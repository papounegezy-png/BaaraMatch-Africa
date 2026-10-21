import { lazy, Suspense, type ComponentProps } from "react";

// La cloche (menu déroulant Radix et son positionnement) ne sert qu'aux
// utilisateurs connectés : chargée à part pour alléger le premier affichage
// des pages publiques. Espace réservé de la même taille en attendant.
const NotificationBell = lazy(() => import("@/components/notification-bell").then((m) => ({ default: m.NotificationBell })));

export function ClocheNotifications(props: ComponentProps<typeof NotificationBell>) {
  return (
    <Suspense fallback={<span className={props.variante === "entete" ? "inline-block h-12 w-12" : "inline-block h-9 w-9"} aria-hidden="true" />}>
      <NotificationBell {...props} />
    </Suspense>
  );
}
