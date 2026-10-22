/**
 * CV vocal : enregistrement sans dépendre d'OpenAI, écoute par le candidat
 * (avec requêtes partielles), écoute par un recruteur qui a reçu sa
 * candidature (et par lui seul), suppression, et plus d'audio dans les
 * réponses JSON. Contre le serveur de développement et la vraie base.
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
  async request(method: string, path: string, body?: unknown, enTetes: Record<string, string> = {}) {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { "Content-Type": "application/json", [EN_TETE_TESTS]: "1", ...(this.cookie ? { Cookie: this.cookie } : {}), ...enTetes },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      redirect: "manual",
    });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) this.cookie = setCookie.split(";")[0];
    return res;
  }
}

const emails = {
  candidat: `test.vocal.candidat.${RUN}@example.com`,
  autreCandidat: `test.vocal.autre.${RUN}@example.com`,
  entreprise: `test.vocal.entreprise.${RUN}@example.com`,
  autreEntreprise: `test.vocal.autreentreprise.${RUN}@example.com`,
};
const candidat = new Session();
const autreCandidat = new Session();
const entreprise = new Session();
const autreEntreprise = new Session();
const visiteur = new Session();
const ids: Record<string, string> = {};
let offreId = "";
// Faux enregistrement : le serveur ne décode pas l'audio, il contrôle le
// format déclaré, la taille et la durée mesurée par l'enregistreur.
const AUDIO = Buffer.from(Array.from({ length: 4096 }, (_, i) => i % 256));
const envoi = (s: Session, champs: Partial<{ audioBase64: string; mimeType: string; dureeSecondes: number }> = {}) =>
  s.request("POST", "/api/profile/cv-vocal", { audioBase64: AUDIO.toString("base64"), mimeType: "audio/webm;codecs=opus", dureeSecondes: 45, ...champs });

beforeAll(async () => {
  for (const [s, email] of [[candidat, emails.candidat], [autreCandidat, emails.autreCandidat]] as const) {
    const r = await s.request("POST", "/api/auth/register", { email, password: PASSWORD, confirmPassword: PASSWORD, userType: "candidate", fullName: "Aminata Diallo" });
    expect(r.status, await r.clone().text()).toBe(201);
  }
  for (const [s, email, nom] of [[entreprise, emails.entreprise, `Vocal Test ${RUN}`], [autreEntreprise, emails.autreEntreprise, `Vocal Autre ${RUN}`]] as const) {
    const r = await s.request("POST", "/api/auth/register-organization", { accountType: "company", email, phone: "+22370000003", contactName: "Contact Vocal", password: PASSWORD, companyName: nom, industry: "Mines", city: "Kayes" });
    expect(r.status, await r.clone().text()).toBe(201);
  }
  for (const [cle, email] of Object.entries(emails)) ids[cle] = (await pool.query("select id from users where email = $1", [email])).rows[0].id;
  offreId = (await pool.query("insert into job_postings (company_id, title, description, location, job_type, is_active) values ($1, 'Foreur vocal', '<p>Test.</p>', 'Kayes', 'cdi', false) returning id", [ids.entreprise])).rows[0].id;
  await pool.query("insert into applications (candidate_id, job_id) values ($1, $2)", [ids.candidat, offreId]);
}, 90_000); // Création des comptes : le hachage des mots de passe est lent sur une machine chargée.

afterAll(async () => {
  const tous = Object.values(ids);
  await pool.query("delete from applications where candidate_id = any($1)", [tous]);
  await pool.query("delete from job_postings where company_id = any($1)", [tous]);
  for (const t of ["notifications", "activity_logs", "candidate_profiles", "company_profiles"]) await pool.query(`delete from ${t} where user_id = any($1)`, [tous]).catch(() => {});
  await pool.query("delete from company_modules where company_profile_id in (select id from company_profiles where user_id = any($1))", [tous]).catch(() => {});
  await pool.query("delete from users where id = any($1)", [tous]);
  await pool.end();
});

describe("POST /api/profile/cv-vocal", () => {
  it("refuse une durée hors de 10 s à 2 min, un format inconnu, un fichier trop lourd", async () => {
    expect((await envoi(candidat, { dureeSecondes: 9 })).status).toBe(400);
    expect((await envoi(candidat, { dureeSecondes: 125 })).status).toBe(400);
    expect((await envoi(candidat, { mimeType: "video/mp4" })).status).toBe(400);
    expect((await envoi(candidat, { audioBase64: Buffer.alloc(6 * 1024 * 1024 + 1).toString("base64") })).status).toBe(413);
    expect((await visiteur.request("POST", "/api/profile/cv-vocal", { audioBase64: "AA==", mimeType: "audio/webm", dureeSecondes: 30 })).status).toBe(401);
  });

  it("enregistre l'audio tout de suite, même sans transcription possible", async () => {
    const res = await envoi(candidat);
    expect(res.status, await res.clone().text()).toBe(201);
    expect(await res.json()).toEqual({ cvVocal: { url: "/api/profile/cv-vocal", dureeSecondes: 45 } });
    const ligne = (await pool.query("select voice_cv_url, voice_cv_duration from candidate_profiles where user_id = $1", [ids.candidat])).rows[0];
    expect(ligne.voice_cv_url.startsWith("data:audio/webm;base64,") || ligne.voice_cv_url.startsWith("/api/files/")).toBe(true);
    expect(ligne.voice_cv_duration).toBe(45);
    // L'ancienne adresse de l'éditeur suit le même traitement.
    expect((await envoi(candidat, { dureeSecondes: 10 })).status).toBe(201);
    expect((await candidat.request("POST", "/api/voice-cv/upload", { audioBase64: AUDIO.toString("base64"), mimeType: "audio/mp4", dureeSecondes: 120 })).status).toBe(201);
    expect((await envoi(candidat)).status).toBe(201);
  });
});

describe("écoute par le candidat", () => {
  it("sert l'audio en entier et par plage (Safari)", async () => {
    const entier = await candidat.request("GET", "/api/profile/cv-vocal");
    expect(entier.status).toBe(200);
    expect(entier.headers.get("content-type")).toBe("audio/webm");
    expect(entier.headers.get("accept-ranges")).toBe("bytes");
    expect(entier.headers.get("cache-control")).toBe("private, no-store");
    expect(Buffer.from(await entier.arrayBuffer()).equals(AUDIO)).toBe(true);
    const plage = await candidat.request("GET", "/api/profile/cv-vocal", undefined, { Range: "bytes=0-9" });
    expect(plage.status).toBe(206);
    expect(plage.headers.get("content-range")).toBe(`bytes 0-9/${AUDIO.length}`);
    expect(Buffer.from(await plage.arrayBuffer()).equals(AUDIO.subarray(0, 10))).toBe(true);
    const fin = await candidat.request("GET", "/api/profile/cv-vocal", undefined, { Range: "bytes=4000-" });
    expect(fin.status).toBe(206);
    expect(Buffer.from(await fin.arrayBuffer()).length).toBe(AUDIO.length - 4000);
    expect((await candidat.request("GET", "/api/profile/cv-vocal", undefined, { Range: "bytes=99999-" })).status).toBe(416);
  });

  it("n'envoie plus l'audio dans /api/profile", async () => {
    const { profile } = await (await candidat.request("GET", "/api/profile")).json();
    expect(profile.voiceCvUrl).toBe("/api/profile/cv-vocal");
    expect(profile.cvVocal).toEqual({ url: "/api/profile/cv-vocal", dureeSecondes: 45 });
    expect(JSON.stringify(profile)).not.toContain("base64");
  });
});

describe("écoute par un recruteur", () => {
  it("l'entreprise qui a reçu la candidature écoute le CV vocal actuel", async () => {
    const res = await entreprise.request("GET", `/api/candidates/${ids.candidat}/cv-vocal`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toBe("inline");
    expect(Buffer.from(await res.arrayBuffer()).equals(AUDIO)).toBe(true);
    const liste = await (await entreprise.request("GET", `/api/jobs/${offreId}/applications`)).json();
    expect(liste[0].candidate.cvVocal).toEqual({ url: `/api/candidates/${ids.candidat}/cv-vocal`, dureeSecondes: 45 });
    expect(JSON.stringify(liste)).not.toContain("data:audio");
    const fiche = await (await entreprise.request("GET", `/api/candidates/${ids.candidat}`)).json();
    expect(fiche.profile.voiceCvUrl).toBe(`/api/candidates/${ids.candidat}/cv-vocal`);
    expect(JSON.stringify(fiche)).not.toContain("data:audio");
  });

  it("refuse les autres : entreprise sans candidature, candidat, visiteur", async () => {
    expect((await autreEntreprise.request("GET", `/api/candidates/${ids.candidat}/cv-vocal`)).status).toBe(403);
    expect((await autreCandidat.request("GET", `/api/candidates/${ids.candidat}/cv-vocal`)).status).toBe(403);
    expect((await visiteur.request("GET", `/api/candidates/${ids.candidat}/cv-vocal`)).status).toBe(401);
  });
});

describe("suppression et anciennes valeurs", () => {
  it("ne propose pas un CV vocal WhatsApp illisible", async () => {
    await pool.query("update candidate_profiles set voice_cv_url = 'whatsapp://media/123' where user_id = $1", [ids.candidat]);
    expect((await candidat.request("GET", "/api/profile/cv-vocal")).status).toBe(404);
    const { profile } = await (await candidat.request("GET", "/api/profile")).json();
    expect(profile.cvVocal).toBeNull();
    expect((await envoi(candidat)).status).toBe(201);
  });

  it("supprime le CV vocal", async () => {
    expect((await candidat.request("DELETE", "/api/profile/cv-vocal")).status).toBe(204);
    expect((await candidat.request("GET", "/api/profile/cv-vocal")).status).toBe(404);
    expect((await entreprise.request("GET", `/api/candidates/${ids.candidat}/cv-vocal`)).status).toBe(404);
    const liste = await (await entreprise.request("GET", `/api/jobs/${offreId}/applications`)).json();
    expect(liste[0].candidate.cvVocal).toBeNull();
  });
});
