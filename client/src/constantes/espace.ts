// Espace candidat : seuils des tâches « À faire maintenant ».

/** Sans réponse depuis ce nombre de jours : proposer de relancer ou de retirer. */
export const SEUIL_RELANCE_JOURS = 30;
/** Sans réponse depuis plus de 6 mois : proposer de retirer ou d'attendre encore. */
export const SEUIL_ATTENTE_LONGUE_JOURS = 180;
/** « Attendre encore » repousse le rappel de ce nombre de jours. */
export const REPORT_RAPPEL_JOURS = 30;
/** Une relance n'est proposée qu'une fois par période. */
export const INTERVALLE_RELANCE_JOURS = 30;
/** Nombre maximal de tâches affichées. */
export const MAX_TACHES = 3;
/** Délai pendant lequel un retrait de candidature peut être annulé. */
export const DELAI_ANNULATION_RETRAIT_MS = 10_000;
