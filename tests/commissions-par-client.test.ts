/**
 * Integration test for agency commission rates set per client
 * (shared/commissions.ts): settings per client and contract type, the rate
 * proposed for a placement, the server applying it when the field is absent,
 * and a signed client agreement as fallback.
 *
 * Runs against the running dev server + real Postgres, like the other agency
 * tests. Requires the dev server (TEST_BASE_URL, default
 * http://localhost:5000) and DATABASE_URL.
 */
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { randomUUID } from "crypto";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const RUN_ID = randomUUID().slice(0, 8);
const AGENCY_EMAIL = `test.commissions.agency.${RUN_ID}@example.com`;
const CANDIDATE_EMAIL = `test.commissions.candidate.${RUN_ID}@example.com`;
const PASSWORD = "Test1234!";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

class Session {
  private cookie = "";

  async request(method: string, path: string, body?: unknown) {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...(this.cookie ? { Cookie: this.cookie } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) this.cookie = setCookie.split(";")[0];
    return res;
  }
}

let agencyId = "";
let candidateId = "";
let clientA = "";
let clientB = "";
const agency = new Session();

async function nettoyer() {
  const ids = (await pool.query("select id from users where email = any($1)", [[AGENCY_EMAIL, CANDIDATE_EMAIL]])).rows.map((r) => r.id);
  if (!ids.length) return;
  for (const sql of [
    "delete from agency_placements where agency_id = any($1)",
    "delete from commission_rate_settings where agency_id = any($1)",
    "delete from agency_client_agreements where agency_id = any($1)",
    "delete from agency_clients where agency_id = any($1)",
    "delete from notifications where user_id = any($1)",
    "delete from activity_logs where user_id = any($1)",
    "delete from candidate_profiles where user_id = any($1)",
    "delete from agency_profiles where user_id = any($1)",
    "delete from users where id = any($1)",
  ]) await pool.query(sql, [ids]);
}

const proposer = async (clientId: string | null, contractType: string) => {
  const params = new URLSearchParams({ contractType, ...(clientId ? { clientId } : {}) });
  const res = await agency.request("GET", `/api/agency/commission-rates/applicable?${params}`);
  expect(res.status).toBe(200);
  return res.json();
};

const placer = async (body: Record<string, unknown>) => {
  const res = await agency.request("POST", "/api/agency/placements", {
    candidateId, position: "Chef de chantier", salary: 400000, startDate: "2026-11-01", ...body,
  });
  expect(res.status).toBe(201);
  return res.json();
};

beforeAll(async () => {
  try {
    const reg = await agency.request("POST", "/api/auth/register", {
      email: AGENCY_EMAIL, password: PASSWORD, confirmPassword: PASSWORD, fullName: "Test Commissions Agency", userType: "agency",
    });
    expect(reg.status).toBe(201);
    agencyId = (await reg.json()).id;
    candidateId = (await pool.query(
      "insert into users (email, password, user_type, full_name, is_verified) values ($1, 'x', 'candidate', 'Test Commissions Candidat', true) returning id",
      [CANDIDATE_EMAIL],
    )).rows[0].id;
    for (const nom of ["Client A", "Client B"]) {
      const res = await agency.request("POST", "/api/agency/clients", { name: `${nom} ${RUN_ID}`, status: "active" });
      expect(res.status).toBe(201);
      const id = (await res.json()).id;
      if (nom === "Client A") clientA = id; else clientB = id;
    }
  } catch (err) {
    await nettoyer();
    throw err;
  }
}, 30000);

afterAll(async () => {
  await nettoyer();
  await pool.end();
});

describe("Taux de commission par client", () => {
  it("enregistre des taux par défaut et par client", async () => {
    for (const reglage of [
      { agencyClientId: null, contractType: null, rate: 8 },
      { agencyClientId: null, contractType: "CDI", rate: 10 },
      { agencyClientId: clientA, contractType: null, rate: 12 },
      { agencyClientId: clientA, contractType: "CDD", rate: 15 },
    ]) {
      const res = await agency.request("POST", "/api/agency/commission-rates", reglage);
      expect(res.status).toBe(201);
    }
  });

  it("refuse un doublon et un client d'une autre agence", async () => {
    const doublon = await agency.request("POST", "/api/agency/commission-rates", { agencyClientId: clientA, contractType: "CDD", rate: 20 });
    expect(doublon.status).toBe(409);
    const etranger = await agency.request("POST", "/api/agency/commission-rates", { agencyClientId: randomUUID(), contractType: null, rate: 5 });
    expect(etranger.status).toBe(404);
  });

  it("propose le taux le plus précis", async () => {
    expect(await proposer(clientA, "CDD")).toMatchObject({ taux: 15, source: "client_contrat" });
    expect(await proposer(clientA, "CDI")).toMatchObject({ taux: 12, source: "client" });
    expect(await proposer(clientB, "CDI")).toMatchObject({ taux: 10, source: "agence_contrat" });
    expect(await proposer(clientB, "Freelance")).toMatchObject({ taux: 8, source: "agence" });
  });

  it("applique le taux réglé quand le placement n'en fournit pas", async () => {
    const placement = await placer({ agencyClientId: clientA, contractType: "CDD" });
    expect(placement.commissionRate).toBe(15);
    expect(placement.commissionAmount).toBe(60000);
  });

  it("respecte un taux vidé (aucune commission) ou modifié", async () => {
    expect((await placer({ agencyClientId: clientA, contractType: "CDD", commissionRate: null })).commissionRate).toBeNull();
    expect((await placer({ agencyClientId: clientA, contractType: "CDD", commissionRate: 9 })).commissionRate).toBe(9);
  });

  it("utilise l'accord signé du client avant le taux de l'agence", async () => {
    const debut = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const res = await agency.request("POST", `/api/agency/clients/${clientB}/agreements`, {
      type: "pricing", title: "Accord test", status: "signed", startDate: debut, commissionRate: 11,
    });
    expect(res.status).toBe(201);
    expect(await proposer(clientB, "CDI")).toMatchObject({ taux: 11, source: "accord" });
  });
});
