import type { ReactNode, RefObject } from "react";
import { MapPin, Search } from "lucide-react";
import { BandeauListe } from "@/components/listes/bandeau-liste";
import { BarreChoix } from "@/components/listes/barre-choix";
import { ChampRecherche } from "@/components/listes/champ-recherche";
import type { TypeChoisi } from "@/lib/employeurs";

/** Bandeau de la page Employeurs (maquette « Page Employeurs »). */
export function BandeauEmployeurs({ children }: { children?: ReactNode }) {
  return (
    <BandeauListe
      idTitre="titre-employeurs"
      lignes={["Les employeurs", "qui recrutent."]}
      phrase="Entreprises et agences présentes sur BaaraMatch, avec leurs offres en cours."
      testIdTitre="text-agencies-page-title"
    >
      {children}
    </BandeauListe>
  );
}

export function RechercheEmployeurs({ recherche, lieu, onRecherche, onLieu }: {
  recherche: string;
  lieu: string;
  onRecherche: (v: string) => void;
  onLieu: (v: string) => void;
}) {
  return (
    <div role="search" aria-label="Rechercher un employeur" className="grid max-w-[760px] gap-3 min-[900px]:grid-cols-2">
      <ChampRecherche libelle="Nom de l'employeur" icone={Search} valeur={recherche} onChange={onRecherche} testId="input-recherche-employeurs" autoComplete="organization" />
      <ChampRecherche libelle="Ville ou pays" icone={MapPin} valeur={lieu} onChange={onLieu} testId="input-lieu-employeurs" autoComplete="address-level2" />
    </div>
  );
}

/** Barre collante : type d'employeur et bouton des filtres. */
export function BarreType({ type, comptes, onType, ...barre }: {
  type: TypeChoisi;
  comptes: Record<"tous" | "entreprise" | "agence", number>;
  onType: (t: TypeChoisi) => void;
  nbFiltresActifs?: number;
  filtresOuverts?: boolean;
  onBasculerFiltres?: () => void;
  idPanneauFiltres?: string;
  refBoutonFiltres?: RefObject<HTMLButtonElement>;
}) {
  return (
    <BarreChoix<TypeChoisi>
      libelleGroupe="Type d'employeur"
      testId="barre-type"
      choix={[
        { valeur: null, libelle: "Tous", nombre: comptes.tous, testId: "bouton-type-tous" },
        { valeur: "entreprise", libelle: "Entreprises", nombre: comptes.entreprise, testId: "bouton-type-entreprise" },
        { valeur: "agence", libelle: "Agences", nombre: comptes.agence, testId: "bouton-type-agence" },
      ]}
      actif={type}
      onChoix={onType}
      {...barre}
    />
  );
}
