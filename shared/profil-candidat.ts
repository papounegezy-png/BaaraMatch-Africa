// Profil candidat : valeurs contrôlées (disponibilité, prétentions) et
// lecture des prétentions, partagées par le serveur (validation, réponse
// de GET /api/profile) et le client (affichage de « Mon profil »).

/** Disponibilités proposées par l'éditeur (« Disponibilité »). */
export const DISPONIBILITES = ["immediate", "1-week", "2-weeks", "1-month", "3-months"] as const;

/** Prétentions proposées par l'éditeur, en milliers de francs (« 600K - 800K FCFA »). */
export const PRETENTIONS = ["200-400", "400-600", "600-800", "800-1M", "1M+"] as const;

export const DEVISE_PAR_DEFAUT = "FCFA";
export const PERIODE_PAR_DEFAUT = "mois";

/**
 * Prétentions enregistrées par l'éditeur, en milliers de francs :
 * « 600-800 » → 600 000 à 800 000 ; « 800-1M » ; « 1M+ » → à partir de
 * 1 000 000. Inconnu → undefined.
 */
export function lirePretentions(valeur: string | null | undefined): { min?: number; max?: number } | undefined {
  const montant = (texte: string) => {
    const m = texte.trim().match(/^(\d+(?:[.,]\d+)?)\s*(k|m)?$/i);
    if (!m) return undefined;
    const n = Number(m[1].replace(",", "."));
    // Sans unité, l'éditeur compte en milliers.
    return Math.round(n * (m[2]?.toLowerCase() === "m" ? 1_000_000 : 1_000));
  };
  const v = (valeur ?? "").trim();
  if (!v) return undefined;
  const plus = v.match(/^(.+)\+$/);
  if (plus) {
    const min = montant(plus[1]);
    return min ? { min } : undefined;
  }
  const [a, b] = v.split("-");
  const min = montant(a ?? "");
  const max = b !== undefined ? montant(b) : undefined;
  if (min === undefined || (b !== undefined && max === undefined)) return undefined;
  return max !== undefined ? { min, max } : { min, max: min };
}

/** Prétentions structurées (réponse de GET /api/profile) ; sans valeur lisible → null. */
export function pretentionsStructurees(valeur: string | null | undefined) {
  const p = lirePretentions(valeur);
  if (!p) return null;
  return { salaireMin: p.min ?? null, salaireMax: p.max ?? null, devise: DEVISE_PAR_DEFAUT, periode: PERIODE_PAR_DEFAUT };
}

/** Extension à ajouter à un nom de CV qui n'en a pas, d'après son type. */
export function nomFichierCv(nom: string | null | undefined, typeMime: string | null | undefined): string {
  const base = (nom ?? "").trim().replace(/[\r\n"\\/]/g, "_") || "cv";
  if (/\.[a-z0-9]{2,5}$/i.test(base)) return base;
  const ext = (typeMime ?? "").includes("pdf") ? ".pdf" : (typeMime ?? "").includes("word") ? ".docx" : "";
  return base + ext;
}
