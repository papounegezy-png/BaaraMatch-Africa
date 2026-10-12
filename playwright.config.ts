import { defineConfig } from "@playwright/test";

// E2E smoke tests, separate from vitest's tests/ (HTTP-level, no browser).
// These exist specifically to catch client-side routing gaps — e.g. a
// wouter <Route> pattern missing for a URL a "Modifier"/"Nouvelle offre"
// button navigates to — which an HTTP-only test cannot see, since the
// Express server returns the same SPA shell for every path regardless of
// whether the client router has a matching route.
//
// Requires the dev server already running (npm run dev) — same convention
// as tests/*.test.ts, deliberately not auto-started here to avoid double
// server starts / port conflicts.
export default defineConfig({
  testDir: "./e2e",
  // Generous: each test does register + login + fill a full offer form +
  // publish + re-fetch + edit + re-assert, and the first test in a run also
  // eats Vite's cold-compile cost for routes not hit yet this session.
  timeout: 60000,
  fullyParallel: false,
  // One worker: tests share a single pg Pool closed in a shared afterAll,
  // and they hit the same dev server/DB — real parallelism here just races
  // teardown against other tests' setup for no speed benefit at this scale.
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.TEST_BASE_URL || "http://localhost:5000",
    screenshot: "only-on-failure",
  },
});
