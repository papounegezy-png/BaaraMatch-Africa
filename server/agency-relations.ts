// Agency "CRM" section: exchanges journal (Suivi échanges / Appels & emails),
// follow-ups with automatic rules (Relances auto) and client satisfaction
// surveys (NPS). Built on the agency's client fiches (agency-crm.ts). Every
// agency route is scoped to the logged-in agency; ids of another agency
// answer 404. The two /api/satisfaction/:token routes are public by design
// (the client answers without an account) and rate-limited.
import type { Express, Request, RequestHandler, Response } from "express";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import { z } from "zod";
import { and, desc, eq, inArray, isNotNull, isNull, lt } from "drizzle-orm";
import { db } from "./db";
import { storage } from "./storage";
import { sendEmail } from "./email";
import {
  agencyClientAgreements,
  agencyClientContacts,
  agencyClientNeeds,
  agencyClients,
  agencyCrmSettings,
  agencyInteractionOutcomes,
  agencyInteractionTypes,
  agencyInteractions,
  agencyPlacements,
  agencyReminders,
  agencySatisfactionSurveys,
  invoices,
  users,
  type AgencyInteractionType,
  type AgencyReminderRules,
  type UserType,
} from "@shared/schema";

type RequireRole = (...roles: UserType[]) => RequestHandler;

const DAY_MS = 86_400_000;
const SURVEY_VALIDITY_DAYS = 30;

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
function handleError(res: Response, error: unknown, fallback: string) {
  if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0]?.message ?? "Données invalides" });
  if (error instanceof HttpError) return res.status(error.status).json({ message: error.message });
  console.error(fallback, error);
  return res.status(500).json({ message: fallback });
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));
const paragraphs = (text: string) => escapeHtml(text).split(/\n{2,}/).map((block) => `<p>${block.replace(/\n/g, "<br>")}</p>`).join("");

async function ownedClient(agencyId: string, clientId: string) {
  const [client] = await db.select().from(agencyClients).where(and(eq(agencyClients.id, clientId), eq(agencyClients.agencyId, agencyId)));
  if (!client) throw new HttpError(404, "Entreprise introuvable");
  return client;
}
async function ownedContact(agencyId: string, clientId: string, contactId: string | null | undefined) {
  if (!contactId) return undefined;
  const [contact] = await db.select().from(agencyClientContacts)
    .where(and(eq(agencyClientContacts.id, contactId), eq(agencyClientContacts.agencyId, agencyId), eq(agencyClientContacts.clientId, clientId)));
  if (!contact) throw new HttpError(400, "Ce contact n'appartient pas à cette entreprise");
  return contact;
}
async function agencyIdentity(agencyId: string) {
  const [user, profile] = await Promise.all([storage.getUser(agencyId), storage.getAgencyProfile(agencyId)]);
  return { name: profile?.agencyName ?? user?.fullName ?? "Votre agence", email: user?.email };
}

/**
 * Journals something BaaraMatch sent on the agency's behalf (email, invoice,
 * reminder, survey). Never throws: the journal must not break the send.
 */
export async function logPlatformInteraction(agencyId: string, clientId: string | null | undefined, entry: { type: AgencyInteractionType; subject: string; body?: string | null; emailTo?: string | null; contactId?: string | null }) {
  if (!clientId) return;
  try {
    await db.insert(agencyInteractions).values({
      agencyId, clientId, contactId: entry.contactId ?? null, type: entry.type, direction: "outbound",
      subject: entry.subject, body: entry.body ?? null, source: "platform", emailTo: entry.emailTo ?? null, occurredAt: new Date(),
    });
  } catch (error) {
    console.error("Could not journal platform interaction:", error);
  }
}

// ---- Automatic follow-up rules ------------------------------------------------
export const DEFAULT_RULES: AgencyReminderRules = {
  invoice_overdue: { enabled: true, days: 7 },
  agreement_expiring: { enabled: true, days: 30 },
  client_dormant: { enabled: true, days: 45 },
  need_untreated: { enabled: true, days: 3 },
  placement_ending: { enabled: true, days: 15 },
  detractor: { enabled: true, days: 0 },
};
type RuleName = keyof AgencyReminderRules;

