// Agency client CRM — the "Entreprises" section of the agency space:
// Fiches entreprises, Contacts RH, Besoins recrutement, Contrats & accords,
// Historique missions. Every row is scoped to the logged-in agency; another
// agency's ids answer 404 (never 403) so their existence isn't confirmed.
import type { Express, Request, RequestHandler, Response } from "express";
import { z } from "zod";
import { and, desc, eq, getTableColumns, ilike, inArray, isNotNull, or } from "drizzle-orm";
import { db } from "./db";
import {
  agencyClients,
  agencyClientContacts,
  agencyClientNeeds,
  agencyClientAgreements,
  agencyClientStatuses,
  agencyClientNeedStatuses,
  agencyClientNeedPriorities,
  agencyClientAgreementTypes,
  agencyClientAgreementStatuses,
  agencyPlacements,
  applications,
  companyProfiles,
  fieldMissions,
  jobPostings,
  users,
  type UserType,
} from "@shared/schema";
import { deleteFromObjectStorage, objectKeyFromUrl, readStoredFile, uploadToObjectStorage } from "./objectStorage";

type RequireRole = (...roles: UserType[]) => RequestHandler;

const AGREEMENT_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_AGREEMENT_BYTES = 10 * 1024 * 1024;
const DAY_MS = 86_400_000;

const agencyIdOf = (req: Request) => req.session.userId!;

// Empty strings from HTML inputs become null rather than "" in the DB.
const optionalText = (max = 500) =>
  z.string().trim().max(max).nullable().optional().transform((value) => (value ? value : null));
const optionalDate = z.union([z.coerce.date(), z.literal("")]).nullable().optional()
  .transform((value) => (value instanceof Date ? value : null));
const optionalInt = (min = 0, max = 1_000_000_000) =>
  z.number().int().min(min).max(max).nullable().optional();

const clientSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis").max(200),
  sector: optionalText(120),
  city: optionalText(120),
  country: optionalText(120),
  address: optionalText(300),
  website: optionalText(300),
  registrationNumber: optionalText(120),
  status: z.enum(agencyClientStatuses).optional(),
  notes: optionalText(4000),
  companyUserId: z.string().nullable().optional(),
});

const contactSchema = z.object({
  fullName: z.string().trim().min(1, "Le nom est requis").max(200),
  jobTitle: optionalText(150),
  email: z.union([z.string().trim().email("Email invalide"), z.literal("")]).nullable().optional()
    .transform((value) => (value ? value : null)),
  phone: optionalText(40),
  whatsapp: optionalText(40),
  isPrimary: z.boolean().optional(),
  notes: optionalText(2000),
  lastContactAt: optionalDate,
});

const needSchema = z.object({
  title: z.string().trim().min(1, "L'intitulé du poste est requis").max(200),
  positions: z.number().int().min(1).max(10_000).optional(),
  contractType: optionalText(60),
  location: optionalText(200),
  desiredStartDate: optionalDate,
  salaryMin: optionalInt(),
  salaryMax: optionalInt(),
  priority: z.enum(agencyClientNeedPriorities).optional(),
  status: z.enum(agencyClientNeedStatuses).optional(),
  description: optionalText(5000),
  contactId: z.string().nullable().optional(),
}).refine((data) => !data.salaryMin || !data.salaryMax || data.salaryMax >= data.salaryMin, {
  message: "Le salaire maximum doit être supérieur au minimum",
  path: ["salaryMax"],
});

const agreementFileSchema = z.object({
  name: z.string().trim().min(1).max(200),
  mimeType: z.string(),
  dataBase64: z.string().min(1),
});

const agreementSchema = z.object({
  type: z.enum(agencyClientAgreementTypes),
  title: z.string().trim().min(1, "L'intitulé est requis").max(200),
  reference: optionalText(120),
  status: z.enum(agencyClientAgreementStatuses).optional(),
  startDate: optionalDate,
  endDate: optionalDate,
  commissionRate: z.number().min(0).max(100).nullable().optional(),
  paymentTermsDays: optionalInt(0, 365),
  notes: optionalText(4000),
  file: agreementFileSchema.nullable().optional(),
}).refine((data) => !data.startDate || !data.endDate || data.endDate > data.startDate, {
  message: "La date de fin doit être après la date de début",
  path: ["endDate"],
});

function handleError(res: Response, error: unknown, fallback: string) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ message: error.errors[0]?.message ?? "Données invalides", errors: error.errors });
  }
  if (error instanceof HttpError) {
    return res.status(error.status).json({ message: error.message });
  }
  console.error(fallback, error);
  return res.status(500).json({ message: fallback });
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export type ClientOfRecord = {
  id: string; name: string; sector: string | null; city: string | null; country: string | null;
  address: string | null; registrationNumber: string | null;
  // Where invoices and reminders go: the primary HR contact's email, else
  // any contact of the fiche that has one.
  email: string | null; contactName: string | null;
};

