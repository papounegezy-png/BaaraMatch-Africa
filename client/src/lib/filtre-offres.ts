import type { Contrat, Offre } from "@/types/offre";

// Filtrage de la page Offres, côté navigateur (GET /api/jobs renvoie toutes
// les offres actives). Comparaisons sans accents ni casse.

export const CONTRATS_BARRE = ["CDI", "CDD", "Freelance"] as const;
export type ContratBarre = (typeof CONTRATS_BARRE)[number];

const DIACRITIQUES = new RegExp("[\\u0300-\\u036f]", "g");

/** « Bamako », « BAMAKO » et « bamako » deviennent la même clé. */
export function normaliserTexte(texte: string | null | undefined): string {
  return (texte ?? "").normalize("NFD").replace(DIACRITIQUES, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Chaque mot de la recherche doit apparaître dans au moins un des textes. */
export function correspondTexte(recherche: string, textes: (string | null | undefined)[]): boolean {
  const mots = normaliserTexte(recherche).split(" ").filter(Boolean);
  if (!mots.length) return true;
  const cible = textes.map(normaliserTexte).join(" ");
  return mots.every((mot) => cible.includes(mot));
}

export type CriteresOffres = {
  recherche?: string;
  lieu?: string;
  contrat?: ContratBarre | null;
  employeurId?: string | null;
};

export function correspond(offre: Offre, c: CriteresOffres): boolean {
  if (c.employeurId && offre.employeurId !== c.employeurId) return false;
  if (c.contrat && offre.contrat !== c.contrat) return false;
  if (c.recherche && !correspondTexte(c.recherche, [offre.titre, offre.employeurNom])) return false;
  if (c.lieu && !correspondTexte(c.lieu, [offre.ville, offre.pays])) return false;
  return true;
}

export function filtrerOffres(offres: Offre[], c: CriteresOffres): Offre[] {
  return offres.filter((o) => correspond(o, c));
}

/** Nombre d'offres par contrat de la barre, tous les autres critères appliqués. */
export function compterParContrat(offres: Offre[], c: CriteresOffres): Record<"toutes" | ContratBarre, number> {
  const base = filtrerOffres(offres, { ...c, contrat: null });
  const compte = (contrat: Contrat) => base.filter((o) => o.contrat === contrat).length;
  return { toutes: base.length, CDI: compte("CDI"), CDD: compte("CDD"), Freelance: compte("Freelance") };
}

/** Contrat lu dans l'adresse (?contrat= ou l'ancien ?type= de l'accueil). */
export function contratDepuisParametre(valeur: string | null): ContratBarre | null {
  const v = normaliserTexte(valeur);
  return CONTRATS_BARRE.find((c) => normaliserTexte(c) === v) ?? null;
}
