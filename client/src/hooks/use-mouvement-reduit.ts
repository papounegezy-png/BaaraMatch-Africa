import { useEffect, useState } from "react";

const REQUETE = "(prefers-reduced-motion: reduce)";

function lireMouvementReduit(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(REQUETE).matches;
}

/**
 * Vrai quand le système demande de réduire les animations. Suit les
 * changements en direct (réglage modifié pendant que la page est ouverte).
 */
export function useMouvementReduit(): boolean {
  const [reduit, setReduit] = useState(lireMouvementReduit);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia(REQUETE);
    const surChangement = () => setReduit(media.matches);
    surChangement();
    // Safari < 14 n'a que addListener/removeListener.
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", surChangement);
      return () => media.removeEventListener("change", surChangement);
    }
    media.addListener(surChangement);
    return () => media.removeListener(surChangement);
  }, []);

  return reduit;
}