async function loadRules(agencyId: string): Promise<AgencyReminderRules> {
  const [row] = await db.select().from(agencyCrmSettings).where(eq(agencyCrmSettings.agencyId, agencyId));
  const stored = row?.rules ?? {};
  return Object.fromEntries((Object.keys(DEFAULT_RULES) as RuleName[]).map((rule) => [rule, { ...DEFAULT_RULES[rule], ...(stored[rule] ?? {}) }])) as AgencyReminderRules;
}

type Candidate = { ruleKey: string; title: string; notes?: string; clientId: string | null; channel: AgencyInteractionType; dueAt: Date; relatedUrl: string };

/**
 * Evaluates the agency's rules and syncs rule-generated reminders:
 * creates the missing ones (idempotent through ruleKey) and closes those
 * whose cause has disappeared (invoice paid, agreement renewed…).
 */
export async function syncRuleReminders(agencyId: string) {
  const rules = await loadRules(agencyId);
  const now = new Date();
  const candidates: Candidate[] = [];
  const fmt = (value: Date | string) => new Date(value).toLocaleDateString("fr-FR");
  const clients = await db.select().from(agencyClients).where(eq(agencyClients.agencyId, agencyId));
  const clientName = new Map(clients.map((client) => [client.id, client.name]));

  if (rules.invoice_overdue.enabled) {
    const overdue = await db.select().from(invoices).where(and(eq(invoices.agencyId, agencyId), inArray(invoices.status, ["pending", "overdue"]), lt(invoices.dueDate, now)));
    for (const invoice of overdue) {
      const lastTouch = invoice.lastReminderAt ?? invoice.dueDate;
      if (now.getTime() - new Date(lastTouch).getTime() < rules.invoice_overdue.days * DAY_MS) continue;
      const days = Math.floor((now.getTime() - new Date(invoice.dueDate).getTime()) / DAY_MS);
      candidates.push({
        // One follow-up per reminder cycle: a new one appears if the invoice
        // stays unpaid N days after the last reminder.
        ruleKey: `invoice_overdue:${invoice.id}:${invoice.reminderCount}`,
        title: `Relancer le paiement de ${invoice.invoiceNumber} (${days} j de retard)`,
        clientId: invoice.agencyClientId, channel: "email", dueAt: now, relatedUrl: "/agency/billing/payments",
      });
    }
  }
  if (rules.agreement_expiring.enabled) {
    const agreements = await db.select().from(agencyClientAgreements).where(and(eq(agencyClientAgreements.agencyId, agencyId), eq(agencyClientAgreements.status, "signed"), isNotNull(agencyClientAgreements.endDate)));
    for (const agreement of agreements) {
      const left = (new Date(agreement.endDate!).getTime() - now.getTime()) / DAY_MS;
      if (left < 0 || left > rules.agreement_expiring.days) continue;
      candidates.push({
        ruleKey: `agreement_expiring:${agreement.id}:${new Date(agreement.endDate!).toISOString().slice(0, 10)}`,
        title: `Renouveler « ${agreement.title} » (expire le ${fmt(agreement.endDate!)})`,
        clientId: agreement.clientId, channel: "meeting", dueAt: now, relatedUrl: "/agency/companies/contracts",
      });
    }
  }
  if (rules.client_dormant.enabled) {
    const last = await db.select({ clientId: agencyInteractions.clientId, occurredAt: agencyInteractions.occurredAt })
      .from(agencyInteractions).where(eq(agencyInteractions.agencyId, agencyId)).orderBy(desc(agencyInteractions.occurredAt));
    const lastByClient = new Map<string, Date>();
    for (const row of last) if (!lastByClient.has(row.clientId)) lastByClient.set(row.clientId, row.occurredAt);
    for (const client of clients) {
      if (client.status !== "active") continue;
      const reference = lastByClient.get(client.id) ?? client.createdAt ?? now;
      const silentDays = Math.floor((now.getTime() - new Date(reference).getTime()) / DAY_MS);
      if (silentDays < rules.client_dormant.days) continue;
      candidates.push({
        ruleKey: `client_dormant:${client.id}:${new Date(reference).toISOString().slice(0, 10)}`,
        title: lastByClient.has(client.id) ? `Reprendre contact avec ${client.name} (aucun échange depuis ${silentDays} j)` : `Premier échange à tracer avec ${client.name}`,
        clientId: client.id, channel: "call", dueAt: now, relatedUrl: "/agency/crm",
      });
    }
  }
  if (rules.need_untreated.enabled) {
    const needs = await db.select().from(agencyClientNeeds).where(and(eq(agencyClientNeeds.agencyId, agencyId), eq(agencyClientNeeds.status, "new")));
    for (const need of needs) {
      if (now.getTime() - new Date(need.createdAt ?? now).getTime() < rules.need_untreated.days * DAY_MS) continue;
      candidates.push({
        ruleKey: `need_untreated:${need.id}`,
        title: `Qualifier le besoin « ${need.title} » (reçu le ${fmt(need.createdAt ?? now)})`,
        clientId: need.clientId, channel: "call", dueAt: now, relatedUrl: "/agency/companies/needs",
      });
    }
  }
  if (rules.placement_ending.enabled) {
    const placements = await db.select().from(agencyPlacements).where(and(eq(agencyPlacements.agencyId, agencyId), eq(agencyPlacements.status, "active"), isNotNull(agencyPlacements.endDate)));
    const candidateIds = Array.from(new Set(placements.map((placement) => placement.candidateId)));
    const names = candidateIds.length ? new Map((await db.select({ id: users.id, fullName: users.fullName }).from(users).where(inArray(users.id, candidateIds))).map((user) => [user.id, user.fullName])) : new Map();
    for (const placement of placements) {
      const left = (new Date(placement.endDate!).getTime() - now.getTime()) / DAY_MS;
      if (left < 0 || left > rules.placement_ending.days) continue;
      candidates.push({
        ruleKey: `placement_ending:${placement.id}:${new Date(placement.endDate!).toISOString().slice(0, 10)}`,
        title: `Fin de mission de ${names.get(placement.candidateId) ?? "votre intérimaire"} le ${fmt(placement.endDate!)} : renouvellement ?`,
        clientId: placement.agencyClientId, channel: "call", dueAt: now, relatedUrl: "/agency/contracts/renewals",
      });
    }
  }
  if (rules.detractor.enabled) {
    const detractors = await db.select().from(agencySatisfactionSurveys).where(and(eq(agencySatisfactionSurveys.agencyId, agencyId), isNotNull(agencySatisfactionSurveys.respondedAt)));
    for (const survey of detractors) {
      if (survey.score === null || survey.score > 6) continue;
      candidates.push({
        ruleKey: `detractor:${survey.id}`,
        title: `Client insatisfait (${survey.score}/10) : rappeler ${clientName.get(survey.clientId) ?? "le client"}`,
        notes: survey.comment ? `Commentaire : « ${survey.comment} »` : undefined,
        clientId: survey.clientId, channel: "call", dueAt: now, relatedUrl: "/agency/crm/satisfaction",
      });
    }
  }

  if (candidates.length) {
    await db.insert(agencyReminders).values(candidates.map((candidate) => ({
      agencyId, clientId: candidate.clientId, title: candidate.title, notes: candidate.notes ?? null, channel: candidate.channel,
      dueAt: candidate.dueAt, source: "rule" as const, ruleKey: candidate.ruleKey, relatedUrl: candidate.relatedUrl,
    }))).onConflictDoNothing();
  }

  // Close open rule reminders whose cause is gone (or whose rule is off).
  const liveKeys = new Set(candidates.map((candidate) => candidate.ruleKey));
  const open = await db.select({ id: agencyReminders.id, ruleKey: agencyReminders.ruleKey }).from(agencyReminders)
    .where(and(eq(agencyReminders.agencyId, agencyId), eq(agencyReminders.status, "open"), eq(agencyReminders.source, "rule")));
  const stale = open.filter((reminder) => reminder.ruleKey && !liveKeys.has(reminder.ruleKey)).map((reminder) => reminder.id);
  if (stale.length) {
    await db.update(agencyReminders).set({ status: "done", completedAt: now, notes: "Résolue automatiquement : la situation a changé." })
      .where(inArray(agencyReminders.id, stale));
  }
}

