import { categorieCanonique } from "./categories";

// Référentiel des 32 secteurs d'activité (décision produit du 20/10/2026) :
// source unique pour les offres, les employeurs et l'inscription. L'ordre
// est fixe : c'est celui d'affichage du filtre « Secteur d'activité ».
export const SECTEURS = [
  "BTP et construction",
  "Mines et carrières",
  "Banque, finance et microfinance",
  "Énergie et électricité",
  "Transport, logistique et transit",
  "Informatique, IT et numérique",
  "Fintech et services numériques",
  "Agriculture, élevage et pêche",
  "Agroalimentaire",
  "Industrie et production",
  "Télécommunications",
  "ONG, humanitaire et développement",
  "Commerce, vente et distribution",
  "Comptabilité, audit et gestion",
  "Santé et pharmacie",
  "Éducation et formation",
  "Recherche, études et statistiques",
  "Consulting, conseil et expertise",
  "Hôtellerie, restauration et tourisme",
  "Marketing et communication",
  "Ressources humaines et recrutement",
  "Juridique et conformité",
  "Sécurité et gardiennage",
  "Environnement, eau et assainissement",
  "Immobilier",
  "Assurance",
  "Import-export et commerce international",
  "Automobile et maintenance",
  "Services aux entreprises",
  "Médias et audiovisuel",
  "Artisanat et textile",
  "Culture, arts et loisirs",
] as const;

export type Secteur = (typeof SECTEURS)[number];

/** Nombre de secteurs visibles avant « Voir plus » dans le filtre. */
export const NB_SECTEURS_INITIAL = 10;

// Les 17 catégories de l'ancien vocabulaire (shared/categories.ts, encore
// écrites par le formulaire d'offre) et leurs alias, rattachées à un secteur.
// « Autre » n'a pas de secteur. Deux choix à confirmer :
//   - « Finance & Comptabilité » → banque et finance (et non comptabilité) ;
//   - « Administration » → services aux entreprises.
const DEPUIS_ANCIENNE_CATEGORIE: Record<string, Secteur | null> = {
  "Informatique & Tech": "Informatique, IT et numérique",
  "Finance & Comptabilité": "Banque, finance et microfinance",
  Assurances: "Assurance",
  "Marketing & Communication": "Marketing et communication",
  "Ressources Humaines": "Ressources humaines et recrutement",
  "Commercial & Vente": "Commerce, vente et distribution",
  Administration: "Services aux entreprises",
  Santé: "Santé et pharmacie",
  Éducation: "Éducation et formation",
  Industrie: "Industrie et production",
  Mines: "Mines et carrières",
  Production: "Industrie et production",
  "BTP & Construction": "BTP et construction",
  "Hôtellerie & Restauration": "Hôtellerie, restauration et tourisme",
  "Transport & Logistique": "Transport, logistique et transit",
  Agriculture: "Agriculture, élevage et pêche",
  Autre: null,
};

// Valeurs saisies à la main hors des deux vocabulaires (clé normalisée).
const ALIAS_LIBRES: Record<string, Secteur> = {
  telecoms: "Télécommunications",
  telecom: "Télécommunications",
  telecommunication: "Télécommunications",
  energie: "Énergie et électricité",
  electricite: "Énergie et électricité",
  ong: "ONG, humanitaire et développement",
  humanitaire: "ONG, humanitaire et développement",
  comptabilite: "Comptabilité, audit et gestion",
  audit: "Comptabilité, audit et gestion",
  juridique: "Juridique et conformité",
  securite: "Sécurité et gardiennage",
  immobilier: "Immobilier",
  fintech: "Fintech et services numériques",
  consulting: "Consulting, conseil et expertise",
  conseil: "Consulting, conseil et expertise",
  tourisme: "Hôtellerie, restauration et tourisme",
  agroalimentaire: "Agroalimentaire",
  automobile: "Automobile et maintenance",
  medias: "Médias et audiovisuel",
  carrieres: "Mines et carrières",
};

const DIACRITIQUES = new RegExp("[\\u0300-\\u036f]", "g");
const cle = (texte: string) => texte.normalize("NFD").replace(DIACRITIQUES, "").trim().toLowerCase();
const PAR_CLE = new Map<string, Secteur>(SECTEURS.map((s) => [cle(s), s]));

/**
 * Secteur (parmi les 32) d'une catégorie d'offre telle qu'enregistrée :
 * un des 32 libellés, une des 17 anciennes catégories, ou une valeur libre
 * connue (« Télécoms », « dev »…). null si inconnue, vide ou « Autre ».
 */
export function secteurDeCategorie(categorie: string | null | undefined): Secteur | null {
  if (!categorie?.trim()) return null;
  const direct = PAR_CLE.get(cle(categorie));
  if (direct) return direct;
  const libre = ALIAS_LIBRES[cle(categorie)];
  if (libre) return libre;
  const ancienne = categorieCanonique(categorie);
  return ancienne && ancienne in DEPUIS_ANCIENNE_CATEGORIE ? DEPUIS_ANCIENNE_CATEGORIE[ancienne] : null;
}
