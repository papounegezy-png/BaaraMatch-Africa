import { useEffect } from "react";

// Page précédente dans le site (navigation interne), pour les liens de
// retour : null si l'on arrive de l'extérieur (lien partagé, moteur de
// recherche) ou après un rechargement.

let courante: string | null = null;
let precedente: string | null = null;

function surNavigation() {
  const chemin = window.location.pathname;
  const adresse = chemin + window.location.search;
  // Même chemin (seule la recherche change, ex. filtres d'une liste) : même
  // page, mise à jour pour y revenir dans le même état.
  if (courante && courante.split("?")[0] !== chemin) precedente = courante;
  courante = adresse;
}

/**
 * À appeler une fois, à la racine de l'application. Wouter émet
 * « pushState » et « replaceState » à chaque changement d'adresse ;
 * « popstate » couvre Retour et Suivant.
 */
export function useSuiviPagePrecedente() {
  useEffect(() => {
    surNavigation();
    const evenements = ["pushState", "replaceState", "popstate"];
    evenements.forEach((e) => window.addEventListener(e, surNavigation));
    return () => evenements.forEach((e) => window.removeEventListener(e, surNavigation));
  }, []);
}

export function pagePrecedente(): string | null {
  return precedente;
}