/**
 * The agency's fiches keyed by id, to name the client of a placement or an
 * invoice — the fiche is the client of record, whether or not the client
 * has a BaaraMatch account.
 */
export async function loadAgencyClientsById(agencyId: string): Promise<Map<string, ClientOfRecord>> {
  const rows = await db.select({
    id: agencyClients.id, name: agencyClients.name, sector: agencyClients.sector, city: agencyClients.city,
    country: agencyClients.country, address: agencyClients.address, registrationNumber: agencyClients.registrationNumber,
  }).from(agencyClients).where(eq(agencyClients.agencyId, agencyId));
  const contacts = await db.select({ clientId: agencyClientContacts.clientId, fullName: agencyClientContacts.fullName, email: agencyClientContacts.email, isPrimary: agencyClientContacts.isPrimary })
    .from(agencyClientContacts).where(eq(agencyClientContacts.agencyId, agencyId));
  return new Map(rows.map((row) => {
    const withEmail = contacts.filter((contact) => contact.clientId === row.id && contact.email);
    const contact = withEmail.find((item) => item.isPrimary) ?? withEmail[0];
    return [row.id, { ...row, email: contact?.email ?? null, contactName: contact?.fullName ?? null }];
  }));
}

/**
 * The agency's fiches keyed by id with just what's needed to label a
 * mission — name, plus the registered company's logo when the fiche is
 * linked to a BaaraMatch account (fiches have no logo of their own).
 */
export async function loadAgencyClientLabels(agencyId: string): Promise<Map<string, { id: string; name: string; logoUrl: string | null }>> {
  const rows = await db.select({ id: agencyClients.id, name: agencyClients.name, logoUrl: companyProfiles.logoUrl })
    .from(agencyClients)
    .leftJoin(companyProfiles, eq(companyProfiles.userId, agencyClients.companyUserId))
    .where(eq(agencyClients.agencyId, agencyId));
  return new Map(rows.map((row) => [row.id, row]));
}

/**
 * The fiche for a client, found or created: an explicit fiche id must be
 * one of the agency's own; a registered company id gets (or reuses) the
 * agency's fiche for that company. Returns undefined when neither resolves.
 */
export async function resolveAgencyClient(agencyId: string, ref: { agencyClientId?: string | null; companyUserId?: string | null }) {
  if (ref.agencyClientId) return findAgencyClient(agencyId, ref.agencyClientId);
  if (!ref.companyUserId) return undefined;
  const [existing] = await db.select().from(agencyClients)
    .where(and(eq(agencyClients.agencyId, agencyId), eq(agencyClients.companyUserId, ref.companyUserId)));
  if (existing) return existing;
  const [company] = await db.select({ id: users.id, fullName: users.fullName, userType: users.userType, city: users.city, country: users.country, companyName: companyProfiles.companyName, industry: companyProfiles.industry })
    .from(users).leftJoin(companyProfiles, eq(companyProfiles.userId, users.id)).where(eq(users.id, ref.companyUserId));
  if (!company || company.userType !== "company") return undefined;
  const [created] = await db.insert(agencyClients).values({
    agencyId, companyUserId: company.id, name: company.companyName ?? company.fullName,
    sector: company.industry, city: company.city, country: company.country, status: "active",
  }).onConflictDoNothing().returning();
  return created ?? (await db.select().from(agencyClients)
    .where(and(eq(agencyClients.agencyId, agencyId), eq(agencyClients.companyUserId, company.id))))[0];
}

/** The agency's own fiche, or undefined — never another agency's. */
export async function findAgencyClient(agencyId: string, clientId: string) {
  const [client] = await db.select().from(agencyClients)
    .where(and(eq(agencyClients.id, clientId), eq(agencyClients.agencyId, agencyId)));
  return client;
}

async function getOwnedClient(agencyId: string, clientId: string) {
  const client = await findAgencyClient(agencyId, clientId);
  if (!client) throw new HttpError(404, "Entreprise introuvable");
  return client;
}

async function assertRegisteredCompany(companyUserId: string | null | undefined) {
  if (!companyUserId) return;
  const [company] = await db.select({ userType: users.userType }).from(users).where(eq(users.id, companyUserId));
  if (!company || company.userType !== "company") {
    throw new HttpError(400, "Entreprise BaaraMatch introuvable");
  }
}

