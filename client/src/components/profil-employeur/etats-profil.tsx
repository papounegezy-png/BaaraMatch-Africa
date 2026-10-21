import { Link } from "wouter";
import { boutonPlein, EtatErreur } from "@/components/listes/etats-liste";

const barre = "rounded-full bg-baara-clair motion-safe:animate-pulse dark:bg-white/10";

/** Profil en cours de chargement : mêmes dimensions que la carte réelle. */
export function SqueletteProfil() {
  return (
    <div aria-busy="true" aria-live="polite" data-testid="chargement-profil">
      <p className="sr-only">Chargement du profil…</p>
      <div aria-hidden="true" className="overflow-hidden rounded-[20px] border-[1.5px] border-baara-trait bg-white dark:border-white/10 dark:bg-white/[0.04] min-[900px]:rounded-3xl">
        <div className="h-32 border-b-4 border-baara-or bg-baara-marine min-[900px]:h-44" />
        <div className="flex flex-wrap items-start gap-5 px-5 pb-6 min-[900px]:px-8">
          <div className="-mt-11 h-[88px] w-[88px] flex-none rounded-[20px] border-4 border-white bg-baara-clair min-[900px]:-mt-[52px] min-[900px]:h-[104px] min-[900px]:w-[104px] min-[900px]:rounded-3xl dark:border-baara-profond" />
          <div className="min-w-0 flex-1 basis-60 space-y-3 pt-3 min-[640px]:pt-6">
            <div className={`${barre} h-8 w-3/5`} />
            <div className={`${barre} h-4 w-2/5`} />
          </div>
        </div>
        <div className="flex gap-6 border-t-[1.5px] border-baara-trait px-6 py-5 dark:border-white/10">
          {[16, 14, 18, 10].map((l, i) => <div key={i} className={`${barre} h-4`} style={{ width: `${l * 4}px` }} />)}
        </div>
        <div className="flex flex-wrap gap-5 border-t-[1.5px] border-baara-trait bg-baara-papier px-4 py-5 dark:border-white/10 dark:bg-baara-profond min-[900px]:px-8 min-[900px]:py-7">
          <div className="h-48 flex-[999_1_560px] rounded-[20px] border-[1.5px] border-baara-trait bg-white dark:border-white/10 dark:bg-white/[0.04]" />
          <div className="h-48 flex-[1_1_300px] rounded-[20px] border-[1.5px] border-baara-trait bg-white dark:border-white/10 dark:bg-white/[0.04]" />
        </div>
      </div>
    </div>
  );
}

/** Lignes fantômes d'une liste d'offres (aperçu, onglet Offres). */
export function SquelettesLignes({ nombre = 3 }: { nombre?: number }) {
  return (
    <div aria-busy="true" data-testid="chargement-offres-profil">
      <p className="sr-only">Chargement des offres…</p>
      <ul aria-hidden="true" className="space-y-4">
        {Array.from({ length: nombre }, (_, i) => (
          <li key={i} className="space-y-2">
            <div className={`${barre} h-4 w-1/2`} />
            <div className={`${barre} h-3.5 w-1/3`} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ErreurProfil({ onReessayer }: { onReessayer: () => void }) {
  return <EtatErreur titre="Le profil n'a pas pu être chargé" texte="Vérifiez votre connexion puis réessayez." onReessayer={onReessayer} testId="erreur-profil" />;
}

/** Erreur discrète dans un bloc (offres), sans casser la mise en page. */
export function ErreurBloc({ texte, onReessayer }: { texte: string; onReessayer: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-x-4 gap-y-2 font-texte text-[15px] text-baara-marine dark:text-white" data-testid="erreur-bloc">
      <span>{texte}</span>
      <button type="button" onClick={onReessayer} className="min-h-11 rounded-sm font-semibold text-baara-bleu underline underline-offset-4 hover:text-baara-marine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu dark:text-baara-moyen">
        Réessayer
      </button>
    </div>
  );
}

/** Employeur introuvable (supprimé, ou adresse erronée). */
export function EmployeurIntrouvable() {
  return (
    <div className="rounded-[20px] border-[1.5px] border-dashed border-baara-trait bg-white px-6 py-14 text-center dark:border-white/15 dark:bg-white/[0.04] min-[900px]:rounded-3xl" data-testid="employeur-introuvable">
      <h1 className="font-titre text-[26px] font-extrabold tracking-[-0.02em] text-baara-marine dark:text-white min-[900px]:text-[32px]">Employeur introuvable</h1>
      <p className="mx-auto mt-3 max-w-md text-pretty font-texte text-baara-texte dark:text-slate-300">
        Ce profil n'existe pas ou n'est plus disponible.
      </p>
      <Link href="/agencies" className={`mt-6 ${boutonPlein}`}>Retour aux employeurs</Link>
    </div>
  );
}
