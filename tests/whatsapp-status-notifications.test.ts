/**
 * WhatsApp application-status notifications vs Meta's 24h service window
 * (see the header of server/whatsapp-bot.ts). Runs the real notification
 * code against the real database, with Meta's Cloud API replaced by a
 * stubbed fetch — no WhatsApp account or approved template needed.
 *
 * Requires DATABASE_URL (same .env as the dev server).
 */
import "dotenv/config";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Pool } from "pg";
import { randomUUID } from "crypto";
import { storage } from "../server/storage";
import { deliverPendingWhatsAppNotifications, notifyApplicationStatusChange } from "../server/whatsapp-bot";

const RUN_ID = randomUUID().slice(0, 8);
const PHONE = `22370${Math.floor(100000 + Math.random() * 899999)}`;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

let candidateId: string;
let webOnlyCandidateId: string;
const metaCalls: Array<{ type: string; to: string }> = [];

// Scripted Meta answers, consumed in order (default: success).
let metaResponses: Array<{ ok: true } | { ok: false; code: number }> = [];

function stubMeta() {
  vi.stubGlobal("fetch", vi.fn(async (_url: string, init: { body: string }) => {
    const body = JSON.parse(init.body) as { type: string; to: string };
    metaCalls.push({ type: body.type, to: body.to });
    const next = metaResponses.shift() ?? { ok: true };
    if (next.ok) return new Response(JSON.stringify({ messages: [{ id: "wamid.test" }] }), { status: 200 });
    return new Response(JSON.stringify({ error: { code: next.code, message: "stub" } }), { status: 400 });
  }));
}

async function notificationsFor(id: string) {
  const result = await pool.query(
    "select status, message, last_error from whatsapp_notifications where candidate_id = $1 order by created_at",
    [id],
  );
  return result.rows as { status: string; message: string; last_error: string | null }[];
}

async function setLastInbound(hoursAgo: number) {
  await pool.query(
    `insert into whatsapp_sessions (phone, step, context, updated_at) values ($1, 'main_menu', '{}', now() - make_interval(mins => $2))
     on conflict (phone) do update set updated_at = now() - make_interval(mins => $2)`,
    [PHONE, Math.round(hoursAgo * 60)],
  );
}

function notify(id = candidateId) {
  return notifyApplicationStatusChange({
    candidateId: id,
    applicationId: randomUUID(),
    jobTitle: `Chef de chantier ${RUN_ID}`,
    status: "shortlisted",
    message: "Votre candidature a été présélectionnée",
  });
}

beforeAll(async () => {
  process.env.WHATSAPP_ACCESS_TOKEN = "test-token";
  process.env.WHATSAPP_PHONE_NUMBER_ID = "test-phone-id";

  const candidate = await pool.query(
    `insert into users (email, password, user_type, full_name, phone) values ($1, 'x', 'candidate', 'Awa Test WhatsApp', $2) returning id`,
    [`test.wa.${RUN_ID}@example.com`, PHONE],
  );
  candidateId = candidate.rows[0].id;
  await pool.query("insert into candidate_profiles (user_id, whatsapp_number) values ($1, $2)", [candidateId, PHONE]);

  // Registered on the website, never wrote to us on WhatsApp.
  const webOnly = await pool.query(
    `insert into users (email, password, user_type, full_name, phone) values ($1, 'x', 'candidate', 'Web Only', '22399999999') returning id`,
    [`test.wa.web.${RUN_ID}@example.com`],
  );
  webOnlyCandidateId = webOnly.rows[0].id;
});

