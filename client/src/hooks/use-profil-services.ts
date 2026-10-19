import { useCallback, useEffect, useState } from "react";
import { ordreProfils, type Profil } from "@/donnees/services";

const PROFIL_PAR_DEFAUT: Profil = "candidats";

function profilDuHash(): Profil | null {
  const ancre = decodeURIComponent(window.location.hash.slice(1));
  return (ordreProfils as string[]).includes(ancre) ? (ancre as Profil) : null;
}

/**
 * Profil affiché sur /services, lu depuis l'ancre (#candidats, #entreprises,
 * #agences). Un lien externe ou du pied de page qui change l'ancre change le
 * profil ; un clic sur le sélecteur met l'ancre à jour par replaceState,
 * marqué « sansDefilement » pour que useDefilementAncre ne fasse pas sauter
 * la page. `tick` augmente à chaque changement : il alterne les classes
 * pop-a / pop-b du panneau pour rejouer son entrée.
 */
export function useProfilServices() {
  const [profil, setProfil] = useState<Profil>(() => profilDuHash() ?? PROFIL_PAR_DEFAUT);
  const [tick, setTick] = useState(0);

  const appliquer = useCallback((suivant: Profil) => {
    setProfil((actuel) => {
      if (actuel !== suivant) setTick((t) => t + 1);
      return suivant;
    });
  }, []);

  useEffect(() => {
    const synchroniser = () => {
      const duHash = profilDuHash();
      if (duHash) appliquer(duHash);
    };
    // wouter émet pushState / replaceState sur window à chaque navigation.
    const evenements = ["hashchange", "popstate", "pushState", "replaceState"];
    evenements.forEach((e) => window.addEventListener(e, synchroniser));
    return () => evenements.forEach((e) => window.removeEventListener(e, synchroniser));
  }, [appliquer]);

  const choisirProfil = useCallback((suivant: Profil) => {
    appliquer(suivant);
    const { pathname, search } = window.location;
    window.history.replaceState({ ...(window.history.state ?? {}), sansDefilement: true }, "", `${pathname}${search}#${suivant}`);
  }, [appliquer]);

  return { profil, tick, choisirProfil };
}
