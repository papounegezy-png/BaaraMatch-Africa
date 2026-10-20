import type { Offre } from "./offre";
import { TRANCHES_EXPERIENCE } from "./experience";
import {
  compterParContrat, contratDepuisParametre, facettes, filtrerOffres, normaliserTexte, secteursDepuisParametres,
  type ContratBarre, type CriteresOffres, type OptionFiltre,
} from "./filtre-offres";

// GET /api/offres : lecture des paramètres d'adresse, puis recherche, tri et
// pagination sur les offres actives. Mêmes noms de paramètres que l'adresse
// de la page (/jobs?contrat=CDI&secteur=…&ville=Bamako&exp=2-5&page=2).

export const TAILLE_PAR_DEFAUT = 20;
export const TAILLE_MAX = 50;
export const TRIS = ["recent"] as const;
export type Tri = (typeof TRIS)[number];

export type ParametresOffres = CriteresOffres & { tri: Tri; page: number; taille: number };

type Requete = Record<string, unknown>;

/** Valeurs d'un paramètre répété : ?ville=a&ville=b, ?ville[]=a ou ?ville=a,b. */
function liste(q: Requete, nom: string): string[] {
  const brut = [q[nom], q[`${nom}[]`]].flat().filter((v): v is string => typeof v === "string");
  return brut.flatMap((v) => v.split(",")).map((v) => v.trim()).filter(Boolean);
}

function texte(q: Requete, ...noms: string[]): string {
  for (const nom of noms) {
    const v = q[nom];
    const premier = Array.isArray(v) ? v[0] : v;
    if (typeof premier === "string" && premier.trim()) return premier.trim().slice(0, 200);
  }
  return "";
}

function entier(valeur: string, min: number, max: number, defaut: number): number {
  const n = Math.floor(Number(valeur));
  return Number.isFinite(n) && n >= min ? Math.min(n, max) : defaut;
}

/**
 * Paramètres de recherche lus dans la requête. Une valeur inconnue est
 * ignorée plutôt que refusée (lien ancien ou modifié à la main) : contrat,
 * secteur ou tranche d'expérience hors liste, page invalide, tri inconnu.
 */
export function lireParametresOffres(q: Requete): ParametresOffres {
  const tri = texte(q, "tri");
  const jours = entier(texte(q, "publiee_depuis_jours"), 1, 365, 0);
  const tranches = new Set(TRANCHES_EXPERIENCE.map((t) => t.id));
  return {
    recherche: texte(q, "q"),
    lieu: texte(q, "lieu", "location"),
    contrat: contratDepuisParametre(texte(q, "contrat", "type") || null),
    employeurId: texte(q, "agencyId", "companyId", "employeur") || null,
    secteurs: secteursDepuisParametres([...liste(q, "secteur"), ...liste(q, "category")]),
    villes: Array.from(new Set(liste(q, "ville").map(normaliserTexte).filter(Boolean))),
    experiences: Array.from(new Set(liste(q, "exp").filter((x) => tranches.has(x)))),
    publieeDepuisJours: jours || null,
    tri: (TRIS as readonly string[]).includes(tri) ? (tri as Tri) : "recent",
    page: entier(texte(q, "page"), 1, 10_000, 1),
    taille: entier(texte(q, "taille"), 1, TAILLE_MAX, TAILLE_PAR_DEFAUT),
  };
}

export type FacettesOffres = {
  contrats: Record<"toutes" | ContratBarre, number>;
  secteurs: OptionFiltre[];
  villes: OptionFiltre[];
  experiences: OptionFiltre[];
};

export type ReponseOffres = {
  offres: Offre[];
  total: number;
  page: number;
  taille: number;
  nbPages: number;
  tri: Tri;
  facettes: FacettesOffres;
};

/**
 * Recherche complète. Chaque facette est comptée avec les autres filtres
 * actifs mais sans le sien. Une page au-delà de la dernière renvoie la
 * dernière (la réponse dit laquelle).
 */
export function rechercherOffres(toutes: Offre[], p: ParametresOffres, maintenant = new Date()): ReponseOffres {
  const criteres: CriteresOffres = { ...p, maintenant };
  const resultats = filtrerOffres(toutes, criteres).sort(
    (a, b) => b.publieLe.localeCompare(a.publieLe) || a.id.localeCompare(b.id),
  );
  const nbPages = Math.max(1, Math.ceil(resultats.length / p.taille));
  const page = Math.min(p.page, nbPages);
  return {
    offres: resultats.slice((page - 1) * p.taille, page * p.taille),
    total: resultats.length,
    page,
    taille: p.taille,
    nbPages,
    tri: p.tri,
    facettes: { contrats: compterParContrat(toutes, criteres), ...facettes(toutes, criteres) },
  };
}
