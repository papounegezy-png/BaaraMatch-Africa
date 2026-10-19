/**
 * Route smoke test: every URL a "Nouvelle offre" / "Modifier" button
 * navigates to must actually render something, not a blank page.
 *
 * This exists because of a real bug: wouter's <Route> list in App.tsx is
 * hand-enumerated per path pattern (e.g. "/company/jobs/:subsection"), and
 * a two-segment path like "/company/jobs/:id/edit" silently matched nothing
 * — the page went blank with no error, console message, or failed request.
 * An HTTP-level test can't catch this class of bug (the server returns the
 * same SPA shell for every path); only a real browser driving the client
 * router can.
 *
 * Requires the dev server already running (npm run dev), reachable at
 * TEST_BASE_URL (defaults to http://localhost:5000) — same convention as
 * tests/*.test.ts.
 */
import { test, expect } from "@playwright/test";
import { Pool } from "pg";
import "dotenv/config";
import { randomUUID } from "crypto";

const RUN_ID = randomUUID().slice(0, 8);
const PASSWORD = "Test1234!";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function cleanupUserIds(ids: string[]) {
  const validIds = ids.filter(Boolean);
  if (validIds.length === 0 || pool.ended) return;
  // A Standard-plan agency's published offer goes through moderation: its
  // queue row references the user, so it must go first or the final
  // "delete from users" fails on moderation_items_target_user_id_fkey.
  await pool.query("delete from moderation_items where target_user_id = any($1)", [validIds]);
  await pool.query("delete from job_postings where company_id = any($1) or agency_id = any($1)", [validIds]);
  await pool.query("delete from activity_logs where user_id = any($1)", [validIds]);
  await pool.query("delete from company_profiles where user_id = any($1)", [validIds]);
  await pool.query("delete from agency_profiles where user_id = any($1)", [validIds]);
  await pool.query("delete from users where id = any($1)", [validIds]);
}

test.afterAll(async () => {
  await pool.end();
});

test("un poste d'entreprise se crée puis se modifie sans page blanche", async ({ page, request }) => {
  const email = `test.smoke.company.${RUN_ID}@example.com`;
  let userId = "";
  try {
    const registerRes = await request.post("/api/auth/register", {
      data: { email, password: PASSWORD, userType: "company", fullName: "Smoke Test Co", industry: "Tech", city: "Dakar" },
    });
    expect(registerRes.status()).toBe(201);
    userId = (await registerRes.json()).id;

    await page.goto("/login");
    await page.getByTestId("input-login-email").fill(email);
    await page.getByTestId("input-login-password").fill(PASSWORD);
    await page.getByTestId("button-login-submit").click();
    await expect(page).toHaveURL(/\/company/);

    await page.goto("/company/jobs/new");
    await expect(page.getByTestId("input-offer-title")).toBeVisible();
    await page.getByTestId("input-offer-title").fill("Smoke Test Job");
    await page.getByTestId("input-offer-location").fill("Dakar");
    await page.getByTestId("select-offer-category").click();
    await page.getByText("Informatique & Tech").click();
    await page.locator('[data-testid="rich-text-editor-content"] .ProseMirror').click();
    await page.keyboard.type("Description suffisamment longue pour passer la validation du formulaire.");
    await page.getByTestId("button-publish-offer").click();
    await expect(page.getByTestId("offer-form-success")).toBeVisible();

    const dashboardRes = await request.get("/api/dashboard/company");
    const jobs = (await dashboardRes.json()).jobs as Array<{ id: string; title: string }>;
    const job = jobs.find((j) => j.title === "Smoke Test Job");
    expect(job).toBeTruthy();

    // The exact bug this test guards against: this route must render the
    // form, not a blank page.
    await page.goto(`/company/jobs/${job!.id}/edit`);
    await expect(page.getByTestId("input-offer-title")).toBeVisible();
    await expect(page.getByTestId("input-offer-title")).toHaveValue("Smoke Test Job");
    await expect(page.getByRole("heading", { name: "Modifier l'offre" })).toBeVisible();
  } finally {
    await cleanupUserIds([userId]);
  }
});

test("une mission d'agence se crée puis se modifie sans page blanche", async ({ page, request }) => {
  const email = `test.smoke.agency.${RUN_ID}@example.com`;
  let userId = "";
  try {
    const registerRes = await request.post("/api/auth/register", {
      data: { email, password: PASSWORD, userType: "agency", fullName: "Smoke Test Agency", agencyName: "Smoke Agency", city: "Abidjan" },
    });
    expect(registerRes.status()).toBe(201);
    userId = (await registerRes.json()).id;

    await page.goto("/login");
    await page.getByTestId("input-login-email").fill(email);
    await page.getByTestId("input-login-password").fill(PASSWORD);
    await page.getByTestId("button-login-submit").click();
    await expect(page).toHaveURL(/\/agency/);

    await page.goto("/agency/missions/new");
    await expect(page.getByTestId("input-offer-title")).toBeVisible();
    await page.getByTestId("input-offer-title").fill("Smoke Test Mission");
    await page.getByTestId("input-offer-location").fill("Abidjan");
    await page.getByTestId("select-offer-category").click();
    await page.getByText("BTP & Construction").click();
    await page.locator('[data-testid="rich-text-editor-content"] .ProseMirror').click();
    await page.keyboard.type("Description suffisamment longue pour passer la validation du formulaire.");
    await page.getByTestId("button-publish-offer").click();
    await expect(page.getByTestId("offer-form-success")).toBeVisible();

    // A new agency is on its 60-day Partner trial, so the offer goes live;
    // a Standard-plan agency's would wait in moderation instead. Read the
    // agency's own jobs (/api/agency/jobs — the same source /agency/missions
    // renders, pending-review jobs included) so both cases work, and target
    // this test's job by id.
    const jobsRes = await request.get("/api/agency/jobs");
    const agencyJobs = (await jobsRes.json()) as Array<{ id: string; title: string }>;
    const mission = agencyJobs.find((j) => j.title === "Smoke Test Mission");
    expect(mission).toBeTruthy();

    await page.goto("/agency/missions");
    // Mission cards (mission-cards-grid.tsx) put "Modifier" in the card's
    // "…" actions menu rather than a standalone edit button.
    await page.getByTestId(`button-actions-mission-${mission!.id}`).click();
    await page.getByRole("menuitem", { name: "Modifier" }).click();
    await expect(page.getByTestId("input-offer-title")).toBeVisible();
    await expect(page.getByTestId("input-offer-title")).toHaveValue("Smoke Test Mission");
    // A live job opens in plain edit mode ("Modifier l'offre"); an offline
    // one (Standard plan, awaiting moderation) reopens as a draft to continue
    // ("Publier une offre").
    // Either way the point of this test holds: the route renders the form.
    await expect(page.getByRole("heading", { name: /^(Modifier l'offre|Publier une offre)$/ })).toBeVisible();
  } finally {
    await cleanupUserIds([userId]);
  }
});
