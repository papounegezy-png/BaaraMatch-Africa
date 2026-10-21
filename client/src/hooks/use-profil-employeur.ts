import { useQuery } from "@tanstack/react-query";
import type { ProfilEmployeur, TypeEmployeur } from "@/types/profil-employeur";

export const cleProfil = (id: string) => ["/api/employeurs", id];

declare global {
  // Profil demandé dès le HTML (index.html) ; donnees renseigné à son arrivée.
  interface Window { __profilPrecharge?: { json: Promise<ProfilEmployeur>; donnees?: ProfilEmployeur } }
}

class Introuvable extends Error {}

// Préchargement d'index.html, s'il porte sur cet employeur (adresse
// d'arrivée) ; utilisé une seule fois.
const prechargement = (id: string) => {
  const p = window.__profilPrecharge;
  return p && window.location.pathname.split("/")[2] === id ? p : undefined;
};

async function chargerProfil(id: string): Promise<ProfilEmployeur> {
  const p = prechargement(id);
  window.__profilPrecharge = undefined;
  if (p) {
    try {
      return await p.json;
    } catch {
      // 404 ou erreur réseau : la requête ci-dessous dit laquelle.
    }
  }
  const r = await fetch(`/api/employeurs/${encodeURIComponent(id)}`, { credentials: "include" });
  if (r.status === 404) throw new Introuvable();
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

/**
 * Profil d'un employeur (GET /api/employeurs/:id). `introuvable` : aucun
 * employeur à cet identifiant, ou pas du type de l'adresse (une agence sous
 * /companies/:id).
 */
export function useProfilEmployeur(type: TypeEmployeur, id: string) {
  const requete = useQuery<ProfilEmployeur>({
    queryKey: cleProfil(id),
    queryFn: () => chargerProfil(id),
    // Déjà arrivé : affiché dès le premier rendu, sans squelette.
    initialData: () => prechargement(id)?.donnees,
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
