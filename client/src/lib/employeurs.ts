// Utilitaires de la page Employeurs. Le filtrage est partagé avec le serveur
// (shared/filtre-employeurs.ts).
export * from "@shared/filtre-employeurs";
export { libelleLieu } from "@/lib/offres";

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