async function storeFile(agencyId: string, file: z.infer<typeof agreementFileSchema>) {
  if (!AGREEMENT_MIME_TYPES.includes(file.mimeType)) {
    throw new HttpError(400, "Formats acceptés : PDF, JPG, PNG ou WebP.");
  }
  const buffer = Buffer.from(file.dataBase64, "base64");
  if (!buffer.length) throw new HttpError(400, "Fichier vide.");
  if (buffer.length > MAX_AGREEMENT_BYTES) throw new HttpError(400, "Le fichier doit faire 10 Mo maximum.");
  let url = `data:${file.mimeType};base64,${buffer.toString("base64")}`;
  try {
    url = await uploadToObjectStorage("client-agreements", agencyId, buffer, file.mimeType);
  } catch (err) {
    console.warn("Object storage unavailable, storing agreement inline:", (err as Error).message);
  }
  return { fileUrl: url, fileName: file.name, fileMimeType: file.mimeType, fileSizeBytes: buffer.length };
}

function discardStoredFile(url: string | null) {
  const key = url ? objectKeyFromUrl(url) : null;
  if (key) {
    deleteFromObjectStorage(key).catch((err) => console.warn("Could not delete agreement blob:", (err as Error).message));
  }
}

/**
 * Registered companies this agency already works with (via its jobs or
 * placements) get a fiche automatically, so the CRM is never empty for an
 * agency that has history, and so that history stays attached to a fiche.
 * Idempotent thanks to the (agency_id, company_user_id) unique constraint.
 */
async function materializeRelatedCompanies(agencyId: string) {
  const [placementCompanies, jobCompanies] = await Promise.all([
    db.selectDistinct({ id: agencyPlacements.companyId }).from(agencyPlacements).where(eq(agencyPlacements.agencyId, agencyId)),
    db.selectDistinct({ id: jobPostings.companyId }).from(jobPostings).where(eq(jobPostings.agencyId, agencyId)),
  ]);
  const ids = Array.from(new Set([...placementCompanies, ...jobCompanies].map((row) => row.id)))
    .filter((id): id is string => !!id && id !== agencyId);
  if (ids.length === 0) return;

  const existing = await db.select({ companyUserId: agencyClients.companyUserId }).from(agencyClients)
    .where(and(eq(agencyClients.agencyId, agencyId), inArray(agencyClients.companyUserId, ids)));
  const known = new Set(existing.map((row) => row.companyUserId));
  const missing = ids.filter((id) => !known.has(id));
  if (missing.length === 0) return;

  const companies = await db.select({
    id: users.id,
    fullName: users.fullName,
    city: users.city,
    country: users.country,
    userType: users.userType,
    companyName: companyProfiles.companyName,
    industry: companyProfiles.industry,
    website: companyProfiles.website,
  }).from(users).leftJoin(companyProfiles, eq(companyProfiles.userId, users.id)).where(inArray(users.id, missing));

  const rows = companies.filter((company) => company.userType === "company").map((company) => ({
    agencyId,
    companyUserId: company.id,
    name: company.companyName ?? company.fullName,
    sector: company.industry ?? null,
    city: company.city ?? null,
    country: company.country ?? null,
    website: company.website ?? null,
    status: "active" as const,
  }));
  if (rows.length) {
    await db.insert(agencyClients).values(rows).onConflictDoNothing();
  }
}

type MissionRow = {
  id: string;
  kind: "mission" | "placement" | "field_mission";
  clientId: string;
  clientName: string;
  title: string;
  candidateName: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  positions: number | null;
  applications: number | null;
  rating: number | null;
  amount: number | null;
};

