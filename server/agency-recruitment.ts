// Agency "Offres & missions" › Shortlist and Affectations.
//
// Shortlist: every candidate in selection (shortlisted → offer) across all of
// the agency's missions, with the facts needed to decide (score, interview
// slot, client). Affectations: candidates the agency has retained ("hired")
// turned into a real placement at the mission's client — the step that was
// missing between the pipeline and "Placements & contrats".
import type { Express, Request, RequestHandler, Response } from "express";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "./db";
import { chargerTauxApplicable } from "./agency-commissions";
import { storage } from "./storage";
import {
  agencyPlacements,
  applications,
  candidateProfiles,
  interviewSlots,
  jobPostings,
  users,
  type UserType,
} from "@shared/schema";
import { loadAgencyClientsById, resolveAgencyClient } from "./agency-crm";

type RequireRole = (...roles: UserType[]) => RequestHandler;

export const SHORTLIST_STATUSES = ["shortlisted", "interview_proposed", "interview", "offered"] as const;

// Offer contract types (offer-form.tsx) → the label a placement carries.
const CONTRACT_LABELS: Record<string, string> = {
  cdi: "CDI", cdd: "CDD", interim: "Intérim", stage: "Stage", journalier: "Journalier", prestation: "Prestation",
};
// Liste partagée avec le client et les réglages de commission.
import { placementContractTypes } from "@shared/commissions";
export { placementContractTypes };
const contractLabel = (jobType: string | null | undefined) =>
  (jobType && (CONTRACT_LABELS[jobType.toLowerCase()] ?? placementContractTypes.find((type) => type.toLowerCase() === jobType.toLowerCase()))) || "CDD";

const iso = (value: Date | null | undefined) => (value ? new Date(value).toISOString() : null);

/** The agency's jobs, their applications in the given statuses, and the people behind them. */
async function loadAgencyApplications(agencyId: string, statuses: readonly string[]) {
  const jobs = await db.select().from(jobPostings).where(eq(jobPostings.agencyId, agencyId));
  if (jobs.length === 0) return { jobs, rows: [] as Awaited<ReturnType<typeof queryRows>> };
  const rows = await queryRows(jobs.map((job) => job.id), statuses);
  return { jobs, rows };
}

function queryRows(jobIds: string[], statuses: readonly string[]) {
  return db.select({
    application: applications,
    candidate: { id: users.id, fullName: users.fullName, email: users.email, phone: users.phone, city: users.city, avatarUrl: users.avatarUrl },
    profile: { title: candidateProfiles.title, skills: candidateProfiles.skills, experienceYears: candidateProfiles.experienceYears },
  })
    .from(applications)
    .innerJoin(users, eq(users.id, applications.candidateId))
    .leftJoin(candidateProfiles, eq(candidateProfiles.userId, users.id))
    .where(and(inArray(applications.jobId, jobIds), inArray(applications.status, [...statuses] as any)));
}

// Same trick as the candidate base: never ship data: URL avatars in a list.
const avatarFor = (candidate: { id: string; avatarUrl: string | null }) =>
  candidate.avatarUrl?.startsWith("data:") ? `/api/agency/candidates/${candidate.id}/avatar` : candidate.avatarUrl;

const assignSchema = z.object({
  contractType: z.enum(placementContractTypes),
  position: z.string().trim().min(1).max(200),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable().optional(),
  salary: z.number().int().positive(),
  commissionRate: z.number().min(0).max(100).nullable().optional(),
  // Only when the mission has no client fiche yet (older agency jobs).
  agencyClientId: z.string().optional(),
}).refine((data) => !data.endDate || data.endDate > data.startDate, {
  message: "La date de fin doit être après la date de début",
  path: ["endDate"],
});

