/**
 * « Mon profil » côté API : complétion calculée par le serveur, sections
 * manquantes, prétentions structurées, valeurs contrôlées, expériences sans
 * date de fin et CV servi par GET /api/profile/cv (plus de base64 dans
 * /api/profile). Contre le serveur de développement et la vraie base,
 * comme tests/api-espace-candidat.test.ts.
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
      redirect: "manual",
    });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) this.cookie = setCookie.split(";")[0];
    return res;
  }
}

const emails = { complet: `test.profil.complet.${RUN}@example.com`, partiel: `test.profil.partiel.${RUN}@example.com` };
const complet = new Session();
const partiel = new Session();
const visiteur = new Session();
const ids: Record<string, string> = {};
// Un vrai petit PDF, en base64 comme l'enregistre l'envoi par morceaux.
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF");

const profilComplet = {
  title: "Technicienne réseau",
  bio: "Cinq ans d'installation de réseaux d'entreprise à Bamako.",
  experience: "3-5",
  skills: ["Cisco IOS", "Fibre optique"],
  salaryExpectation: "600-800",
  availableFrom: "1-month",
  educationEntries: [{ id: "f1", level: "Bac+5 (Master)", institution: "USTTB", degree: "Master réseaux", startYear: "2016", endYear: "2018" }],
  certifications: [{ id: "c1", name: "CCNA", issuer: "Cisco", obtainedDate: "2021-03-02" }],
  experiences: [
    { id: "e1", position: "Technicienne réseau", company: "Orange Mali", contractType: "CDD", startDate: "2021-03-02", endDate: null, isCurrent: true, missionDescription: "Maintenance des routeurs d'agence." },
    { id: "e2", position: "Assistante réseau", company: "Sahel Télécom", contractType: "CDI", startDate: "2018-03-02", endDate: null, isCurrent: false, missionDescription: "" },
  ],
};

beforeAll(async () => {
  for (const [s, email] of [[complet, emails.complet], [partiel, emails.partiel]] as const) {
    const r = await s.request("POST", "/api/auth/register", { email, password: PASSWORD, confirmPassword: PASSWORD, userType: "candidate", fullName: "Aminata Diallo" });
    expect(r.status, await r.clone().text()).toBe(201);
  }
  for (const [cle, email] of Object.entries(emails)) ids[cle] = (await pool.query("select id from users where email = $1", [email])).rows[0].id;
  const res = await complet.request("PATCH", "/api/profile", { userUpdates: { phone: "+22376234567", city: "Bamako" }, profileUpdates: profilComplet });
  expect(res.status, await res.clone().text()).toBe(200);
  // CV enregistré comme le fait /api/profile/resume-chunk sans stockage d'objets, nom sans extension.
  await pool.query("update candidate_profiles set resume_url = $2, resume_file_name = 'CV Aminata Diallo', resume_mime_type = 'application/pdf' where user_id = $1", [ids.complet, `data:application/pdf;base64,${PDF.toString("base64")}`]);
  const { certifications: _c, ...sansCertification } = profilComplet;
  const r2 = await partiel.request("PATCH", "/api/profile", { userUpdates: { phone: "76234567", city: "Kayes" }, profileUpdates: { ...sansCertification, certifications: [] } });
  expect(r2.status, await r2.clone().text()).toBe(200);
  await pool.query("update candidate_profiles set resume_url = $2, resume_file_name = 'cv.pdf', resume_mime_type = 'application/pdf' where user_id = $1", [ids.partiel, `data:application/pdf;base64,${PDF.toString("base64")}`]);
}, 40000);

afterAll(async () => {
  const tous = Object.values(ids);
  for (const t of ["notifications", "activity_logs", "candidate_profiles"]) await pool.query(`delete from ${t} where user_id = any($1)`, [tous]).catch(() => {});
  await pool.query("delete from users where id = any($1)", [tous]);
  await pool.end();
});

const profil = async (s: Session) => {
  const res = await s.request("GET", "/api/profile");
  expect(res.status).toBe(200);
  return { taille: Number(res.headers.get("content-length") ?? 0), corps: await res.json() };
};

describe("GET /api/profile", () => {
  it("profil complet : 100 %, aucune section manquante, prétentions structurées", async () => {
    const { corps } = await profil(complet);
    expect(corps.profile.completion).toEqual({ pourcentage: 100, sectionsManquantes: [], etapesManquantes: [] });
    expect(corps.profile.pretentions).toEqual({ salaireMin: 600_000, salaireMax: 800_000, devise: "FCFA", periode: "mois" });
    expect(corps.profile.availableFrom).toBe("1-month");
    expect(corps.profile.updatedAt).toBeTruthy();
  });

  it("profil sans certification : 90 % et la section certifications manquante", async () => {
    const { corps } = await profil(partiel);
    expect(corps.profile.completion.pourcentage).toBe(90);
    expect(corps.profile.completion.sectionsManquantes).toEqual(["certifications"]);
    expect(corps.profile.completion.etapesManquantes).toEqual([{ label: "Ajouter une certification", section: "certifications" }]);
  });

  it("garde une expérience en cours et une expérience terminée, toutes deux sans date de fin", async () => {
    const { corps } = await profil(complet);
    const [enCours, terminee] = corps.profile.experiences;
    expect(enCours).toMatchObject({ id: "e1", isCurrent: true, endDate: null });
    expect(terminee).toMatchObject({ id: "e2", isCurrent: false, endDate: null });
  });

  it("n'envoie plus le CV en base64 : l'adresse de GET /api/profile/cv", async () => {
    const { corps } = await profil(complet);
    expect(corps.profile.resumeUrl).toBe("/api/profile/cv");
    expect(JSON.stringify(corps)).not.toContain("base64");
    expect(corps.profile.profileEmbedding).toBeUndefined();
  });
});

describe("GET /api/profile/cv", () => {
  it("affiche le PDF, et le télécharge avec une extension quand le nom n'en a pas", async () => {
    const vue = await complet.request("GET", "/api/profile/cv");
    expect(vue.status).toBe(200);
    expect(vue.headers.get("content-type")).toBe("application/pdf");
    expect(vue.headers.get("content-disposition")).toMatch(/^inline; filename="CV Aminata Diallo\.pdf"/);
    expect(vue.headers.get("cache-control")).toBe("private, no-store");
    expect(Buffer.from(await vue.arrayBuffer()).equals(PDF)).toBe(true);
    const fichier = await complet.request("GET", "/api/profile/cv?telechargement=1");
    expect(fichier.headers.get("content-disposition")).toMatch(/^attachment; filename="CV Aminata Diallo\.pdf"/);
  });

  it("ne sert que son propre CV, et rien sans session", async () => {
    const autre = Buffer.from(await (await partiel.request("GET", "/api/profile/cv")).arrayBuffer());
    expect(autre.equals(PDF)).toBe(true);
    expect((await partiel.request("GET", "/api/profile/cv")).headers.get("content-disposition")).toMatch(/filename="cv\.pdf"/);
    expect((await visiteur.request("GET", "/api/profile/cv")).status).toBe(401);
  });

  it("répond 404 sans CV", async () => {
    await pool.query("update candidate_profiles set resume_url = null where user_id = $1", [ids.partiel]);
    expect((await partiel.request("GET", "/api/profile/cv")).status).toBe(404);
    const { corps } = await profil(partiel);
    expect(corps.profile.resumeUrl).toBeNull();
    expect(corps.profile.completion.sectionsManquantes).toEqual(["cv", "certifications"]);
  });
});

describe("PATCH /api/profile : valeurs contrôlées", () => {
  it("refuse une disponibilité ou des prétentions en texte libre", async () => {
    expect((await complet.request("PATCH", "/api/profile", { profileUpdates: { availableFrom: "bientôt" } })).status).toBe(400);
    expect((await complet.request("PATCH", "/api/profile", { profileUpdates: { salaryExpectation: "beaucoup" } })).status).toBe(400);
    expect((await complet.request("PATCH", "/api/profile", { profileUpdates: { availableFrom: "2026-11-02" } })).status).toBe(200);
    expect((await complet.request("PATCH", "/api/profile", { profileUpdates: { availableFrom: "", salaryExpectation: "" } })).status).toBe(200);
  });

  it("n'accepte qu'un effacement du CV, jamais une adresse", async () => {
    expect((await complet.request("PATCH", "/api/profile", { profileUpdates: { resumeUrl: "https://exemple.org/cv.pdf" } })).status).toBe(400);
    const res = await complet.request("PATCH", "/api/profile", { profileUpdates: { resumeUrl: null, resumeFileName: null, resumeMimeType: null } });
    expect(res.status).toBe(200);
    const corps = await res.json();
    expect(corps.profile.resumeUrl).toBeNull();
    expect(corps.profile.completion.sectionsManquantes).toContain("cv");
  });
});
