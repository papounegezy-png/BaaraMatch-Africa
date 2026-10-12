// Conversational WhatsApp bot: search offers, apply (with an optional voice
// note), track applications — all without leaving WhatsApp. A menu-driven
// state machine (numbers, not free-text NLU) on purpose: reliable for a
// BTP/mines audience with sometimes-low literacy, no LLM dependency, and
// trivial to test deterministically.
//
// Reuses real, already-existing infrastructure rather than rebuilding it:
// storage.getUserByPhone/createUser (same as the voice-CV flow already
// does), shared/matching.ts's calculateMatchScore (the V0 rule-based
// scorer), storage.createApplication (the same path the web app uses),
// storage.getApplicationsByCandidateWithJobs (built for "Mes candidatures").
//
// ── Session-initiated vs business-initiated messages (Meta's 24h rule) ──
// WhatsApp only lets a business send free-form text inside a "customer
// service window": the 24h following the candidate's last message to us.
// Everything the bot sends is a reply, so it is always inside that window
// (session-initiated). A notification we send on our own — e.g. "your
// application was shortlisted" — is business-initiated: outside the window
// Meta rejects free text (error 131047) and only accepts a pre-approved
// template message.
//
// Templates may not be approved yet (MVP), so notifyApplicationStatusChange
// below never assumes one exists:
// 1. Window open (whatsapp_sessions.updatedAt < 24h, refreshed on every
//    inbound message by the webhook) → free-form text, like a bot reply.
// 2. Window closed → template, only if WHATSAPP_STATUS_TEMPLATE_NAME is
//    configured (body params: {{1}} job title, {{2}} new status; language
//    WHATSAPP_STATUS_TEMPLATE_LANG, default "fr").
// 3. No template, or Meta refuses for a window/template reason → the
//    notification is NOT dropped: stored as "en_attente_fenetre" and sent
//    by deliverPendingWhatsAppNotifications the next time the candidate
//    writes (which reopens the window), before the bot answers them.
//    Admins see that backlog at /admin/whatsapp-pending to call people
//    whose wait gets too long.
// Template submission/approval itself is deliberately out of scope here.
import { storage } from "./storage";
import { calculateMatchScore } from "@shared/matching";
import {
  sendWhatsAppMessage,
  sendWhatsAppText,
  sendWhatsAppTemplate,
  downloadWhatsAppMedia,
  WHATSAPP_WINDOW_ERROR_CODES,
  type WhatsAppMessage,
  type WhatsAppSendResult,
} from "./whatsapp";
import { uploadToObjectStorage } from "./objectStorage";
import type { WhatsAppBotStep } from "@shared/schema";

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

// Basic per-phone anti-spam: a sliding 60s window, in-memory. Good enough
// for a single-process dev/launch deployment — not meant to survive a
// restart or multiple instances, matching the "limite raisonnable" the spec
// asked for, not a distributed rate limiter.
const MAX_MESSAGES_PER_WINDOW = 10;
const WINDOW_MS = 60 * 1000;
const recentMessageTimestamps = new Map<string, number[]>();

