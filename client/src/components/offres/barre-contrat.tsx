import type { RefObject } from "react";
import { BarreChoix } from "@/components/listes/barre-choix";
import { CONTRATS_BARRE, type ContratBarre } from "@/lib/filtre-offres";

/** Barre collante de la page Offres : contrat et bouton des filtres. */
export function BarreContrat({ contrat, comptes, onContrat, ...barre }: {
  contrat: ContratBarre | null;
  comptes: Record<"toutes" | ContratBarre, number>;
  onContrat: (c: ContratBarre | null) => void;
  nbFiltresActifs: number;
  filtresOuverts: boolean;
  onBasculerFiltres: () => void;
  idPanneauFiltres: string;
  refBoutonFiltres?: RefObject<HTMLButtonElement>;
}) {
  return (
    <BarreChoix<ContratBarre | null>
      libelleGroupe="Type de contrat"
      testId="barre-contrat"
      choix={[
        { valeur: null, libelle: "Toutes", nombre: comptes.toutes, testId: "bouton-contrat-toutes" },
        ...CONTRATS_BARRE.map((c) => ({ valeur: c, libelle: c, nombre: comptes[c], testId: `bouton-contrat-${c}` })),
      ]}
      actif={contrat}
      onChoix={onContrat}
      {...barre}
    />
  );
}
