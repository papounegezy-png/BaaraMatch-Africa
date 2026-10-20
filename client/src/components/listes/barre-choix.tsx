import type { RefObject } from "react";
import { SlidersHorizontal } from "lucide-react";

const pastille =
  "inline-flex min-h-12 items-center gap-2 rounded-full px-4 font-texte text-[15px] font-semibold transition-colors min-[900px]:px-5 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2 focus-visible:ring-offset-baara-papier";

// Sous 900 px, les choix se partagent la ligne en colonnes égales.
const COLONNES = { 3: "max-[899px]:grid-cols-3", 4: "max-[899px]:grid-cols-4" } as const;

export type Choix<T> = { valeur: T; libelle: string; nombre: number; testId: string };

/**
 * Barre collante des pages de liste, sous l'en-tête collant (76 px + 1 px de
 * bordure) : un choix exclusif (contrat, type d'employeur) avec le nombre de
 * résultats (dès 900 px), et, sous 1000 px, le bouton du panneau de filtres
 * (sur sa propre ligne sous 900 px).
 */
export function BarreChoix<T>({ libelleGroupe, choix, actif, onChoix, nbFiltresActifs, filtresOuverts, onBasculerFiltres, idPanneauFiltres, refBoutonFiltres, testId }: {
  libelleGroupe: string;
  choix: Choix<T>[];
  actif: T;
  onChoix: (valeur: T) => void;
  // Bouton du panneau de filtres : absent si la page n'en a pas.
  nbFiltresActifs?: number;
  filtresOuverts?: boolean;
  onBasculerFiltres?: () => void;
  idPanneauFiltres?: string;
  refBoutonFiltres?: RefObject<HTMLButtonElement>;
  testId: string;
}) {
  return (
    <div
      className="sticky top-[calc(env(safe-area-inset-top,0px)+77px)] z-20 border-y border-baara-trait bg-baara-papier/95 backdrop-blur supports-[backdrop-filter]:bg-baara-papier/85 dark:border-white/10 dark:bg-baara-profond/95"
      data-testid={testId}
    >
      <div className="container mx-auto flex flex-wrap items-center gap-3 px-4 py-3">
        <div role="group" aria-label={libelleGroupe} className={`flex flex-1 flex-wrap gap-2 max-[899px]:grid ${COLONNES[choix.length as 3 | 4] ?? ""}`}>
          {choix.map(({ valeur, libelle, nombre, testId: idChoix }) => {
            const estActif = actif === valeur;
            return (
              <button
                key={libelle}
                type="button"
                aria-pressed={estActif}
                onClick={() => onChoix(valeur)}
                className={`${pastille} justify-center ${estActif ? "bg-baara-marine text-white dark:bg-white dark:text-baara-marine" : "text-baara-marine hover:bg-white dark:text-white dark:hover:bg-white/10"}`}
                data-testid={idChoix}
              >
                {libelle}
                <span className={`hidden font-normal tabular-nums min-[900px]:inline ${estActif ? "text-white/80 dark:text-baara-marine/70" : "text-baara-texte dark:text-slate-400"}`}>
                  {nombre}
                </span>
              </button>
            );
          })}
        </div>
        {onBasculerFiltres && (
        <button
          ref={refBoutonFiltres}
          type="button"
          aria-expanded={filtresOuverts}
          aria-controls={idPanneauFiltres}
          onClick={onBasculerFiltres}
          className={`${pastille} justify-center border border-baara-marine/40 text-baara-marine hover:bg-white dark:border-white/40 dark:text-white dark:hover:bg-white/10 max-[899px]:w-full min-[1000px]:hidden`}
          data-testid="bouton-filtres"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          {nbFiltresActifs ? `Filtres (${nbFiltresActifs})` : "Filtres"}
        </button>
        )}
      </div>
    </div>
  );
}
