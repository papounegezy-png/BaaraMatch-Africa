// Agency "Base de données" candidats: one lean row per candidate enriched
// with what THIS agency knows about them (its applications, placements,
// documents), shared filtering for the list and the Excel export, and the
// "présélectionner sur une mission" action that feeds the real pipeline.
//
// Deliberately not /api/candidates: that returns whole profiles (resume
// data: URLs, embeddings…) — ~30 Ko per candidate — which doesn't scale for
// a list screen and must never end up in a spreadsheet.
import type { Express, Request, RequestHandler, Response } from "express";
import ExcelJS from "exceljs";
import { z } from "zod";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "./db";
import { storage } from "./storage";
import {
  agencyPlacements,
  applications,
  candidateDocuments,
  candidateProfiles,
  jobPostings,
  users,
  type UserType,
} from "@shared/schema";
import { calculateMatchScore } from "@shared/matching";
import { readStoredFile } from "./objectStorage";

type RequireRole = (...roles: UserType[]) => RequestHandler;

export const candidateBaseStatuses = ["available", "in_process", "placed"] as const;
export type CandidateBaseStatus = typeof candidateBaseStatuses[number];

const IN_PROCESS_STATUSES = ["shortlisted", "interview_proposed", "interview", "offered"];

export type CandidateBaseRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  city: string | null;
  country: string | null;
  avatarUrl: string | null;
  title: string | null;
  skills: string[];
  experienceYears: number | null;
  educationLevel: string | null;
  languages: string[];
  availableFrom: string | null;
  salaryExpectation: string | null;
  hasCv: boolean;
  hasVoiceCv: boolean;
  completeness: number;
  registeredAt: string | null;
  // What this agency knows about the candidate
  status: CandidateBaseStatus;
  applicationsCount: number;
  lastApplicationAt: string | null;
  currentProcess: { jobTitle: string; status: string } | null;
  placementsCount: number;
  currentPlacement: { position: string | null; endDate: string | null } | null;
  averageRating: number | null;
  documentsCount: number;
  matchScore: number | null;
};

const filtersSchema = z.object({
  search: z.string().trim().max(200).optional(),
  status: z.enum(["all", ...candidateBaseStatuses]).optional(),
  skill: z.string().trim().max(100).optional(),
  city: z.string().trim().max(100).optional(),
  minExperience: z.coerce.number().int().min(0).max(60).optional(),
  hasCv: z.enum(["yes", "no"]).optional(),
  jobId: z.string().optional(),
});
type Filters = z.infer<typeof filtersSchema>;

const iso = (value: Date | null | undefined) => (value ? new Date(value).toISOString() : null);
// Accent-insensitive comparison: "Ségou" matches "segou".
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

