import { useQuery } from "@tanstack/react-query";
import { profilAgence, profilEntreprise, type AgenceApi, type EntrepriseApi, type ProfilEmployeur, type TypeEmployeur } from "@/types/profil-employeur";

/**
 * Profil d'un employeur, lu dans la liste de son type (mêmes requêtes et même
 * cache que les anciennes pages). `introuvable` : la liste est chargée mais
 * l'employeur n'y est pas.
 */
export function useProfilEmployeur(type: TypeEmployeur, id: string) {
  const requete = useQuery<(AgenceApi | EntrepriseApi)[]>({ queryKey: [type === "agence" ? "/api/agencies" : "/api/companies"] });
  const brut = requete.data?.find((e) => e.id === id);
  const profil: ProfilEmployeur | undefined = brut
    ? type === "agence" ? profilAgence(brut as AgenceApi) : profilEntreprise(brut as EntrepriseApi)
    : undefined;
  return {
    profil,
    chargement: requete.isLoading,
    erreur: requete.isError,
    introuvable: !!requete.data && !brut,
    reessayer: () => requete.refetch(),
  };
}