function isRateLimited(phone: string): boolean {
  const now = Date.now();
  const recent = (recentMessageTimestamps.get(phone) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  recentMessageTimestamps.set(phone, recent);
  return recent.length > MAX_MESSAGES_PER_WINDOW;
}

const statusLabels: Record<string, string> = {
  pending: "Reçue",
  reviewing: "En cours d'examen",
  shortlisted: "Présélectionnée",
  interview_proposed: "Créneaux d'entretien à choisir",
  interview: "Entretien prévu",
  offered: "Offre reçue",
  hired: "Embauché(e)",
  rejected: "Non retenue",
  withdrawn: "Retirée",
};

const MENU_TEXT =
  "Bienvenue sur BaaraMatch ! Que voulez-vous faire ?\n\n" +
  "1. Rechercher des offres\n" +
  "2. Suivre mes candidatures\n" +
  "3. Parler à un conseiller\n\n" +
  "Répondez avec le numéro de votre choix.";

async function reply(phone: string, text: string) {
  await sendWhatsAppMessage(phone, text);
}

async function setStep(phone: string, step: WhatsAppBotStep, context: Record<string, unknown> = {}) {
  await storage.upsertWhatsAppSession(phone, step, context);
}

async function findOrCreateCandidate(phone: string, senderName: string) {
  const existing = await storage.getUserByPhone(phone);
  if (existing) return existing;

  // Meta can deliver two messages from a brand-new number in quick
  // succession (a fast double-send, or a webhook retry) — both requests
  // can reach here before either's insert commits, so the second one's
  // createUser can lose a race on the derived email's unique constraint.
  // Rather than serialize every call, just fall back to re-reading the
  // row the other request just created.
  try {
    const user = await storage.createUser({
      email: `whatsapp_${phone}@baaramatch.africa`,
      password: `wa_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      userType: "candidate",
      fullName: senderName || "Candidat WhatsApp",
      phone,
      country: "Mali",
    });
    await storage.createCandidateProfile({
      userId: user.id,
      title: null,
      bio: null,
      skills: null,
      experience: null,
      education: null,
      languages: null,
      availableFrom: null,
      salaryExpectation: null,
      resumeUrl: null,
      whatsappNumber: phone,
      preferredContact: "whatsapp",
    });
    return user;
  } catch (error) {
    const isUniqueViolation = (error as { code?: string })?.code === "23505";
    if (!isUniqueViolation) throw error;
    const winner = await storage.getUserByPhone(phone);
    if (winner) return winner;
    throw error;
  }
}

async function showMainMenu(phone: string) {
  await reply(phone, MENU_TEXT);
  await setStep(phone, "main_menu");
}

async function trackApplications(phone: string, userId: string) {
  const applications = await storage.getApplicationsByCandidateWithJobs(userId);
  if (applications.length === 0) {
    await reply(phone, "Vous n'avez encore aucune candidature. Tapez 1 pour rechercher des offres.");
    return;
  }
  const lines = applications
    .slice(0, 10)
    .map((app) => `• ${app.jobTitle} (${app.organizationName ?? "Employeur"}) — ${statusLabels[app.status ?? "pending"] ?? app.status}`);
  await reply(phone, `Vos candidatures :\n\n${lines.join("\n")}\n\nTapez un numéro du menu pour continuer.`);
}

async function handleMainMenu(phone: string, userId: string, text: string) {
  const choice = text.trim();
  if (choice === "1") {
    await reply(phone, "Quel métier recherchez-vous ? (ex : chef de chantier, électricien...)");
    await setStep(phone, "awaiting_job_title");
    return;
  }
  if (choice === "2") {
    await trackApplications(phone, userId);
    return;
  }
  if (choice === "3") {
    await reply(
      phone,
      "Un conseiller BaaraMatch va vous recontacter. Vous pouvez aussi nous écrire à contact@baaramatch.africa.\n\nTapez un numéro du menu pour continuer.",
    );
    return;
  }
  await showMainMenu(phone);
}

async function handleJobTitleStep(phone: string, text: string) {
  const jobTitle = text.trim();
  if (jobTitle.toLowerCase() === "stop") {
    await showMainMenu(phone);
    return;
  }
  if (!jobTitle) {
    await reply(phone, "Merci d'indiquer un métier (ex : chef de chantier), ou 'stop' pour revenir au menu.");
    return;
  }
  await reply(phone, "Dans quelle ville ?");
  await setStep(phone, "awaiting_city", { jobTitle });
}

async function handleCityStep(phone: string, userId: string, text: string, context: Record<string, unknown>) {
  const city = text.trim();
  if (city.toLowerCase() === "stop") {
    await showMainMenu(phone);
    return;
  }
  if (!city) {
    await reply(phone, "Merci d'indiquer une ville, ou 'stop' pour revenir au menu.");
    return;
  }

  const jobTitle = String(context.jobTitle ?? "");
  const [allJobs, profile] = await Promise.all([
    storage.getAllJobPostings(),
    storage.getCandidateProfile(userId),
  ]);

  const keyword = jobTitle.toLowerCase();
  const matches = allJobs.filter(
    (job) => job.title.toLowerCase().includes(keyword) || (job.description ?? "").toLowerCase().includes(keyword),
  );

  const scored = matches
    .map((job) => ({
      job,
      score: calculateMatchScore(
        { skills: profile?.skills, city, experienceYears: profile?.experienceYears },
        { requiredSkills: job.requiredSkills, location: job.location, experienceMin: job.experienceMin },
      ).score,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (scored.length === 0) {
    await reply(
      phone,
      `Aucune offre trouvée pour "${jobTitle}". Tapez un autre métier à rechercher, ou 'stop' pour revenir au menu.`,
    );
    await setStep(phone, "awaiting_job_title");
    return;
  }

  const lines = scored.map(
    ({ job, score }, index) =>
      `${index + 1}. ${job.title} — ${job.organizationName ?? "Employeur"}, ${job.location} (${score}% de correspondance)`,
  );
  await reply(
    phone,
    `Voici les offres qui correspondent le mieux :\n\n${lines.join("\n")}\n\nRépondez avec le numéro pour postuler, ou 'stop' pour revenir au menu.`,
  );
  await setStep(phone, "awaiting_job_choice", {
    jobTitle,
    city,
    jobOptions: scored.map(({ job }) => ({ id: job.id, title: job.title, organizationName: job.organizationName })),
  });
}

async function handleJobChoiceStep(phone: string, userId: string, text: string, context: Record<string, unknown>) {
  const choice = text.trim();
  if (choice.toLowerCase() === "stop") {
    await showMainMenu(phone);
    return;
  }
  const jobOptions = (context.jobOptions as { id: string; title: string; organizationName: string | null }[]) ?? [];
  const index = Number(choice) - 1;
  const selected = jobOptions[index];
  if (!selected) {
    await reply(phone, "Choix invalide. Répondez avec le numéro d'une offre proposée, ou 'stop' pour revenir au menu.");
    return;
  }

  const existingApplications = await storage.getApplicationsByCandidate(userId);
  if (existingApplications.some((app) => app.jobId === selected.id)) {
    await reply(phone, `Vous avez déjà postulé pour "${selected.title}". Tapez un numéro du menu pour continuer.`);
    await showMainMenu(phone);
    return;
  }

  await reply(
    phone,
    `Voulez-vous ajouter un message vocal expliquant votre motivation pour "${selected.title}" ?\n\nEnvoyez votre vocal maintenant, ou répondez 'non' pour postuler sans message.`,
  );
  await setStep(phone, "awaiting_voice_or_confirmation", { selectedJobId: selected.id, selectedJobTitle: selected.title });
}

async function createApplicationFromBot(userId: string, jobId: string, voiceIntroUrl: string | null) {
  const job = await storage.getJobPosting(jobId);
  const profile = await storage.getCandidateProfile(userId);
  const user = await storage.getUser(userId);
  const matchScore = job
    ? calculateMatchScore(
        { skills: profile?.skills, city: user?.city, experienceYears: profile?.experienceYears },
        { requiredSkills: job.requiredSkills, location: job.location, experienceMin: job.experienceMin },
      ).score
    : null;

  const application = await storage.createApplication({
    candidateId: userId,
    jobId,
    status: "pending",
    matchScore,
    voiceIntroUrl,
  });

  if (job) {
    const recipientId = job.agencyId || job.companyId;
    if (recipientId && user) {
      await storage.createNotification({
        userId: recipientId,
        type: "application_update",
        title: "Nouvelle candidature",
        message: `${user.fullName} a postulé (via WhatsApp) à l'offre "${job.title}".`,
        actionUrl: job.agencyId ? "/agency/missions" : "/company/applications",
      });
    }
  }

  return application;
}