async function buildCandidateBase(agencyId: string, jobId?: string): Promise<CandidateBaseRow[]> {
  const [candidates, agencyJobs, placements, documents] = await Promise.all([
    // Only the columns the list needs: never pull resume data: URLs or
    // embedding vectors just to know whether a CV exists.
    db.select({
      user: {
        id: users.id, fullName: users.fullName, email: users.email, phone: users.phone,
        city: users.city, country: users.country, avatarUrl: users.avatarUrl, createdAt: users.createdAt,
      },
      profile: {
        title: candidateProfiles.title, skills: candidateProfiles.skills, experienceYears: candidateProfiles.experienceYears,
        educationLevel: candidateProfiles.educationLevel, languages: candidateProfiles.languages,
        availableFrom: candidateProfiles.availableFrom, salaryExpectation: candidateProfiles.salaryExpectation,
        whatsappNumber: candidateProfiles.whatsappNumber,
        hasCv: sql<boolean>`${candidateProfiles.resumeUrl} is not null`,
        hasVoiceCv: sql<boolean>`${candidateProfiles.voiceCvUrl} is not null`,
      },
    })
      .from(users)
      .leftJoin(candidateProfiles, eq(candidateProfiles.userId, users.id))
      .where(eq(users.userType, "candidate")),
    db.select({ id: jobPostings.id, title: jobPostings.title, requiredSkills: jobPostings.requiredSkills, location: jobPostings.location, experienceMin: jobPostings.experienceMin })
      .from(jobPostings).where(eq(jobPostings.agencyId, agencyId)),
    db.select().from(agencyPlacements).where(eq(agencyPlacements.agencyId, agencyId)),
    db.select({ candidateId: candidateDocuments.candidateId }).from(candidateDocuments).where(eq(candidateDocuments.agencyId, agencyId)),
  ]);
  const jobById = new Map(agencyJobs.map((job) => [job.id, job]));
  const agencyApplications = agencyJobs.length
    ? await db.select().from(applications).where(inArray(applications.jobId, agencyJobs.map((job) => job.id)))
    : [];

  const targetJob = jobId ? jobById.get(jobId) : undefined;
  const now = Date.now();

  return candidates.map(({ user, profile }) => {
    const apps = agencyApplications
      .filter((application) => application.candidateId === user.id)
      .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
    const inProcess = apps.find((application) => IN_PROCESS_STATUSES.includes(application.status ?? ""));
    const myPlacements = placements.filter((placement) => placement.candidateId === user.id);
    const activePlacement = myPlacements.find((placement) =>
      placement.status === "active" && (!placement.endDate || new Date(placement.endDate).getTime() >= now));
    const rated = myPlacements.filter((placement) => placement.performanceRating !== null);

    const skills = profile?.skills ?? [];
    const hasCv = !!profile?.hasCv;
    // Profile completeness — what an agency needs before presenting someone.
    const checks = [!!profile?.title, skills.length > 0, profile?.experienceYears !== null && profile?.experienceYears !== undefined, hasCv, !!user.phone, !!user.city, !!profile?.educationLevel];
    const completeness = Math.round((checks.filter(Boolean).length / checks.length) * 100);

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      whatsapp: profile?.whatsappNumber ?? null,
      city: user.city,
      country: user.country,
      // Without object storage, avatars are inline data: URLs (~90 Ko each):
      // hand out a small cacheable URL instead of the image itself.
      avatarUrl: user.avatarUrl?.startsWith("data:") ? `/api/agency/candidates/${user.id}/avatar` : user.avatarUrl,
      title: profile?.title ?? null,
      skills,
      experienceYears: profile?.experienceYears ?? null,
      educationLevel: profile?.educationLevel ?? null,
      languages: profile?.languages ?? [],
      availableFrom: profile?.availableFrom ?? null,
      salaryExpectation: profile?.salaryExpectation ?? null,
      hasCv,
      hasVoiceCv: !!profile?.hasVoiceCv,
      completeness,
      registeredAt: iso(user.createdAt),
      status: activePlacement ? "placed" : inProcess ? "in_process" : "available",
      applicationsCount: apps.length,
      lastApplicationAt: iso(apps[0]?.createdAt),
      currentProcess: inProcess ? { jobTitle: jobById.get(inProcess.jobId)?.title ?? "Mission", status: inProcess.status ?? "shortlisted" } : null,
      placementsCount: myPlacements.length,
      currentPlacement: activePlacement ? { position: activePlacement.position, endDate: iso(activePlacement.endDate) } : null,
      averageRating: rated.length ? Math.round((rated.reduce((sum, placement) => sum + placement.performanceRating!, 0) / rated.length) * 10) / 10 : null,
      documentsCount: documents.filter((document) => document.candidateId === user.id).length,
      matchScore: targetJob
        ? calculateMatchScore(
          { skills, city: user.city, experienceYears: profile?.experienceYears },
          { requiredSkills: targetJob.requiredSkills, location: targetJob.location, experienceMin: targetJob.experienceMin },
        ).score
        : null,
    };
  });
}

function applyFilters(rows: CandidateBaseRow[], filters: Filters) {
  const search = filters.search ? normalize(filters.search) : "";
  const skill = filters.skill ? normalize(filters.skill) : "";
  const city = filters.city ? normalize(filters.city) : "";
  const filtered = rows.filter((row) =>
    (!search || [row.fullName, row.email, row.title ?? "", row.city ?? "", ...row.skills].some((value) => normalize(value).includes(search)))
    && (!filters.status || filters.status === "all" || row.status === filters.status)
    && (!skill || row.skills.some((value) => normalize(value) === skill))
    && (!city || normalize(row.city ?? "") === city)
    && (filters.minExperience === undefined || (row.experienceYears ?? 0) >= filters.minExperience)
    && (!filters.hasCv || row.hasCv === (filters.hasCv === "yes")));
  // With a target mission, best matches first; otherwise newest registrations first.
  return filtered.sort((a, b) => (filters.jobId
    ? (b.matchScore ?? 0) - (a.matchScore ?? 0)
    : new Date(b.registeredAt ?? 0).getTime() - new Date(a.registeredAt ?? 0).getTime()));
}

const STATUS_LABELS: Record<CandidateBaseStatus, string> = { available: "Disponible", in_process: "En processus", placed: "En mission" };

