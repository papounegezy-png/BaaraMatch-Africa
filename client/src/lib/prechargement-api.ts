import { queryClient } from "@/lib/queryClient";

declare global {
  interface Window { __requetesPrechargees?: Record<string, Promise<unknown>> }
}

/**
 * Reprend les requêtes lancées dès index.html (selon l'adresse de la page)
 * pour alimenter le cache avant le premier rendu. Une seule fois ; un
 * échec (session expirée par exemple) laisse la page refaire sa requête.
 * prefetchQuery : la requête est « en cours » pour React Query, la page
 * l'attend au lieu d'en relancer une.
 */
export function reprendrePrechargement() {
  const prechargees = window.__requetesPrechargees;
  window.__requetesPrechargees = undefined;
  if (!prechargees) return;
  for (const [url, promesse] of Object.entries(prechargees)) {
    if (queryClient.getQueryState([url])) continue;
    void queryClient.prefetchQuery({ queryKey: [url], queryFn: () => promesse });
  }
}