/** Every mission-like record tied to this agency's clients, newest first. */
async function loadClientMissions(agencyId: string, clientId?: string): Promise<MissionRow[]> {
  const clients = await db.select().from(agencyClients)
    .where(clientId ? and(eq(agencyClients.agencyId, agencyId), eq(agencyClients.id, clientId)) : eq(agencyClients.agencyId, agencyId));
  if (clients.length === 0) return [];
  const clientById = new Map(clients.map((client) => [client.id, client]));
  const clientByCompany = new Map(clients.filter((client) => client.companyUserId).map((client) => [client.companyUserId!, client]));

  const jobs = await db.select().from(jobPostings).where(and(
    eq(jobPostings.agencyId, agencyId),
    inArray(jobPostings.agencyClientId, clients.map((client) => client.id)),
  ));
  const jobClient = new Map(jobs.map((job) => [job.id, clientById.get(job.agencyClientId!)!]));

  const companyIds = Array.from(clientByCompany.keys());
  const jobIds = jobs.map((job) => job.id);
  const placementFilters = [
    inArray(agencyPlacements.agencyClientId, clients.map((client) => client.id)),
    companyIds.length ? inArray(agencyPlacements.companyId, companyIds) : undefined,
    jobIds.length ? inArray(agencyPlacements.jobId, jobIds) : undefined,
  ].filter(Boolean);
  const placements = placementFilters.length
    ? await db.select({ placement: agencyPlacements, candidateName: users.fullName })
      .from(agencyPlacements)
      .leftJoin(users, eq(users.id, agencyPlacements.candidateId))
      .where(and(eq(agencyPlacements.agencyId, agencyId), or(...placementFilters)))
    : [];

  const applicationCounts = new Map<string, number>();
  if (jobIds.length) {
    const rows = await db.select({ jobId: applications.jobId }).from(applications).where(inArray(applications.jobId, jobIds));
    for (const row of rows) applicationCounts.set(row.jobId, (applicationCounts.get(row.jobId) ?? 0) + 1);
  }

  // Field missions only carry a free-text client name — matched
  // case-insensitively against the fiche name.
  const names = clients.map((client) => client.name);
  const field = await db.select({ mission: fieldMissions, candidateName: users.fullName })
    .from(fieldMissions)
    .leftJoin(users, eq(users.id, fieldMissions.candidateId))
    // ILIKE without wildcards = case-insensitive equality; escape any
    // literal % or _ in the fiche name so it can't act as a pattern.
    .where(and(eq(fieldMissions.agencyId, agencyId), or(...names.map((name) => ilike(fieldMissions.clientName, name.replace(/[\\%_]/g, (char) => `\\${char}`))))));
  const clientByName = new Map(clients.map((client) => [client.name.trim().toLowerCase(), client]));

  const iso = (value: Date | null | undefined) => (value ? new Date(value).toISOString() : null);
  const rows: MissionRow[] = [];

  for (const job of jobs) {
    const client = jobClient.get(job.id)!;
    rows.push({
      id: job.id,
      kind: "mission",
      clientId: client.id,
      clientName: client.name,
      title: job.title,
      candidateName: null,
      startDate: iso(job.startDate ?? job.createdAt),
      endDate: iso(job.applicationDeadline),
      status: job.isActive ? "open" : "draft",
      positions: job.positions,
      applications: applicationCounts.get(job.id) ?? 0,
      rating: null,
      amount: null,
    });
  }

  for (const { placement, candidateName } of placements) {
    const client = (placement.agencyClientId && clientById.get(placement.agencyClientId))
      || (placement.jobId && jobClient.get(placement.jobId))
      || (placement.companyId ? clientByCompany.get(placement.companyId) : undefined);
    if (!client) continue;
    const expired = placement.status === "active" && placement.endDate && new Date(placement.endDate).getTime() < Date.now();
    rows.push({
      id: placement.id,
      kind: "placement",
      clientId: client.id,
      clientName: client.name,
      title: placement.position ?? "Placement",
      candidateName: candidateName ?? null,
      startDate: iso(placement.startDate),
      endDate: iso(placement.endDate),
      status: expired ? "expired" : placement.status ?? "active",
      positions: null,
      applications: null,
      rating: placement.performanceRating,
      amount: placement.commissionAmount,
    });
  }

  for (const { mission, candidateName } of field) {
    const client = clientByName.get(mission.clientName.trim().toLowerCase());
    if (!client) continue;
    rows.push({
      id: mission.id,
      kind: "field_mission",
      clientId: client.id,
      clientName: client.name,
      title: mission.jobTitle,
      candidateName: candidateName ?? null,
      startDate: iso(mission.startDate),
      endDate: iso(mission.actualEndDate ?? mission.plannedEndDate),
      status: mission.status ?? "planned",
      positions: null,
      applications: null,
      rating: mission.clientRating,
      amount: null,
    });
  }

  return rows.sort((left, right) => new Date(right.startDate ?? 0).getTime() - new Date(left.startDate ?? 0).getTime());
}

