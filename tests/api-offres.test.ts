/**
 * GET /api/offres (page Offres) et PATCH /api/admin/employeurs/:id/verification,
 * contre le serveur de développement et la vraie base, comme
 * tests/admin-third-party.test.ts. Les offres de test portent un titre
 * unique et sont recherchées par ce titre (?q=), pour ne pas dépendre des
 * offres déjà en base.
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

const ids: string[] = [];
let entrepriseId: string;
const admin = new Session();
const moderateur = new Session();
const visiteur = new Session();

async function utilisateur(type: string, nom: string, niveau?: string) {
  const email = `test.offres.${type}.${niveau ?? "x"}.${RUN}@example.com`;
  const { rows } = await pool.query(
    "insert into users (email, password, user_type, full_name, is_verified) values ($1, $2, $3, $4, true) returning id",
    [email, await bcrypt.hash(PASSWORD, 10), type, nom],
  );
  ids.push(rows[0].id);
  if (niveau) await pool.query("insert into admin_profiles (user_id, admin_level, is_active) values ($1, $2, true)", [rows[0].id, niveau]);
  return { id: rows[0].id as string, email };
}

async function offre(titre: string, champs: { location: string; job_type: string; category?: string; experience_min?: number; jours?: number }) {
  await pool.query(
    `insert into job_postings (company_id, title, description, location, job_type, category, experience_min, is_active, created_at)
     values ($1, $2, '<p>Offre de test.</p>', $3, $4, $5, $6, true, now() - ($7 || ' days')::interval)`,
    [entrepriseId, `${titre} ${MOT}`, champs.location, champs.job_type, champs.category ?? null, champs.experience_min ?? null, String(champs.jours ?? 0)],
  );
}

beforeAll(async () => {
  const entreprise = await utilisateur("company", "Entreprise test offres");
  entrepriseId = entreprise.id;
  await pool.query("insert into company_profiles (user_id, company_name, logo_url) values ($1, $2, '/logo-test.png')", [entrepriseId, `Sahel Test ${RUN}`]);
  await offre("Chef de chantier", { location: "Bamako", job_type: "cdi", category: "BTP & Construction", experience_min: 3, jours: 1 });
  await offre("Conducteur d'engins", { location: "BAMAKO", job_type: "cdd", category: "Mines", experience_min: 0, jours: 2 });
  await offre("Géologue", { location: "Kayès", job_type: "freelance", category: "Mines et carrières", experience_min: 6, jours: 20 });
  for (const [s, niveau] of [[admin, "super_admin"], [moderateur, "moderateur"]] as const) {
    const u = await utilisateur("admin", `Admin ${niveau}`, niveau);
    expect((await s.request("POST", "/api/auth/login", { email: u.email, password: PASSWORD })).status).toBe(200);
  }
}, 30000);

afterAll(async () => {
  await pool.query("delete from job_postings where company_id = $1", [entrepriseId]);
  await pool.query("delete from activity_logs where user_id = any($1)", [ids]);
  await pool.query("delete from company_profiles where user_id = any($1)", [ids]);
  await pool.query("delete from admin_profiles where user_id = any($1)", [ids]);
  await pool.query("delete from users where id = any($1)", [ids]);
  await pool.end();
});

const chercher = async (params: string) => {
  const res = await visiteur.request("GET", `/api/offres?q=${MOT}${params}`);
  expect(res.status).toBe(200);
  return res.json();
};

describe("GET /api/offres", () => {
  it("renvoie les offres, le total, la pagination et l'employeur", async () => {
    const r = await chercher("");
    expect([r.total, r.page, r.taille, r.nbPages, r.tri]).toEqual([3, 1, 20, 1, "recent"]);
    expect(r.offres.map((o: { titre: string }) => o.titre.replace(` ${MOT}`, ""))).toEqual(["Chef de chantier", "Conducteur d'engins", "Géologue"]);
    expect(r.offres[0]).toMatchObject({ employeurNom: `Sahel Test ${RUN}`, employeurLogoUrl: "/logo-test.png", employeurVerifie: false, contrat: "CDI", secteur: "BTP et construction", ville: "Bamako" });
    expect(r.offres[0].publieLe).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(r.offres[0]).not.toHaveProperty("employeurNote");
  });

  it("compare les villes sans casse ni accents", async () => {
    expect((await chercher("&ville=bamako")).total).toBe(2);
    expect((await chercher("&ville=KAYES")).total).toBe(1);
    expect((await chercher(`&ville=${encodeURIComponent("Bamakó")}&ville=kayes`)).total).toBe(3);
  });

  it("filtre par contrat, secteur (anciennes catégories comprises), expérience et date", async () => {
    expect((await chercher("&contrat=Freelance")).total).toBe(1);
    expect((await chercher(`&secteur=${encodeURIComponent("Mines et carrières")}`)).total).toBe(2);
    expect((await chercher("&exp[]=0-2&exp[]=5-10")).total).toBe(2);
    expect((await chercher("&publiee_depuis_jours=7")).total).toBe(2);
  });

  it("pagine et ramène une page trop grande à la dernière", async () => {
    const r = await chercher("&taille=2&page=5");
    expect([r.page, r.nbPages, r.offres.length]).toEqual([2, 2, 1]);
  });

  it("calcule les facettes avec les autres filtres actifs", async () => {
    const { facettes } = await chercher("&contrat=CDI");
    expect(facettes.contrats).toEqual({ toutes: 3, CDI: 1, CDD: 1, Freelance: 1 });
    // Toutes les villes de la base restent proposées ; seules celles du test sont comptées.
    const villes = facettes.villes.filter((v: { valeur: string }) => ["bamako", "kayes"].includes(v.valeur));
    expect(villes.map((v: { libelle: string; nombre: number }) => `${v.libelle}:${v.nombre}`)).toEqual(["Bamako:1", "Kayès:0"]);
    expect(facettes.secteurs).toHaveLength(32);
  });
});

describe("vérification d'un employeur", () => {
  it("est refusée à un modérateur", async () => {
    expect((await moderateur.request("PATCH", `/api/admin/employeurs/${entrepriseId}/verification`, { verifie: true })).status).toBe(403);
  });

  it("allume le badge des offres, puis l'éteint", async () => {
    expect((await admin.request("PATCH", `/api/admin/employeurs/${entrepriseId}/verification`, { verifie: true })).status).toBe(200);
    expect((await chercher("")).offres.every((o: { employeurVerifie: boolean }) => o.employeurVerifie)).toBe(true);
    const liste = await (await admin.request("GET", "/api/admin/companies")).json();
    expect(liste.find((c: { id: string }) => c.id === entrepriseId).verifiedAt).toBeTruthy();

    expect((await admin.request("PATCH", `/api/admin/employeurs/${entrepriseId}/verification`, { verifie: false })).status).toBe(200);
    expect((await chercher("")).offres.some((o: { employeurVerifie: boolean }) => o.employeurVerifie)).toBe(false);
  });

  it("refuse un corps invalide et un compte qui n'est pas un employeur", async () => {
    expect((await admin.request("PATCH", `/api/admin/employeurs/${entrepriseId}/verification`, { verifie: "oui" })).status).toBe(400);
    expect((await admin.request("PATCH", `/api/admin/employeurs/${ids[1]}/verification`, { verifie: true })).status).toBe(404);
  });
});
