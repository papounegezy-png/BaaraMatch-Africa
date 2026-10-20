import type { Contrat, Offre } from "./offre";
import { SECTEURS, secteurDeCategorie, type Secteur } from "./secteurs";
import { TRANCHES_EXPERIENCE, trancheExperience } from "./experience";
import { formatJobTitle } from "./format-job-title";

// Filtrage de la page Offres, partagé par GET /api/offres (serveur) et les
// tests. Comparaisons sans accents ni casse.
// Dans un groupe (secteurs, villes, expérience), une valeur cochée suffit ;
// les groupes se combinent entre eux et avec la recherche et le contrat.

export const CONTRATS_BARRE = ["CDI", "CDD", "Freelance"] as const;
export type ContratBarre = (typeof CONTRATS_BARRE)[number];

export const PERIODES_PUBLICATION = [
  { jours: null, libelle: "Toutes les dates" },
  { jours: 1, libelle: "Dernières 24 heures" },
  { jours: 7, libelle: "7 derniers jours" },
  { jours: 30, libelle: "30 derniers jours" },
] as const;

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
  secteurs?: Secteur[];
  // Clés normalisées (normaliserTexte) des villes cochées.
  villes?: string[];
  // Identifiants des tranches (« 2-5 »…).
  experiences?: string[];
  publieeDepuisJours?: number | null;
  maintenant?: Date;
};

const JOUR_MS = 24 * 60 * 60 * 1000;

export function correspond(offre: Offre, c: CriteresOffres): boolean {
  if (c.employeurId && offre.employeurId !== c.employeurId) return false;
  if (c.contrat && offre.contrat !== c.contrat) return false;
  if (c.recherche && !correspondTexte(c.recherche, [offre.titre, offre.employeurNom])) return false;
  if (c.lieu && !correspondTexte(c.lieu, [offre.ville, offre.pays])) return false;
  if (c.secteurs?.length && !(offre.secteur && c.secteurs.includes(offre.secteur))) return false;
  if (c.villes?.length && !c.villes.includes(normaliserTexte(offre.ville))) return false;
  if (c.experiences?.length) {
    const tranche = trancheExperience(offre.experienceMin, offre.experienceMax);
    if (!tranche || !c.experiences.includes(tranche.id)) return false;
  }
  if (c.publieeDepuisJours) {
    const limite = (c.maintenant ?? new Date()).getTime() - c.publieeDepuisJours * JOUR_MS;
    if (new Date(offre.publieLe).getTime() < limite) return false;
  }
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

export type OptionFiltre = { valeur: string; libelle: string; nombre: number };

/**
 * Compteurs du panneau de filtres. Chaque groupe est compté avec tous les
 * autres critères, mais sans le sien : cocher « Bamako » ne fait pas tomber
 * les autres villes à 0.
 */
export function facettes(offres: Offre[], c: CriteresOffres) {
  const sansSecteurs = filtrerOffres(offres, { ...c, secteurs: [] });
  const sansVilles = filtrerOffres(offres, { ...c, villes: [] });
  const sansExperience = filtrerOffres(offres, { ...c, experiences: [] });

  const secteurs: OptionFiltre[] = SECTEURS.map((s) => ({ valeur: s, libelle: s, nombre: sansSecteurs.filter((o) => o.secteur === s).length }));

  // Villes issues des données ; même clé normalisée = même ville. Libellé :
  // la graphie la plus fréquente, remise en forme (« BAMAKO » → « Bamako »).
  const parVille = new Map<string, { graphies: Map<string, number>; nombre: number }>();
  for (const o of offres) {
    const cle = normaliserTexte(o.ville);
    if (!cle) continue;
    const v = parVille.get(cle) ?? { graphies: new Map(), nombre: 0 };
    v.graphies.set(o.ville!, (v.graphies.get(o.ville!) ?? 0) + 1);
    parVille.set(cle, v);
  }
  for (const o of sansVilles) {
    const v = parVille.get(normaliserTexte(o.ville));
    if (v) v.nombre++;
  }
  const villes: OptionFiltre[] = Array.from(parVille.entries())
    .map(([cle, v]) => ({
      valeur: cle,
      libelle: formatJobTitle(Array.from(v.graphies.entries()).sort((a, b) => b[1] - a[1])[0][0]),
      nombre: v.nombre,
    }))
    .sort((a, b) => b.nombre - a.nombre || a.libelle.localeCompare(b.libelle, "fr"));

  const experiences: OptionFiltre[] = TRANCHES_EXPERIENCE.map((t) => ({
    valeur: t.id,
    libelle: t.libelle,
    nombre: sansExperience.filter((o) => trancheExperience(o.experienceMin, o.experienceMax)?.id === t.id).length,
  }));

  return { secteurs, villes, experiences };
}

/** Contrat lu dans l'adresse (?contrat= ou l'ancien ?type= de l'accueil). */
export function contratDepuisParametre(valeur: string | null): ContratBarre | null {
  const v = normaliserTexte(valeur);
  return CONTRATS_BARRE.find((c) => normaliserTexte(c) === v) ?? null;
}

/** Secteurs lus dans l'adresse : 32 libellés, ou anciennes catégories (?category=). */
export function secteursDepuisParametres(valeurs: string[]): Secteur[] {
  return Array.from(new Set(valeurs.map(secteurDeCategorie).filter((s): s is Secteur => !!s)));
}
