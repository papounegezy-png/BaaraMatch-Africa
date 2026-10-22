// Durées lisibles (« 39 jours », « 2 mois », « plus de 6 mois »), jamais
// « 191 jours ».

export const JOUR_MS = 86_400_000;

/** Jours entiers écoulés entre deux dates. */
export function joursEcoules(depuis: Date | string, maintenant: Date = new Date()): number {
  return Math.max(0, Math.floor((maintenant.getTime() - new Date(depuis).getTime()) / JOUR_MS));
}

/**
 * Moins de 60 jours : en jours ; de 60 à 179 : en mois (30 jours) ; à partir
 * de 180 : « plus de 6 mois ».
 */
export function libelleDuree(jours: number): string {
  if (jours < 1) return "moins d'un jour";
  if (jours < 60) return `${jours} jour${jours > 1 ? "s" : ""}`;
  if (jours < 180) return `${Math.floor(jours / 30)} mois`;
  return "plus de 6 mois";
}
