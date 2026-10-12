import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

const VISITOR_ID_KEY = "baaramatch_visitor_id";
const HEARTBEAT_INTERVAL_MS = 30_000;

function getOrCreateVisitorId(): string {
  try {
    const existing = localStorage.getItem(VISITOR_ID_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(VISITOR_ID_KEY, id);
    return id;
  } catch {
    // Private browsing / storage blocked — fall back to a per-load id
    // rather than crashing; it just won't persist across page loads.
    return crypto.randomUUID();
  }
}

function sendBeacon(visitorId: string) {
  fetch("/api/analytics/visit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visitorId }),
    keepalive: true,
  }).catch(() => {
    // Analytics must never surface an error to a real visitor.
  });
}

// Mounted once at the app root. Pings on load, then on a heartbeat while
// the tab is actually visible, so "temps de visite" (see server's
// siteVisits table: lastSeenAt - firstSeenAt) reflects real active time
// rather than a tab left open in the background. Admin traffic is
// excluded on purpose — it isn't a real visitor to the platform.
export function useVisitTracker() {
  const { user, isLoading } = useAuth();
  const isAdmin = user?.userType === "admin";

  useEffect(() => {
    // Wait for the auth check to settle so an admin's very first pageview
    // doesn't sneak in as a beacon before we know who they are.
    if (isLoading || isAdmin) return;

    const visitorId = getOrCreateVisitorId();
    sendBeacon(visitorId);

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        sendBeacon(visitorId);
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isAdmin]);
}
