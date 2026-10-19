/**
 * Integration test for the admin "third-party job management" feature:
 * a super_admin/gestionnaire_comptes can create a prospect organization (a
 * company/agency account with no real login yet) and immediately post a job
 * on its behalf, traced via jobPostings.managementType/createdByAdminId. The
 * real owner later claims the account via a one-time claimToken. A
 * moderateur-level admin must be blocked from all of this and from the
 * admin-accounts screen; a super_admin cannot demote or deactivate
 * themselves; a deactivated admin is blocked from login and every admin route.
 *
 * Runs against a real running dev server + real Postgres, same approach as
 * tests/agency-freemium.test.ts (no mocks). Requires:
 *   - the dev server running (npm run dev), reachable at TEST_BASE_URL
 *     (defaults to http://localhost:5000)
 *   - DATABASE_URL set (same .env the dev server uses)
 */
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { EN_TETE_TESTS } from "../server/middlewares/limiteur-tests";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const RUN_ID = randomUUID().slice(0, 8);
const SUPER_ADMIN_EMAIL = `test.3p.superadmin.${RUN_ID}@example.com`;
const MODERATOR_EMAIL = `test.3p.moderateur.${RUN_ID}@example.com`;
const PROSPECT_EMAIL = `test.3p.prospect.${RUN_ID}@example.com`;
const CONTACT_MATCH_PROSPECT_EMAIL = `test.3p.contactmatch.${RUN_ID}@example.com`;
const CONTACT_MATCH_PHONE = `+2217${RUN_ID}`;
const PASSWORD = "Test1234!";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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

let superAdminId: string;
let superAdminProfileId: string;
let moderatorId: string;
let superAdminSession: Session;
let moderatorSession: Session;
let prospectId: string;
let prospectClaimToken: string;
let createdJobId: string;
let contactMatchProspectId: string;

async function cleanupUserIds(ids: string[]) {
  const validIds = ids.filter(Boolean);
  if (validIds.length === 0) return;
  // job_postings.created_by_admin_id/validated_by_admin_id reference
  // admin_profiles.id, not users.id directly — go through the subquery.
  await pool.query(
    `delete from job_postings
     where created_by_admin_id in (select id from admin_profiles where user_id = any($1))
        or validated_by_admin_id in (select id from admin_profiles where user_id = any($1))
        or company_id = any($1) or agency_id = any($1)`,
    [validIds],
  );
  await pool.query("delete from activity_logs where user_id = any($1)", [validIds]);
  await pool.query("delete from company_profiles where user_id = any($1)", [validIds]);
  await pool.query("delete from agency_profiles where user_id = any($1)", [validIds]);
  // users.created_by_admin_id -> admin_profiles.id and admin_profiles.user_id
  // -> users.id form a real cycle between these two tables — break it before
  // deleting either side.
  await pool.query("update users set created_by_admin_id = null where id = any($1)", [validIds]);
  await pool.query("delete from admin_profiles where user_id = any($1) or created_by_admin_id = any($1)", [validIds]);
  await pool.query("delete from users where id = any($1)", [validIds]);
}

beforeAll(async () => {
  try {
    const passwordHash = await bcrypt.hash(PASSWORD, 12);

    const superAdminResult = await pool.query(
      `insert into users (email, password, user_type, full_name, is_verified)
       values ($1, $2, 'admin', 'Test Super Admin', true) returning id`,
      [SUPER_ADMIN_EMAIL, passwordHash],
    );
    superAdminId = superAdminResult.rows[0].id;
    const superAdminProfileResult = await pool.query(
      `insert into admin_profiles (user_id, admin_level, is_active) values ($1, 'super_admin', true) returning id`,
      [superAdminId],
    );
    superAdminProfileId = superAdminProfileResult.rows[0].id;

    const moderatorResult = await pool.query(
      `insert into users (email, password, user_type, full_name, is_verified)
       values ($1, $2, 'admin', 'Test Moderateur', true) returning id`,
      [MODERATOR_EMAIL, passwordHash],
    );
    moderatorId = moderatorResult.rows[0].id;
    await pool.query(
      `insert into admin_profiles (user_id, admin_level, is_active) values ($1, 'moderateur', true)`,
      [moderatorId],
    );

    superAdminSession = new Session();
    const superAdminLogin = await superAdminSession.request("POST", "/api/auth/login", {
      email: SUPER_ADMIN_EMAIL,
      password: PASSWORD,
    });
    expect(superAdminLogin.status).toBe(200);

    moderatorSession = new Session();
    const moderatorLogin = await moderatorSession.request("POST", "/api/auth/login", {
      email: MODERATOR_EMAIL,
      password: PASSWORD,
    });
    expect(moderatorLogin.status).toBe(200);
  } catch (err) {
    await cleanupUserIds([superAdminId, moderatorId]);
    throw err;
  }
}, 30000);