async function buildWorkbook(rows: CandidateBaseRow[], filters: Filters, agencyName: string, jobTitle: string | null) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "BaaraMatch";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Candidats", { views: [{ state: "frozen", ySplit: 1 }] });
  const columns: { header: string; key: string; width: number }[] = [
    { header: "Nom complet", key: "fullName", width: 26 },
    { header: "Titre / métier", key: "title", width: 28 },
    { header: "Statut agence", key: "status", width: 15 },
    ...(jobTitle ? [{ header: "Score mission (%)", key: "matchScore", width: 16 }] : []),
    { header: "Email", key: "email", width: 30 },
    { header: "Téléphone", key: "phone", width: 18 },
    { header: "WhatsApp", key: "whatsapp", width: 18 },
    { header: "Ville", key: "city", width: 16 },
    { header: "Pays", key: "country", width: 14 },
    { header: "Expérience (ans)", key: "experienceYears", width: 15 },
    { header: "Niveau d'études", key: "educationLevel", width: 18 },
    { header: "Compétences", key: "skills", width: 40 },
    { header: "Langues", key: "languages", width: 20 },
    { header: "Disponible à partir de", key: "availableFrom", width: 20 },
    { header: "Prétentions salariales", key: "salaryExpectation", width: 20 },
    { header: "CV", key: "hasCv", width: 8 },
    { header: "Profil complet (%)", key: "completeness", width: 16 },
    { header: "Candidatures (agence)", key: "applicationsCount", width: 18 },
    { header: "Processus en cours", key: "currentProcess", width: 26 },
    { header: "Placements (agence)", key: "placementsCount", width: 18 },
    { header: "Note moyenne /5", key: "averageRating", width: 15 },
    { header: "Pièces au dossier", key: "documentsCount", width: 15 },
    { header: "Inscrit le", key: "registeredAt", width: 13 },
  ];
  sheet.columns = columns;

  for (const row of rows) {
    sheet.addRow({
      ...row,
      status: STATUS_LABELS[row.status],
      skills: row.skills.join(", "),
      languages: row.languages.join(", "),
      hasCv: row.hasCv ? "Oui" : "Non",
      currentProcess: row.currentPlacement
        ? `En mission${row.currentPlacement.position ? ` : ${row.currentPlacement.position}` : ""}`
        : row.currentProcess ? row.currentProcess.jobTitle : "",
      registeredAt: row.registeredAt ? new Date(row.registeredAt) : null,
    });
  }

  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
  header.alignment = { vertical: "middle", wrapText: true };
  header.height = 30;
  sheet.getColumn("registeredAt").numFmt = "dd/mm/yyyy";
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };

  // Second sheet: what this file is — who exported it, when, with which
  // filters — so a spreadsheet passed around keeps its context.
  const info = workbook.addWorksheet("Export");
  info.columns = [{ key: "label", width: 26 }, { key: "value", width: 50 }];
  const filterLines: [string, string][] = [
    ["Recherche", filters.search || "—"],
    ["Statut", filters.status && filters.status !== "all" ? STATUS_LABELS[filters.status] : "Tous"],
    ["Compétence", filters.skill || "Toutes"],
    ["Ville", filters.city || "Toutes"],
    ["Expérience minimale", filters.minExperience !== undefined ? `${filters.minExperience} an(s)` : "—"],
    ["CV", filters.hasCv === "yes" ? "Avec CV" : filters.hasCv === "no" ? "Sans CV" : "Tous"],
    ["Classé pour la mission", jobTitle ?? "—"],
  ];
  [
    ["Base candidats — export", ""],
    ["Agence", agencyName],
    ["Date d'export", new Date().toLocaleString("fr-FR", { timeZone: "Africa/Bamako" })],
    ["Nombre de candidats", String(rows.length)],
    ["", ""],
    ["Filtres appliqués", ""],
    ...filterLines,
    ["", ""],
    ["Confidentialité", "Données personnelles de candidats : usage strictement interne au recrutement."],
  ].forEach(([label, value]) => info.addRow({ label, value }));
  info.getRow(1).font = { bold: true, size: 14 };
  info.getRow(6).font = { bold: true };
  info.getColumn("label").font = { bold: true };

  return workbook;
}