export function registerAgencyCrmRoutes(app: Express, requireRole: RequireRole) {
  const agencyOnly = requireRole("agency");

  // ---- Fiches entreprises ------------------------------------------------
  app.get("/api/agency/clients", agencyOnly, async (req, res) => {
    try {
      const agencyId = agencyIdOf(req);
      await materializeRelatedCompanies(agencyId);
      const [clients, contacts, needs, agreements, missions] = await Promise.all([
        db.select().from(agencyClients).where(eq(agencyClients.agencyId, agencyId)).orderBy(agencyClients.name),
        db.select().from(agencyClientContacts).where(eq(agencyClientContacts.agencyId, agencyId)),
        db.select({ clientId: agencyClientNeeds.clientId, status: agencyClientNeeds.status }).from(agencyClientNeeds).where(eq(agencyClientNeeds.agencyId, agencyId)),
        db.select({ clientId: agencyClientAgreements.clientId, status: agencyClientAgreements.status, endDate: agencyClientAgreements.endDate })
          .from(agencyClientAgreements).where(eq(agencyClientAgreements.agencyId, agencyId)),
        loadClientMissions(agencyId),
      ]);
      const now = Date.now();
      res.json(clients.map((client) => {
        const clientContacts = contacts.filter((contact) => contact.clientId === client.id);
        const primary = clientContacts.find((contact) => contact.isPrimary) ?? clientContacts[0] ?? null;
        const signed = agreements.filter((agreement) => agreement.clientId === client.id && agreement.status === "signed");
        const clientMissions = missions.filter((mission) => mission.clientId === client.id);
        return {
          ...client,
          contactsCount: clientContacts.length,
          primaryContact: primary ? { id: primary.id, fullName: primary.fullName, jobTitle: primary.jobTitle, email: primary.email, phone: primary.phone } : null,
          openNeeds: needs.filter((need) => need.clientId === client.id && ["new", "qualified", "in_progress"].includes(need.status)).length,
          activeAgreements: signed.filter((agreement) => !agreement.endDate || agreement.endDate.getTime() >= now).length,
          expiringAgreements: signed.filter((agreement) => agreement.endDate && agreement.endDate.getTime() >= now && agreement.endDate.getTime() - now <= 30 * DAY_MS).length,
          activePlacements: clientMissions.filter((mission) => mission.kind === "placement" && mission.status === "active").length,
          totalPlacements: clientMissions.filter((mission) => mission.kind === "placement").length,
          lastActivityAt: clientMissions[0]?.startDate ?? null,
        };
      }));
    } catch (error) {
      handleError(res, error, "Erreur lors du chargement des entreprises");
    }
  });

  // Registered companies an agency can link a fiche to — only public-facing
  // fields, never emails or phones.
  app.get("/api/agency/platform-companies", agencyOnly, async (req, res) => {
    try {
      const search = String(req.query.search ?? "").trim();
      const rows = await db.select({
        id: users.id,
        name: companyProfiles.companyName,
        fallbackName: users.fullName,
        city: users.city,
        industry: companyProfiles.industry,
      }).from(users).leftJoin(companyProfiles, eq(companyProfiles.userId, users.id))
        .where(and(
          eq(users.userType, "company"),
          search ? or(ilike(companyProfiles.companyName, `%${search}%`), ilike(users.fullName, `%${search}%`)) : undefined,
        ))
        .limit(20);
      res.json(rows.map((row) => ({ id: row.id, name: row.name ?? row.fallbackName, city: row.city, industry: row.industry })));
    } catch (error) {
      handleError(res, error, "Erreur lors de la recherche d'entreprises");
    }
  });

  app.post("/api/agency/clients", agencyOnly, async (req, res) => {
    try {
      const data = clientSchema.parse(req.body);
      await assertRegisteredCompany(data.companyUserId);
      const [created] = await db.insert(agencyClients).values({ ...data, companyUserId: data.companyUserId ?? null, agencyId: agencyIdOf(req) })
        .onConflictDoNothing().returning();
      if (!created) throw new HttpError(409, "Une fiche existe déjà pour cette entreprise BaaraMatch.");
      res.status(201).json(created);
    } catch (error) {
      handleError(res, error, "Erreur lors de la création de l'entreprise");
    }
  });

  app.patch("/api/agency/clients/:id", agencyOnly, async (req, res) => {
    try {
      const client = await getOwnedClient(agencyIdOf(req), String(req.params.id));
      const data = clientSchema.partial().parse(req.body);
      if (data.companyUserId !== undefined) await assertRegisteredCompany(data.companyUserId);
      const [updated] = await db.update(agencyClients).set({ ...data, updatedAt: new Date() }).where(eq(agencyClients.id, client.id)).returning();
      res.json(updated);
    } catch (error) {
      if ((error as { code?: string }).code === "23505") {
        return res.status(409).json({ message: "Une autre fiche est déjà liée à cette entreprise BaaraMatch." });
      }
      handleError(res, error, "Erreur lors de la mise à jour de l'entreprise");
    }
  });

  app.delete("/api/agency/clients/:id", agencyOnly, async (req, res) => {
    try {
      const client = await getOwnedClient(agencyIdOf(req), String(req.params.id));
      const files = await db.select({ fileUrl: agencyClientAgreements.fileUrl }).from(agencyClientAgreements)
        .where(and(eq(agencyClientAgreements.clientId, client.id), isNotNull(agencyClientAgreements.fileUrl)));
      // Contacts, needs and agreements cascade; linked jobs keep existing
      // with their client link set to null.
      await db.delete(agencyClients).where(eq(agencyClients.id, client.id));
      files.forEach((file) => discardStoredFile(file.fileUrl));
      res.json({ success: true });
    } catch (error) {
      handleError(res, error, "Erreur lors de la suppression de l'entreprise");
    }
  });

  // ---- Contacts RH ---------------------------------------------------------
  app.get("/api/agency/client-contacts", agencyOnly, async (req, res) => {
    try {
      const rows = await db.select({ contact: agencyClientContacts, clientName: agencyClients.name })
        .from(agencyClientContacts)
        .innerJoin(agencyClients, eq(agencyClients.id, agencyClientContacts.clientId))
        .where(eq(agencyClientContacts.agencyId, agencyIdOf(req)))
        .orderBy(agencyClientContacts.fullName);
      res.json(rows.map((row) => ({ ...row.contact, clientName: row.clientName })));
    } catch (error) {
      handleError(res, error, "Erreur lors du chargement des contacts");
    }
  });

  // Keeps at most one primary contact per client.
  async function makePrimary(clientId: string, contactId: string) {
    await db.update(agencyClientContacts).set({ isPrimary: false })
      .where(and(eq(agencyClientContacts.clientId, clientId), eq(agencyClientContacts.isPrimary, true)));
    await db.update(agencyClientContacts).set({ isPrimary: true }).where(eq(agencyClientContacts.id, contactId));
  }

  app.post("/api/agency/clients/:id/contacts", agencyOnly, async (req, res) => {
    try {
      const agencyId = agencyIdOf(req);
      const client = await getOwnedClient(agencyId, String(req.params.id));
      const data = contactSchema.parse(req.body);
      const existing = await db.select({ id: agencyClientContacts.id }).from(agencyClientContacts)
        .where(eq(agencyClientContacts.clientId, client.id)).limit(1);
      // The first contact of a client becomes its primary contact.
      const isPrimary = data.isPrimary ?? existing.length === 0;
      const [created] = await db.insert(agencyClientContacts).values({ ...data, isPrimary: false, agencyId, clientId: client.id }).returning();
      if (isPrimary) await makePrimary(client.id, created.id);
      res.status(201).json({ ...created, isPrimary });
    } catch (error) {
      handleError(res, error, "Erreur lors de la création du contact");
    }
  });

  app.patch("/api/agency/client-contacts/:id", agencyOnly, async (req, res) => {
    try {
      const [contact] = await db.select().from(agencyClientContacts)
        .where(and(eq(agencyClientContacts.id, String(req.params.id)), eq(agencyClientContacts.agencyId, agencyIdOf(req))));
      if (!contact) throw new HttpError(404, "Contact introuvable");
      const { isPrimary, ...data } = contactSchema.partial().parse(req.body);
      const [updated] = await db.update(agencyClientContacts).set(data).where(eq(agencyClientContacts.id, contact.id)).returning();
      if (isPrimary === true) await makePrimary(contact.clientId, contact.id);
      if (isPrimary === false) await db.update(agencyClientContacts).set({ isPrimary: false }).where(eq(agencyClientContacts.id, contact.id));
      res.json({ ...updated, isPrimary: isPrimary ?? updated.isPrimary });
    } catch (error) {
      handleError(res, error, "Erreur lors de la mise à jour du contact");
    }
  });

  app.delete("/api/agency/client-contacts/:id", agencyOnly, async (req, res) => {
    try {
      const deleted = await db.delete(agencyClientContacts)
        .where(and(eq(agencyClientContacts.id, String(req.params.id)), eq(agencyClientContacts.agencyId, agencyIdOf(req))))
        .returning({ id: agencyClientContacts.id });
      if (!deleted.length) throw new HttpError(404, "Contact introuvable");
      res.json({ success: true });
    } catch (error) {
      handleError(res, error, "Erreur lors de la suppression du contact");
    }
  });

  // ---- Besoins recrutement ---------------------------------------------------
  async function assertOwnedContact(agencyId: string, clientId: string, contactId: string | null | undefined) {
    if (!contactId) return;
    const [contact] = await db.select({ id: agencyClientContacts.id }).from(agencyClientContacts)
      .where(and(eq(agencyClientContacts.id, contactId), eq(agencyClientContacts.agencyId, agencyId), eq(agencyClientContacts.clientId, clientId)));
    if (!contact) throw new HttpError(400, "Ce contact n'appartient pas à cette entreprise");
  }

  app.get("/api/agency/client-needs", agencyOnly, async (req, res) => {
    try {
      const rows = await db.select({ need: agencyClientNeeds, clientName: agencyClients.name, contactName: agencyClientContacts.fullName, jobIsActive: jobPostings.isActive })
        .from(agencyClientNeeds)
        .innerJoin(agencyClients, eq(agencyClients.id, agencyClientNeeds.clientId))
        .leftJoin(agencyClientContacts, eq(agencyClientContacts.id, agencyClientNeeds.contactId))
        .leftJoin(jobPostings, eq(jobPostings.id, agencyClientNeeds.jobId))
        .where(eq(agencyClientNeeds.agencyId, agencyIdOf(req)))
        .orderBy(desc(agencyClientNeeds.createdAt));
      res.json(rows.map((row) => ({ ...row.need, clientName: row.clientName, contactName: row.contactName, jobIsActive: row.jobIsActive })));
    } catch (error) {
      handleError(res, error, "Erreur lors du chargement des besoins");
    }
  });

  app.post("/api/agency/clients/:id/needs", agencyOnly, async (req, res) => {
    try {
      const agencyId = agencyIdOf(req);
      const client = await getOwnedClient(agencyId, String(req.params.id));
      const data = needSchema.parse(req.body);
      await assertOwnedContact(agencyId, client.id, data.contactId);
      const [created] = await db.insert(agencyClientNeeds).values({ ...data, contactId: data.contactId ?? null, agencyId, clientId: client.id }).returning();
      res.status(201).json(created);
    } catch (error) {
      handleError(res, error, "Erreur lors de la création du besoin");
    }
  });

  app.patch("/api/agency/client-needs/:id", agencyOnly, async (req, res) => {
    try {
      const agencyId = agencyIdOf(req);
      const [need] = await db.select().from(agencyClientNeeds)
        .where(and(eq(agencyClientNeeds.id, String(req.params.id)), eq(agencyClientNeeds.agencyId, agencyId)));
      if (!need) throw new HttpError(404, "Besoin introuvable");
      const data = needSchema.innerType().partial().parse(req.body);
      await assertOwnedContact(agencyId, need.clientId, data.contactId);
      const [updated] = await db.update(agencyClientNeeds).set({ ...data, updatedAt: new Date() }).where(eq(agencyClientNeeds.id, need.id)).returning();
      res.json(updated);
    } catch (error) {
      handleError(res, error, "Erreur lors de la mise à jour du besoin");
    }
  });

  app.delete("/api/agency/client-needs/:id", agencyOnly, async (req, res) => {
    try {
      const deleted = await db.delete(agencyClientNeeds)
        .where(and(eq(agencyClientNeeds.id, String(req.params.id)), eq(agencyClientNeeds.agencyId, agencyIdOf(req))))
        .returning({ id: agencyClientNeeds.id });
      if (!deleted.length) throw new HttpError(404, "Besoin introuvable");
      res.json({ success: true });
    } catch (error) {
      handleError(res, error, "Erreur lors de la suppression du besoin");
    }
  });

  // Turns a qualified need into a mission: creates an inactive (draft) job
  // posting tied to the client, so the agency completes and publishes it
  // through the normal mission editor — and its usual moderation rules.
  app.post("/api/agency/client-needs/:id/convert", agencyOnly, async (req, res) => {
    try {
      const agencyId = agencyIdOf(req);
      const [need] = await db.select().from(agencyClientNeeds)
        .where(and(eq(agencyClientNeeds.id, String(req.params.id)), eq(agencyClientNeeds.agencyId, agencyId)));
      if (!need) throw new HttpError(404, "Besoin introuvable");
      if (need.jobId) throw new HttpError(409, "Ce besoin a déjà été transformé en mission.");
      const client = await getOwnedClient(agencyId, need.clientId);

      const [job] = await db.insert(jobPostings).values({
        companyId: agencyId,
        agencyId,
        agencyClientId: client.id,
        title: need.title,
        description: need.description || `Mission pour ${client.name}.`,
        location: need.location || client.city || "À préciser",
        jobType: need.contractType || "CDD",
        positions: need.positions,
        salaryMin: need.salaryMin,
        salaryMax: need.salaryMax,
        startDate: need.desiredStartDate,
        isUrgent: need.priority === "urgent",
        isActive: false,
      }).returning();

      const [updated] = await db.update(agencyClientNeeds)
        .set({ jobId: job.id, status: "in_progress", updatedAt: new Date() })
        .where(eq(agencyClientNeeds.id, need.id)).returning();
      res.status(201).json({ need: updated, jobId: job.id });
    } catch (error) {
      handleError(res, error, "Erreur lors de la création de la mission");
    }
  });

  // ---- Contrats & accords ---------------------------------------------------
  const { fileUrl: _fileUrl, ...agreementColumns } = getTableColumns(agencyClientAgreements);

  app.get("/api/agency/client-agreements", agencyOnly, async (req, res) => {
    try {
      const rows = await db.select({ agreement: agreementColumns, clientName: agencyClients.name })
        .from(agencyClientAgreements)
        .innerJoin(agencyClients, eq(agencyClients.id, agencyClientAgreements.clientId))
        .where(eq(agencyClientAgreements.agencyId, agencyIdOf(req)))
        .orderBy(desc(agencyClientAgreements.createdAt));
      res.json(rows.map((row) => ({ ...row.agreement, clientName: row.clientName })));
    } catch (error) {
      handleError(res, error, "Erreur lors du chargement des accords");
    }
  });

  const stripFileUrl = <T extends { fileUrl: string | null }>({ fileUrl: _url, ...rest }: T) => rest;

  app.post("/api/agency/clients/:id/agreements", agencyOnly, async (req, res) => {
    try {
      const agencyId = agencyIdOf(req);
      const client = await getOwnedClient(agencyId, String(req.params.id));
      const { file, ...data } = agreementSchema.parse(req.body);
      const stored = file ? await storeFile(agencyId, file) : {};
      const [created] = await db.insert(agencyClientAgreements).values({ ...data, ...stored, agencyId, clientId: client.id }).returning();
      res.status(201).json(stripFileUrl(created));
    } catch (error) {
      handleError(res, error, "Erreur lors de la création de l'accord");
    }
  });

  app.patch("/api/agency/client-agreements/:id", agencyOnly, async (req, res) => {
    try {
      const agencyId = agencyIdOf(req);
      const [agreement] = await db.select().from(agencyClientAgreements)
        .where(and(eq(agencyClientAgreements.id, String(req.params.id)), eq(agencyClientAgreements.agencyId, agencyId)));
      if (!agreement) throw new HttpError(404, "Accord introuvable");
      const { file, ...data } = agreementSchema.innerType().partial().parse(req.body);
      const stored = file ? await storeFile(agencyId, file) : {};
      const [updated] = await db.update(agencyClientAgreements).set({ ...data, ...stored, updatedAt: new Date() })
        .where(eq(agencyClientAgreements.id, agreement.id)).returning();
      if (file) discardStoredFile(agreement.fileUrl);
      res.json(stripFileUrl(updated));
    } catch (error) {
      handleError(res, error, "Erreur lors de la mise à jour de l'accord");
    }
  });

  app.delete("/api/agency/client-agreements/:id", agencyOnly, async (req, res) => {
    try {
      const [deleted] = await db.delete(agencyClientAgreements)
        .where(and(eq(agencyClientAgreements.id, String(req.params.id)), eq(agencyClientAgreements.agencyId, agencyIdOf(req))))
        .returning({ fileUrl: agencyClientAgreements.fileUrl });
      if (!deleted) throw new HttpError(404, "Accord introuvable");
      discardStoredFile(deleted.fileUrl);
      res.json({ success: true });
    } catch (error) {
      handleError(res, error, "Erreur lors de la suppression de l'accord");
    }
  });

  app.get("/api/agency/client-agreements/:id/file", agencyOnly, async (req, res) => {
    try {
      const [agreement] = await db.select().from(agencyClientAgreements)
        .where(and(eq(agencyClientAgreements.id, String(req.params.id)), eq(agencyClientAgreements.agencyId, agencyIdOf(req))));
      if (!agreement?.fileUrl) throw new HttpError(404, "Document introuvable");
      const buffer = await readStoredFile(agreement.fileUrl);
      const download = req.query.download === "1";
      res.setHeader("Content-Type", agreement.fileMimeType ?? "application/octet-stream");
      res.setHeader("Content-Disposition", `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(agreement.fileName ?? "document")}`);
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.send(buffer);
    } catch (error) {
      handleError(res, error, "Fichier indisponible");
    }
  });

  // ---- Historique missions ----------------------------------------------------
  app.get("/api/agency/client-missions", agencyOnly, async (req, res) => {
    try {
      const clientId = req.query.clientId ? String(req.query.clientId) : undefined;
      if (clientId) await getOwnedClient(agencyIdOf(req), clientId);
      res.json(await loadClientMissions(agencyIdOf(req), clientId));
    } catch (error) {
      handleError(res, error, "Erreur lors du chargement de l'historique");
    }
  });
}
