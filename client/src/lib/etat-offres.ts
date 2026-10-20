import { contratDepuisParametre, normaliserTexte, secteursDepuisParametres, type ContratBarre } from "@/lib/filtre-offres";
import type { Secteur } from "@shared/secteurs";

// État de la page Offres, entièrement porté par l'adresse : la page est
// partageable et le bouton Retour la restaure. Les anciens noms de
// paramètres restent lus (accueil : location, type, category ; page
// Employeurs : agencyId / companyId + employerName), les nouveaux sont écrits.

export const TAILLE_PAGE = 20;

export type EtatOffres = {
  recherche: string;
  lieu: string;
  contrat: ContratBarre | null;
  secteurs: Secteur[];
  villes: string[];
  experiences: string[];
  publieeDepuisJours: number | null;
  tri: "recent";
  page: number;
  employeur: { cle: "agencyId" | "companyId"; id: string; nom: string | null } | null;
};

export const ETAT_VIDE: EtatOffres = {
  recherche: "", lieu: "", contrat: null, secteurs: [], villes: [], experiences: [],
  publieeDepuisJours: null, tri: "recent", page: 1, employeur: null,
};

export function etatDepuisAdresse(search: string): EtatOffres {
  const p = new URLSearchParams(search);
  const cleEmployeur = p.get("agencyId") ? "agencyId" : p.get("companyId") ? "companyId" : null;
  const page = Math.floor(Number(p.get("page")));
  return {
    recherche: p.get("q") ?? "",
    lieu: p.get("lieu") ?? p.get("location") ?? "",
    contrat: contratDepuisParametre(p.get("contrat") ?? p.get("type")),
    secteurs: secteursDepuisParametres([...p.getAll("secteur"), ...p.getAll("category")]),
    villes: Array.from(new Set(p.getAll("ville").map(normaliserTexte).filter(Boolean))),
    experiences: p.getAll("exp"),
    publieeDepuisJours: Number(p.get("publiee_depuis_jours")) || null,
    tri: "recent",
    page: page >= 1 ? page : 1,
    employeur: cleEmployeur ? { cle: cleEmployeur, id: p.get(cleEmployeur)!, nom: p.get("employerName") } : null,
  };
}

/** Adresse de l'état : seulement ce qui diffère de l'état vide. */
export function adresseDepuisEtat(e: EtatOffres): string {
  const p = new URLSearchParams();
  if (e.recherche.trim()) p.set("q", e.recherche.trim());
  if (e.lieu.trim()) p.set("lieu", e.lieu.trim());
  if (e.contrat) p.set("contrat", e.contrat);
  e.secteurs.forEach((s) => p.append("secteur", s));
  e.villes.forEach((v) => p.append("ville", v));
  e.experiences.forEach((x) => p.append("exp", x));
  if (e.publieeDepuisJours) p.set("publiee_depuis_jours", String(e.publieeDepuisJours));
  if (e.employeur) {
    p.set(e.employeur.cle, e.employeur.id);
    if (e.employeur.nom) p.set("employerName", e.employeur.nom);
  }
  if (e.page > 1) p.set("page", String(e.page));
  const texte = p.toString();
  return texte ? `?${texte}` : "";
}

/**
 * Numéros de page à afficher : la première, la dernière, la courante et ses
 * voisines, « … » pour les trous (1 … 4 5 6 … 20). Tout s'affiche jusqu'à 7 pages.
 */
export function pagesAAfficher(courante: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const garder = new Set([1, total, courante - 1, courante, courante + 1].filter((n) => n >= 1 && n <= total));
  if (courante <= 3) [2, 3, 4].forEach((n) => garder.add(n));
  if (courante >= total - 2) [total - 3, total - 2, total - 1].forEach((n) => garder.add(n));
  const tries = Array.from(garder).sort((a, b) => a - b);
  const sortie: (number | "…")[] = [];
  tries.forEach((n, i) => {
    if (i > 0 && n - tries[i - 1] > 1) sortie.push("…");
    sortie.push(n);
  });
  return sortie;
}

const nombre = (n: number) => n.toLocaleString("fr-FR");

/** « 1–20 sur 17 964 offres », « 1 offre », « 0 offre ». */
export function libelleResultats(page: number, total: number): string {
  if (total === 0) return "0 offre";
  if (total === 1) return "1 offre";
  const debut = (page - 1) * TAILLE_PAGE + 1;
  const fin = Math.min(page * TAILLE_PAGE, total);
  return `${nombre(debut)}–${nombre(fin)} sur ${nombre(total)} offres`;
}
