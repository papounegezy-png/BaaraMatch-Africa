import { useEffect } from "react";

const SITE = "BaaraMatch";
const HOME_TITLE = "BaaraMatch Africa - Emploi et Recrutement en Afrique";

// First match wins. `null` = the page sets its own title once its data has
// loaded (job, company, agency detail) or is the 404 — the router must not
// overwrite it, since a parent's effect runs after its children's.
const ROUTE_TITLES: [RegExp, string | null][] = [
  [/^\/$/, HOME_TITLE],
  [/^\/login$/, "Connexion"],
  [/^\/register\/organisation$/, "Créer un compte employeur"],
  [/^\/register$/, "Créer un compte"],
  [/^\/claim\//, "Activer votre compte"],
  [/^\/satisfaction\//, "Enquête de satisfaction"],
  [/^\/(candidate\/)?jobs$/, "Offres d'emploi"],
  [/^\/jobs\/[^/]+$/, null],
  [/^\/saved-jobs$/, "Offres sauvegardées"],
  [/^\/candidate-applications$/, "Mes candidatures"],
  [/^\/(candidate\/)?profile(\/view)?$/, "Mon profil"],
  [/^\/espace-personnel$/, "Mon espace"],
  [/^\/notifications$/, "Notifications"],
  [/^\/statistics$/, "Statistiques"],
  [/^\/agencies$/, "Employeurs"],
  [/^\/(agencies|companies)\/[^/]+(\/jobs)?$/, null],
  [/^\/services$/, "Services"],
  [/^\/privacy$/, "Confidentialité"],
  [/^\/terms$/, "Conditions d'utilisation"],
  [/^\/legal-notice$/, "Mentions légales"],
  [/^\/agency(\/|$)/, "Espace agence"],
  [/^\/company(\/|$)/, "Espace entreprise"],
  [/^\/admin(\/|$)/, "Administration"],
];

function apply(title: string) {
  document.title = title === HOME_TITLE ? HOME_TITLE : `${title} — ${SITE}`;
}

/** Router-level title from the URL; unknown paths are left to their page (404). */
export function useRouteTitle(location: string) {
  useEffect(() => {
    const match = ROUTE_TITLES.find(([pattern]) => pattern.test(location));
    if (match && match[1]) apply(match[1]);
  }, [location]);
}

/** Page-level title, for pages whose title depends on loaded data. */
export function usePageTitle(title: string | null | undefined, fallback: string) {
  useEffect(() => {
    apply(title?.trim() || fallback);
  }, [title, fallback]);
}
