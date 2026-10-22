import { lirePretentions } from "@shared/profil-candidat";

// « Mon profil » : conversions des données pour l'affichage. Aucune valeur
// brute (type MIME, numéro collé) n'arrive telle quelle à l'écran.

// Indicatifs de la région (et la France), du plus long au plus court pour
// la recherche. La longueur du numéro national varie : 8 chiffres au Mali,
// 9 au Sénégal et en Guinée, 10 en Côte d'Ivoire et au Bénin.
const INDICATIFS = ["221", "222", "223", "224", "225", "226", "227", "228", "229", "231", "232", "233", "234", "235", "237", "241", "33"];

/**
 * Chiffres d'un numéro national, par paires : « 76234567 » → « 76 23 45 67 » ;
 * longueur impaire (Sénégal, 9 chiffres) : « 77 123 45 67 ».
 */
function grouper(chiffres: string): string {
  if (chiffres.length % 2 === 1 && chiffres.length >= 7) {
    return [chiffres.slice(0, 2), chiffres.slice(2, 5), ...(chiffres.slice(5).match(/.{1,2}/g) ?? [])].join(" ");
  }
  return chiffres.match(/.{1,2}/g)?.join(" ") ?? "";
}

/**
 * Numéro lisible : « 76234567 » → « 76 23 45 67 » ; avec indicatif
 * (« + » ou « 00 ») : « +22376234567 » → « +223 76 23 45 67 ». Sans « + »,
 * un numéro de plus de 10 chiffres qui commence par un indicatif connu est
 * lu de la même façon (« 22376234567 » → « +223 76 23 45 67 »). Vide → null.
 */
export function formaterTelephone(valeur: string | null | undefined): string | null {
  const brut = (valeur ?? "").trim();
  if (!brut) return null;
  let chiffres = brut.replace(/\D/g, "");
  const avecPrefixe = brut.startsWith("+") || brut.startsWith("00");
  if (brut.startsWith("00")) chiffres = chiffres.slice(2);
  if (!chiffres) return null;
  if (avecPrefixe || chiffres.length > 10) {
    const indicatif = INDICATIFS.find((i) => chiffres.startsWith(i) && chiffres.length - i.length >= 8);
    if (indicatif) return `+${indicatif} ${grouper(chiffres.slice(indicatif.length))}`;
    // Indicatif inconnu : le numéro tel qu'il a été saisi, sans le redécouper.
    if (avecPrefixe) return brut.replace(/\s+/g, " ");
  }
  return grouper(chiffres);
}

const TYPES_FICHIER: [RegExp, string][] = [
  [/pdf/, "Document PDF"],
  [/msword|wordprocessingml|\.docx?$|opendocument\.text|\.odt$/, "Document Word"],
  [/^image\/|\.(png|jpe?g|webp|gif)$/, "Image"],
  [/^text\/plain|\.txt$/, "Document texte"],
];

/**
 * Type de fichier lisible : « application/pdf » → « Document PDF ». Sans
 * type MIME, l'extension du nom suffit ; inconnu → « Fichier ».
 */
export function libelleTypeFichier(typeMime?: string | null, nomFichier?: string | null): string {
  const indices = [typeMime, nomFichier].map((v) => (v ?? "").trim().toLowerCase()).filter(Boolean);
  for (const [motif, libelle] of TYPES_FICHIER) {
    if (indices.some((v) => motif.test(v))) return libelle;
  }
  return "Fichier";
}

// Lecture des prétentions de l'éditeur : partagée avec le serveur.
export { lirePretentions };

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

type DatePartielle = { annee: number; mois?: number; jour?: number };

/** « 2021-03-02 », « 2021-03 » ou « 2021 » ; autre chose → null. */
function lireDate(valeur: string | null | undefined): DatePartielle | null {
  const m = (valeur ?? "").trim().match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?/);
  if (!m) return null;
  const mois = m[2] ? Number(m[2]) : undefined;
  const jour = m[3] ? Number(m[3]) : undefined;
  if (mois !== undefined && (mois < 1 || mois > 12)) return { annee: Number(m[1]) };
  return { annee: Number(m[1]), mois, jour };
}

const rang = (d: DatePartielle) => d.annee * 10000 + (d.mois ?? 0) * 100 + (d.jour ?? 0);
const moisAnnee = (d: DatePartielle) => (d.mois ? `${MOIS[d.mois - 1]} ${d.annee}` : String(d.annee));
const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Période lisible : « Mars 2021 – en cours », « 2020 – 2023 »,
 * « Mars 2018 – fin non renseignée ». Dates inversées : remises dans
 * l'ordre. Rien d'exploitable → null.
 */
export function libellePeriode(debut?: string | null, fin?: string | null, enCours = false): string | null {
  let d = lireDate(debut);
  let f = enCours ? null : lireDate(fin);
  if (d && f && rang(f) < rang(d)) [d, f] = [f, d];
  if (!d) {
    if (enCours) return "En cours";
    return f ? `Jusqu'en ${moisAnnee(f)}` : null;
  }
  if (enCours) return majuscule(`${moisAnnee(d)} – en cours`);
  if (!f) return majuscule(`${moisAnnee(d)} – fin non renseignée`);
  const a = moisAnnee(d);
  const b = moisAnnee(f);
  return majuscule(a === b ? a : `${a} – ${b}`);
}

