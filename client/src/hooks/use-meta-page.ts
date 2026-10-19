import { useEffect } from "react";

type Balise = { selecteur: string; attribut: "name" | "property"; cle: string; valeur: string };

/**
 * Description et balises Open Graph d'une page, posées dans <head> tant que
 * la page est affichée, puis remises à leur valeur d'index.html. Le titre
 * de l'onglet reste géré par useRouteTitle (lib/page-title.ts).
 * L'application est rendue côté client : les robots qui n'exécutent pas
 * JavaScript liront toujours les balises d'index.html.
 */
export function useMetaPage({ titre, description }: { titre: string; description: string }) {
  useEffect(() => {
    const balises: Balise[] = [
      { selecteur: 'meta[name="description"]', attribut: "name", cle: "description", valeur: description },
      { selecteur: 'meta[property="og:title"]', attribut: "property", cle: "og:title", valeur: titre },
      { selecteur: 'meta[property="og:description"]', attribut: "property", cle: "og:description", valeur: description },
    ];
    const restaurations = balises.map(({ selecteur, attribut, cle, valeur }) => {
      let el = document.head.querySelector<HTMLMetaElement>(selecteur);
      const creee = !el;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attribut, cle);
        document.head.appendChild(el);
      }
      const avant = el.getAttribute("content");
      el.setAttribute("content", valeur);
      return () => (creee ? el!.remove() : avant !== null && el!.setAttribute("content", avant));
    });
    return () => restaurations.forEach((restaurer) => restaurer());
  }, [titre, description]);
}