export function registerAgencyCandidateRoutes(app: Express, requireRole: RequireRole) {
  const agencyOnly = requireRole("agency");

  async function ownedJob(agencyId: string, jobId: string | undefined) {
    if (!jobId) return undefined;
    const [job] = await db.select().from(jobPostings).where(and(eq(jobPostings.id, jobId), eq(jobPostings.agencyId, agencyId)));
    return job;
  }

  app.get("/api/agency/candidate-base", agencyOnly, async (req: Request, res: Response) => {
    try {
      const filters = filtersSchema.parse(req.query);
      const agencyId = req.session.userId!;
      const job = await ownedJob(agencyId, filters.jobId);
      const rows = await buildCandidateBase(agencyId, job?.id);
      res.json({
        total: rows.length,
        rows: applyFilters(rows, { ...filters, jobId: job?.id }),
      });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Filtres invalides" });
      console.error("Error building candidate base:", error);
      res.status(500).json({ message: "Erreur lors du chargement de la base candidats" });
    }
  });

  app.get("/api/agency/candidate-base/export", agencyOnly, async (req: Request, res: Response) => {
    try {
      const filters = filtersSchema.parse(req.query);
      const agencyId = req.session.userId!;
      const [job, agencyProfile, agencyUser] = await Promise.all([
        ownedJob(agencyId, filters.jobId),
        storage.getAgencyProfile(agencyId),
        storage.getUser(agencyId),
      ]);
      const rows = applyFilters(await buildCandidateBase(agencyId, job?.id), { ...filters, jobId: job?.id });
      const agencyName = agencyProfile?.agencyName ?? agencyUser?.fullName ?? "Agence";
      const workbook = await buildWorkbook(rows, filters, agencyName, job?.title ?? null);

      // A bulk export of personal data is traceable: who, when, how many.
      await storage.createActivityLog({
        action: "candidate_base_exported",
        userId: agencyId,
        userLabel: agencyUser?.email ?? agencyName,
        ipAddress: req.ip ?? null,
        status: "success",
        details: `Export Excel de ${rows.length} candidat(s) par ${agencyName}`,
      });

      const fileName = `base-candidats-${new Date().toISOString().slice(0, 10)}.xlsx`;
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      res.setHeader("Cache-Control", "private, no-store");
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Filtres invalides" });
      console.error("Error exporting candidate base:", error);
      res.status(500).json({ message: "Erreur lors de l'export Excel" });
    }
  });

  app.get("/api/agency/candidates/:candidateId/avatar", agencyOnly, async (req: Request, res: Response) => {
    try {
      const candidate = await storage.getUser(String(req.params.candidateId));
      if (!candidate || candidate.userType !== "candidate" || !candidate.avatarUrl) return res.status(404).end();
      const mimeType = candidate.avatarUrl.match(/^data:([^;,]+)/)?.[1] ?? "image/jpeg";
      if (!mimeType.startsWith("image/")) return res.status(404).end();
      res.setHeader("Content-Type", mimeType);
      res.setHeader("Cache-Control", "private, max-age=3600");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.send(await readStoredFile(candidate.avatarUrl));
    } catch {
      res.status(404).end();
    }
  });

  // "Présélectionner sur une mission": the agency puts a candidate from its
  // base forward for one of ITS missions. Creates a real application
  // (status "shortlisted") so it shows up in the pipeline / Kanban and can
  // then receive interview slots through the existing flow.
  app.post("/api/agency/candidates/:candidateId/shortlist", agencyOnly, async (req: Request, res: Response) => {
    try {
      const agencyId = req.session.userId!;
      const { jobId, note } = z.object({ jobId: z.string().min(1), note: z.string().trim().max(2000).optional() }).parse(req.body);
      const job = await ownedJob(agencyId, jobId);
      if (!job) return res.status(404).json({ message: "Mission introuvable" });

      const candidateId = String(req.params.candidateId);
      const candidate = await storage.getUser(candidateId);
      if (!candidate || candidate.userType !== "candidate") return res.status(404).json({ message: "Candidat introuvable" });

      const existing = (await storage.getApplicationsByCandidate(candidateId)).find((application) => application.jobId === job.id);
      if (existing) {
        return res.status(409).json({ message: `${candidate.fullName} est déjà positionné(e) sur « ${job.title} ».`, applicationId: existing.id });
      }

      const profile = await storage.getCandidateProfile(candidateId);
      const { score } = calculateMatchScore(
        { skills: profile?.skills, city: candidate.city, experienceYears: profile?.experienceYears },
        { requiredSkills: job.requiredSkills, location: job.location, experienceMin: job.experienceMin },
      );
      const application = await storage.createApplication({
        candidateId,
        jobId: job.id,
        agencyId,
        status: "shortlisted",
        matchScore: score,
        reviewerNotes: note || null,
      });

      const agencyProfile = await storage.getAgencyProfile(agencyId);
      await storage.createNotification({
        userId: candidateId,
        type: "application_update",
        title: `Présélection pour « ${job.title} »`,
        message: `${agencyProfile?.agencyName ?? "Une agence"} vous a présélectionné(e) pour la mission « ${job.title} ».`,
        actionUrl: "/candidate-applications",
      });

      res.status(201).json(application);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Données invalides" });
      console.error("Error shortlisting candidate:", error);
      res.status(500).json({ message: "Erreur lors de la présélection" });
    }
  });
}