/** « 2021-03-02 » → « 2 mars 2021 » (« 1er » le premier du mois) ; sinon null. */
export function libelleDateLongue(valeur: string | Date | null | undefined): string | null {
  if (!valeur) return null;
  if (valeur instanceof Date || /T/.test(valeur)) {
    const date = new Date(valeur);
    if (Number.isNaN(date.getTime())) return null;
    return libelleDateLongue(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`);
  }
  const d = lireDate(valeur);
  if (!d) return null;
  if (!d.mois) return String(d.annee);
  if (!d.jour) return `${MOIS[d.mois - 1]} ${d.annee}`;
  return `${d.jour === 1 ? "1er" : d.jour} ${MOIS[d.mois - 1]} ${d.annee}`;
}

// Valeurs de l'éditeur de profil (mobile-profile-editor.tsx, « Disponibilité »).
const DISPONIBILITES: Record<string, string> = {
  immediate: "Disponible immédiatement",
  "1-week": "Disponible sous 1 semaine",
  "2-weeks": "Disponible sous 2 semaines",
  "1-month": "Disponible sous 1 mois",
  "3-months": "Disponible sous 3 mois",
};

/** « 1-month » → « Disponible sous 1 mois » ; une date → « Disponible à partir du … » ; inconnu → undefined. */
export function libelleDisponibilite(valeur: string | null | undefined): string | undefined {
  const v = (valeur ?? "").trim();
  if (!v) return undefined;
  if (DISPONIBILITES[v]) return DISPONIBILITES[v];
  const date = /^\d{4}-\d{2}-\d{2}/.test(v) ? libelleDateLongue(v) : null;
  return date ? `Disponible à partir du ${date}` : undefined;
}

// Espace insécable (U+00A0) entre les milliers : « 600 000 » ne se coupe pas.
const montantLisible = (n: number) => n.toLocaleString("fr-FR").replace(/\s/g, "\u00A0");

/**
 * « 600 000 – 800 000 FCFA / mois » (espaces insécables entre les
 * milliers). Sans montant → undefined.
 */
export function libelleSalaire(min?: number, max?: number, devise = "FCFA", periode = "mois"): string | undefined {
  const fin = `${devise} / ${periode}`;
  if (min && max && max !== min) return `${montantLisible(Math.min(min, max))} – ${montantLisible(Math.max(min, max))} ${fin}`;
  if (min && max) return `${montantLisible(min)} ${fin}`;
  if (min) return `À partir de ${montantLisible(min)} ${fin}`;
  if (max) return `Jusqu'à ${montantLisible(max)} ${fin}`;
  return undefined;
}

// Années d'expérience de l'éditeur (« Expérience », sélection).
const ANNEES_EXPERIENCE: Record<string, string> = {
  "0-1": "Moins d'un an d'expérience",
  "1-3": "1 à 3 ans d'expérience",
  "3-5": "3 à 5 ans d'expérience",
  "5-10": "5 à 10 ans d'expérience",
  "10+": "Plus de 10 ans d'expérience",
};

export function libelleAnneesExperience(valeur: string | null | undefined): string | undefined {
  return ANNEES_EXPERIENCE[(valeur ?? "").trim()];
}

// Types de contrat : « Interim » (sans accent) vient de l'éditeur.
export function libelleContrat(valeur: string | null | undefined): string | undefined {
  const v = (valeur ?? "").trim();
  if (!v) return undefined;
  return v.toLowerCase() === "interim" ? "Intérim" : v;
}

/** « 1 expérience ajoutée », « 2 expériences ajoutées » ; 0 → null. */
export function accorderNombre(n: number, singulier: string, pluriel: string): string | null {
  if (!Number.isFinite(n) || n <= 0) return null;
  return `${n} ${n > 1 ? pluriel : singulier}`;
}

/** Mot accordé seul : 0 ou 1 → singulier, au-delà → pluriel. */
export function motAccorde(n: number, singulier: string, pluriel: string): string {
  return n > 1 ? pluriel : singulier;
}

/** Initiales d'un nom (deux au plus) : « Aminata Diallo » → « AD ». */
export function initiales(nom: string | null | undefined): string {
  return (nom ?? "").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]!.toLocaleUpperCase("fr")).join("") || "?";
}

/**
 * Date d'une certification : « Obtenue le 2 mars 2021 », « Obtenue en
 * avril 2024 » (sans le jour), « Date non renseignée ».
 */
export function libelleObtention(valeur: string | null | undefined): string {
  const v = (valeur ?? "").trim();
  const date = libelleDateLongue(v);
  if (!date) return "Date non renseignée";
  return `Obtenue ${/^\d{4}-\d{2}-\d{2}/.test(v) ? "le" : "en"} ${date}`;
}

/** Niveau d'une formation, seulement s'il apporte autre chose que le diplôme. */
export function niveauDistinct(niveau: string | null | undefined, diplome: string | null | undefined): string | undefined {
  const n = (niveau ?? "").trim();
  if (!n) return undefined;
  return n.toLocaleLowerCase("fr") === (diplome ?? "").trim().toLocaleLowerCase("fr") ? undefined : n;
}

/** Prétentions enregistrées par l'éditeur (« 600-800 ») → texte affiché ; inconnu → undefined. */
export function libellePretentions(valeur: string | null | undefined): string | undefined {
  const p = lirePretentions(valeur);
  return p ? libelleSalaire(p.min, p.max) : undefined;
}
