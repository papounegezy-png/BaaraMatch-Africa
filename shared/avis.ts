import { z } from "zod";

// Avis de candidats sur un employeur (profil employeur, onglet Avis).
// Règles par défaut, à ajuster ici :
// - seul un candidat ayant postulé à au moins une offre de l'employeur peut
//   donner un avis ; un seul par employeur, qu'il peut modifier ou retirer ;
// - note entière de 1 à 5, commentaire facultatif ;
// - l'avis est publié sans le nom de son auteur (« Avis d'un candidat ») ;
// - la note moyenne n'est affichée qu'à partir de SEUIL_MOYENNE avis, pour
//   qu'un avis isolé ne fasse pas la réputation d'un employeur ;
// - l'équipe BaaraMatch peut masquer un avis (modération).

export const SEUIL_MOYENNE = 3;
export const LONGUEUR_MAX_COMMENTAIRE = 1000;

export const avisSchema = z.object({
  note: z.number().int().min(1).max(5),
  commentaire: z.string().trim().max(LONGUEUR_MAX_COMMENTAIRE).nullable().optional()
    .transform((v) => (v ? v : null)),
}).strict();

export type AvisPublic = {
  id: string;
  note: number;
  commentaire: string | null;
  publieLe: string;
  // Vrai pour l'avis du candidat connecté (pour le modifier).
  estLeMien: boolean;
};

export type ResumeAvis = {
  nombre: number;
  // null sous SEUIL_MOYENNE avis.
  moyenne: number | null;
};

/** Moyenne arrondie au dixième, seulement à partir du seuil. */
export function resumerAvis(notes: number[]): ResumeAvis {
  const nombre = notes.length;
  if (nombre < SEUIL_MOYENNE) return { nombre, moyenne: null };
  return { nombre, moyenne: Math.round((notes.reduce((s, n) => s + n, 0) / nombre) * 10) / 10 };
}
