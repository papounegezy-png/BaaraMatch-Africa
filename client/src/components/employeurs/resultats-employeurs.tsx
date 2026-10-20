import { useId } from "react";
import { EtatErreur, EtatVide, focusVisible } from "@/components/listes/etats-liste";
import { libelleAffiches, libelleNombre, TRIS, type Tri } from "@/lib/etat-employeurs";

/** « N employeurs » (annoncé à chaque changement) et « Trier par ». */
export function EnTeteEmployeurs({ total, tri, onTri }: { total: number; tri: Tri; onTri: (t: Tri) => void }) {
  const idTri = useId();
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b-2 border-baara-marine pb-3 dark:border-white">
      <h2 aria-live="polite" aria-atomic="true" className="font-titre text-xl font-bold tabular-nums text-baara-marine dark:text-white" data-testid="nombre-employeurs">
        {libelleNombre(total)}
      </h2>
      <div className="flex items-center gap-2">
        <label htmlFor={idTri} className="font-texte text-[15px] text-baara-texte dark:text-slate-300">Trier par</label>
        <select
          id={idTri}
          value={tri}
          onChange={(e) => onTri(e.target.value as Tri)}
          className={`min-h-11 rounded-full border border-baara-marine/35 bg-white pl-4 pr-8 font-texte text-[15px] font-semibold text-baara-marine dark:border-white/30 dark:bg-white/5 dark:text-white ${focusVisible}`}
          data-testid="select-tri-employeurs"
        >
          {TRIS.map((t) => <option key={t.valeur} value={t.valeur}>{t.libelle}</option>)}
        </select>
      </div>
    </div>
  );
}

/** Six cartes fantômes, de la taille et de la grille des vraies. */
export function SquelettesEmployeurs() {
  const barre = "rounded-full bg-baara-clair dark:bg-white/10";
  return (
    <div aria-busy="true" aria-live="polite" data-testid="chargement-employeurs">
      <p className="sr-only">Chargement des employeurs…</p>
      <ul aria-hidden="true" className="grid gap-3 min-[640px]:grid-cols-2 min-[900px]:gap-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <li key={i} className="flex items-start gap-4 rounded-2xl border-[1.5px] border-baara-trait bg-white px-4 py-3.5 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="h-[52px] w-[52px] flex-none rounded-xl bg-baara-clair motion-safe:animate-pulse dark:bg-white/10" />
            <div className="flex-1 space-y-2.5 motion-safe:animate-pulse">
              <div className={`${barre} h-5 w-3/5`} />
              <div className={`${barre} h-4 w-2/5`} />
              <div className="flex gap-1.5 pt-0.5">
                <div className={`${barre} h-6 w-20`} />
                <div className={`${barre} h-6 w-28`} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AucunEmployeur({ onReinitialiser }: { onReinitialiser: () => void }) {
  return <EtatVide titre="Aucun employeur trouvé" texte="Essayez un autre nom, une autre ville, ou retirez un filtre." onReinitialiser={onReinitialiser} testId="aucun-employeur" />;
}

export function ErreurEmployeurs({ onReessayer }: { onReessayer: () => void }) {
  return <EtatErreur titre="Les employeurs n'ont pas pu être chargés" onReessayer={onReessayer} testId="erreur-employeurs" />;
}

/** « 12 sur 48 » et « Afficher plus » ; rien quand tout est affiché. */
export function AfficherPlus({ affiches, total, onPlus }: { affiches: number; total: number; onPlus: () => void }) {
  if (affiches >= total) return null;
  return (
    <div className="mt-8 flex flex-col items-center gap-3" data-testid="afficher-plus">
      <p className="font-texte text-[15px] tabular-nums text-baara-texte dark:text-slate-300">{libelleAffiches(affiches, total)}</p>
      <button
        type="button"
        onClick={onPlus}
        className={`inline-flex min-h-12 items-center rounded-full border-[1.5px] border-baara-marine px-6 font-texte font-semibold text-baara-marine hover:bg-white dark:border-white dark:text-white dark:hover:bg-white/10 ${focusVisible}`}
        data-testid="bouton-afficher-plus"
      >
        Afficher plus
      </button>
    </div>
  );
}