export function registerAgencyRecruitmentRoutes(app: Express, requireRole: RequireRole) {
  const agencyOnly = requireRole("agency");

  app.get("/api/agency/shortlist", agencyOnly, async (req: Request, res: Response) => {
    try {
      const agencyId = req.session.userId!;
      const { jobs, rows } = await loadAgencyApplications(agencyId, SHORTLIST_STATUSES);
      const clientsById = await loadAgencyClientsById(agencyId);
      const jobById = new Map(jobs.map((job) => [job.id, job]));

      const applicationIds = rows.map((row) => row.application.id);
      const slots = applicationIds.length
        ? await db.select().from(interviewSlots).where(inArray(interviewSlots.applicationId, applicationIds))
        : [];

      res.json(rows.map(({ application, candidate, profile }) => {
        const job = jobById.get(application.jobId)!;
        const mySlots = slots.filter((slot) => slot.applicationId === application.id);
        const chosen = mySlots.find((slot) => slot.isSelected);
        return {
          applicationId: application.id,
          status: application.status,
          matchScore: application.matchScore ?? null,
          reviewerNotes: application.reviewerNotes,
          statusChangedAt: iso(application.statusChangedAt),
          createdAt: iso(application.createdAt),
          interviewAt: iso(chosen?.startTime ?? application.interviewDate),
          proposedSlots: chosen ? [] : mySlots.map((slot) => iso(slot.startTime)).filter(Boolean),
          candidate: { ...candidate, avatarUrl: avatarFor(candidate), title: profile?.title ?? null, skills: profile?.skills ?? [], experienceYears: profile?.experienceYears ?? null },
          job: {
            id: job.id,
            title: job.title,
            location: job.location,
            positions: job.positions,
            isActive: !!job.isActive,
            clientName: (job.agencyClientId && clientsById.get(job.agencyClientId)?.name) || null,
          },
        };
      }));
    } catch (error) {
      console.error("Error loading shortlist:", error);
      res.status(500).json({ message: "Erreur lors du chargement de la shortlist" });
    }
  });

  app.get("/api/agency/assignments", agencyOnly, async (req: Request, res: Response) => {
    try {
      const agencyId = req.session.userId!;
      const { jobs, rows } = await loadAgencyApplications(agencyId, ["hired"]);
      const clientsById = await loadAgencyClientsById(agencyId);
      const placements = await db.select().from(agencyPlacements).where(eq(agencyPlacements.agencyId, agencyId));
      const placementByApplication = new Map(placements.filter((placement) => placement.applicationId).map((placement) => [placement.applicationId!, placement]));

      // Filled positions per mission = placements created for that job.
      const filledByJob = new Map<string, number>();
      for (const placement of placements) {
        if (placement.jobId && placement.status !== "terminated") filledByJob.set(placement.jobId, (filledByJob.get(placement.jobId) ?? 0) + 1);
      }

      const jobById = new Map(jobs.map((job) => [job.id, job]));
      res.json({
        rows: rows.map(({ application, candidate, profile }) => {
          const job = jobById.get(application.jobId)!;
          const placement = placementByApplication.get(application.id);
          const fiche = job.agencyClientId ? clientsById.get(job.agencyClientId) : undefined;
          return {
            applicationId: application.id,
            hiredAt: iso(application.statusChangedAt),
            candidate: { ...candidate, avatarUrl: avatarFor(candidate), title: profile?.title ?? null },
            job: {
              id: job.id,
              title: job.title,
              location: job.location,
              positions: job.positions,
              filled: filledByJob.get(job.id) ?? 0,
              clientId: fiche?.id ?? null,
              clientName: fiche?.name ?? null,
            },
            // Pre-filled contract, straight from the mission.
            defaults: {
              position: job.title,
              contractType: contractLabel(job.jobType),
              startDate: iso(job.startDate),
              salary: application.offeredSalary ?? job.salaryMin ?? null,
            },
            placement: placement ? {
              id: placement.id,
              contractType: placement.contractType,
              startDate: iso(placement.startDate),
              endDate: iso(placement.endDate),
              salary: placement.salary,
              status: placement.status,
            } : null,
          };
        }),
        missions: jobs
          .filter((job) => job.isActive || filledByJob.has(job.id))
          .map((job) => ({
            id: job.id,
            title: job.title,
            positions: job.positions,
            filled: filledByJob.get(job.id) ?? 0,
            clientName: (job.agencyClientId && clientsById.get(job.agencyClientId)?.name) || null,
          })),
      });
    } catch (error) {
      console.error("Error loading assignments:", error);
      res.status(500).json({ message: "Erreur lors du chargement des affectations" });
    }
  });

  // Turns a retained candidate into a placement at the mission's client.
  app.post("/api/agency/applications/:id/assign", agencyOnly, async (req: Request, res: Response) => {
    try {
      const agencyId = req.session.userId!;
      const data = assignSchema.parse(req.body);
      const application = await storage.getApplication(String(req.params.id));
      const job = application ? await storage.getJobPosting(application.jobId) : undefined;
      if (!application || !job || job.agencyId !== agencyId) {
        return res.status(404).json({ message: "Candidature introuvable" });
      }
      if (application.status !== "hired") {
        return res.status(409).json({ message: "Seul un candidat retenu peut être affecté. Passez-le d'abord à « Retenu »." });
      }
      const [existing] = await db.select({ id: agencyPlacements.id }).from(agencyPlacements)
        .where(and(eq(agencyPlacements.agencyId, agencyId), eq(agencyPlacements.applicationId, application.id)));
      if (existing) {
        return res.status(409).json({ message: "Ce candidat est déjà affecté (contrat existant).", placementId: existing.id });
      }

      const client = await resolveAgencyClient(agencyId, { agencyClientId: job.agencyClientId ?? data.agencyClientId });
      if (!client) {
        return res.status(400).json({ message: "Cette mission n'est rattachée à aucun client : choisissez l'entreprise cliente." });
      }

      // Taux non fourni (champ absent, pas vidé) : taux réglé pour ce client.
      const commissionRate = data.commissionRate !== undefined
        ? data.commissionRate
        : (await chargerTauxApplicable(agencyId, client.id, data.contractType))?.taux ?? null;

      const placement = await storage.createAgencyPlacement({
        agencyId,
        candidateId: application.candidateId,
        companyId: client.companyUserId ?? null,
        agencyClientId: client.id,
        jobId: job.id,
        applicationId: application.id,
        position: data.position,
        contractType: data.contractType,
        salary: data.salary,
        salaryCurrency: job.salaryCurrency ?? "XOF",
        startDate: data.startDate,
        endDate: data.endDate ?? null,
        commissionRate: commissionRate ?? null,
        commissionAmount: commissionRate ? Math.round((data.salary * commissionRate) / 100) : null,
        status: "active",
      });

      await storage.createNotification({
        userId: application.candidateId,
        type: "application_update",
        title: `Affectation confirmée — ${data.position}`,
        message: `Votre mission chez ${client.name} débute le ${data.startDate.toLocaleDateString("fr-FR")}.`,
        actionUrl: "/candidate-applications",
      });

      res.status(201).json(placement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0]?.message ?? "Données invalides" });
      }
      console.error("Error assigning candidate:", error);
      res.status(500).json({ message: "Erreur lors de l'affectation" });
    }
  });
}