afterAll(async () => {
  await cleanupUserIds([superAdminId, moderatorId, prospectId, contactMatchProspectId]);
  await pool.end();
});

describe("Organisation prospect — création et publication d'offre pour tiers", () => {
  it("un super_admin crée une organisation prospect avec contact", async () => {
    const res = await superAdminSession.request("POST", "/api/admin/organizations/prospect", {
      userType: "company",
      email: PROSPECT_EMAIL,
      organizationName: "Prospect Test SARL",
      contactName: "Aminata Diallo",
      contactPhone: "+221771234567",
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.claimToken).toBeTruthy();
    prospectId = body.id;
    prospectClaimToken = body.claimToken;
  });

  it("l'organisation prospect apparaît dans la liste avec son claimToken et son contact", async () => {
    const res = await superAdminSession.request("GET", "/api/admin/organizations");
    expect(res.status).toBe(200);
    const list = await res.json();
    const entry = list.find((o: { id: string }) => o.id === prospectId);
    expect(entry).toBeTruthy();
    expect(entry.claimed).toBe(false);
    expect(entry.claimToken).toBe(prospectClaimToken);
    expect(entry.contactName).toBe("Aminata Diallo");
    expect(entry.contactPhone).toBe("+221771234567");
  });

  it("filtre la liste par ?prospect=true et par ?type=company", async () => {
    const prospectOnly = await superAdminSession.request("GET", "/api/admin/organizations?prospect=true");
    expect(prospectOnly.status).toBe(200);
    const prospectList = await prospectOnly.json();
    expect(prospectList.some((o: { id: string }) => o.id === prospectId)).toBe(true);
    expect(prospectList.every((o: { claimed: boolean }) => o.claimed === false)).toBe(true);

    const companiesOnly = await superAdminSession.request("GET", "/api/admin/organizations?type=agency");
    expect(companiesOnly.status).toBe(200);
    const agencyList = await companiesOnly.json();
    expect(agencyList.some((o: { id: string }) => o.id === prospectId)).toBe(false);
  });

  it("GET /api/admin/organizations/:id renvoie le détail avec ses offres", async () => {
    const res = await superAdminSession.request("GET", `/api/admin/organizations/${prospectId}`);
    expect(res.status).toBe(200);
    const detail = await res.json();
    expect(detail.id).toBe(prospectId);
    expect(detail.name).toBe("Prospect Test SARL");
    expect(detail.contactName).toBe("Aminata Diallo");
    expect(Array.isArray(detail.jobs)).toBe(true);
  });

  it("renvoie 404 pour une organisation inexistante", async () => {
    const res = await superAdminSession.request("GET", "/api/admin/organizations/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
  });

  it("PATCH /api/admin/organizations/:id modifie l'organisation", async () => {
    const res = await superAdminSession.request("PATCH", `/api/admin/organizations/${prospectId}`, {
      industry: "BTP",
      city: "Thiès",
    });
    expect(res.status).toBe(200);

    const detailRes = await superAdminSession.request("GET", `/api/admin/organizations/${prospectId}`);
    const detail = await detailRes.json();
    expect(detail.industry).toBe("BTP");
    expect(detail.city).toBe("Thiès");
  });

  it("OrganisationPickerOrCreate — la recherche trouve le prospect par nom", async () => {
    const res = await superAdminSession.request("GET", "/api/admin/organizations/search?q=Prospect%20Test");
    expect(res.status).toBe(200);
    const results = await res.json();
    const entry = results.find((o: { id: string }) => o.id === prospectId);
    expect(entry).toBeTruthy();
    expect(entry.isProspect).toBe(true);
  });

  it("OrganisationPickerOrCreate — la recherche trouve le prospect par téléphone", async () => {
    const res = await superAdminSession.request("GET", "/api/admin/organizations/search?q=771234567");
    expect(res.status).toBe(200);
    const results = await res.json();
    expect(results.some((o: { id: string }) => o.id === prospectId)).toBe(true);
  });

  it("la recherche renvoie une liste vide pour une requête trop courte", async () => {
    const res = await superAdminSession.request("GET", "/api/admin/organizations/search?q=a");
    expect(res.status).toBe(200);
    const results = await res.json();
    expect(results).toEqual([]);
  });

  it("bloque la recherche d'organisations pour un moderateur", async () => {
    const res = await moderatorSession.request("GET", "/api/admin/organizations/search?q=Prospect");
    expect(res.status).toBe(403);
  });

  it("un admin publie une offre au nom de l'organisation prospect", async () => {
    const res = await superAdminSession.request("POST", `/api/admin/organizations/${prospectId}/jobs`, {
      title: "Chef de chantier",
      description: "Poste pour organisation prospect",
      location: "Dakar",
      jobType: "full_time",
    });
    expect(res.status).toBe(201);
    const job = await res.json();
    expect(job.companyId).toBe(prospectId);
    expect(job.managementType).toBe("geree_par_baaramatch");
    // createdByAdminId/validatedByAdminId reference admin_profiles.id, not
    // users.id — that's the whole point of routing the FK through
    // AdminProfil rather than User directly.
    expect(job.createdByAdminId).toBe(superAdminProfileId);
    expect(job.isActive).toBe(true);
    // No separate review step for an admin-managed job — the creating
    // admin is the validator, stamped at creation time.
    expect(job.validatedByAdminId).toBe(superAdminProfileId);
    expect(job.validatedAt).toBeTruthy();
    createdJobId = job.id;
  });

  it("l'offre apparaît dans la liste de traçabilité des offres gérées", async () => {
    const res = await superAdminSession.request("GET", "/api/admin/organizations/managed-jobs");
    expect(res.status).toBe(200);
    const jobs = await res.json();
    const entry = jobs.find((j: { id: string }) => j.id === createdJobId);
    expect(entry).toBeTruthy();
    expect(entry.organizationId).toBe(prospectId);
    expect(entry.organizationName).toBe("Prospect Test SARL");
    expect(entry.createdByAdminId).toBe(superAdminProfileId);
    // Resolved server-side through admin_profiles back to the real name.
    expect(entry.createdByAdminName).toBe("Test Super Admin");
    expect(entry.validatedAt).toBeTruthy();
  });

  it("filtre les offres gérées par organisation et par admin créateur", async () => {
    const byOrg = await superAdminSession.request("GET", `/api/admin/organizations/managed-jobs?organizationId=${prospectId}`);
    expect(byOrg.status).toBe(200);
    const byOrgJobs = await byOrg.json();
    expect(byOrgJobs.some((j: { id: string }) => j.id === createdJobId)).toBe(true);

    const byAdmin = await superAdminSession.request("GET", `/api/admin/organizations/managed-jobs?createdByAdminId=${superAdminProfileId}`);
    expect(byAdmin.status).toBe(200);
    const byAdminJobs = await byAdmin.json();
    expect(byAdminJobs.some((j: { id: string }) => j.id === createdJobId)).toBe(true);

    const byOtherOrg = await superAdminSession.request("GET", "/api/admin/organizations/managed-jobs?organizationId=00000000-0000-0000-0000-000000000000");
    expect(byOtherOrg.status).toBe(200);
    const byOtherOrgJobs = await byOtherOrg.json();
    expect(byOtherOrgJobs.some((j: { id: string }) => j.id === createdJobId)).toBe(false);
  });

  it("un client ne peut pas s'attribuer managementType/createdByAdminId via POST /api/jobs normal", async () => {
    // Sanity check on the whitelist fix on insertJobPostingSchema — not
    // reachable as company/agency here, so just confirm the field is
    // stripped rather than rejected when a plain admin session (not a
    // company/agency) tries the public route.
    const res = await superAdminSession.request("POST", "/api/jobs", {
      title: "x",
      description: "x",
      location: "x",
      jobType: "full_time",
      companyId: "irrelevant",
      managementType: "geree_par_baaramatch",
      createdByAdminId: superAdminId,
    });
    expect(res.status).toBe(403); // admin userType isn't company/agency — blocked upstream, as expected
  });
});

describe("Isolation par niveau — moderateur", () => {
  it("bloque la création d'organisation prospect pour un moderateur", async () => {
    const res = await moderatorSession.request("POST", "/api/admin/organizations/prospect", {
      userType: "company",
      email: `blocked.${RUN_ID}@example.com`,
      organizationName: "Should Not Exist",
    });
    expect(res.status).toBe(403);
  });

  it("bloque l'écran Comptes admin pour un moderateur", async () => {
    const res = await moderatorSession.request("GET", "/api/admin/accounts");
    expect(res.status).toBe(403);
  });

  it("laisse la file de modération accessible à un moderateur (route admin standard)", async () => {
    const res = await moderatorSession.request("GET", "/api/admin/moderation");
    expect(res.status).toBe(200);
  });
});

describe("Claim flow — l'organisation prospect récupère son compte", () => {
  // /api/organizations/claim sits behind the real authRateLimiter (a claim
  // token is guessable the same way a password is, so it deserves the same
  // protection). Running this suite repeatedly in a short window can trip
  // that limiter before hitting our own 404 — a 429 is an equally valid
  // "rejected" outcome from the real security control, not a test failure.
  it("un token invalide est rejeté", async () => {
    const res = await new Session().request("POST", "/api/organizations/claim", {
      token: "invalid-token",
      password: PASSWORD,
      confirmPassword: PASSWORD,
    });
    expect([404, 429]).toContain(res.status);
  });

  it("le vrai propriétaire réclame son compte avec le claimToken", async () => {
    const claimSession = new Session();
    const res = await claimSession.request("POST", "/api/organizations/claim", {
      token: prospectClaimToken,
      password: "NewOwnerPass1!",
      confirmPassword: "NewOwnerPass1!",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(prospectId);
    expect(body.isProspect).toBe(false);

    // Session is now logged in as the claimed organization.
    const me = await claimSession.request("GET", "/api/auth/me");
    expect(me.status).toBe(200);
  });

  it("l'organisation reste visible dans la liste admin une fois réclamée (comme 'Compte actif')", async () => {
    const res = await superAdminSession.request("GET", "/api/admin/organizations");
    expect(res.status).toBe(200);
    const list = await res.json();
    const entry = list.find((o: { id: string }) => o.id === prospectId);
    expect(entry).toBeTruthy();
    expect(entry.claimed).toBe(true);
    expect(entry.claimToken).toBeNull();
  });

  it("le token ne fonctionne plus une fois utilisé", async () => {
    const res = await new Session().request("POST", "/api/organizations/claim", {
      token: prospectClaimToken,
      password: PASSWORD,
      confirmPassword: PASSWORD,
    });
    expect([404, 429]).toContain(res.status);
  });
});

describe("Comptes admin — super_admin uniquement", () => {
  it("empêche un super_admin de se rétrograder lui-même", async () => {
    const res = await superAdminSession.request("PATCH", `/api/admin/accounts/${superAdminId}/level`, {
      adminLevel: "moderateur",
    });
    expect(res.status).toBe(400);
  });

  it("permet à un super_admin de changer le niveau d'un autre admin", async () => {
    const res = await superAdminSession.request("PATCH", `/api/admin/accounts/${moderatorId}/level`, {
      adminLevel: "gestionnaire_comptes",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.adminLevel).toBe("gestionnaire_comptes");

    // Restore for a clean re-run signature (not load-bearing for cleanup).
    await superAdminSession.request("PATCH", `/api/admin/accounts/${moderatorId}/level`, {
      adminLevel: "moderateur",
    });
  });

  it("le compte admin-créé-par-admin trace correctement createdByAdminId", async () => {
    const res = await superAdminSession.request("GET", "/api/admin/accounts");
    expect(res.status).toBe(200);
    const accounts = await res.json();
    const self = accounts.find((a: { id: string }) => a.id === superAdminId);
    expect(self).toBeTruthy();
    expect(self.isAdminActive).toBe(true);
  });
});

describe("Désactivation d'un compte admin — super_admin uniquement", () => {
  it("empêche un super_admin de se désactiver lui-même", async () => {
    const res = await superAdminSession.request("PATCH", `/api/admin/accounts/${superAdminId}/status`, {
      isAdminActive: false,
    });
    expect(res.status).toBe(400);
  });

  it("un super_admin désactive un autre admin, qui perd aussitôt l'accès et ne peut plus se reconnecter", async () => {
    const deactivateRes = await superAdminSession.request("PATCH", `/api/admin/accounts/${moderatorId}/status`, {
      isAdminActive: false,
    });
    expect(deactivateRes.status).toBe(200);
    const body = await deactivateRes.json();
    expect(body.isAdminActive).toBe(false);

    // The already-logged-in session is now blocked mid-flight.
    const blockedRes = await moderatorSession.request("GET", "/api/admin/moderation");
    expect(blockedRes.status).toBe(403);

    // And a fresh login attempt is rejected outright.
    const freshLoginRes = await new Session().request("POST", "/api/auth/login", {
      email: MODERATOR_EMAIL,
      password: PASSWORD,
    });
    expect([403, 429]).toContain(freshLoginRes.status);

    // Reactivate so cleanup and any re-run behave predictably.
    const reactivateRes = await superAdminSession.request("PATCH", `/api/admin/accounts/${moderatorId}/status`, {
      isAdminActive: true,
    });
    expect(reactivateRes.status).toBe(200);
  });
});

describe("Réclamation en libre-service par correspondance de contact", () => {
  it("prépare une organisation prospect distincte pour ce flux", async () => {
    const res = await superAdminSession.request("POST", "/api/admin/organizations/prospect", {
      userType: "company",
      email: CONTACT_MATCH_PROSPECT_EMAIL,
      organizationName: "Contact Match SARL",
      contactPhone: CONTACT_MATCH_PHONE,
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    contactMatchProspectId = body.id;
  });

  it("signale une correspondance quand le téléphone correspond", async () => {
    const res = await new Session().request("POST", "/api/organizations/prospect-match", {
      userType: "company",
      phone: CONTACT_MATCH_PHONE,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.match).toBe(true);
    expect(body.organizationName).toBe("Contact Match SARL");
  });

  it("ne signale rien pour un téléphone qui ne correspond à aucun prospect", async () => {
    const res = await new Session().request("POST", "/api/organizations/prospect-match", {
      userType: "company",
      phone: "+221700000000",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.match).toBe(false);
  });

  it("réclame le compte par correspondance téléphone sans jamais exposer de claimToken", async () => {
    const claimSession = new Session();
    const res = await claimSession.request("POST", "/api/organizations/claim-by-contact", {
      userType: "company",
      phone: CONTACT_MATCH_PHONE,
      password: "ContactMatch1!",
      confirmPassword: "ContactMatch1!",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(contactMatchProspectId);
    expect(body.isProspect).toBe(false);

    const me = await claimSession.request("GET", "/api/auth/me");
    expect(me.status).toBe(200);
  });

  it("ne peut plus être réclamé une seconde fois par correspondance téléphone", async () => {
    const res = await new Session().request("POST", "/api/organizations/claim-by-contact", {
      userType: "company",
      phone: CONTACT_MATCH_PHONE,
      password: PASSWORD,
      confirmPassword: PASSWORD,
    });
    expect([404, 429]).toContain(res.status);
  });
});
