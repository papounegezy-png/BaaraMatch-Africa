import { useEffect, useRef, useState } from "react";
import { Mic, RotateCcw, Square, Upload } from "lucide-react";
import { DUREE_MAX_SECONDES, DUREE_MIN_SECONDES, FORMATS_ENREGISTREMENT } from "@shared/cv-vocal";
import { LecteurVocal } from "@/components/cv-vocal/lecteur-vocal";

const boutonPlein =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-baara-bleu px-6 font-texte text-[15px] font-semibold text-white hover:bg-baara-marine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2 disabled:opacity-60";
const boutonContour =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-[1.5px] border-baara-marine bg-white px-6 font-texte text-[15px] font-semibold text-baara-marine hover:bg-baara-clair focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2 disabled:opacity-60 dark:border-white dark:bg-transparent dark:text-white dark:hover:bg-white/10";

type Etat = { etape: "repos" } | { etape: "enregistrement"; debut: number } | { etape: "apercu"; fichier: Blob; url: string; duree: number } | { etape: "envoi"; fichier: Blob; url: string; duree: number };

export type EnregistrementVocal = { fichier: Blob; typeMime: string; dureeSecondes: number };

const temps = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Premier format que le navigateur sait enregistrer (Opus/WebM, sinon AAC/MP4 sur Safari). */
function formatEnregistrement(): string | undefined {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return undefined;
  return FORMATS_ENREGISTREMENT.find((f) => MediaRecorder.isTypeSupported(f));
}

/**
 * Enregistreur du CV vocal : démarrer, arrêter (automatiquement à 2 min),
 * réécouter, recommencer, envoyer. Moins de 10 s : refusé avant envoi.
 */
