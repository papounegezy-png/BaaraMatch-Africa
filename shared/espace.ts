// Espace candidat : seuils des tâches « À faire maintenant » et durées
// lisibles, partagés entre le client (calcul des tâches) et le serveur
// (contrôle des relances et des rappels).

/** Sans réponse depuis ce nombre de jours : proposer de relancer ou de retirer. */
export const SEUIL_RELANCE_JOURS = 30;
/** Sans réponse depuis plus de 6 mois : proposer de retirer ou d'attendre encore. */
export const SEUIL_ATTENTE_LONGUE_JOURS = 180;
/** « Attendre encore » repousse le rappel de ce nombre de jours. */
export const REPORT_RAPPEL_JOURS = 30;
/** Une relance n'est possible qu'une fois par période. */
export const INTERVALLE_RELANCE_JOURS = 30;
/** Nombre maximal de tâches affichées. */
export const MAX_TACHES = 3;
/** Délai pendant lequel un retrait de candidature peut être annulé. */
export const DELAI_ANNULATION_RETRAIT_MS = 10_000;
/** Statuts « sans réponse » de l'employeur. */
export const STATUTS_SANS_REPONSE = ["pending", "reviewing"] as const;

export const JOUR_MS = 86_400_000;

/** Jours entiers écoulés entre deux dates. */
export function joursEcoules(depuis: Date | string, maintenant: Date = new Date()): number {
  return Math.max(0, Math.floor((maintenant.getTime() - new Date(depuis).getTime()) / JOUR_MS));
}

/**
 * « 39 jours », « 2 mois », « plus de 6 mois », jamais « 191 jours ».
 * Moins de 60 jours : en jours ; de 60 à 179 : en mois (30 jours) ; à partir
 * de 180 : « plus de 6 mois ».
 */
export function libelleDuree(jours: number): string {
  if (jours < 1) return "moins d'un jour";
  if (jours < 60) return `${jours} jour${jours > 1 ? "s" : ""}`;
  if (jours < 180) return `${Math.floor(jours / 30)} mois`;
  return "plus de 6 mois";
}
