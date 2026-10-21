/**
 * Profil employeur : GET /api/employeurs/:id, suivi (et notification des
 * abonnés à la publication d'une offre), avis de candidats et modération,
 * contre le serveur de développement et la vraie base (comme
 * tests/api-employeurs.test.ts).
 */
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import bcrypt from "bcrypt";
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
  complete: `test.profil.complete.${RUN}@example.com`,
  vide: `test.profil.vide.${RUN}@example.com`,
  candidat: `test.profil.candidat.${RUN}@example.com`,
  autre: `test.profil.autre.${RUN}@example.com`,
  admin: `test.profil.admin.${RUN}@example.com`,
};
const complete = new Session();
const vide = new Session();
const candidat = new Session();
const autre = new Session();
const admin = new Session();
const visiteur = new Session();
const ids: Record<string, string> = {};

async function inscrireOrganisation(s: Session, email: string, nom: string, industry: string) {
  const res = await s.request("POST", "/api/auth/register-organization", { accountType: "company", email, phone: "+22370000001", contactName: `Contact ${nom}`, password: PASSWORD, companyName: nom, industry, city: "Bamako" });
  expect(res.status, await res.clone().text()).toBe(201);
}
async function inscrireCandidat(s: Session, email: string) {
  const res = await s.request("POST", "/api/auth/register", { email, password: PASSWORD, confirmPassword: PASSWORD, userType: "candidate", fullName: "Candidat Profil Test" });
  expect(res.status, await res.clone().text()).toBe(201);
}

beforeAll(async () => {
  await inscrireOrganisation(complete, emails.complete, `Profil Complet ${RUN}`, "Mines");
  await inscrireOrganisation(vide, emails.vide, `Profil Vide ${RUN}`, "Divers");
  await inscrireCandidat(candidat, emails.candidat);
  await inscrireCandidat(autre, emails.autre);
  for (const [cle, email] of Object.entries(emails)) {
    const r = await pool.query("select id from users where email = $1", [email]);
    if (r.rows[0]) ids[cle] = r.rows[0].id;
  }
  await pool.query(
    "update company_profiles set description = $2, founded_year = 2012, website = 'profil.example', cover_image_url = '/banniere-test.png', logo_url = '/logo-test.png' where user_id = $1",
    [ids.complete, "Entreprise minière à Kayes.\nNous recrutons toute l'année."],
  );
  // Une offre active et une candidature du premier candidat.
  const job = await pool.query("insert into job_postings (company_id, title, description, location, job_type, is_active) values ($1, 'Foreur test', '<p>Test.</p>', 'Kayes', 'cdi', true) returning id", [ids.complete]);
  await pool.query("insert into applications (candidate_id, job_id) values ($1, $2)", [ids.candidat, job.rows[0].id]);
  const { rows } = await pool.query("insert into users (email, password, user_type, full_name, is_verified) values ($1, $2, 'admin', 'Admin test', true) returning id", [emails.admin, await bcrypt.hash(PASSWORD, 10)]);
  ids.admin = rows[0].id;
  await pool.query("insert into admin_profiles (user_id, admin_level, is_active) values ($1, 'moderateur', true)", [ids.admin]);
  expect((await admin.request("POST", "/api/auth/login", { email: emails.admin, password: PASSWORD })).status).toBe(200);
}, 40000);

afterAll(async () => {
  const tous = Object.values(ids);
  await pool.query("delete from employer_reviews where employer_id = any($1) or candidate_id = any($1)", [tous]);
  await pool.query("delete from employer_follows where employer_id = any($1) or candidate_id = any($1)", [tous]);
  await pool.query("delete from applications where candidate_id = any($1)", [tous]);
  await pool.query("delete from job_postings where company_id = any($1)", [tous]);
  for (const t of ["notifications", "activity_logs", "candidate_profiles", "company_profiles", "admin_profiles"]) await pool.query(`delete from ${t} where user_id = any($1)`, [tous]).catch(() => {});
  await pool.query("delete from company_modules where company_profile_id in (select id from company_profiles where user_id = any($1))", [tous]).catch(() => {});
  await pool.query("delete from users where id = any($1)", [tous]);
  await pool.end();
});