beforeEach(async () => {
  stubMeta();
  metaCalls.length = 0;
  metaResponses = [];
  delete process.env.WHATSAPP_STATUS_TEMPLATE_NAME;
  await pool.query("delete from whatsapp_notifications where candidate_id = any($1)", [[candidateId, webOnlyCandidateId]]);
  await pool.query("delete from whatsapp_sessions where phone = $1", [PHONE]);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

afterAll(async () => {
  const ids = [candidateId, webOnlyCandidateId].filter(Boolean);
  await pool.query("delete from whatsapp_notifications where candidate_id = any($1)", [ids]);
  await pool.query("delete from whatsapp_sessions where phone = $1", [PHONE]);
  await pool.query("delete from candidate_profiles where user_id = any($1)", [ids]);
  await pool.query("delete from users where id = any($1)", [ids]);
  await pool.end();
});

describe("Notification de statut WhatsApp — fenêtre de 24h", () => {
  it("dans la fenêtre : envoie un message libre", async () => {
    await setLastInbound(2);
    await notify();
    expect(metaCalls).toEqual([{ type: "text", to: PHONE }]);
    expect((await notificationsFor(candidateId)).map((n) => n.status)).toEqual(["envoye"]);
  });

  it("hors fenêtre sans template configuré : met en attente sans appeler Meta", async () => {
    await setLastInbound(30);
    await notify();
    expect(metaCalls).toHaveLength(0);
    expect((await notificationsFor(candidateId)).map((n) => n.status)).toEqual(["en_attente_fenetre"]);
  });

  it("hors fenêtre avec template configuré : envoie le template", async () => {
    process.env.WHATSAPP_STATUS_TEMPLATE_NAME = "statut_candidature";
    await setLastInbound(30);
    await notify();
    expect(metaCalls).toEqual([{ type: "template", to: PHONE }]);
    expect((await notificationsFor(candidateId)).map((n) => n.status)).toEqual(["envoye_template"]);
  });

  it("template refusé par Meta (non approuvé) : met en attente au lieu de perdre", async () => {
    process.env.WHATSAPP_STATUS_TEMPLATE_NAME = "statut_candidature";
    metaResponses = [{ ok: false, code: 132001 }];
    await setLastInbound(30);
    await notify();
    expect((await notificationsFor(candidateId)).map((n) => n.status)).toEqual(["en_attente_fenetre"]);
  });

  it("Meta répond 131047 alors qu'on se croyait dans la fenêtre : bascule hors fenêtre", async () => {
    metaResponses = [{ ok: false, code: 131047 }];
    await setLastInbound(23.9);
    await notify();
    expect(metaCalls).toEqual([{ type: "text", to: PHONE }]);
    expect((await notificationsFor(candidateId)).map((n) => n.status)).toEqual(["en_attente_fenetre"]);
  });

  it("autre erreur Meta : marque en échec", async () => {
    metaResponses = [{ ok: false, code: 131026 }];
    await setLastInbound(1);
    await notify();
    expect((await notificationsFor(candidateId)).map((n) => n.status)).toEqual(["echec"]);
  });

  it("candidat qui n'a jamais utilisé WhatsApp : rien n'est envoyé ni stocké", async () => {
    await notify(webOnlyCandidateId);
    expect(metaCalls).toHaveLength(0);
    expect(await notificationsFor(webOnlyCandidateId)).toHaveLength(0);
  });
});

describe("Livraison au prochain message du candidat", () => {
  it("envoie les notifications en attente, une seule fois", async () => {
    await setLastInbound(30);
    await notify();
    await notify();
    expect(metaCalls).toHaveLength(0);

    // Two inbound messages processed at the same time must not double-send.
    await Promise.all([deliverPendingWhatsAppNotifications(PHONE), deliverPendingWhatsAppNotifications(PHONE)]);
    expect(metaCalls).toEqual([{ type: "text", to: PHONE }, { type: "text", to: PHONE }]);
    expect((await notificationsFor(candidateId)).map((n) => n.status)).toEqual(["envoye", "envoye"]);
  });

  it("remet en attente si l'envoi échoue", async () => {
    await setLastInbound(30);
    await notify();
    metaResponses = [{ ok: false, code: 131026 }];
    await deliverPendingWhatsAppNotifications(PHONE);
    const [notification] = await notificationsFor(candidateId);
    expect(notification.status).toBe("en_attente_fenetre");
    expect(notification.last_error).toContain("131026");
  });

  it("apparaît dans la liste admin avec le nom et le téléphone", async () => {
    await setLastInbound(30);
    await notify();
    const pending = (await storage.listPendingWindowWhatsAppNotifications()).filter((n) => n.candidateId === candidateId);
    expect(pending).toHaveLength(1);
    expect(pending[0].candidateName).toBe("Awa Test WhatsApp");
    expect(pending[0].phone).toBe(PHONE);
  });

  it("un message entrant rouvre la fenêtre (dernière activité mise à jour)", async () => {
    await setLastInbound(30);
    await storage.touchWhatsAppSession(PHONE);
    await notify();
    expect(metaCalls).toEqual([{ type: "text", to: PHONE }]);
  });
});
