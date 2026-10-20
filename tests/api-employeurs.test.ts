/**
 * GET /api/employeurs (page Employeurs), le secteur des employeurs et la
 * règle « un employeur ne se vérifie jamais lui-même », contre le serveur de
 * développement et la vraie base (comme tests/api-offres.test.ts). Les
 * employeurs de test portent un nom unique, recherché par ?q=.
 */
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { EN_TETE_TESTS } from "../server/middlewares/limiteur-tests";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const RUN = randomUUID().slice(0, 8);
const MOT = `zq${RUN}`;
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

const entreprise = new Session();
const agence = new Session();
const admin = new Session();
const visiteur = new Session();
const emails = {
  entreprise: `test.employeurs.entreprise.${RUN}@example.com`,
  agence: `test.employeurs.agence.${RUN}@example.com`,
  admin: `test.employeurs.admin.${RUN}@example.com`,
};
let idEntreprise = "";
let idAgence = "";

async function inscrire(s: Session, accountType: "company" | "agency", email: string, nom: string, industry: string, city: string) {
  const res = await s.request("POST", "/api/auth/register-organization", {
    accountType, email, phone: "+22370000000", contactName: "Contact test", password: PASSWORD, companyName: nom, industry, city,
  });
  expect(res.status, await res.clone().text()).toBe(201);
  return (await pool.query("select id from users where email = $1", [email])).rows[0].id as string;
}

beforeAll(async () => {
  idEntreprise = await inscrire(entreprise, "company", emails.entreprise, `Sahel Test ${MOT}`, "Mines", "BAMAKO");
  idAgence = await inscrire(agence, "agency", emails.agence, `Talents Test ${MOT}`, "BTP", "Kayès");
  await pool.query(
    "insert into job_postings (company_id, title, description, location, job_type, is_active) values ($1, 'Offre test', '<p>Test.</p>', 'Bamako', 'cdi', true), ($1, 'Offre inactive', '<p>Test.</p>', 'Bamako', 'cdi', false)",
    [idEntreprise],
  );
  const { rows } = await pool.query(
    "insert into users (email, password, user_type, full_name, is_verified) values ($1, $2, 'admin', 'Admin test', true) returning id",
    [emails.admin, await bcrypt.hash(PASSWORD, 10)],
  );
  await pool.query("insert into admin_profiles (user_id, admin_level, is_active) values ($1, 'super_admin', true)", [rows[0].id]);
  expect((await admin.request("POST", "/api/auth/login", { email: emails.admin, password: PASSWORD })).status).toBe(200);
}, 30000);

afterAll(async () => {
  const ids = (await pool.query("select id from users where email = any($1)", [Object.values(emails)])).rows.map((r) => r.id);
  await pool.query("delete from job_postings where company_id = any($1) or agency_id = any($1)", [ids]);
  for (const t of ["activity_logs", "notifications", "company_modules"]) {
    if (t === "company_modules") await pool.query("delete from company_modules where company_profile_id in (select id from company_profiles where user_id = any($1))", [ids]).catch(() => {});
    else await pool.query(`delete from ${t} where user_id = any($1)`, [ids]).catch(() => {});
  }
  for (const t of ["company_profiles", "agency_profiles", "admin_profiles"]) await pool.query(`delete from ${t} where user_id = any($1)`, [ids]);
  await pool.query("delete from users where id = any($1)", [ids]);
  await pool.end();
});

const chercher = async (params = "") => {
  const res = await visiteur.request("GET", `/api/employeurs?q=${MOT}${params}`);
  expect(res.status).toBe(200);
  return res.json();
};

