/**
 * Console admin : demandes de démo (liste, traitement) et modération des avis
 * de candidats, contre le serveur de développement et la vraie base (comme
 * tests/api-profil-employeur.test.ts).
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

const gestionnaire = new Session();
const moderateur = new Session();
const visiteur = new Session();
const ids: string[] = [];
let idDemande = "";
let idAvis = "";
let idEmployeur = "";

async function admin(s: Session, niveau: string) {
  const email = `test.nettoyage.${niveau}.${RUN}@example.com`;
  const { rows } = await pool.query("insert into users (email, password, user_type, full_name, is_verified) values ($1, $2, 'admin', $3, true) returning id", [email, await bcrypt.hash(PASSWORD, 10), `Admin ${niveau}`]);
  ids.push(rows[0].id);
  await pool.query("insert into admin_profiles (user_id, admin_level, is_active) values ($1, $2, true)", [rows[0].id, niveau]);
  expect((await s.request("POST", "/api/auth/login", { email, password: PASSWORD })).status).toBe(200);
}

beforeAll(async () => {
  await admin(gestionnaire, "gestionnaire_comptes");
  await admin(moderateur, "moderateur");
  const demande = await visiteur.request("POST", "/api/demo-requests", { fullName: "Awa Test", company: `Société Test ${RUN}`, contact: `demo.${RUN}@example.com`, profileType: "entreprise" });
  expect(demande.status, await demande.clone().text()).toBeLessThan(300);
  idDemande = (await pool.query("select id from demo_requests where company = $1", [`Société Test ${RUN}`])).rows[0].id;
  // Un employeur et un candidat pour un avis.
  const e = await pool.query("insert into users (email, password, user_type, full_name) values ($1, 'x', 'company', $2) returning id", [`test.nettoyage.emp.${RUN}@example.com`, `Employeur Test ${RUN}`]);
  const c = await pool.query("insert into users (email, password, user_type, full_name) values ($1, 'x', 'candidate', 'Candidat Test') returning id", [`test.nettoyage.cand.${RUN}@example.com`]);
  idEmployeur = e.rows[0].id;
  ids.push(idEmployeur, c.rows[0].id);
  idAvis = (await pool.query("insert into employer_reviews (employer_id, candidate_id, note, commentaire) values ($1, $2, 2, 'Avis de test') returning id", [idEmployeur, c.rows[0].id])).rows[0].id;
}, 40000);

afterAll(async () => {
  await pool.query("delete from demo_requests where company = $1", [`Société Test ${RUN}`]);
  await pool.query("delete from employer_reviews where employer_id = any($1)", [ids]);
  await pool.query("delete from activity_logs where user_id = any($1)", [ids]);
  await pool.query("delete from admin_profiles where user_id = any($1)", [ids]);
  await pool.query("delete from users where id = any($1)", [ids]);
  await pool.end();
});

describe("demandes de démo", () => {
  it("sont listées pour un gestionnaire, refusées à un modérateur et à un visiteur", async () => {
    const res = await gestionnaire.request("GET", "/api/admin/demo-requests");
    expect(res.status).toBe(200);
    const d = (await res.json()).find((x: { id: string }) => x.id === idDemande);
    expect(d).toMatchObject({ fullName: "Awa Test", treatedAt: null });
    expect((await moderateur.request("GET", "/api/admin/demo-requests")).status).toBe(403);
    expect((await visiteur.request("GET", "/api/admin/demo-requests")).status).toBeGreaterThanOrEqual(401);
  });

  it("se marquent comme traitées, puis se rouvrent, avec journal", async () => {
    const r1 = await gestionnaire.request("PATCH", `/api/admin/demo-requests/${idDemande}`, { traitee: true });
    expect(r1.status).toBe(200);
    expect((await r1.json()).treatedAt).toBeTruthy();
    const journal = await pool.query("select count(*)::int n from activity_logs where details = $1", [`Demande de démo de Société Test ${RUN} traitée`]);
    expect(journal.rows[0].n).toBe(1);
    expect((await (await gestionnaire.request("PATCH", `/api/admin/demo-requests/${idDemande}`, { traitee: false })).json()).treatedAt).toBeNull();
    expect((await gestionnaire.request("PATCH", `/api/admin/demo-requests/${idDemande}`, { traitee: "oui" })).status).toBe(400);
    expect((await gestionnaire.request("PATCH", "/api/admin/demo-requests/inexistante", { traitee: true })).status).toBe(404);
  });
});

describe("modération des avis", () => {
  it("liste les avis avec l'employeur, sans l'auteur", async () => {
    const res = await moderateur.request("GET", "/api/admin/avis");
    expect(res.status).toBe(200);
    const liste = await res.json();
    const a = liste.find((x: { id: string }) => x.id === idAvis);
    expect(a).toMatchObject({ employeurNom: `Employeur Test ${RUN}`, note: 2, commentaire: "Avis de test", masque: false });
    expect(JSON.stringify(a)).not.toContain("Candidat Test");
    expect((await visiteur.request("GET", "/api/admin/avis")).status).toBeGreaterThanOrEqual(401);
  });

  it("masque puis rétablit un avis, visible dans la liste", async () => {
    expect((await moderateur.request("PATCH", `/api/admin/avis/${idAvis}`, { masque: true })).status).toBe(200);
    expect((await (await moderateur.request("GET", "/api/admin/avis")).json()).find((x: { id: string }) => x.id === idAvis).masque).toBe(true);
    expect((await (await visiteur.request("GET", `/api/employeurs/${idEmployeur}/avis`)).json()).avis).toHaveLength(0);
    expect((await moderateur.request("PATCH", `/api/admin/avis/${idAvis}`, { masque: false })).status).toBe(200);
  });
});
