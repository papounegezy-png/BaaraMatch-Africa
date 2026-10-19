/**
 * Integration test for the job review gate of standard-plan (freemium)
 * agencies: a job they publish goes to the moderation queue instead of
 * going live, and flipping isActive through PATCH /api/jobs/:id must not
 * bypass that queue. Once an admin approves it, the agency is notified and
 * can close/reopen the job freely.
 *
 * Same setup as agency-freemium.test.ts: needs the dev server running
 * (TEST_BASE_URL, default http://localhost:5000) and DATABASE_URL set.
 */
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { EN_TETE_TESTS } from "../server/middlewares/limiteur-tests";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const RUN_ID = randomUUID().slice(0, 8);
const AGENCY_EMAIL = `test.moderation.agency.${RUN_ID}@example.com`;
const ADMIN_EMAIL = `test.moderation.admin.${RUN_ID}@example.com`;
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
        // Exempte la requête des limiteurs de débit (hors production).
        [EN_TETE_TESTS]: "1",
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
let jobId: string;
let agencySession: Session;
let adminSession: Session;

async function pendingItemsForJob() {
  const result = await pool.query(
    "select id from moderation_items where target_entity_id = $1 and status = 'pending'",
    [jobId],
  );
  return result.rows as { id: string }[];
}

async function getJob() {
  const result = await pool.query("select is_active, validated_at from job_postings where id = $1", [jobId]);
  return result.rows[0] as { is_active: boolean; validated_at: Date | null };
}

beforeAll(async () => {
  try {
    agencySession = new Session();
    const registerRes = await agencySession.request("POST", "/api/auth/register", {
      email: AGENCY_EMAIL,
      password: PASSWORD,
      confirmPassword: PASSWORD,
      fullName: "Test Moderation Agency",
      userType: "agency",
    });
    expect(registerRes.status).toBe(201);
    agencyId = (await registerRes.json()).id;
    // Une nouvelle agence démarre en essai Partenaire (offre de lancement) :
    // on fait expirer l'essai pour tester le plan Standard qui suit.
    await pool.query(
      "update agency_profiles set partner_trial_ends_at = now() - interval '1 day' where user_id = $1",
      [agencyId],
    );

    // Approving needs the "offres:valider" permission, so the throwaway
    // admin gets a super_admin profile.
    const passwordHash = await bcrypt.hash(PASSWORD, 12);
    const adminResult = await pool.query(
      `insert into users (email, password, user_type, full_name, is_verified)
       values ($1, $2, 'admin', 'Test Moderation Admin', true) returning id`,
      [ADMIN_EMAIL, passwordHash],
    );
    adminId = adminResult.rows[0].id;
    await pool.query("insert into admin_profiles (user_id, admin_level) values ($1, 'super_admin')", [adminId]);

    adminSession = new Session();
    const adminLoginRes = await adminSession.request("POST", "/api/auth/login", {
      email: ADMIN_EMAIL,
      password: PASSWORD,
    });
    expect(adminLoginRes.status).toBe(200);
  } catch (err) {
    await cleanup();
    throw err;
  }
}, 30000);

async function cleanup() {
  const users = await pool.query("select id from users where email in ($1, $2)", [AGENCY_EMAIL, ADMIN_EMAIL]);
  const ids = users.rows.map((row) => row.id as string);
  if (ids.length === 0) return;
  await pool.query("delete from moderation_items where target_user_id = any($1) or resolved_by = any($1)", [ids]);
  await pool.query("delete from notifications where user_id = any($1)", [ids]);
  await pool.query("delete from job_postings where agency_id = any($1)", [ids]);
  await pool.query("delete from activity_logs where user_id = any($1)", [ids]);
  await pool.query("delete from agency_financial_settings where agency_id = any($1)", [ids]);
  await pool.query("delete from agency_profiles where user_id = any($1)", [ids]);
  await pool.query("delete from admin_profiles where user_id = any($1)", [ids]);
  await pool.query("delete from users where id = any($1)", [ids]);
}

afterAll(async () => {
  await cleanup();
  await pool.end();
});

