// Offres recommandées de l'espace candidat. Le score ne porte que sur les
// critères réellement comparables (les deux côtés renseignés), et il faut
// au moins MIN_CRITERES critères : un seul (la ville) donnerait « 100 % »
// à toutes les offres de la ville. Contrairement à shared/matching,
// une donnée absente ne vaut pas « 50 % ».

export type ProfilCandidat = {
  ville?: string | null;
  metier?: string | null;
  competences?: string[] | null;
  experienceAnnees?: number | null;
};

export type OffreAComparer = {
  id: string;
  titre: string;
  ville?: string | null;
  competencesRequises?: string[] | null;
  experienceMin?: number | null;
};

export type Critere = "ville" | "metier" | "competences" | "experience";

export type Correspondance = { score: number; correspondent: Critere[] };

export const MIN_CRITERES = 2;

const POIDS: Record<Critere, number> = { competences: 0.35, metier: 0.25, ville: 0.2, experience: 0.2 };
const ORDRE: Critere[] = ["ville", "metier", "competences", "experience"];
const NOMS: Record<Critere, string> = { ville: "ville", metier: "métier", competences: "compétences", experience: "expérience" };

// Mots vides et mots trop généraux pour dire qu'un métier correspond.
const MOTS_IGNORES = new Set(["des", "les", "pour", "avec", "dans", "chef", "senior", "junior", "responsable", "charge", "chargee", "assistant", "assistante", "adjoint", "adjointe", "general", "generale", "principal", "principale"]);

function normaliser(texte: string): string {
  return texte.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function mots(texte: string): string[] {
  return normaliser(texte).split(/[^a-z0-9]+/).filter((m) => m.length >= 4 && !MOTS_IGNORES.has(m));
}

/** « Goulamina / Bamako » contient « Bamako ». */
function memeVille(villeCandidat: string, lieuOffre: string): boolean {
  const ville = normaliser(villeCandidat).trim();
  return !!ville && normaliser(lieuOffre).split(/[^a-z0-9-]+/).includes(ville);
}

function memeMetier(metier: string, titre: string): boolean {
  const deLOffre = new Set(mots(titre));
  return mots(metier).some((m) => deLOffre.has(m));
}

export function correspondance(profil: ProfilCandidat, offre: OffreAComparer): Correspondance | null {
  const resultats: Partial<Record<Critere, number>> = {};
  if (profil.ville?.trim() && offre.ville?.trim()) resultats.ville = memeVille(profil.ville, offre.ville) ? 1 : 0;
  if (profil.metier?.trim() && mots(profil.metier).length > 0) resultats.metier = memeMetier(profil.metier, offre.titre) ? 1 : 0;
  const requises = (offre.competencesRequises ?? []).filter((c) => c.trim());
  const siennes = new Set((profil.competences ?? []).map((c) => normaliser(c.trim())).filter(Boolean));
  if (requises.length > 0 && siennes.size > 0) resultats.competences = requises.filter((c) => siennes.has(normaliser(c.trim()))).length / requises.length;
  if (profil.experienceAnnees != null && offre.experienceMin != null && offre.experienceMin > 0) {
    resultats.experience = Math.min(1, profil.experienceAnnees / offre.experienceMin);
  }
  const criteres = ORDRE.filter((c) => resultats[c] !== undefined);
  if (criteres.length < MIN_CRITERES) return null;
  const total = criteres.reduce((s, c) => s + POIDS[c], 0);
  const score = Math.round((criteres.reduce((s, c) => s + POIDS[c] * resultats[c]!, 0) / total) * 100);
  return { score, correspondent: criteres.filter((c) => resultats[c] === 1) };
}

/** « Ville et métier correspondent », « La ville correspond » ; rien si aucun. */
export function raisonCorrespondance(criteres: Critere[]): string | null {
  if (criteres.length === 0) return null;
  const noms = criteres.map((c) => NOMS[c]);
  const liste = noms.length === 1 ? noms[0]! : `${noms.slice(0, -1).join(", ")} et ${noms[noms.length - 1]}`;
  const pluriel = noms.length > 1 || criteres[0] === "competences";
  const phrase = `${liste} ${pluriel ? "correspondent" : "correspond"}`;
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

/** Jusqu'à `max` offres avec un score, la meilleure d'abord, hors candidatures déjà envoyées. */
export function recommander<T extends OffreAComparer>(
  profil: ProfilCandidat,
  offres: T[],
  dejaPostulees: Set<string>,
  max = 4,
): (T & { correspondance: Correspondance })[] {
  return offres
    .filter((o) => !dejaPostulees.has(o.id))
    .map((o) => ({ ...o, correspondance: correspondance(profil, o) }))
    .filter((o): o is T & { correspondance: Correspondance } => !!o.correspondance && o.correspondance.score > 0)
    .sort((a, b) => b.correspondance.score - a.correspondance.score)
    .slice(0, max);
}
