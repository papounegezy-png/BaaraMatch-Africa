import type { JobPosting } from "@shared/schema";
import { secteurDeCategorie, type Secteur } from "@shared/secteurs";
import { jobDescriptionPreview } from "@/lib/sanitize-html";

// Modèle partagé avec GET /api/offres (shared/offre.ts). versOffre reste
// pour les réponses de GET /api/jobs (aperçu via DOMPurify).
import { contratDe, type Offre } from "@shared/offre";
export { contratDe, type Contrat, type Offre } from "@shared/offre";

export type OffreApi = JobPosting & { organizationName: string | null };

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
    // Aperçu texte ; vide pour le texte de remplissage « Mission de démonstration ».
    description: jobDescriptionPreview(job.description) ?? "",
    urgent: !!job.isUrgent,
    publieLe: new Date(job.createdAt ?? Date.now()).toISOString(),
  };
}
