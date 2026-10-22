/**
 * Espace candidat (migration 0045) : relance, rappel repoussé, retrait,
 * sauvegarde en double, ?limite= et pays sans valeur par défaut, contre le
 * serveur de développement et la vraie base (comme
 * tests/api-profil-employeur.test.ts).
 */
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { randomUUID } from "crypto";
import { EN_TETE_TESTS } from "../server/middlewares/limiteur-tests";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const RUN = randomUUID().slice(0, 8);
const PASSWORD = "Test1234!";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

class Session {
  private cookie = "";
  async request(method: string, path: string, body?: unknown) {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { "Content-Type": "application/json", [EN_TETE_TESTS]: "1", ...(this.cookie ? { Cookie: this.cookie } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) this.cookie = setCookie.split(";")[0];
    return res;
  }
}

const emails = {
  entreprise: `test.espace.entreprise.${RUN}@example.com`,
  candidat: `test.espace.candidat.${RUN}@example.com`,
  autre: `test.espace.autre.${RUN}@example.com`,
};
const entreprise = new Session();
const candidat = new Session();
const autre = new Session();
const ids: Record<string, string> = {};
const candidatures: Record<string, string> = {};
let offres: string[] = [];

// Candidature du candidat de test, sans réponse depuis `jours` jours.
async function candidature(cle: string, offre: string, jours: number, statut = "pending") {
  const { rows } = await pool.query(
    "insert into applications (candidate_id, job_id, status, created_at, status_changed_at) values ($1, $2, $3, now() - ($4 || ' days')::interval, now() - ($4 || ' days')::interval) returning id",
    [ids.candidat, offre, statut, String(jours)],
  );
  candidatures[cle] = rows[0].id;
}

beforeAll(async () => {
  const res = await entreprise.request("POST", "/api/auth/register-organization", { accountType: "company", email: emails.entreprise, phone: "+22370000002", contactName: "Contact Espace", password: PASSWORD, companyName: `Espace Test ${RUN}`, industry: "Mines", city: "Kayes" });
  expect(res.status, await res.clone().text()).toBe(201);
  for (const [s, email] of [[candidat, emails.candidat], [autre, emails.autre]] as const) {
    const r = await s.request("POST", "/api/auth/register", { email, password: PASSWORD, confirmPassword: PASSWORD, userType: "candidate", fullName: "Candidat Espace Test" });
    expect(r.status, await r.clone().text()).toBe(201);
  }
  for (const [cle, email] of Object.entries(emails)) ids[cle] = (await pool.query("select id from users where email = $1", [email])).rows[0].id;
  offres = [];
  for (let i = 0; i < 6; i++) {
    offres.push((await pool.query("insert into job_postings (company_id, title, description, location, job_type, is_active) values ($1, $2, '<p>Test.</p>', 'Kayes', 'cdi', true) returning id", [ids.entreprise, `Poste espace ${i}`])).rows[0].id);
  }
  await candidature("j29", offres[0], 29);
  await candidature("j30", offres[1], 30);
  await candidature("j181", offres[2], 181);
  await candidature("entretien", offres[3], 60, "interview");
  await candidature("retrait", offres[4], 3);
}, 40000);

afterAll(async () => {
  const tous = Object.values(ids);
  await pool.query("delete from saved_jobs where candidate_id = any($1)", [tous]);
  await pool.query("delete from applications where candidate_id = any($1)", [tous]);
  await pool.query("delete from job_postings where company_id = any($1)", [tous]);
  for (const t of ["notifications", "activity_logs", "candidate_profiles", "company_profiles"]) await pool.query(`delete from ${t} where user_id = any($1)`, [tous]).catch(() => {});
  await pool.query("delete from company_modules where company_profile_id in (select id from company_profiles where user_id = any($1))", [tous]).catch(() => {});
  await pool.query("delete from users where id = any($1)", [tous]);
  await pool.end();
});

const notificationsRelance = async () =>
  (await pool.query("select message from notifications where user_id = $1 and title = 'Relance d''un candidat'", [ids.entreprise])).rows.map((r) => r.message as string);

describe("POST /api/applications/:id/relance", () => {
  it("refuse avant 30 jours sans réponse", async () => {
    const res = await candidat.request("POST", `/api/applications/${candidatures.j29}/relance`);
    expect(res.status).toBe(400);
    expect((await res.json()).message).toMatch(/30 jours/);
  });

  it("à 30 jours : notifie l'employeur une fois, puis refuse la deuxième relance", async () => {
    const res = await candidat.request("POST", `/api/applications/${candidatures.j30}/relance`);
    expect(res.status, await res.clone().text()).toBe(200);
    expect((await res.json()).lastFollowUpAt).toBeTruthy();
    expect(await notificationsRelance()).toEqual(["Candidat Espace Test relance sa candidature pour « Poste espace 1 », sans réponse depuis 30 jours."]);
    const encore = await candidat.request("POST", `/api/applications/${candidatures.j30}/relance`);
    expect(encore.status).toBe(429);
    expect(await notificationsRelance()).toHaveLength(1);
  });

  it("à 181 jours, écrit « plus de 6 mois »", async () => {
    expect((await candidat.request("POST", `/api/applications/${candidatures.j181}/relance`)).status).toBe(200);
    expect((await notificationsRelance()).some((m) => m.endsWith("sans réponse depuis plus de 6 mois."))).toBe(true);
  });

  it("refuse une candidature à laquelle l'employeur a répondu, ou celle d'un autre", async () => {
    expect((await candidat.request("POST", `/api/applications/${candidatures.entretien}/relance`)).status).toBe(400);
    expect((await autre.request("POST", `/api/applications/${candidatures.j181}/relance`)).status).toBe(403);
  });
});

describe("POST /api/applications/:id/rappel", () => {
  it("repousse le rappel de 30 jours", async () => {
    const res = await candidat.request("POST", `/api/applications/${candidatures.j181}/rappel`);
    expect(res.status, await res.clone().text()).toBe(200);
    const jours = (new Date((await res.json()).reminderSnoozedUntil).getTime() - Date.now()) / 86_400_000;
    expect(jours).toBeGreaterThan(29.9);
    expect(jours).toBeLessThan(30.1);
    expect((await autre.request("POST", `/api/applications/${candidatures.j181}/rappel`)).status).toBe(403);
  });
});

describe("Retrait d'une candidature", () => {
  it("passe la candidature en « retirée » sans la supprimer", async () => {
    const res = await candidat.request("PATCH", `/api/applications/${candidatures.retrait}/withdraw`);
    expect(res.status).toBe(200);
    expect((await pool.query("select status from applications where id = $1", [candidatures.retrait])).rows[0].status).toBe("withdrawn");
  });
});

describe("GET /api/applications", () => {
  it("trie de la plus récente à la plus ancienne, avec l'employeur et ?limite=", async () => {
    const toutes = await (await candidat.request("GET", "/api/applications")).json();
    expect(toutes.map((a: { id: string }) => a.id)).toEqual([candidatures.retrait, candidatures.j29, candidatures.j30, candidatures.entretien, candidatures.j181]);
    expect(toutes[0]).toMatchObject({ jobTitle: "Poste espace 4", organizationName: `Espace Test ${RUN}`, employeurVerifie: false, location: "Kayes", status: "withdrawn" });
    expect(toutes[0].statusChangedAt).toBeTruthy();
    const deux = await (await candidat.request("GET", "/api/applications?limite=2")).json();
    expect(deux.map((a: { id: string }) => a.id)).toEqual([candidatures.retrait, candidatures.j29]);
  });
});

describe("Offres sauvegardées", () => {
  it("une sauvegarde en double ne crée qu'une ligne ; le retrait est idempotent", async () => {
    const [a, b] = await Promise.all([
      candidat.request("POST", "/api/saved-jobs", { jobId: offres[5] }),
      candidat.request("POST", "/api/saved-jobs", { jobId: offres[5] }),
    ]);
    expect([a.status, b.status]).toEqual([201, 201]);
    expect((await candidat.request("POST", "/api/saved-jobs", { jobId: offres[5] })).status).toBe(201);
    expect((await pool.query("select count(*)::int n from saved_jobs where candidate_id = $1", [ids.candidat])).rows[0].n).toBe(1);
    expect((await candidat.request("DELETE", `/api/saved-jobs/${offres[5]}`)).status).toBe(204);
    expect((await candidat.request("DELETE", `/api/saved-jobs/${offres[5]}`)).status).toBe(204);
    expect((await pool.query("select count(*)::int n from saved_jobs where candidate_id = $1", [ids.candidat])).rows[0].n).toBe(0);
  });
});

describe("Pays", () => {
  it("n'invente plus « Sénégal » pour un compte créé sans pays", async () => {
    const pays = (await pool.query("select email, country from users where id = any($1)", [Object.values(ids)])).rows;
    expect(pays.every((u) => u.country === null)).toBe(true);
  });
});
