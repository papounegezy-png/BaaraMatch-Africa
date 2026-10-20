import { formatJobTitle } from "@/lib/format-job-title";

// Libellés affichés sur les cartes de la page Offres. Fonctions pures :
// une donnée absente donne null (rien à afficher), sauf le salaire, qui
// devient « Selon profil ». Aucun chiffre n'est jamais inventé.

const plurielAns = (n: number) => `${n} ${n > 1 ? "ans" : "an"}`;

/** « 3-5 ans », « 5 ans et plus », « Jusqu'à 3 ans », « Débutant accepté ». */
export function libelleExperience(min?: number | null, max?: number | null): string | null {
  const a = min ?? null;
  const b = max ?? null;
  if (a === null && b === null) return null;
  if ((a === null || a === 0) && (b === null || b === 0)) return "Débutant accepté";
  if (a !== null && b !== null) return a === b ? plurielAns(a) : `${a}-${b} ans`;
  if (a !== null) return `${plurielAns(a)} et plus`;
  return `Jusqu'à ${plurielAns(b!)}`;
}

// Séparateur de milliers : espace fine insécable (U+202F), celle de la
// typographie française et d'Intl.NumberFormat("fr-FR").
const ESPACE_FINE_INSECABLE = String.fromCharCode(0x202f);
const ESPACE_INSECABLE = String.fromCharCode(0x00a0);
function montant(n: number): string {
  const chiffres = Math.round(n).toString();
  const groupes: string[] = [];
  for (let fin = chiffres.length; fin > 0; fin -= 3) groupes.unshift(chiffres.slice(Math.max(0, fin - 3), fin));
  return groupes.join(ESPACE_FINE_INSECABLE);
}

const DEVISES: Record<string, string> = { XOF: "FCFA", XAF: "FCFA", FCFA: "FCFA", EUR: "€", USD: "$", GNF: "GNF" };

/** « 350 000-500 000 FCFA / mois », « À partir de 350 000 FCFA », « Selon profil ». */
export function libelleSalaire(min?: number | null, max?: number | null, devise?: string | null, periode?: "mois" | "jour" | "mission" | null): string {
  const a = typeof min === "number" && min > 0 ? min : null;
  const b = typeof max === "number" && max > 0 ? max : null;
  if (a === null && b === null) return "Selon profil";
  const unite = devise ? DEVISES[devise.toUpperCase()] ?? devise : "FCFA";
  // Espace insécable avant l'unité : « FCFA » ne passe jamais seul à la ligne.
  const suffixe = `${ESPACE_INSECABLE}${unite}${periode ? ` / ${periode}` : ""}`;
  if (a !== null && b !== null) return a === b ? `${montant(a)}${suffixe}` : `${montant(a)}-${montant(b)}${suffixe}`;
  if (a !== null) return `À partir de ${montant(a)}${suffixe}`;
  return `Jusqu'à ${montant(b!)}${suffixe}`;
}

const JOUR_MS = 24 * 60 * 60 * 1000;
const debutJour = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/**
 * Ancienneté en jours de calendrier (heure locale) : « Aujourd'hui », « Hier »,
 * « Il y a 3 jours », « Il y a 1 semaine » (7-13 j), « Il y a 2 semaines »
 * (14-20 j)…, « Il y a 1 mois » (30-59 j), « Il y a 2 mois »…, « Il y a 1 an ».
 */
export function libelleDate(dateIso: string | Date | null | undefined, maintenant: Date = new Date()): string | null {
  if (!dateIso) return null;
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return null;
  const jours = Math.round((debutJour(maintenant) - debutJour(date)) / JOUR_MS);
  if (jours <= 0) return "Aujourd'hui";
  if (jours === 1) return "Hier";
  if (jours < 7) return `Il y a ${jours} jours`;
  if (jours < 30) {
    const semaines = Math.floor(jours / 7);
    return `Il y a ${semaines} ${semaines > 1 ? "semaines" : "semaine"}`;
  }
  if (jours < 365) return `Il y a ${Math.floor(jours / 30)} mois`;
  const ans = Math.floor(jours / 365);
  return `Il y a ${plurielAns(ans)}`;
}

/** « Bamako, Mali » ; la ville seule, le pays seul, ou null. */
export function libelleLieu(ville?: string | null, pays?: string | null): string | null {
  const v = ville?.trim() ? formatJobTitle(ville) : "";
  const p = pays?.trim() ? formatJobTitle(pays) : "";
  if (v && p && v.toLowerCase() !== p.toLowerCase()) return `${v}, ${p}`;
  return v || p || null;
}
