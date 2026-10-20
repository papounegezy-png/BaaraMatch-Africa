import { normaliserTexte } from "@shared/filtre-offres";
import { formatJobTitle } from "@shared/format-job-title";

// Utilitaires de la page Employeurs. Même normalisation que la page Offres :
// « BAMAKO », « Bamako » et « bamako » sont une seule valeur.

export { libelleLieu } from "@/lib/offres";

/** Minuscules, sans accents ni espaces superflus : pour chercher et comparer. */
export const normaliser = normaliserTexte;

/** Ville ou pays à afficher : « BAMAKO » → « Bamako », espaces retirées. */
export function libelleLieuSimple(valeur: string | null | undefined): string {
  return formatJobTitle((valeur ?? "").trim().replace(/\s+/g, " "));
}

// Petits mots ignorés pour les initiales (« Initiative pour le Développement »
// → « ID »).
const MOTS_VIDES = new Set(["d", "l", "de", "du", "des", "la", "le", "les", "et", "pour", "en", "au", "aux", "sa", "sarl", "sas"]);

// Tout ce qui n'est ni lettre ni chiffre, quel que soit l'alphabet.
const SEPARATEURS = new RegExp("[^\\p{L}\\p{N}]+", "u");

/** Deux lettres au plus, pour l'avatar d'un employeur sans logo. */
export function initiales(nom: string | null | undefined): string {
  const mots = (nom ?? "")
    .replace(/[’']/g, " ")
    .split(SEPARATEURS)
    .filter(Boolean);
  const pleins = mots.filter((m) => !MOTS_VIDES.has(m.toLocaleLowerCase("fr")));
  const retenus = pleins.length ? pleins : mots;
  if (!retenus.length) return "";
  const lettres = retenus.length === 1 ? retenus[0].slice(0, 2) : retenus[0][0] + retenus[1][0];
  return lettres.toLocaleUpperCase("fr");
}

export type ValeurRegroupee = { valeur: string; libelle: string; nombre: number };

/**
 * Valeurs distinctes d'une liste (villes, pays), regroupées par forme
 * normalisée ; libellé : la graphie la plus fréquente, remise en forme.
 * Triées par nombre décroissant puis par libellé. Les vides sont ignorés.
 */
export function regrouperValeurs(valeurs: (string | null | undefined)[]): ValeurRegroupee[] {
  const groupes = new Map<string, { graphies: Map<string, number>; nombre: number }>();
  for (const brute of valeurs) {
    const cle = normaliser(brute);
    if (!cle) continue;
    const g = groupes.get(cle) ?? { graphies: new Map<string, number>(), nombre: 0 };
    const graphie = (brute ?? "").trim().replace(/\s+/g, " ");
    g.graphies.set(graphie, (g.graphies.get(graphie) ?? 0) + 1);
    g.nombre++;
    groupes.set(cle, g);
  }
  return Array.from(groupes.entries())
    .map(([valeur, g]) => ({
      valeur,
      libelle: libelleLieuSimple(Array.from(g.graphies.entries()).sort((a, b) => b[1] - a[1])[0][0]),
      nombre: g.nombre,
    }))
    .sort((a, b) => b.nombre - a.nombre || a.libelle.localeCompare(b.libelle, "fr"));
}
