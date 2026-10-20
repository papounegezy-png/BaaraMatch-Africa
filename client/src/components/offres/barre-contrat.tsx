import { SlidersHorizontal } from "lucide-react";
import { CONTRATS_BARRE, type ContratBarre } from "@/lib/filtre-offres";

const pastille =
  "inline-flex min-h-12 items-center gap-2 rounded-full px-4 font-texte text-[15px] font-semibold transition-colors min-[900px]:px-5 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2 focus-visible:ring-offset-baara-papier";

/**
 * Barre collante de la page Offres, sous l'en-tête collant (76 px + 1 px de
 * bordure) : choix du contrat avec le nombre de résultats, et, sous 1000 px,
 * le bouton qui ouvre le panneau des filtres.
 */
export function BarreContrat({ contrat, comptes, onContrat, nbFiltresActifs, filtresOuverts, onBasculerFiltres, idPanneauFiltres }: {
  contrat: ContratBarre | null;
  comptes: Record<"toutes" | ContratBarre, number>;
  onContrat: (c: ContratBarre | null) => void;
  nbFiltresActifs: number;
  filtresOuverts: boolean;
  onBasculerFiltres: () => void;
  idPanneauFiltres: string;
}) {
  const choix: { valeur: ContratBarre | null; libelle: string; nombre: number }[] = [
    { valeur: null, libelle: "Toutes", nombre: comptes.toutes },
    ...CONTRATS_BARRE.map((c) => ({ valeur: c, libelle: c, nombre: comptes[c] })),
  ];

  return (
    <div
      className="sticky top-[calc(env(safe-area-inset-top,0px)+77px)] z-20 border-y border-baara-trait bg-baara-papier/95 backdrop-blur supports-[backdrop-filter]:bg-baara-papier/85 dark:border-white/10 dark:bg-baara-profond/95"
      data-testid="barre-contrat"
    >
      <div className="container mx-auto flex flex-wrap items-center gap-3 px-4 py-3">
        <div role="group" aria-label="Type de contrat" className="flex flex-1 flex-wrap gap-2 max-[899px]:grid max-[899px]:grid-cols-4">
          {choix.map(({ valeur, libelle, nombre }) => {
            const actif = contrat === valeur;
            return (
              <button
                key={libelle}
                type="button"
                aria-pressed={actif}
                onClick={() => onContrat(valeur)}
                className={`${pastille} justify-center ${actif ? "bg-baara-marine text-white dark:bg-white dark:text-baara-marine" : "text-baara-marine hover:bg-white dark:text-white dark:hover:bg-white/10"}`}
                data-testid={`bouton-contrat-${valeur ?? "toutes"}`}
              >
                {libelle}
                <span className={`hidden font-normal tabular-nums min-[900px]:inline ${actif ? "text-white/80 dark:text-baara-marine/70" : "text-baara-texte dark:text-slate-400"}`}>
                  {nombre}
                </span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          aria-expanded={filtresOuverts}
          aria-controls={idPanneauFiltres}
          onClick={onBasculerFiltres}
          className={`${pastille} justify-center border border-baara-marine/40 text-baara-marine hover:bg-white dark:border-white/40 dark:text-white dark:hover:bg-white/10 max-[899px]:w-full min-[1000px]:hidden`}
          data-testid="bouton-filtres"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          {nbFiltresActifs > 0 ? `Filtres (${nbFiltresActifs})` : "Filtres"}
        </button>
      </div>
    </div>
  );
}