const profil = async (s: Session, id: string) => {
  const res = await s.request("GET", `/api/employeurs/${id}`);
  expect(res.status).toBe(200);
  return res.json();
};

describe("GET /api/employeurs/:id", () => {
  it("renvoie un profil complet", async () => {
    const p = await profil(visiteur, ids.complete);
    expect(p).toMatchObject({
      type: "entreprise", nom: `Profil Complet ${RUN}`, logoUrl: "/logo-test.png", banniereUrl: "/banniere-test.png", ville: "Bamako",
      verifie: false, anneeCreation: 2012, secteur: "Mines et carrières", siteWeb: "profil.example", offresActives: 1,
      avis: { nombre: 0, moyenne: null }, suiviParMoi: false, peutDonnerAvis: false,
    });
    expect(p.description).toContain("Kayes");
    expect(p).not.toHaveProperty("note");
  });

  it("n'invente rien pour un profil sans bannière, secteur ni offre", async () => {
    const p = await profil(visiteur, ids.vide);
    expect(p.banniereUrl).toBeUndefined();
    expect(p.secteur).toBeUndefined();
    expect(p.description).toBeUndefined();
    expect(p.anneeCreation).toBeUndefined();
    expect(p.offresActives).toBe(0);
    expect(JSON.stringify(p)).not.toMatch(/N\/A/);
  });

  it("renvoie 404 pour un identifiant inconnu ou un compte qui n'est pas un employeur", async () => {
    expect((await visiteur.request("GET", "/api/employeurs/inexistant-123")).status).toBe(404);
    expect((await visiteur.request("GET", `/api/employeurs/${ids.candidat}`)).status).toBe(404);
  });
});