describe("GET /api/employeurs", () => {
  it("renvoie les employeurs, le total, la pagination et les facettes", async () => {
    const r = await chercher();
    expect([r.total, r.page, r.taille, r.tri]).toEqual([2, 1, 12, "offres"]);
    // Plus d'offres d'abord : l'offre inactive ne compte pas.
    expect(r.employeurs.map((e: { nom: string; offresPubliees: number }) => `${e.nom.replace(` ${MOT}`, "")}:${e.offresPubliees}`)).toEqual(["Sahel Test:1", "Talents Test:0"]);
    expect(r.employeurs[0]).toMatchObject({ type: "entreprise", ville: "BAMAKO", verifie: false });
    expect(r.employeurs[0]).not.toHaveProperty("note");
    expect(r.facettes.types).toEqual({ tous: 2, entreprise: 1, agence: 1 });
    expect(r.facettes.avecOffres).toBe(1);
  });

  it("enregistre le secteur saisi à l'inscription, agences comprises", async () => {
    const r = await chercher();
    expect(r.employeurs.map((e: { secteur?: string }) => e.secteur)).toEqual(["Mines et carrières", "BTP et construction"]);
  });

  it("compare les villes sans casse ni accents et filtre par type, secteur et offres", async () => {
    expect((await chercher("&lieu=bamako")).total).toBe(1);
    expect((await chercher("&lieu=KAYES")).total).toBe(1);
    expect((await chercher("&type=agences")).employeurs[0].type).toBe("agence");
    expect((await chercher(`&secteur=${encodeURIComponent("BTP et construction")}`)).total).toBe(1);
    expect((await chercher("&offres=1")).total).toBe(1);
  });
});

describe("secteur et vérification sur le profil", () => {
  it("un employeur choisit son secteur parmi les 32, et seulement parmi eux", async () => {
    expect((await entreprise.request("PATCH", "/api/profile", { profileUpdates: { secteur: "Énergie et électricité" } })).status).toBe(200);
    expect((await chercher()).employeurs[0].secteur).toBe("Énergie et électricité");
    expect((await entreprise.request("PATCH", "/api/profile", { profileUpdates: { secteur: "Divers" } })).status).toBe(400);
  });

  it("un employeur ne peut jamais se marquer vérifié lui-même", async () => {
    const essais: [Session, Record<string, unknown>][] = [
      [entreprise, { verifiedAt: new Date().toISOString() }],
      [entreprise, { verifiedBy: idEntreprise }],
      [agence, { verifiedAt: new Date().toISOString(), verifiedBy: idAgence }],
      [agence, { verificationStatus: "verified" }],
    ];
    for (const [s, profileUpdates] of essais) {
      expect((await s.request("PATCH", "/api/profile", { profileUpdates })).status).toBe(400);
    }
    // Ni par l'action réservée aux administrateurs.
    expect((await entreprise.request("PATCH", `/api/admin/employeurs/${idEntreprise}/verification`, { verifie: true })).status).toBeGreaterThanOrEqual(401);
    expect((await agence.request("PATCH", `/api/admin/employeurs/${idAgence}/verification`, { verifie: true })).status).toBeGreaterThanOrEqual(401);
    const base = await pool.query(
      "select (select verified_at from company_profiles where user_id = $1) c, (select verified_at from agency_profiles where user_id = $2) a, (select verification_status from agency_profiles where user_id = $2) s",
      [idEntreprise, idAgence],
    );
    expect(base.rows[0]).toEqual({ c: null, a: null, s: "pending" });
    expect((await chercher()).employeurs.every((e: { verifie: boolean }) => !e.verifie)).toBe(true);
  });

  it("seul un administrateur vérifie un employeur, et le badge suit", async () => {
    expect((await admin.request("PATCH", `/api/admin/employeurs/${idAgence}/verification`, { verifie: true })).status).toBe(200);
    const r = await chercher("&type=agences");
    expect(r.employeurs[0]).toMatchObject({ id: idAgence, verifie: true });
    const journal = await pool.query("select details from activity_logs where details like $1", [`%Contact test%vérifié par BaaraMatch%`]);
    expect(journal.rowCount).toBeGreaterThan(0);
  });
});