async function handleVoiceOrConfirmationStep(
  phone: string,
  userId: string,
  text: string,
  audio: { id: string; mime_type: string } | undefined,
  context: Record<string, unknown>,
) {
  const jobId = context.selectedJobId as string | undefined;
  const jobTitle = (context.selectedJobTitle as string | undefined) ?? "cette offre";
  if (!jobId) {
    await showMainMenu(phone);
    return;
  }

  if (audio) {
    let voiceIntroUrl: string | null = null;
    try {
      const buffer = await downloadWhatsAppMedia(audio.id);
      voiceIntroUrl = await uploadToObjectStorage("voice-application", userId, buffer, audio.mime_type);
    } catch (error) {
      console.error("[WhatsApp bot] Failed to persist voice note, applying without it:", error);
    }
    await createApplicationFromBot(userId, jobId, voiceIntroUrl);
    await reply(
      phone,
      `Candidature envoyée pour "${jobTitle}"${voiceIntroUrl ? " avec votre message vocal" : ""} ! Vous recevrez une mise à jour dès qu'il y a du nouveau.`,
    );
    await showMainMenu(phone);
    return;
  }

  const choice = text.trim().toLowerCase();
  if (choice === "non" || choice === "no") {
    await createApplicationFromBot(userId, jobId, null);
    await reply(phone, `Candidature envoyée pour "${jobTitle}" ! Vous recevrez une mise à jour dès qu'il y a du nouveau.`);
    await showMainMenu(phone);
    return;
  }
  if (choice === "stop") {
    await showMainMenu(phone);
    return;
  }

  await reply(phone, "Envoyez votre message vocal, ou répondez 'non' pour postuler sans message.");
}