describe("suivi", () => {
  it("est refusé à un visiteur et à un employeur", async () => {
    expect((await visiteur.request("POST", `/api/employeurs/${ids.complete}/suivi`)).status).toBe(401);
    expect((await vide.request("POST", `/api/employeurs/${ids.complete}/suivi`)).status).toBe(403);
  });

  it("suivre puis ne plus suivre, état visible dans le profil", async () => {
    expect(await (await candidat.request("POST", `/api/employeurs/${ids.complete}/suivi`)).json()).toEqual({ suivi: true });
    expect(await (await candidat.request("GET", `/api/employeurs/${ids.complete}/suivi`)).json()).toEqual({ suivi: true });
    expect((await profil(candidat, ids.complete)).suiviParMoi).toBe(true);
    expect((await profil(visiteur, ids.complete)).suiviParMoi).toBe(false);
    // Deux fois de suite : sans erreur ni doublon.
    expect((await candidat.request("POST", `/api/employeurs/${ids.complete}/suivi`)).status).toBe(200);
    expect(await (await candidat.request("DELETE", `/api/employeurs/${ids.complete}/suivi`)).json()).toEqual({ suivi: false });
    expect((await profil(candidat, ids.complete)).suiviParMoi).toBe(false);
  });

  it("prévient les abonnés quand l'employeur publie une offre", async () => {
    await candidat.request("POST", `/api/employeurs/${ids.complete}/suivi`);
    const res = await complete.request("POST", "/api/jobs", { title: "Géologue test", description: "<p>Prospection minière, rapports hebdomadaires.</p>", location: "Kayes", jobType: "cdi", isActive: true });
    expect(res.status, await res.clone().text()).toBe(201);
    let notif;
    for (let i = 0; i < 20 && !notif; i++) {
      await new Promise((r) => setTimeout(r, 200));
      notif = (await pool.query("select title, message, action_url from notifications where user_id = $1 and type = 'employer_job'", [ids.candidat])).rows[0];
    }
    expect(notif?.title).toBe(`Nouvelle offre de Profil Complet ${RUN}`);
    expect(notif?.action_url).toMatch(/^\/jobs\//);
    // Un candidat qui ne suit pas n'est pas prévenu.
    expect((await pool.query("select count(*)::int n from notifications where user_id = $1 and type = 'employer_job'", [ids.autre])).rows[0].n).toBe(0);
  });
});

describe("avis de candidats", () => {
  it("sont réservés aux candidats ayant postulé", async () => {
    expect((await profil(candidat, ids.complete)).peutDonnerAvis).toBe(true);
    expect((await profil(autre, ids.complete)).peutDonnerAvis).toBe(false);
    expect((await autre.request("PUT", `/api/employeurs/${ids.complete}/avis`, { note: 5 })).status).toBe(403);
    expect((await vide.request("PUT", `/api/employeurs/${ids.complete}/avis`, { note: 5 })).status).toBe(403);
    expect((await visiteur.request("PUT", `/api/employeurs/${ids.complete}/avis`, { note: 5 })).status).toBe(401);
  });

  it("refusent une note hors de 1 à 5", async () => {
    for (const note of [0, 6, 3.5]) expect((await candidat.request("PUT", `/api/employeurs/${ids.complete}/avis`, { note })).status).toBe(400);
  });

  it("un avis par candidat, modifiable, publié sans nom ; moyenne à partir de 3 avis", async () => {
    expect((await candidat.request("PUT", `/api/employeurs/${ids.complete}/avis`, { note: 4, commentaire: "  Bon accueil.  " })).status).toBe(200);
    expect((await candidat.request("PUT", `/api/employeurs/${ids.complete}/avis`, { note: 5, commentaire: "Très bon accueil." })).status).toBe(200);
    const public_ = await (await visiteur.request("GET", `/api/employeurs/${ids.complete}/avis`)).json();
    expect(public_.resume).toEqual({ nombre: 1, moyenne: null });
    expect(public_.avis).toHaveLength(1);
    expect(public_.avis[0]).toMatchObject({ note: 5, commentaire: "Très bon accueil.", estLeMien: false });
    expect(JSON.stringify(public_)).not.toContain("Candidat Profil Test");
    expect(JSON.stringify(public_)).not.toContain(ids.candidat);
    const mien = await (await candidat.request("GET", `/api/employeurs/${ids.complete}/avis`)).json();
    expect(mien.avis[0].estLeMien).toBe(true);
    expect((await profil(visiteur, ids.complete)).avis).toEqual({ nombre: 1, moyenne: null });
  });

  it("peuvent être masqués par la modération, puis rétablis", async () => {
    const id = (await pool.query("select id from employer_reviews where employer_id = $1", [ids.complete])).rows[0].id;
    expect((await candidat.request("PATCH", `/api/admin/avis/${id}`, { masque: true })).status).toBeGreaterThanOrEqual(401);
    expect((await admin.request("PATCH", `/api/admin/avis/${id}`, { masque: true })).status).toBe(200);
    expect((await (await visiteur.request("GET", `/api/employeurs/${ids.complete}/avis`)).json()).avis).toHaveLength(0);
    expect((await admin.request("PATCH", `/api/admin/avis/${id}`, { masque: false })).status).toBe(200);
    expect((await (await visiteur.request("GET", `/api/employeurs/${ids.complete}/avis`)).json()).avis).toHaveLength(1);
  });

  it("peuvent être retirés par leur auteur", async () => {
    expect((await candidat.request("DELETE", `/api/employeurs/${ids.complete}/avis`)).status).toBe(200);
    expect((await (await visiteur.request("GET", `/api/employeurs/${ids.complete}/avis`)).json()).resume).toEqual({ nombre: 0, moyenne: null });
    expect((await candidat.request("DELETE", `/api/employeurs/${ids.complete}/avis`)).status).toBe(404);
  });
});
