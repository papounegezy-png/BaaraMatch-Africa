import type { JobPosting } from "@shared/schema";
import { secteurDeCategorie, type Secteur } from "@shared/secteurs";
import { stripJobDescriptionHtml } from "@/lib/sanitize-html";

// Modèle d'une offre pour la page Offres (/jobs), adapté de GET /api/jobs.

export type Contrat = "CDI" | "CDD" | "Freelance" | "Intérim" | "Stage" | "Journalier" | "Prestation";

export type Offre = {
  id: string;
  titre: string;
  employeurId: string;
  employeurNom: string;
  // Pas encore exposé par /api/jobs (prompt 6).
  employeurLogoUrl?: string;
  // Masquée : aucune source réelle des notes (décision du 20/10/2026).
  employeurNote?: number;
  // Toujours faux tant que la vérification des employeurs n'existe pas.
  employeurVerifie: boolean;
  // null : ancienne valeur sans équivalent (« full-time », « part-time »…).
  contrat: Contrat | null;
  secteur?: Secteur;
  experienceMin?: number;
  experienceMax?: number;
  salaireMin?: number;
  salaireMax?: number;
  devise?: string;
  // Pas encore enregistrée (prompt 6).
  periodeSalaire?: "mois" | "jour" | "mission";
  ville?: string;
  // Pas de champ pays : la base n'a que `location` (texte libre).
  pays?: string;
  description: string;
  urgent: boolean;
  publieLe: string;
};

export type OffreApi = JobPosting & { organizationName: string | null };

// Codes écrits par le formulaire d'offre (et anciennes valeurs) → contrat.
const CONTRATS: Record<string, Contrat> = {
  cdi: "CDI",
  cdd: "CDD",
  freelance: "Freelance",
  interim: "Intérim",
  temporary: "Intérim",
  stage: "Stage",
  internship: "Stage",
  journalier: "Journalier",
  prestation: "Prestation",
};

export function contratDe(jobType: string | null | undefined): Contrat | null {
  return CONTRATS[(jobType ?? "").trim().toLowerCase()] ?? null;
}

const nombre = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/** Offre de l'API → modèle de la page. Ne complète aucune donnée absente. */
export function versOffre(job: OffreApi): Offre {
  return {
    id: job.id,
    titre: job.title,
    employeurId: job.agencyId ?? job.companyId,
    employeurNom: job.organizationName ?? "",
    employeurVerifie: false,
    contrat: contratDe(job.jobType),
    secteur: secteurDeCategorie(job.category) ?? undefined,
    experienceMin: nombre(job.experienceMin),
    experienceMax: nombre(job.experienceMax),
    salaireMin: nombre(job.salaryMin),
    salaireMax: nombre(job.salaryMax),
    devise: job.salaryCurrency ?? undefined,
    ville: job.location?.trim() || undefined,
    description: stripJobDescriptionHtml(job.description ?? ""),
    urgent: !!job.isUrgent,
    publieLe: new Date(job.createdAt ?? Date.now()).toISOString(),
  };
}
