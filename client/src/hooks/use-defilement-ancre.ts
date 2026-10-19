import { useEffect } from "react";

// Durée maximale d'attente de la cible : la page visée peut encore charger
// (route paresseuse, données) quand l'URL change.
const ATTENTE_MAX = 2000;

/**
 * Fait défiler jusqu'à l'ancre de l'URL (#faq, #demo…) après une
 * navigation. Le navigateur ne le fait pas seul dans une application d'une
 * seule page : la cible n'existe pas encore quand l'URL change. wouter émet
 * « pushState » / « replaceState » sur window à chaque navigation.
 */
export function useDefilementAncre() {
  useEffect(() => {
    let annule = false;
    let image = 0;

    const defiler = () => {
      cancelAnimationFrame(image);
      const ancre = decodeURIComponent(window.location.hash.slice(1));
      if (!ancre) return;
      // Ancre mise à jour sans navigation (ex. sélecteur de profil de
      // /services) : pas de défilement.
      if (window.history.state?.sansDefilement) return;
      const debut = performance.now();
      const chercher = () => {
        if (annule) return;
        const cible = document.getElementById(ancre);
        if (cible) {
          const reduit = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
          cible.scrollIntoView({ behavior: reduit ? "auto" : "smooth", block: "start" });
        } else if (performance.now() - debut < ATTENTE_MAX) {
          image = requestAnimationFrame(chercher);
        }
      };
      // Laisse d'abord React rendre la nouvelle route.
      image = requestAnimationFrame(chercher);
    };

    defiler();
    const evenements = ["pushState", "replaceState", "popstate", "hashchange"];
    evenements.forEach((e) => window.addEventListener(e, defiler));
    return () => {
      annule = true;
      cancelAnimationFrame(image);
      evenements.forEach((e) => window.removeEventListener(e, defiler));
    };
  }, []);
}
