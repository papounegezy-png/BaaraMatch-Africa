import type { Employeur } from "./employeur";
import { secteursDepuisParametres } from "./filtre-offres";
import { compterParType, facettesEmployeurs, filtrerEmployeurs, normaliser, type CriteresEmployeurs, type TypeChoisi } from "./filtre-employeurs";

// GET /api/employeurs : lecture des paramètres d'adresse, puis recherche,
// tri et pagination. Mêmes noms de paramètres que l'adresse de la page
// (/agencies?type=agences&secteur=…&pays=mali&offres=1&tri=nom&q=…).

export const TAILLE_PAR_DEFAUT = 12;
export const TAILLE_MAX = 120;

// Pas de « Mieux notés » : les notes n'ont pas de source réelle.
export const TRIS = [
  { valeur: "offres", libelle: "Plus d'offres" },
  { valeur: "nom", libelle: "Nom (A–Z)" },
] as const;
export type Tri = (typeof TRIS)[number]["valeur"];

type Triable = { nom: string; offresPubliees: number };

/** Plus d'offres : départage par nom. Nom : ordre alphabétique français. */
export function trierEmployeurs<E extends Triable>(liste: E[], tri: Tri): E[] {
  const parNom = (a: E, b: E) => a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" });
  return [...liste].sort(tri === "nom" ? parNom : (a, b) => b.offresPubliees - a.offresPubliees || parNom(a, b));
}

const TYPES: Record<string, TypeChoisi> = { entreprises: "entreprise", entreprise: "entreprise", agences: "agence", agence: "agence" };

type Requete = Record<string, unknown>;

function liste(q: Requete, nom: string): string[] {
  return [q[nom], q[`${nom}[]`]].flat().filter((v): v is string => typeof v === "string").flatMap((v) => v.split(",")).map((v) => v.trim()).filter(Boolean);
}
function texte(q: Requete, nom: string): string {
  const v = q[nom];
  const premier = Array.isArray(v) ? v[0] : v;
  return typeof premier === "string" ? premier.trim().slice(0, 200) : "";
}
function entier(valeur: string, min: number, max: number, defaut: number): number {
  const n = Math.floor(Number(valeur));
  return Number.isFinite(n) && n >= min ? Math.min(n, max) : defaut;
}

export type ParametresEmployeurs = CriteresEmployeurs & { tri: Tri; page: number; taille: number };

/** Paramètres lus dans la requête ; une valeur inconnue est ignorée. */
export function lireParametresEmployeurs(q: Requete): ParametresEmployeurs {
  const tri = texte(q, "tri");
  return {
    recherche: texte(q, "q"),
    lieu: texte(q, "lieu"),
    type: TYPES[normaliser(texte(q, "type"))] ?? null,
    secteurs: secteursDepuisParametres(liste(q, "secteur")),
    pays: Array.from(new Set(liste(q, "pays").map(normaliser).filter(Boolean))),
    avecOffres: texte(q, "offres") === "1",
    tri: TRIS.some((t) => t.valeur === tri) ? (tri as Tri) : "offres",
    page: entier(texte(q, "page"), 1, 10_000, 1),
    taille: entier(texte(q, "taille"), 1, TAILLE_MAX, TAILLE_PAR_DEFAUT),
  };
}

export type ReponseEmployeurs = {
  employeurs: Employeur[];
  total: number;
  page: number;
  taille: number;
  nbPages: number;
  tri: Tri;
  facettes: ReturnType<typeof facettesEmployeurs> & { types: ReturnType<typeof compterParType> };
};

/**
 * Recherche complète. Chaque facette est comptée avec les autres filtres
 * actifs mais sans le sien. Une page au-delà de la dernière renvoie la
 * dernière.
 */
export function rechercherEmployeurs(tous: Employeur[], p: ParametresEmployeurs): ReponseEmployeurs {
  const resultats = trierEmployeurs(filtrerEmployeurs(tous, p), p.tri);
  const nbPages = Math.max(1, Math.ceil(resultats.length / p.taille));
  const page = Math.min(p.page, nbPages);
  return {
    employeurs: resultats.slice((page - 1) * p.taille, page * p.taille),
    total: resultats.length,
    page,
    taille: p.taille,
    nbPages,
    tri: p.tri,
    facettes: { types: compterParType(tous, p), ...facettesEmployeurs(tous, p) },
  };
}