// ---- Schemas -----------------------------------------------------------------
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional().transform((value) => (value ? value : null));

const interactionSchema = z.object({
  clientId: z.string().min(1),
  contactId: z.string().nullable().optional(),
  type: z.enum(agencyInteractionTypes),
  direction: z.enum(["inbound", "outbound"]).nullable().optional(),
  subject: z.string().trim().min(1, "L'objet est requis").max(200),
  body: optionalText(5000),
  outcome: z.enum(agencyInteractionOutcomes).nullable().optional(),
  durationMinutes: z.number().int().min(0).max(1440).nullable().optional(),
  occurredAt: z.coerce.date().optional(),
  // Optional next step, created as a follow-up in the same request.
  followUp: z.object({ title: z.string().trim().min(1).max(200), dueAt: z.coerce.date(), channel: z.enum(agencyInteractionTypes).optional() }).nullable().optional(),
  // Logging the exchange a reminder asked for closes that reminder.
  reminderId: z.string().optional(),
});

const reminderSchema = z.object({
  clientId: z.string().nullable().optional(),
  contactId: z.string().nullable().optional(),
  title: z.string().trim().min(1, "L'intitulé est requis").max(200),
  notes: optionalText(2000),
  channel: z.enum(agencyInteractionTypes).nullable().optional(),
  dueAt: z.coerce.date(),
});