async function processIncomingWhatsAppMessage(message: WhatsAppMessage, senderName: string): Promise<void> {
  const phone = message.from;
  const user = await findOrCreateCandidate(phone, senderName);

  let session = await storage.getWhatsAppSession(phone);
  const isStale = session && Date.now() - new Date(session.updatedAt ?? session.createdAt ?? 0).getTime() > SESSION_TIMEOUT_MS;
  if (!session || isStale) {
    session = await storage.upsertWhatsAppSession(phone, "main_menu", {});
  }

  const text = message.text?.body ?? "";
  const audio = message.audio || message.voice;
  const context = (session.context as Record<string, unknown>) ?? {};

  switch (session.step) {
    case "awaiting_job_title":
      await handleJobTitleStep(phone, text);
      break;
    case "awaiting_city":
      await handleCityStep(phone, user.id, text, context);
      break;
    case "awaiting_job_choice":
      await handleJobChoiceStep(phone, user.id, text, context);
      break;
    case "awaiting_voice_or_confirmation":
      await handleVoiceOrConfirmationStep(phone, user.id, text, audio, context);
      break;
    case "main_menu":
    default:
      await handleMainMenu(phone, user.id, text);
      break;
  }
}

// Meta can deliver several messages from the same number in quick
// succession (a fast double-send, or a webhook retry), and each arrives as
// its own independent HTTP request/async task with no ordering guarantee.
// Without serialization, two messages from the same phone can interleave
// their session read-modify-write and corrupt the conversation's state
// (confirmed while testing: a later message's read raced an earlier
// message's write and silently applied the wrong step transition). Chaining
// each phone's work onto a per-phone promise forces strictly sequential
// processing — matching how a human actually converses, one message at a
// time — without blocking other phones' conversations.
const processingQueues = new Map<string, Promise<void>>();

export async function handleIncomingWhatsAppMessage(message: WhatsAppMessage, senderName: string): Promise<void> {
  const phone = message.from;
  if (isRateLimited(phone)) {
    console.warn(`[WhatsApp bot] Rate limit hit for ${phone}, dropping message`);
    return;
  }

  const previous = processingQueues.get(phone) ?? Promise.resolve();
  const current = previous
    .catch(() => {}) // one message's failure must not jam the phone's queue
    .then(() => processIncomingWhatsAppMessage(message, senderName));
  processingQueues.set(phone, current);
  try {
    await current;
  } finally {
    if (processingQueues.get(phone) === current) {
      processingQueues.delete(phone);
    }
  }
}

