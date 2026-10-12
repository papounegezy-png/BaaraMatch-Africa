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

    // /agency/missions browses every job system-wide (not just this
    // agency's own), so target this test's job by id — never assume it's
    // first in an unfiltered, possibly seed-data-populated list.
    const jobsRes = await request.get("/api/jobs");
    const allJobs = (await jobsRes.json()) as Array<{ id: string; title: string }>;
    const mission = allJobs.find((j) => j.title === "Smoke Test Mission");
    expect(mission).toBeTruthy();

    await page.goto("/agency/missions");
    await page.getByTestId(`button-edit-${mission!.id}`).click();
    await expect(page.getByTestId("input-offer-title")).toBeVisible();
    await expect(page.getByTestId("input-offer-title")).toHaveValue("Smoke Test Mission");
    await expect(page.getByRole("heading", { name: "Modifier l'offre" })).toBeVisible();
  } finally {
    await cleanupUserIds([userId]);
  }
});