export function EnregistreurVocal({ onEnvoyer, onAnnuler }: { onEnvoyer: (e: EnregistrementVocal) => Promise<void>; onAnnuler?: () => void }) {
  const [etat, setEtat] = useState<Etat>({ etape: "repos" });
  const [message, setMessage] = useState<string | null>(null);
  const [annonce, setAnnonce] = useState("");
  const [ecoule, setEcoule] = useState(0);
  const enregistreur = useRef<MediaRecorder | null>(null);
  const flux = useRef<MediaStream | null>(null);
  const morceaux = useRef<Blob[]>([]);
  const debut = useRef(0);
  const urlApercu = useRef<string | null>(null);

  const couperMicro = () => {
    flux.current?.getTracks().forEach((t) => t.stop());
    flux.current = null;
  };
  const libererApercu = () => {
    if (urlApercu.current) URL.revokeObjectURL(urlApercu.current);
    urlApercu.current = null;
  };

  useEffect(() => () => {
    if (enregistreur.current?.state === "recording") enregistreur.current.stop();
    couperMicro();
    libererApercu();
  }, []);

  // Minuteur et arrêt automatique à la durée maximale.
  useEffect(() => {
    if (etat.etape !== "enregistrement") return;
    const minuteur = setInterval(() => {
      const s = (Date.now() - debut.current) / 1000;
      setEcoule(s);
      if (s >= DUREE_MAX_SECONDES) arreter();
    }, 250);
    return () => clearInterval(minuteur);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etat.etape]);

  const demarrer = async () => {
    setMessage(null);
    const format = formatEnregistrement();
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMessage("Votre navigateur ne permet pas d'enregistrer. Essayez avec Chrome ou Safari à jour.");
      return;
    }
    try {
      flux.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      setMessage("Le micro n'est pas autorisé. Autorisez-le dans les réglages du navigateur, puis réessayez.");
      return;
    }
    const recorder = new MediaRecorder(flux.current, format ? { mimeType: format, audioBitsPerSecond: 64_000 } : undefined);
    enregistreur.current = recorder;
    morceaux.current = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) morceaux.current.push(e.data); };
    recorder.onstop = () => {
      couperMicro();
      const duree = Math.min(DUREE_MAX_SECONDES, (Date.now() - debut.current) / 1000);
      if (duree < DUREE_MIN_SECONDES) {
        setEtat({ etape: "repos" });
        setMessage(`Enregistrement trop court : présentez-vous pendant au moins ${DUREE_MIN_SECONDES} secondes.`);
        setAnnonce("Enregistrement trop court");
        return;
      }
      const fichier = new Blob(morceaux.current, { type: recorder.mimeType || format || "audio/webm" });
      libererApercu();
      urlApercu.current = URL.createObjectURL(fichier);
      setEtat({ etape: "apercu", fichier, url: urlApercu.current, duree: Math.round(duree) });
      setAnnonce("Enregistrement terminé. Réécoutez-le avant de l'enregistrer.");
    };
    debut.current = Date.now();
    setEcoule(0);
    recorder.start(1000);
    setEtat({ etape: "enregistrement", debut: debut.current });
    setAnnonce("Enregistrement en cours");
  };

  function arreter() {
    if (enregistreur.current?.state === "recording") enregistreur.current.stop();
  }

  const recommencer = () => {
    libererApercu();
    setEtat({ etape: "repos" });
    setMessage(null);
  };

  const envoyer = async () => {
    if (etat.etape !== "apercu") return;
    setEtat({ ...etat, etape: "envoi" });
    setMessage(null);
    try {
      await onEnvoyer({ fichier: etat.fichier, typeMime: etat.fichier.type, dureeSecondes: etat.duree });
      libererApercu();
      setEtat({ etape: "repos" });
    } catch (e) {
      setEtat({ ...etat, etape: "apercu" });
      setMessage((e as Error).message || "Le CV vocal n'a pas pu être enregistré. Réessayez.");
    }
  };

  return (
    <div className="space-y-4" data-testid="enregistreur-vocal">
      <p role="status" className="sr-only">{annonce}</p>
      {etat.etape === "repos" && (
        <>
          <p className="max-w-[68ch] font-texte text-[15.5px] text-baara-texte dark:text-slate-300">
            Présentez-vous de vive voix, entre {DUREE_MIN_SECONDES} secondes et {DUREE_MAX_SECONDES / 60} minutes : votre métier, votre expérience, votre ville et votre disponibilité.
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={demarrer} className={boutonPlein} data-testid="bouton-demarrer-vocal">
              <Mic className="h-5 w-5" aria-hidden="true" />
              Commencer l'enregistrement
            </button>
            {onAnnuler && (
              <button type="button" onClick={onAnnuler} className={boutonContour}>
                Annuler
              </button>
            )}
          </div>
        </>
      )}

      {etat.etape === "enregistrement" && (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border-[1.5px] border-baara-moyen bg-baara-clair px-4 py-3 dark:border-white/15 dark:bg-white/5">
          <span className="flex items-center gap-2 font-texte text-[15.5px] font-semibold text-baara-marine dark:text-white">
            <span className="h-3 w-3 rounded-full bg-baara-bleu motion-safe:animate-pulse" aria-hidden="true" />
            Enregistrement en cours
          </span>
          <span className="font-texte text-[17px] font-bold tabular-nums text-baara-marine dark:text-white" data-testid="minuteur-vocal">
            {temps(ecoule)} <span className="font-normal text-baara-texte dark:text-slate-300">/ {temps(DUREE_MAX_SECONDES)}</span>
          </span>
          <button type="button" onClick={arreter} className={`${boutonPlein} ml-auto`} data-testid="bouton-arreter-vocal">
            <Square className="h-4 w-4 fill-current" aria-hidden="true" />
            Arrêter
          </button>
        </div>
      )}

      {(etat.etape === "apercu" || etat.etape === "envoi") && (
        <>
          <LecteurVocal url={etat.url} dureeSecondes={etat.duree} libelle="votre nouvel enregistrement" />
          <div className="flex flex-wrap gap-3 max-[639px]:flex-col">
            <button type="button" onClick={envoyer} disabled={etat.etape === "envoi"} className={boutonPlein} data-testid="bouton-envoyer-vocal">
              <Upload className="h-5 w-5" aria-hidden="true" />
              {etat.etape === "envoi" ? "Enregistrement…" : "Enregistrer ce CV vocal"}
            </button>
            <button type="button" onClick={recommencer} disabled={etat.etape === "envoi"} className={boutonContour} data-testid="bouton-recommencer-vocal">
              <RotateCcw className="h-5 w-5" aria-hidden="true" />
              Recommencer
            </button>
          </div>
        </>
      )}

      {message && (
        <p role="alert" className="font-texte text-[15px] font-semibold text-baara-marine dark:text-white" data-testid="message-vocal">
          {message}
        </p>
      )}
    </div>
  );
}
