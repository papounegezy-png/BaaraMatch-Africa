import type { ReactNode } from "react";
import { BandeauListe } from "@/components/listes/bandeau-liste";

/** Bandeau de la page Offres (maquette « Page Offres »). */
export function BandeauOffres({ children }: { children?: ReactNode }) {
  return (
    <BandeauListe
      idTitre="titre-offres"
      lignes={["Des offres de terrain,", "près de chez vous."]}
      phrase={<>BTP, mines et métiers techniques&nbsp;: postulez en quelques clics avec votre profil.</>}
      testIdTitre="text-jobs-page-title"
    >
      {children}
    </BandeauListe>
  );
}