describe("Agence plan standard — validation des offres", () => {
  it("met une nouvelle offre en révision au lieu de la publier", async () => {
    const res = await agencySession.request("POST", "/api/jobs", {
      companyId: agencyId,
      agencyId,
      title: `Offre test modération ${RUN_ID}`,
      description: "Description de test",
      location: "Bamako",
      jobType: "full-time",
      isActive: true,
    });
    expect(res.status).toBe(201);
    const job = await res.json();
    jobId = job.id;
    expect(job.isActive).toBe(false);
    expect(await pendingItemsForJob()).toHaveLength(1);
  });

  it("ne laisse pas PATCH isActive=true contourner la révision", async () => {
    const res = await agencySession.request("PATCH", `/api/jobs/${jobId}`, { isActive: true });
    expect(res.status).toBe(200);
    expect((await res.json()).isActive).toBe(false);
    expect((await getJob()).is_active).toBe(false);
    // Already queued: no duplicate review item.
    expect(await pendingItemsForJob()).toHaveLength(1);
  });

  it("publie l'offre et notifie l'agence quand l'admin valide", async () => {
    const [item] = await pendingItemsForJob();
    const res = await adminSession.request("PATCH", `/api/admin/moderation/${item.id}`, { status: "approved" });
    expect(res.status).toBe(200);

    const job = await getJob();
    expect(job.is_active).toBe(true);
    expect(job.validated_at).not.toBeNull();

    const notifications = await pool.query("select title from notifications where user_id = $1", [agencyId]);
    expect(notifications.rows.some((row) => String(row.title).includes("est en ligne"))).toBe(true);
  });

  it("laisse fermer puis rouvrir une offre déjà validée sans nouvelle révision", async () => {
    const closeRes = await agencySession.request("PATCH", `/api/jobs/${jobId}`, { isActive: false });
    expect((await closeRes.json()).isActive).toBe(false);

    const reopenRes = await agencySession.request("PATCH", `/api/jobs/${jobId}`, { isActive: true });
    expect((await reopenRes.json()).isActive).toBe(true);
    expect(await pendingItemsForJob()).toHaveLength(0);
  });
});

describe("Publier un brouillon", () => {
  // What « Offres & Missions » actually reads to show the status badge.
  async function isPendingOnAgencyScreen(id: string) {
    const res = await agencySession.request("GET", "/api/agency/jobs");
    expect(res.status).toBe(200);
    const jobs = (await res.json()) as { id: string; isPendingModeration: boolean }[];
    return jobs.find((job) => job.id === id)?.isPendingModeration;
  }

  async function createDraft(label: string) {
    const res = await agencySession.request("POST", "/api/jobs", {
      companyId: agencyId,
      agencyId,
      title: `Brouillon ${label} ${RUN_ID}`,
      description: "Description de test",
      location: "Bamako",
      jobType: "full-time",
      isActive: false,
    });
    expect(res.status).toBe(201);
    return (await res.json()).id as string;
  }

  it("plan standard : le brouillon part en validation, pas en ligne", async () => {
    const draftId = await createDraft("standard");
    const queuedBefore = await pool.query("select id from moderation_items where target_entity_id = $1", [draftId]);
    expect(queuedBefore.rows).toHaveLength(0);
    // A draft is not "en attente de validation" on the agency's screen.
    expect(await isPendingOnAgencyScreen(draftId)).toBe(false);

    const res = await agencySession.request("PATCH", `/api/jobs/${draftId}`, { isActive: true });
    expect((await res.json()).isActive).toBe(false);
    const queuedAfter = await pool.query(
      "select id from moderation_items where target_entity_id = $1 and status = 'pending'",
      [draftId],
    );
    expect(queuedAfter.rows).toHaveLength(1);
    // Once actually queued, it is.
    expect(await isPendingOnAgencyScreen(draftId)).toBe(true);
  });

  it("plan Agence Partenaire : le brouillon est publié immédiatement", async () => {
    const planRes = await adminSession.request("PATCH", `/api/admin/agencies/${agencyId}/plan`, { plan: "partner" });
    expect(planRes.status).toBe(200);

    const draftId = await createDraft("partner");
    const res = await agencySession.request("PATCH", `/api/jobs/${draftId}`, { isActive: true });
    expect((await res.json()).isActive).toBe(true);
    const queued = await pool.query("select id from moderation_items where target_entity_id = $1", [draftId]);
    expect(queued.rows).toHaveLength(0);
  });
});