const ruleSchema = z.object({ enabled: z.boolean(), days: z.number().int().min(0).max(365) });
const rulesSchema = z.object(Object.fromEntries((Object.keys(DEFAULT_RULES) as RuleName[]).map((rule) => [rule, ruleSchema.optional()])) as Record<RuleName, z.ZodOptional<typeof ruleSchema>>);

function npsOf(scores: number[]) {
  if (!scores.length) return null;
  const promoters = scores.filter((score) => score >= 9).length;
  const detractors = scores.filter((score) => score <= 6).length;
  return Math.round(((promoters - detractors) / scores.length) * 100);
}

const publicLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });

export function registerAgencyRelationsRoutes(app: Express, requireRole: RequireRole) {
  const agencyOnly = requireRole("agency");
  const agencyIdOf = (req: Request) => req.session.userId!;

  // ---- Exchanges ---------------------------------------------------------------
  app.get("/api/agency/interactions", agencyOnly, async (req, res) => {
    try {
      const rows = await db.select({ interaction: agencyInteractions, clientName: agencyClients.name, contactName: agencyClientContacts.fullName })
        .from(agencyInteractions)
        .innerJoin(agencyClients, eq(agencyClients.id, agencyInteractions.clientId))
        .leftJoin(agencyClientContacts, eq(agencyClientContacts.id, agencyInteractions.contactId))
        .where(eq(agencyInteractions.agencyId, agencyIdOf(req)))
        .orderBy(desc(agencyInteractions.occurredAt))
        .limit(1000);
      res.json(rows.map((row) => ({ ...row.interaction, clientName: row.clientName, contactName: row.contactName })));
    } catch (error) {
      handleError(res, error, "Erreur lors du chargement des échanges");
    }
  });

  app.post("/api/agency/interactions", agencyOnly, async (req, res) => {
    try {
      const agencyId = agencyIdOf(req);
      const { followUp, reminderId, ...data } = interactionSchema.parse(req.body);
      await ownedClient(agencyId, data.clientId);
      await ownedContact(agencyId, data.clientId, data.contactId);
      if (data.occurredAt && data.occurredAt.getTime() > Date.now() + 5 * 60_000) throw new HttpError(400, "Un échange ne peut pas être daté dans le futur : créez plutôt une relance.");
      const [created] = await db.insert(agencyInteractions).values({ ...data, contactId: data.contactId ?? null, agencyId, source: "manual", occurredAt: data.occurredAt ?? new Date() }).returning();
      if (followUp) {
        await db.insert(agencyReminders).values({ agencyId, clientId: data.clientId, contactId: data.contactId ?? null, title: followUp.title, dueAt: followUp.dueAt, channel: followUp.channel ?? data.type, source: "manual" });
      }
      if (reminderId) {
        await db.update(agencyReminders).set({ status: "done", completedAt: new Date() })
          .where(and(eq(agencyReminders.id, reminderId), eq(agencyReminders.agencyId, agencyId)));
      }
      res.status(201).json(created);
    } catch (error) {
      handleError(res, error, "Erreur lors de l'enregistrement de l'échange");
    }
  });

  app.delete("/api/agency/interactions/:id", agencyOnly, async (req, res) => {
    try {
      const [row] = await db.select().from(agencyInteractions).where(and(eq(agencyInteractions.id, String(req.params.id)), eq(agencyInteractions.agencyId, agencyIdOf(req))));
      if (!row) throw new HttpError(404, "Échange introuvable");
      if (row.source === "platform") throw new HttpError(409, "Un envoi effectué par BaaraMatch fait foi et ne peut pas être supprimé.");
      await db.delete(agencyInteractions).where(eq(agencyInteractions.id, row.id));
      res.json({ success: true });
    } catch (error) {
      handleError(res, error, "Erreur lors de la suppression");
    }
  });

  // Email a client contact from BaaraMatch; replies go to the agency's own
  // address, and the email is journaled automatically.
  app.post("/api/agency/clients/:id/email", agencyOnly, async (req, res) => {
    try {
      const agencyId = agencyIdOf(req);
      const client = await ownedClient(agencyId, String(req.params.id));
      const body = z.object({
        contactId: z.string().nullable().optional(),
        to: z.string().trim().email("Adresse email invalide").optional(),
        subject: z.string().trim().min(1, "L'objet est requis").max(200),
        message: z.string().trim().min(1, "Le message est vide").max(10000),
      }).parse(req.body);
      const contact = await ownedContact(agencyId, client.id, body.contactId);
      const to = body.to ?? contact?.email;
      if (!to) throw new HttpError(400, "Aucune adresse email : choisissez un contact qui en a une, ou saisissez-la.");
      const agency = await agencyIdentity(agencyId);
      const delivered = await sendEmail({
        to, subject: body.subject, replyTo: agency.email,
        html: `${paragraphs(body.message)}<p style="color:#6b7280;font-size:12px">— ${escapeHtml(agency.name)}, via BaaraMatch</p>`,
      });
      if (!delivered) throw new HttpError(502, "L'email n'a pas pu être envoyé (service d'envoi non configuré ou refusé).");
      const [interaction] = await db.insert(agencyInteractions).values({
        agencyId, clientId: client.id, contactId: contact?.id ?? null, type: "email", direction: "outbound",
        subject: body.subject, body: body.message, source: "platform", emailTo: to, occurredAt: new Date(),
      }).returning();
      if (contact) await db.update(agencyClientContacts).set({ lastContactAt: new Date() }).where(eq(agencyClientContacts.id, contact.id));
      res.status(201).json(interaction);
    } catch (error) {
      handleError(res, error, "Erreur lors de l'envoi de l'email");
    }
  });

  // ---- Follow-ups --------------------------------------------------------------
  app.get("/api/agency/reminders", agencyOnly, async (req, res) => {
    try {
      const agencyId = agencyIdOf(req);
      await syncRuleReminders(agencyId);
      const rows = await db.select({ reminder: agencyReminders, clientName: agencyClients.name, contactName: agencyClientContacts.fullName, contactPhone: agencyClientContacts.phone, contactEmail: agencyClientContacts.email })
        .from(agencyReminders)
        .leftJoin(agencyClients, eq(agencyClients.id, agencyReminders.clientId))
        .leftJoin(agencyClientContacts, eq(agencyClientContacts.id, agencyReminders.contactId))
        .where(eq(agencyReminders.agencyId, agencyId))
        .orderBy(agencyReminders.dueAt)
        .limit(1000);
      res.json(rows.map((row) => ({ ...row.reminder, clientName: row.clientName, contactName: row.contactName, contactPhone: row.contactPhone, contactEmail: row.contactEmail })));
    } catch (error) {
      handleError(res, error, "Erreur lors du chargement des relances");
    }
  });

  app.post("/api/agency/reminders", agencyOnly, async (req, res) => {
    try {
      const agencyId = agencyIdOf(req);
      const data = reminderSchema.parse(req.body);
      if (data.clientId) {
        await ownedClient(agencyId, data.clientId);
        await ownedContact(agencyId, data.clientId, data.contactId);
      }
      const [created] = await db.insert(agencyReminders).values({ ...data, clientId: data.clientId ?? null, contactId: data.clientId ? data.contactId ?? null : null, agencyId, source: "manual" }).returning();
      res.status(201).json(created);
    } catch (error) {
      handleError(res, error, "Erreur lors de la création de la relance");
    }
  });

  app.patch("/api/agency/reminders/:id", agencyOnly, async (req, res) => {
    try {
      const agencyId = agencyIdOf(req);
      const data = z.object({
        status: z.enum(["open", "done", "cancelled"]).optional(),
        dueAt: z.coerce.date().optional(),
        notes: optionalText(2000),
        title: z.string().trim().min(1).max(200).optional(),
      }).parse(req.body);
      const [updated] = await db.update(agencyReminders)
        .set({ ...data, ...(data.status ? { completedAt: data.status === "open" ? null : new Date() } : {}) })
        .where(and(eq(agencyReminders.id, String(req.params.id)), eq(agencyReminders.agencyId, agencyId)))
        .returning();
      if (!updated) throw new HttpError(404, "Relance introuvable");
      res.json(updated);
    } catch (error) {
      handleError(res, error, "Erreur lors de la mise à jour de la relance");
    }
  });

  app.get("/api/agency/crm-settings", agencyOnly, async (req, res) => {
    try {
      res.json({ rules: await loadRules(agencyIdOf(req)) });
    } catch (error) {
      handleError(res, error, "Erreur lors du chargement des règles");
    }
  });

  app.put("/api/agency/crm-settings", agencyOnly, async (req, res) => {
    try {
      const agencyId = agencyIdOf(req);
      const { rules } = z.object({ rules: rulesSchema }).parse(req.body);
      const merged = { ...(await loadRules(agencyId)), ...Object.fromEntries(Object.entries(rules).filter(([, value]) => value)) };
      await db.insert(agencyCrmSettings).values({ agencyId, rules: merged, updatedAt: new Date() })
        .onConflictDoUpdate({ target: agencyCrmSettings.agencyId, set: { rules: merged, updatedAt: new Date() } });
      await syncRuleReminders(agencyId);
      res.json({ rules: merged });
    } catch (error) {
      handleError(res, error, "Erreur lors de l'enregistrement des règles");
    }
  });

  // ---- Overview (KPIs shared by the CRM pages) -----------------------------------
  app.get("/api/agency/relations/overview", agencyOnly, async (req, res) => {
    try {
      const agencyId = agencyIdOf(req);
      await syncRuleReminders(agencyId);
      const now = Date.now();
      const rules = await loadRules(agencyId);
      const [interactions, reminders, clients, surveys] = await Promise.all([
        db.select({ clientId: agencyInteractions.clientId, occurredAt: agencyInteractions.occurredAt, type: agencyInteractions.type }).from(agencyInteractions).where(eq(agencyInteractions.agencyId, agencyId)),
        db.select({ status: agencyReminders.status, dueAt: agencyReminders.dueAt }).from(agencyReminders).where(eq(agencyReminders.agencyId, agencyId)),
        db.select({ id: agencyClients.id, status: agencyClients.status }).from(agencyClients).where(eq(agencyClients.agencyId, agencyId)),
        db.select({ score: agencySatisfactionSurveys.score, respondedAt: agencySatisfactionSurveys.respondedAt }).from(agencySatisfactionSurveys).where(eq(agencySatisfactionSurveys.agencyId, agencyId)),
      ]);
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
      const recentClients = new Set(interactions.filter((row) => now - new Date(row.occurredAt).getTime() <= 30 * DAY_MS).map((row) => row.clientId));
      const lastByClient = new Map<string, number>();
      for (const row of interactions) lastByClient.set(row.clientId, Math.max(lastByClient.get(row.clientId) ?? 0, new Date(row.occurredAt).getTime()));
      const open = reminders.filter((reminder) => reminder.status === "open");
      const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
      const scores = surveys.filter((survey) => survey.respondedAt && survey.score !== null).map((survey) => survey.score!);
      res.json({
        interactionsThisMonth: interactions.filter((row) => new Date(row.occurredAt).getTime() >= startOfMonth).length,
        callsThisMonth: interactions.filter((row) => row.type === "call" && new Date(row.occurredAt).getTime() >= startOfMonth).length,
        emailsThisMonth: interactions.filter((row) => row.type === "email" && new Date(row.occurredAt).getTime() >= startOfMonth).length,
        clientsContacted30d: recentClients.size,
        dormantClients: clients.filter((client) => client.status === "active" && now - (lastByClient.get(client.id) ?? 0) > rules.client_dormant.days * DAY_MS).length,
        remindersOpen: open.length,
        // Overdue = due before today; "today" includes anything due by tonight.
        remindersOverdue: open.filter((reminder) => new Date(reminder.dueAt) < new Date(new Date().setHours(0, 0, 0, 0))).length,
        remindersToday: open.filter((reminder) => new Date(reminder.dueAt) <= endOfToday).length,
        nps: npsOf(scores),
        responses: scores.length,
        dormantDays: rules.client_dormant.days,
      });
    } catch (error) {
      handleError(res, error, "Erreur lors du calcul de la synthèse");
    }
  });

  // ---- Satisfaction ------------------------------------------------------------
  app.get("/api/agency/satisfaction", agencyOnly, async (req, res) => {
    try {
      const rows = await db.select({ survey: agencySatisfactionSurveys, clientName: agencyClients.name, contactName: agencyClientContacts.fullName })
        .from(agencySatisfactionSurveys)
        .innerJoin(agencyClients, eq(agencyClients.id, agencySatisfactionSurveys.clientId))
        .leftJoin(agencyClientContacts, eq(agencyClientContacts.id, agencySatisfactionSurveys.contactId))
        .where(eq(agencySatisfactionSurveys.agencyId, agencyIdOf(req)))
        .orderBy(desc(agencySatisfactionSurveys.sentAt));
      const surveys = rows.map(({ survey, clientName, contactName }) => {
        const { token: _token, ...safe } = survey;
        return { ...safe, clientName, contactName, expired: !survey.respondedAt && new Date(survey.expiresAt).getTime() < Date.now() };
      });
      const answered = surveys.filter((survey) => survey.respondedAt && survey.score !== null);
      const scores = answered.map((survey) => survey.score!);
      const byClient = new Map<string, { clientId: string; clientName: string; scores: number[]; lastAt: string | null }>();
      for (const survey of answered) {
        const entry = byClient.get(survey.clientId) ?? { clientId: survey.clientId, clientName: survey.clientName, scores: [], lastAt: null };
        entry.scores.push(survey.score!);
        if (!entry.lastAt || new Date(survey.respondedAt!) > new Date(entry.lastAt)) entry.lastAt = new Date(survey.respondedAt!).toISOString();
        byClient.set(survey.clientId, entry);
      }
      res.json({
        surveys,
        stats: {
          sent: surveys.length,
          responses: scores.length,
          responseRate: surveys.length ? Math.round((scores.length / surveys.length) * 100) : null,
          nps: npsOf(scores),
          average: scores.length ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10 : null,
          promoters: scores.filter((score) => score >= 9).length,
          passives: scores.filter((score) => score >= 7 && score <= 8).length,
          detractors: scores.filter((score) => score <= 6).length,
        },
        byClient: Array.from(byClient.values()).map((entry) => ({
          clientId: entry.clientId, clientName: entry.clientName, responses: entry.scores.length,
          average: Math.round((entry.scores.reduce((sum, score) => sum + score, 0) / entry.scores.length) * 10) / 10,
          nps: npsOf(entry.scores), lastAt: entry.lastAt,
        })).sort((a, b) => a.average - b.average),
      });
    } catch (error) {
      handleError(res, error, "Erreur lors du chargement de la satisfaction");
    }
  });

  app.post("/api/agency/satisfaction/surveys", agencyOnly, async (req, res) => {
    try {
      const agencyId = agencyIdOf(req);
      const body = z.object({
        clientId: z.string().min(1),
        contactId: z.string().nullable().optional(),
        to: z.string().trim().email("Adresse email invalide").optional(),
        message: z.string().trim().max(2000).optional(),
      }).parse(req.body);
      const client = await ownedClient(agencyId, body.clientId);
      const contact = await ownedContact(agencyId, client.id, body.contactId);
      const to = body.to ?? contact?.email;
      if (!to) throw new HttpError(400, "Aucune adresse email : choisissez un contact qui en a une, ou saisissez-la.");

      const token = crypto.randomBytes(24).toString("hex");
      const [survey] = await db.insert(agencySatisfactionSurveys).values({
        agencyId, clientId: client.id, contactId: contact?.id ?? null, token, sentTo: to,
        expiresAt: new Date(Date.now() + SURVEY_VALIDITY_DAYS * DAY_MS),
      }).returning();

      const agency = await agencyIdentity(agencyId);
      const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
      const link = `${baseUrl}/satisfaction/${token}`;
      const delivered = await sendEmail({
        to, replyTo: agency.email,
        subject: `${agency.name} — votre avis sur notre collaboration`,
        html: `<p>Bonjour${contact ? ` ${escapeHtml(contact.fullName)}` : ""},</p>
          ${body.message ? paragraphs(body.message) : `<p>Votre avis nous aide à mieux vous servir. Une seule question, moins d'une minute.</p>`}
          <p><a href="${link}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Donner mon avis</a></p>
          <p style="color:#6b7280;font-size:12px">Lien personnel, valable ${SURVEY_VALIDITY_DAYS} jours. — ${escapeHtml(agency.name)}, via BaaraMatch</p>`,
      });
      if (!delivered) {
        await db.delete(agencySatisfactionSurveys).where(eq(agencySatisfactionSurveys.id, survey.id));
        throw new HttpError(502, "L'email n'a pas pu être envoyé (service d'envoi non configuré ou refusé). Aucune enquête créée.");
      }
      await logPlatformInteraction(agencyId, client.id, { type: "email", subject: "Enquête de satisfaction envoyée", emailTo: to, contactId: contact?.id });
      const { token: _token, ...safe } = survey;
      res.status(201).json(safe);
    } catch (error) {
      handleError(res, error, "Erreur lors de l'envoi de l'enquête");
    }
  });

  // ---- Public survey (no account) --------------------------------------------------
  async function findSurvey(token: string) {
    if (!/^[a-f0-9]{48}$/.test(token)) return undefined;
    const [row] = await db.select({ survey: agencySatisfactionSurveys, clientName: agencyClients.name })
      .from(agencySatisfactionSurveys)
      .innerJoin(agencyClients, eq(agencyClients.id, agencySatisfactionSurveys.clientId))
      .where(eq(agencySatisfactionSurveys.token, token));
    return row;
  }

  app.get("/api/satisfaction/:token", publicLimiter, async (req, res) => {
    try {
      const row = await findSurvey(String(req.params.token));
      if (!row) return res.status(404).json({ message: "Lien d'enquête invalide." });
      const agency = await agencyIdentity(row.survey.agencyId);
      res.json({
        agencyName: agency.name,
        clientName: row.clientName,
        answered: !!row.survey.respondedAt,
        expired: !row.survey.respondedAt && new Date(row.survey.expiresAt).getTime() < Date.now(),
      });
    } catch (error) {
      handleError(res, error, "Erreur lors du chargement de l'enquête");
    }
  });

  app.post("/api/satisfaction/:token", publicLimiter, async (req, res) => {
    try {
      const { score, comment } = z.object({
        score: z.number().int().min(0).max(10),
        comment: z.string().trim().max(2000).optional(),
      }).parse(req.body);
      const row = await findSurvey(String(req.params.token));
      if (!row) return res.status(404).json({ message: "Lien d'enquête invalide." });
      if (row.survey.respondedAt) return res.status(409).json({ message: "Vous avez déjà répondu à cette enquête. Merci !" });
      if (new Date(row.survey.expiresAt).getTime() < Date.now()) return res.status(410).json({ message: "Ce lien a expiré." });
      // Single-use, enforced by the conditional update (a double submit
      // can't record two answers).
      const [updated] = await db.update(agencySatisfactionSurveys)
        .set({ score, comment: comment || null, respondedAt: new Date() })
        .where(and(eq(agencySatisfactionSurveys.id, row.survey.id), isNull(agencySatisfactionSurveys.respondedAt)))
        .returning();
      if (!updated) return res.status(409).json({ message: "Vous avez déjà répondu à cette enquête. Merci !" });
      await storage.createNotification({
        userId: row.survey.agencyId,
        type: "system",
        title: `Avis client : ${row.clientName} — ${score}/10`,
        message: comment ? `« ${comment.slice(0, 140)} »` : "Nouvelle réponse à votre enquête de satisfaction.",
        actionUrl: "/agency/crm/satisfaction",
      });
      await db.insert(agencyInteractions).values({
        agencyId: row.survey.agencyId, clientId: row.survey.clientId, contactId: row.survey.contactId, type: "note", direction: "inbound",
        subject: `Réponse à l'enquête de satisfaction : ${score}/10`, body: comment || null, source: "platform", occurredAt: new Date(),
        outcome: score >= 9 ? "positive" : score <= 6 ? "negative" : "neutral",
      });
      res.json({ success: true, score: updated.score });
    } catch (error) {
      handleError(res, error, "Erreur lors de l'enregistrement de votre réponse");
    }
  });
}
