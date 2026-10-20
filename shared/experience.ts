// Tranches d'expérience du filtre « Expérience » de la page Offres.
// `id` sert dans l'adresse (?exp=2-5). Bornes en années : [min, max[.

export type TrancheExperience = { id: string; libelle: string; min: number; max: number };

export const TRANCHES_EXPERIENCE: TrancheExperience[] = [
  { id: "0-2", libelle: "Moins de 2 ans", min: 0, max: 2 },
  { id: "2-5", libelle: "2 à 5 ans", min: 2, max: 5 },
  { id: "5-10", libelle: "5 à 10 ans", min: 5, max: 10 },
  { id: "10+", libelle: "Plus de 10 ans", min: 10, max: Infinity },
];

/**
 * Tranche d'une offre, d'après l'expérience minimale demandée (ou la
 * maximale si seule celle-ci est renseignée). null si l'offre n'indique
 * aucune expérience : elle ne correspond alors à aucune tranche du filtre.
 */
export function trancheExperience(experienceMin?: number | null, experienceMax?: number | null): TrancheExperience | null {
  const annees = experienceMin ?? experienceMax;
  if (annees == null || annees < 0) return null;
  return TRANCHES_EXPERIENCE.find((t) => annees >= t.min && annees < t.max) ?? null;
}
