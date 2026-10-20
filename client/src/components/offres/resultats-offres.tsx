import { forwardRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { libelleResultats, pagesAAfficher } from "@/lib/etat-offres";
import { EtatErreur, EtatVide, focusVisible as focus } from "@/components/listes/etats-liste";


/**
 * « 1–20 sur N offres », titre de la liste : il reçoit le focus après un
 * changement de page. Le tri par employeurs mieux notés de la maquette est
 * absent : les notes n'ont pas encore de source réelle.
 */
export const EnTeteResultats = forwardRef<HTMLHeadingElement, { page: number; total: number }>(
  function EnTeteResultats({ page, total }, ref) {
    return (
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b-2 border-baara-marine pb-3 dark:border-white">
        <h2
          ref={ref}
          tabIndex={-1}
          aria-live="polite"
          aria-atomic="true"
          className="rounded-sm font-titre text-lg font-bold tabular-nums text-baara-marine focus:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu dark:text-white"
          data-testid="nombre-resultats"
        >
          {libelleResultats(page, total)}
        </h2>
        <p className="font-texte text-[15px] text-baara-texte dark:text-slate-300">Les plus récentes d'abord</p>
      </div>
    );
  },
);

/** Pagination numérique : Précédent, 1 … 4 5 6 … 20, Suivant. */
export function PaginationOffres({ page, nbPages, onPage }: { page: number; nbPages: number; onPage: (p: number) => void }) {
  if (nbPages <= 1) return null;
  const pastille = `inline-flex min-h-11 min-w-11 items-center justify-center rounded-full font-texte text-[15px] font-semibold tabular-nums ${focus}`;
  const fleche = `${pastille} gap-1 border-[1.5px] border-baara-trait px-3 text-baara-marine sm:px-4 hover:border-baara-marine disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-baara-trait dark:border-white/15 dark:text-white`;
  return (
    <nav aria-label="Pages de résultats" className="mt-8" data-testid="pagination-offres">
      <ul className="flex flex-wrap items-center justify-center gap-1.5">
        <li>
          <button type="button" className={fleche} disabled={page <= 1} onClick={() => onPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            <span className="max-sm:sr-only">Précédent</span>
          </button>
        </li>
        {pagesAAfficher(page, nbPages).map((n, i) =>
          n === "…" ? (
            <li key={`trou-${i}`} aria-hidden="true" className="min-w-6 text-center text-baara-texte max-sm:hidden">…</li>
          ) : (
            <li key={n} className="max-sm:hidden">
              <button
                type="button"
                aria-label={`Page ${n}`}
                aria-current={n === page ? "page" : undefined}
                onClick={() => onPage(n)}
                className={`${pastille} px-3 ${n === page ? "bg-baara-marine text-white dark:bg-white dark:text-baara-marine" : "text-baara-marine hover:bg-baara-clair dark:text-white dark:hover:bg-white/10"}`}
              >
                {n}
              </button>
            </li>
          ),
        )}
        {/* Sous 640 px, 9 pastilles ne tiennent pas sur une ligne. */}
        <li className="px-2 font-texte text-[15px] font-semibold tabular-nums text-baara-marine dark:text-white sm:hidden">
          Page {page} sur {nbPages}
        </li>
        <li>
          <button type="button" className={fleche} disabled={page >= nbPages} onClick={() => onPage(page + 1)}>
            <span className="max-sm:sr-only">Suivant</span>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </li>
      </ul>
    </nav>
  );
}

/** Quatre cartes fantômes de la taille des vraies, pendant le chargement. */
export function SquelettesOffres() {
  const barre = "rounded-full bg-baara-clair dark:bg-white/10";
  return (
    <div aria-busy="true" aria-live="polite" data-testid="chargement-offres">
      <p className="sr-only">Chargement des offres…</p>
      <ul className="space-y-4" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="rounded-2xl border-[1.5px] border-baara-trait bg-white px-4 py-[18px] dark:border-white/10 dark:bg-white/[0.04] min-[900px]:rounded-[20px] min-[900px]:px-6 min-[900px]:py-[22px]">
            <div className="motion-safe:animate-pulse">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2.5">
                  <div className={`${barre} h-5 w-3/5`} />
                  <div className={`${barre} h-4 w-2/5`} />
                </div>
                <div className="h-12 w-12 flex-none rounded-[14px] bg-baara-clair dark:bg-white/10 min-[900px]:h-14 min-[900px]:w-14" />
              </div>
              <div className={`${barre} mt-5 h-4 w-4/5`} />
              <div className={`${barre} mt-4 h-3.5 w-full`} />
              <div className={`${barre} mt-2 h-3.5 w-11/12`} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AucuneOffre({ onReinitialiser }: { onReinitialiser: () => void }) {
  return <EtatVide titre="Aucune offre trouvée" texte="Essayez un autre métier, une autre ville, ou retirez un filtre." onReinitialiser={onReinitialiser} testId="aucune-offre" />;
}

export function ErreurOffres({ onReessayer }: { onReessayer: () => void }) {
  return <EtatErreur titre="Les offres n'ont pas pu être chargées" onReessayer={onReessayer} testId="erreur-offres" />;
}
