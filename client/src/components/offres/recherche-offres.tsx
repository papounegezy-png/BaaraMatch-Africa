import { MapPin, Search } from "lucide-react";
import { ChampRecherche } from "@/components/listes/champ-recherche";

export function RechercheOffres({ recherche, lieu, onRecherche, onLieu }: {
  recherche: string;
  lieu: string;
  onRecherche: (v: string) => void;
  onLieu: (v: string) => void;
}) {
  return (
    <div role="search" aria-label="Rechercher une offre" className="grid max-w-[820px] gap-3 min-[900px]:grid-cols-[1.3fr_1fr]">
      <ChampRecherche libelle="Métier ou employeur" icone={Search} valeur={recherche} onChange={onRecherche} testId="input-recherche-offres" />
      <ChampRecherche libelle="Ville ou pays" icone={MapPin} valeur={lieu} onChange={onLieu} testId="input-lieu-offres" autoComplete="address-level2" />
    </div>
  );
}
