import { useEffect, useId, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

function temps(secondes: number): string {
  const s = Math.max(0, Math.floor(secondes));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Lecteur du CV vocal : lecture / pause, position réglable au clavier,
 * temps écoulé et durée. Écoute seulement : pas de bouton de
 * téléchargement ni de menu du lecteur natif (un navigateur ne peut pas
 * empêcher toute copie d'un son qu'il lit).
 * `dureeSecondes` : la durée mesurée à l'enregistrement ; les fichiers
 * WebM de MediaRecorder n'annoncent souvent pas la leur.
 */
export function LecteurVocal({ url, dureeSecondes, libelle = "CV vocal", compact = false }: { url: string; dureeSecondes?: number | null; libelle?: string; compact?: boolean }) {
  const audio = useRef<HTMLAudioElement>(null);
  const idPosition = useId();
  const [lecture, setLecture] = useState(false);
  const [position, setPosition] = useState(0);
  const [duree, setDuree] = useState(dureeSecondes ?? 0);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    setLecture(false);
    setPosition(0);
    setErreur(false);
    setDuree(dureeSecondes ?? 0);
  }, [url, dureeSecondes]);

  const basculer = async () => {
    const a = audio.current;
    if (!a) return;
    if (!a.paused) return a.pause();
    try {
      await a.play();
      setErreur(false);
    } catch {
      setErreur(true);
    }
  };

  const regler = (valeur: number) => {
    const a = audio.current;
    if (!a) return;
    a.currentTime = valeur;
    setPosition(valeur);
  };

  const total = duree > 0 ? duree : 0;

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border-[1.5px] border-baara-moyen bg-baara-clair dark:border-white/15 dark:bg-white/5 ${compact ? "px-3 py-2" : "px-4 py-3"}`}
      onContextMenu={(e) => e.preventDefault()}
      data-testid="lecteur-vocal"
    >
      <audio
        ref={audio}
        src={url}
        preload="metadata"
        controlsList="nodownload noplaybackrate"
        onPlay={() => setLecture(true)}
        onPause={() => setLecture(false)}
        onEnded={() => { setLecture(false); setPosition(0); }}
        onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => { const d = e.currentTarget.duration; if (Number.isFinite(d) && d > 0) setDuree(d); }}
        onError={() => setErreur(true)}
      />
      <button
        type="button"
        onClick={basculer}
        aria-label={lecture ? `Mettre en pause : ${libelle}` : `Écouter : ${libelle}`}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-baara-bleu text-white hover:bg-baara-marine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2"
        data-testid="bouton-lecture-vocal"
      >
        {lecture ? <Pause className="h-5 w-5" aria-hidden="true" /> : <Play className="ml-0.5 h-5 w-5" aria-hidden="true" />}
      </button>
      <div className="min-w-0 flex-1">
        <label htmlFor={idPosition} className="sr-only">Position dans {libelle}</label>
        <input
          id={idPosition}
          type="range"
          min={0}
          max={total || 1}
          step={1}
          value={Math.min(position, total || 1)}
          onChange={(e) => regler(Number(e.target.value))}
          aria-valuetext={`${temps(position)} sur ${total ? temps(total) : "durée inconnue"}`}
          disabled={!total}
          className="h-2 w-full cursor-pointer accent-baara-bleu disabled:cursor-default"
        />
        <p className="mt-1 flex justify-between font-texte text-[13.5px] tabular-nums text-baara-texte dark:text-slate-300" aria-hidden="true">
          <span>{temps(position)}</span>
          <span>{total ? temps(total) : "—"}</span>
        </p>
        {erreur && (
          <p role="alert" className="mt-1 font-texte text-[14px] text-baara-marine dark:text-white">
            Lecture impossible. Vérifiez votre connexion, puis réessayez.
          </p>
        )}
      </div>
    </div>
  );
}