// ── Business-initiated notifications (see the header comment) ──

const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;

function isWindowError(result: WhatsAppSendResult) {
  return !result.ok && result.errorCode !== null && WHATSAPP_WINDOW_ERROR_CODES.has(result.errorCode);
}

// The number to notify, only if the candidate has actually used WhatsApp
// with us (their number on the profile, or a bot session for it) — never a
// phone typed on the website, which never opted in to WhatsApp messages.
async function getCandidateWhatsAppPhone(candidateId: string): Promise<string | null> {
  const [user, profile] = await Promise.all([storage.getUser(candidateId), storage.getCandidateProfile(candidateId)]);
  if (profile?.whatsappNumber) return profile.whatsappNumber;
  if (user?.phone && (await storage.getWhatsAppSession(user.phone))) return user.phone;
  return null;
}

export async function notifyApplicationStatusChange(params: {
  candidateId: string;
  applicationId: string;
  jobTitle: string;
  status: string;
  message: string;
}): Promise<void> {
  const phone = await getCandidateWhatsAppPhone(params.candidateId);
  if (!phone) return;

  const text = `BaaraMatch — Candidature « ${params.jobTitle} »\n\n${params.message}.\n\nRépondez à ce message pour suivre vos candidatures.`;
  const record = (status: "envoye" | "envoye_template" | "en_attente_fenetre" | "echec", lastError: string | null = null) =>
    storage.createWhatsAppNotification({ candidateId: params.candidateId, phone, applicationId: params.applicationId, message: text, status, lastError });

  const session = await storage.getWhatsAppSession(phone);
  const lastInboundAt = session ? new Date(session.updatedAt ?? session.createdAt ?? 0).getTime() : 0;
  const windowOpen = Date.now() - lastInboundAt < SERVICE_WINDOW_MS;

  if (windowOpen) {
    const result = await sendWhatsAppText(phone, text);
    if (result.ok) return void (await record("envoye"));
    // Our clock and Meta's can disagree near the 24h edge — fall through to
    // the out-of-window path instead of losing the notification.
    if (!isWindowError(result)) return void (await record("echec", result.error));
  }

  const templateName = process.env.WHATSAPP_STATUS_TEMPLATE_NAME?.trim();
  if (!templateName) return void (await record("en_attente_fenetre", "Hors fenêtre 24h, aucun template configuré"));

  const result = await sendWhatsAppTemplate(phone, {
    name: templateName,
    language: process.env.WHATSAPP_STATUS_TEMPLATE_LANG?.trim() || "fr",
    bodyParams: [params.jobTitle, statusLabels[params.status] ?? params.message],
  });
  if (result.ok) return void (await record("envoye_template"));
  await record(isWindowError(result) ? "en_attente_fenetre" : "echec", result.error);
}

// Called on every inbound message, before the bot answers: the candidate
// just reopened the window, so whatever was waiting can go out as text.
export async function deliverPendingWhatsAppNotifications(phone: string): Promise<void> {
  const pending = await storage.claimPendingWhatsAppNotifications(phone);
  for (const notification of pending) {
    const result = await sendWhatsAppText(phone, notification.message);
    if (!result.ok) await storage.releaseWhatsAppNotification(notification.id, result.error);
  }
}

// Only the voice-note-for-an-application step should treat incoming audio
// as part of the bot flow — everywhere else, an unsolicited voice message
// falls back to the existing "build my CV from this" behavior
// (processVoiceCVMessage), so that feature isn't silently broken by adding
// the conversational bot on top of it.
export async function isAwaitingApplicationVoiceNote(phone: string): Promise<boolean> {
  const session = await storage.getWhatsAppSession(phone);
  if (!session) return false;
  const isStale = Date.now() - new Date(session.updatedAt ?? session.createdAt ?? 0).getTime() > SESSION_TIMEOUT_MS;
  return !isStale && session.step === "awaiting_voice_or_confirmation";
}
