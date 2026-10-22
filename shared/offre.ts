import type { JobPosting, SalaryPeriod } from "./schema";
import { secteurDeCategorie, type Secteur } from "./secteurs";

// Modèle d'une offre de la page Offres (/jobs), tel que GET /api/offres le
// renvoie. Aucune donnée absente n'est complétée.

export type Contrat = "CDI" | "CDD" | "Freelance" | "Intérim" | "Stage" | "Journalier" | "Prestation";

export type Offre = {
  id: string;
  titre: string;
  employeurId: string;
  employeurNom: string;
  employeurLogoUrl?: string;
  // Masquée : aucune source réelle des notes (décision du 20/10/2026).
  employeurNote?: number;
  // Vrai seulement après la vérification par l'équipe BaaraMatch (admin).
  employeurVerifie: boolean;
  // null : ancienne valeur sans équivalent (« full-time », « part-time »…).
  contrat: Contrat | null;
  secteur?: Secteur;
  experienceMin?: number;
  experienceMax?: number;
  // Compétences requises (correspondance de l'espace candidat).
  competences?: string[];
  salaireMin?: number;
  salaireMax?: number;
  devise?: string;
  periodeSalaire?: SalaryPeriod;
  ville?: string;
  // Pas de champ pays : la base n'a que `location` (texte libre).
  pays?: string;
  description: string;
  urgent: boolean;
  publieLe: string;
};

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

const ENTITES: Record<string, string> = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const BLOCS = /<\/?(p|li|h[1-6]|div|br|ul|ol|blockquote|tr)\b[^>]*>/gi;

// Texte de remplissage des offres de démonstration en base : pas d'aperçu.
const TEXTES_DE_REMPLISSAGE = new Set(["mission de démonstration"]);

/**
 * Aperçu texte d'une description HTML, sans navigateur (le serveur n'a pas
 * DOMPurify) : balises retirées, blocs séparés par une espace, entités
 * décodées. Le résultat est affiché comme du texte, jamais comme du HTML.
 */
export function apercuDescription(html: string | null | undefined, longueur = 320): string {
  const texte = (html ?? "")
    .replace(BLOCS, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (tout, e: string) => {
      if (e[0] === "#") {
        const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : tout;
      }
      return ENTITES[e.toLowerCase()] ?? tout;
    })
    .replace(/\s+/g, " ")
    .trim();
  if (TEXTES_DE_REMPLISSAGE.has(texte.toLowerCase())) return "";
  return texte.length > longueur ? `${texte.slice(0, longueur).trimEnd()}…` : texte;
}

export type LigneOffre = JobPosting & {
  organizationName: string | null;
  logoUrl: string | null;
  verifiedAt: Date | string | null;
};

const nombre = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/** Ligne de la base (offre + employeur) → modèle de la page. */
export function offreDepuisLigne(job: LigneOffre): Offre {
  return {
    id: job.id,
    titre: job.title,
    employeurId: job.agencyId ?? job.companyId,
    employeurNom: job.organizationName ?? "",
    employeurLogoUrl: job.logoUrl || undefined,
    employeurVerifie: !!job.verifiedAt,
    contrat: contratDe(job.jobType),
    secteur: secteurDeCategorie(job.category) ?? undefined,
    experienceMin: nombre(job.experienceMin),
    experienceMax: nombre(job.experienceMax),
    competences: job.requiredSkills?.filter((c) => c?.trim()).length ? job.requiredSkills.filter((c) => c?.trim()) : undefined,
    salaireMin: nombre(job.salaryMin),
    salaireMax: nombre(job.salaryMax),
    devise: job.salaryCurrency ?? undefined,
    periodeSalaire: job.salaryPeriod ?? undefined,
    ville: job.location?.trim() || undefined,
    description: apercuDescription(job.description),
    urgent: !!job.isUrgent,
    publieLe: new Date(job.createdAt ?? Date.now()).toISOString(),
  };
}
