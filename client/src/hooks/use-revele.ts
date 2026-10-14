import { useEffect, useRef, useState, type RefObject } from "react";
import { useMouvementReduit } from "./use-mouvement-reduit";

interface OptionsRevele {
  /** Part de l'élément visible avant de le révéler (0,12 par défaut). */
  seuil?: number;
  /** Marge autour de la fenêtre, comme `rootMargin` d'IntersectionObserver. */
  marge?: string;
}

/**
 * `[ref, visible]` : `visible` passe à true la première fois que l'élément
 * entre à l'écran, puis l'observation s'arrête (pas de re-masquage).
 * Sans IntersectionObserver, ou si le mouvement est réduit, `visible` est
 * true d'emblée : le contenu n'est jamais laissé invisible.
 *
 *   const [ref, visible] = useRevele<HTMLElement>();
 *   <section ref={ref} className={`revele ${visible ? "visible" : ""}`}>
 */
export function useRevele<T extends Element = HTMLDivElement>(
  options: OptionsRevele = {},
): [RefObject<T>, boolean] {
  const { seuil = 0.12, marge } = options;
  const reduit = useMouvementReduit();
  const ref = useRef<T>(null);
  const sansObservateur = typeof window === "undefined" || typeof IntersectionObserver === "undefined";
  const [visible, setVisible] = useState(sansObservateur || reduit);

  useEffect(() => {
    if (visible) return;
    if (reduit || sansObservateur) {
      setVisible(true);
      return;
    }
    const element = ref.current;
    if (!element) return;
    const observateur = new IntersectionObserver(
      (entrees) => {
        if (entrees.some((entree) => entree.isIntersecting)) {
          setVisible(true);
          observateur.disconnect();
        }
      },
      { threshold: seuil, rootMargin: marge },
    );
    observateur.observe(element);
    return () => observateur.disconnect();
  }, [visible, reduit, sansObservateur, seuil, marge]);

  return [ref, visible];
}
