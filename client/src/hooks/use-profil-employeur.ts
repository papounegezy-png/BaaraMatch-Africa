import { useQuery } from "@tanstack/react-query";
import type { ProfilEmployeur, TypeEmployeur } from "@/types/profil-employeur";

export const cleProfil = (id: string) => ["/api/employeurs", id];

class Introuvable extends Error {}

/**
 * Profil d'un employeur (GET /api/employeurs/:id). `introuvable` : aucun
 * employeur à cet identifiant, ou pas du type de l'adresse (une agence sous
 * /companies/:id).
 */
export function useProfilEmployeur(type: TypeEmployeur, id: string) {
  const requete = useQuery<ProfilEmployeur>({
    queryKey: cleProfil(id),
    queryFn: async () => {
      const r = await fetch(`/api/employeurs/${encodeURIComponent(id)}`, { credentials: "include" });
      if (r.status === 404) throw new Introuvable();
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    },
    retry: false,
  });
  const introuvable = requete.error instanceof Introuvable || (!!requete.data && requete.data.type !== type);
  return {
    profil: introuvable ? undefined : requete.data,
    chargement: requete.isLoading,
    erreur: requete.isError && !introuvable && !requete.isFetching,
    introuvable,
    reessayer: () => requete.refetch(),
  };
}
