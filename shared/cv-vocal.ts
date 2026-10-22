// CV vocal du candidat : limites et formats, partagés par l'enregistreur
// (navigateur) et le serveur (contrôle à l'envoi).

/** Durée acceptée, en secondes (décision du 22/10/2026). */
export const DUREE_MIN_SECONDES = 10;
export const DUREE_MAX_SECONDES = 120;

/**
 * Taille maximale du fichier. 2 minutes en Opus (Chrome, Android) font
 * environ 1 Mo, en AAC (Safari, iPhone) environ 2 Mo : 6 Mo laisse de la
 * marge sans accepter n'importe quoi.
 */
export const TAILLE_MAX_OCTETS = 6 * 1024 * 1024;

/** Formats audio acceptés (sans les paramètres « ;codecs=… »). */
export const TYPES_AUDIO = ["audio/webm", "audio/ogg", "audio/mp4", "audio/aac", "audio/mpeg", "audio/wav", "audio/x-m4a"] as const;
export type TypeAudio = (typeof TYPES_AUDIO)[number];

/** « audio/webm;codecs=opus » → « audio/webm » ; format non accepté → null. */
export function typeAudio(mime: string | null | undefined): TypeAudio | null {
  const base = (mime ?? "").split(";")[0]!.trim().toLowerCase();
  return (TYPES_AUDIO as readonly string[]).includes(base) ? (base as TypeAudio) : null;
}

/**
 * Formats à essayer pour MediaRecorder, du meilleur au plus répandu :
 * Opus en WebM (Chrome, Firefox, Android), puis AAC en MP4 (Safari, iPhone).
 */
export const FORMATS_ENREGISTREMENT = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4;codecs=mp4a.40.2", "audio/mp4", "audio/ogg;codecs=opus"] as const;

/** Une adresse qu'un navigateur sait lire (pas « whatsapp://media/… »). */
export function adresseAudioLisible(url: string | null | undefined): boolean {
  return !!url && (url.startsWith("data:audio/") || url.startsWith("/api/files/"));
}

/** « 1 min 05 s », « 45 s » ; durée inconnue → null. */
export function libelleDureeAudio(secondes: number | null | undefined): string | null {
  if (secondes == null || !Number.isFinite(secondes) || secondes <= 0) return null;
  const s = Math.round(secondes);
  if (s < 60) return `${s} s`;
  return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s`;
}
