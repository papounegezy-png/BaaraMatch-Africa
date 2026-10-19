/**
 * Integration test for the agency plans. Offre de lancement : a newly
 * registered agency starts a 60-day "partner" trial (shared/plans.ts), with
 * the billing suite open. Once the trial ends it falls back to the
 * "standard" plan, which blocks the billing suite (invoices, commission
 * rates, payment methods, salary payments, financial settings) while
 * leaving core features (placements, dashboard) accessible. A Super Admin
 * can promote the agency to "partner" for good, which unlocks the billing
 * suite immediately.
 *
 * Runs against a real running dev server + real Postgres — matches how
 * this project has been manually verified throughout development (no
 * mocks). Requires:
 *   - the dev server running (npm run dev), reachable at TEST_BASE_URL
 *     (defaults to http://localhost:5000)
 *   - DATABASE_URL set (same .env the dev server uses)
 */
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const RUN_ID = randomUUID().slice(0, 8);
const AGENCY_EMAIL = `test.freemium.agency.${RUN_ID}@example.com`;
const ADMIN_EMAIL = `test.freemium.admin.${RUN_ID}@example.com`;
const PASSWORD = "Test1234!";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/** Minimal cookie-jar client so each Session carries its own login. */
class Session {
  private cookie = "";

  async request(method: string, path: string, body?: unknown) {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(this.cookie ? { Cookie: this.cookie } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) this.cookie = setCookie.split(";")[0];
    return res;
  }
}

let agencyId: string;
let adminId: string;
let agencySession: Session;
let adminSession: Session;

beforeAll(async () => {
  // If setup fails partway through (e.g. the admin insert), afterAll's hook
  // never runs — best-effort clean up whatever was created before rethrowing,
  // so a broken run never leaves rows behind for the next one to trip over.
  try {
    // Register the agency through the real signup flow — this is the account
    // whose freemium/paid boundary we're testing.
    agencySession = new Session();
    const registerRes = await agencySession.request("POST", "/api/auth/register", {
      email: AGENCY_EMAIL,
      password: PASSWORD,
      confirmPassword: PASSWORD,
      fullName: "Test Freemium Agency",
      userType: "agency",
    });
    expect(registerRes.status).toBe(201);
    const registered = await registerRes.json();
    agencyId = registered.id;

    // Seed a throwaway admin directly in the DB (public registration
    // intentionally can't create admins) so the plan-toggle step exercises
    // the real Super Admin API, not a DB shortcut.
    const passwordHash = await bcrypt.hash(PASSWORD, 12);
    const adminResult = await pool.query(
      `insert into users (email, password, user_type, full_name, is_verified)
       values ($1, $2, 'admin', 'Test Freemium Admin', true) returning id`,
      [ADMIN_EMAIL, passwordHash],
    );
    adminId = adminResult.rows[0].id;

    adminSession = new Session();
    const adminLoginRes = await adminSession.request("POST", "/api/auth/login", {
      email: ADMIN_EMAIL,
      password: PASSWORD,
    });
    expect(adminLoginRes.status).toBe(200);
  } catch (err) {
    const orphans = await pool.query("select id from users where email in ($1, $2)", [AGENCY_EMAIL, ADMIN_EMAIL]);
    for (const { id } of orphans.rows) {
      await pool.query("delete from activity_logs where user_id = $1", [id]);
      await pool.query("delete from agency_financial_settings where agency_id = $1", [id]);
      await pool.query("delete from agency_profiles where user_id = $1", [id]);
      await pool.query("delete from users where id = $1", [id]);
    }
    throw err;
  }
}, 30000);

afterAll(async () => {
  await pool.query("delete from activity_logs where user_id = any($1)", [[agencyId, adminId]]);
  await pool.query("delete from agency_financial_settings where agency_id = $1", [agencyId]);
  await pool.query("delete from agency_profiles where user_id = $1", [agencyId]);
  await pool.query("delete from users where id = any($1)", [[agencyId, adminId]]);
  await pool.end();
});

describe("Agence — essai Partenaire de lancement à l’inscription", () => {
  it("ouvre 60 jours de Partenaire", async () => {
    const { rows } = await pool.query(
      "select subscription_plan, partner_trial_ends_at from agency_profiles where user_id = $1",
      [agencyId],
    );
    expect(rows[0].subscription_plan).toBe("partner");
    const jours = (new Date(rows[0].partner_trial_ends_at).getTime() - Date.now()) / 86_400_000;
    expect(jours).toBeGreaterThan(59);
    expect(jours).toBeLessThanOrEqual(60);
  });

  it("donne accès à la facturation pendant l’essai", async () => {
    const res = await agencySession.request("GET", "/api/agency/invoices");
    expect(res.status).toBe(200);
  });
});

describe("Agence — plan standard (freemium) après l’essai", () => {
  beforeAll(async () => {
    // Fin de l’essai simulée : la date est passée, le plan effectif redevient Standard.
    await pool.query(
      "update agency_profiles set partner_trial_ends_at = now() - interval '1 day' where user_id = $1",
      [agencyId],
    );
  });

  const billingRoutes = [
    "/api/agency/financial-settings",
    "/api/agency/commission-rates",
    "/api/agency/payment-methods",
    "/api/agency/invoices",
    "/api/agency/salary-payments",
  ];

  it.each(billingRoutes)("bloque %s avec 403 + PARTNER_PLAN_REQUIRED", async (route) => {
    const res = await agencySession.request("GET", route);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("PARTNER_PLAN_REQUIRED");
  });

  it("laisse les fonctionnalités gratuites accessibles (placements)", async () => {
    const res = await agencySession.request("GET", "/api/agency/placements");
    expect(res.status).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });

  it("laisse le tableau de bord agence accessible", async () => {
    const res = await agencySession.request("GET", "/api/dashboard/agency");
    expect(res.status).toBe(200);
  });
});

describe("Agence — après activation du plan Agence Partenaire par l'admin", () => {
  beforeAll(async () => {
    const res = await adminSession.request("PATCH", `/api/admin/agencies/${agencyId}/plan`, {
      plan: "partner",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.subscriptionPlan).toBe("partner");
  });

  it("débloque /api/agency/financial-settings", async () => {
    const res = await agencySession.request("GET", "/api/agency/financial-settings");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.agencyId).toBe(agencyId);
  });

  it("reflète le plan dans la liste admin des agences", async () => {
    const res = await adminSession.request("GET", "/api/admin/agencies");
    expect(res.status).toBe(200);
    const agencies = await res.json();
    const entry = agencies.find((a: { id: string }) => a.id === agencyId);
    expect(entry?.subscriptionPlan).toBe("partner");
  });
});

describe("Isolation entre comptes", () => {
  it("une entreprise ne peut pas appeler les routes agence", async () => {
    const companySession = new Session();
    const companyEmail = `test.freemium.company.${RUN_ID}@example.com`;
    const registerRes = await companySession.request("POST", "/api/auth/register", {
      email: companyEmail,
      password: PASSWORD,
      confirmPassword: PASSWORD,
      fullName: "Test Freemium Company",
      userType: "company",
    });
    expect(registerRes.status).toBe(201);
    const company = await registerRes.json();

    const res = await companySession.request("GET", "/api/agency/invoices");
    expect(res.status).toBe(403);

    await pool.query("delete from activity_logs where user_id = $1", [company.id]);
    await pool.query("delete from company_profiles where user_id = $1", [company.id]);
    await pool.query("delete from users where id = $1", [company.id]);
  });
});
