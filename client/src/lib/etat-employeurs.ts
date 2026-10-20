import { secteursDepuisParametres } from "@shared/filtre-offres";
import type { Secteur } from "@shared/secteurs";
import { normaliser, type TypeChoisi } from "@/lib/employeurs";

// État de la page Employeurs, entièrement porté par l'adresse : la page est
// partageable et le bouton Retour la restaure.
// Exemple : /agencies?type=agences&secteur=Mines%20et%20carri%C3%A8res&pays=mali&offres=1&tri=nom&q=sahel

export const TAILLE_PAGE = 12;

// Tris proposés. Pas de « Mieux notés » : les notes n'ont pas de source
// réelle (décision du 20/10/2026).
export const TRIS = [
  { valeur: "offres", libelle: "Plus d'offres" },
  { valeur: "nom", libelle: "Nom (A–Z)" },
] as const;
export type Tri = (typeof TRIS)[number]["valeur"];

export type EtatEmployeurs = {
  recherche: string;
  lieu: string;
  type: TypeChoisi;
  secteurs: Secteur[];
  // Clés normalisées des pays cochés.
  pays: string[];
  avecOffres: boolean;
  tri: Tri;
};

export const ETAT_VIDE: EtatEmployeurs = { recherche: "", lieu: "", type: null, secteurs: [], pays: [], avecOffres: false, tri: "offres" };

const TYPES: Record<string, TypeChoisi> = { entreprises: "entreprise", entreprise: "entreprise", agences: "agence", agence: "agence" };

export function etatDepuisAdresse(search: string): EtatEmployeurs {
  const p = new URLSearchParams(search);
  const tri = p.get("tri");
  return {
    recherche: p.get("q") ?? "",
    lieu: p.get("lieu") ?? "",
    type: TYPES[normaliser(p.get("type"))] ?? null,
    secteurs: secteursDepuisParametres(p.getAll("secteur")),
    pays: Array.from(new Set(p.getAll("pays").map(normaliser).filter(Boolean))),
    avecOffres: p.get("offres") === "1",
    tri: TRIS.some((t) => t.valeur === tri) ? (tri as Tri) : "offres",
  };
}

/** Adresse de l'état : seulement ce qui diffère de l'état vide. */
export function adresseDepuisEtat(e: EtatEmployeurs): string {
  const p = new URLSearchParams();
  if (e.recherche.trim()) p.set("q", e.recherche.trim());
  if (e.lieu.trim()) p.set("lieu", e.lieu.trim());
  if (e.type) p.set("type", e.type === "agence" ? "agences" : "entreprises");
  e.secteurs.forEach((s) => p.append("secteur", s));
  e.pays.forEach((x) => p.append("pays", x));
  if (e.avecOffres) p.set("offres", "1");
  if (e.tri !== "offres") p.set("tri", e.tri);
  const texte = p.toString();
  return texte ? `?${texte}` : "";
}

type Triable = { nom: string; offresPubliees: number };

/** Plus d'offres : départage par nom. Nom : ordre alphabétique français. */
export function trierEmployeurs<E extends Triable>(liste: E[], tri: Tri): E[] {
  const parNom = (a: E, b: E) => a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" });
  return [...liste].sort(tri === "nom" ? parNom : (a, b) => b.offresPubliees - a.offresPubliees || parNom(a, b));
}

/** « 1 employeur », « 22 employeurs », « 0 employeur ». */
export function libelleNombre(n: number): string {
  return `${n.toLocaleString("fr-FR")} ${n > 1 ? "employeurs" : "employeur"}`;
}

/** « 12 sur 48 » sous la grille. */
export function libelleAffiches(affiches: number, total: number): string {
  return `${affiches.toLocaleString("fr-FR")} sur ${total.toLocaleString("fr-FR")}`;
}
