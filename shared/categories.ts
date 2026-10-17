// Vocabulaire des secteurs d'offre : ce que OfferForm écrit dans
// job_postings.category. Partagé par le client (formulaire, filtre /jobs,
// accueil) et le serveur (GET /api/accueil/secteurs).
export const jobCategoryOptions = [
  "Informatique & Tech",
  "Finance & Comptabilité",
  "Assurances",
  "Marketing & Communication",
  "Ressources Humaines",
  "Commercial & Vente",
  "Administration",
  "Santé",
  "Éducation",
  "Industrie",
  "Mines",
  "Production",
  "BTP & Construction",
  "Hôtellerie & Restauration",
  "Transport & Logistique",
  "Agriculture",
  "Autre",
];

// Valeurs anciennes ou saisies à la main encore présentes en base (« BTP »,
// « Tech », « INFORMATIQUE », « dev »…), rattachées à une entrée du
// vocabulaire. Clés en minuscules, sans accents. Les données ne sont pas
// modifiées : la correspondance se fait à la lecture.
const ALIAS_CATEGORIES: Record<string, string> = {
  btp: "BTP & Construction",
  construction: "BTP & Construction",
  tech: "Informatique & Tech",
  informatique: "Informatique & Tech",
  it: "Informatique & Tech",
  dev: "Informatique & Tech",
  developpement: "Informatique & Tech",
  finance: "Finance & Comptabilité",
  comptabilite: "Finance & Comptabilité",
  rh: "Ressources Humaines",
  "ressources humaines": "Ressources Humaines",
  logistique: "Transport & Logistique",
  transport: "Transport & Logistique",
  marketing: "Marketing & Communication",
  commercial: "Commercial & Vente",
  vente: "Commercial & Vente",
  hotellerie: "Hôtellerie & Restauration",
  restauration: "Hôtellerie & Restauration",
  mine: "Mines",
};

const DIACRITIQUES = new RegExp("[\u0300-\u036f]", "g");

function cle(texte: string): string {
  return texte.normalize("NFD").replace(DIACRITIQUES, "").trim().toLowerCase();
}

const PAR_CLE = new Map(jobCategoryOptions.map((c) => [cle(c), c]));

/**
 * Entrée du vocabulaire correspondant à une catégorie saisie, quelle que soit
 * sa casse ou ses accents, alias compris. Une valeur inconnue est renvoyée
 * nettoyée (espaces retirés) ; une valeur vide donne null.
 */
export function categorieCanonique(categorie: string | null | undefined): string | null {
  const brute = (categorie ?? "").trim();
  if (!brute) return null;
  const k = cle(brute);
  const alias = ALIAS_CATEGORIES[k];
  return PAR_CLE.get(k) ?? (alias ? PAR_CLE.get(cle(alias)) ?? alias : brute);
}

// Secteurs mis en avant sur l'accueil (pastilles du bandeau, section
// « Entreprises qui recrutent »). `valeur` est une entrée du vocabulaire.
export const SECTEURS_ACCUEIL_BASE = [
  { libelle: "BTP", valeur: "BTP & Construction" },
  { libelle: "Mines", valeur: "Mines" },
  { libelle: "Logistique", valeur: "Transport & Logistique" },
  { libelle: "Finance", valeur: "Finance & Comptabilité" },
  { libelle: "RH", valeur: "Ressources Humaines" },
  { libelle: "Tech", valeur: "Informatique & Tech" },
] as const;

// Réponse de GET /api/accueil/secteurs.
export interface EmployeurQuiRecrute {
  id: string;
  nom: string;
  logoUrl: string | null;
}

export interface SecteurQuiRecrute {
  secteur: string;
  valeur: string;
  offresActives: number;
  entreprises: EmployeurQuiRecrute[];
}
