// Agency "Paie & facturation": invoice delivery (send / payment reminders by
// email, PDF attached), automatic "en retard" status, the payment statement
// ("États de paiement") and the accounting export ("Export comptable",
// SYSCOHADA chart of accounts — the OHADA standard used across West Africa).
import type { Express, Request, RequestHandler, Response } from "express";
import ExcelJS from "exceljs";
import { z } from "zod";
import { and, eq, lt } from "drizzle-orm";
import { db } from "./db";
import { storage } from "./storage";
import { sendEmail } from "./email";
import { invoices, type UserType } from "@shared/schema";
import { loadAgencyClientsById, type ClientOfRecord } from "./agency-crm";
import { logPlatformInteraction } from "./agency-relations";

type RequireRole = (...roles: UserType[]) => RequestHandler;

const DAY_MS = 86_400_000;
const MAX_PDF_BYTES = 5 * 1024 * 1024;

const iso = (value: Date | string | null | undefined) => (value ? new Date(value).toISOString() : null);
const money = (amount: number, currency = "XOF") =>
  `${new Intl.NumberFormat("fr-FR").format(amount)} ${currency === "XOF" ? "FCFA" : currency}`;
const frDate = (value: Date | string | null | undefined) => (value ? new Date(value).toLocaleDateString("fr-FR") : "—");
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));

/**
 * A "pending" invoice past its due date is overdue. Persisted (not only
 * computed) so every screen, stat and export agrees; idempotent.
 */
export async function markOverdueInvoices(agencyId: string) {
  await db.update(invoices)
    .set({ status: "overdue", updatedAt: new Date() })
    .where(and(eq(invoices.agencyId, agencyId), eq(invoices.status, "pending"), lt(invoices.dueDate, new Date())));
}

type InvoiceRow = Awaited<ReturnType<typeof storage.listInvoices>>[number];

const clientOf = (invoice: InvoiceRow, clientsById: Map<string, ClientOfRecord>) =>
  (invoice.agencyClientId ? clientsById.get(invoice.agencyClientId) : undefined);

// ---- Period helpers -------------------------------------------------------
const periodSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

function resolvePeriod(query: unknown) {
  const { from, to } = periodSchema.parse(query);
  const now = new Date();
  const start = from ?? new Date(now.getFullYear(), 0, 1);
  const end = to ?? now;
  // "to" is inclusive: the whole last day counts.
  const endInclusive = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
  if (endInclusive < start) throw new z.ZodError([{ code: "custom", message: "La date de fin précède la date de début", path: ["to"] }]);
  return { start, end: endInclusive };
}
const inPeriod = (value: Date | string | null | undefined, period: { start: Date; end: Date }) => {
  if (!value) return false;
  const date = new Date(value);
  return date >= period.start && date <= period.end;
};

// ---- Payment statement ------------------------------------------------------
const AGING_BUCKETS = [
  { key: "not_due", label: "Non échu" },
  { key: "d0_30", label: "1–30 jours" },
  { key: "d31_60", label: "31–60 jours" },
  { key: "d61_90", label: "61–90 jours" },
  { key: "d90_plus", label: "Plus de 90 jours" },
] as const;
type AgingKey = typeof AGING_BUCKETS[number]["key"];

function agingBucket(dueDate: Date, now: number): AgingKey {
  const late = Math.floor((now - dueDate.getTime()) / DAY_MS);
  if (late <= 0) return "not_due";
  if (late <= 30) return "d0_30";
  if (late <= 60) return "d31_60";
  if (late <= 90) return "d61_90";
  return "d90_plus";
}

async function buildStatement(agencyId: string, period: { start: Date; end: Date }) {
  await markOverdueInvoices(agencyId);
  const [allInvoices, salaries, placements, clientsById] = await Promise.all([
    storage.listInvoices(agencyId),
    storage.listSalaryPayments(agencyId),
    storage.getAgencyPlacements(agencyId),
    loadAgencyClientsById(agencyId),
  ]);
  const now = Date.now();
  const billable = allInvoices.filter((invoice) => invoice.status !== "cancelled" && invoice.status !== "draft");

  // Receivables are a position at the end of the period, whatever the issue date.
  const open = billable.filter((invoice) => invoice.status !== "paid" && new Date(invoice.issueDate) <= period.end);
  const aging = Object.fromEntries(AGING_BUCKETS.map((bucket) => [bucket.key, 0])) as Record<AgingKey, number>;
  for (const invoice of open) aging[agingBucket(new Date(invoice.dueDate), now)] += invoice.totalAmount;

  const invoicedInPeriod = billable.filter((invoice) => inPeriod(invoice.issueDate, period));
  const collectedInPeriod = billable.filter((invoice) => invoice.status === "paid" && inPeriod(invoice.paidDate, period));
  const salariesPaidInPeriod = salaries.filter((salary) => salary.status === "paid" && inPeriod(salary.paymentDate, period));
  const salariesDue = salaries.filter((salary) => salary.status !== "paid" && salary.status !== "cancelled");

  const byClient = new Map<string, { clientId: string | null; clientName: string; email: string | null; outstanding: number; overdue: number; invoices: number; oldestDue: string | null; lastReminderAt: string | null }>();
  for (const invoice of open) {
    const client = clientOf(invoice, clientsById);
    const key = client?.id ?? invoice.clientId ?? "unknown";
    const entry = byClient.get(key) ?? { clientId: client?.id ?? null, clientName: client?.name ?? "Client", email: client?.email ?? null, outstanding: 0, overdue: 0, invoices: 0, oldestDue: null, lastReminderAt: null };
    entry.outstanding += invoice.totalAmount;
    entry.invoices += 1;
    if (new Date(invoice.dueDate).getTime() < now) entry.overdue += invoice.totalAmount;
    if (!entry.oldestDue || new Date(invoice.dueDate) < new Date(entry.oldestDue)) entry.oldestDue = iso(invoice.dueDate);
    if (invoice.lastReminderAt && (!entry.lastReminderAt || new Date(invoice.lastReminderAt) > new Date(entry.lastReminderAt))) entry.lastReminderAt = iso(invoice.lastReminderAt);
    byClient.set(key, entry);
  }

  // Monthly cash flow over the period: money in (paid invoices) vs out (salaries paid).
  const months: { month: string; label: string; inflow: number; outflow: number }[] = [];
  for (let cursor = new Date(period.start.getFullYear(), period.start.getMonth(), 1); cursor <= period.end; cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)) {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    const within = (value: Date | string | null | undefined) => !!value && new Date(value) >= cursor && new Date(value) < next;
    months.push({
      month: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`,
      label: new Intl.DateTimeFormat("fr-FR", { month: "short", year: "2-digit" }).format(cursor),
      inflow: collectedInPeriod.filter((invoice) => within(invoice.paidDate)).reduce((sum, invoice) => sum + invoice.totalAmount, 0),
      outflow: salariesPaidInPeriod.filter((salary) => within(salary.paymentDate)).reduce((sum, salary) => sum + salary.netSalary, 0),
    });
  }

  const placementById = new Map(placements.map((placement) => [placement.id, placement]));
  const candidateNames = new Map<string, string>();
  for (const salary of salariesDue) {
    const placement = placementById.get(salary.placementId);
    if (placement && !candidateNames.has(placement.candidateId)) {
      candidateNames.set(placement.candidateId, (await storage.getUser(placement.candidateId))?.fullName ?? "Candidat");
    }
  }

  const sum = (rows: { totalAmount: number }[]) => rows.reduce((total, row) => total + row.totalAmount, 0);
  return {
    period: { from: iso(period.start), to: iso(period.end) },
    totals: {
      invoiced: sum(invoicedInPeriod),
      collected: sum(collectedInPeriod),
      outstanding: sum(open),
      overdue: sum(open.filter((invoice) => new Date(invoice.dueDate).getTime() < now)),
      salariesPaid: salariesPaidInPeriod.reduce((total, salary) => total + salary.netSalary, 0),
      salariesDue: salariesDue.reduce((total, salary) => total + salary.netSalary, 0),
      netCash: sum(collectedInPeriod) - salariesPaidInPeriod.reduce((total, salary) => total + salary.netSalary, 0),
    },
    aging: AGING_BUCKETS.map((bucket) => ({ ...bucket, amount: aging[bucket.key] })),
    byClient: Array.from(byClient.values()).sort((a, b) => b.overdue - a.overdue || b.outstanding - a.outstanding),
    openInvoices: open
      .map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        clientName: clientOf(invoice, clientsById)?.name ?? "Client",
        issueDate: iso(invoice.issueDate),
        dueDate: iso(invoice.dueDate),
        totalAmount: invoice.totalAmount,
        daysLate: Math.max(0, Math.floor((now - new Date(invoice.dueDate).getTime()) / DAY_MS)),
        reminderCount: invoice.reminderCount,
        lastReminderAt: iso(invoice.lastReminderAt),
      }))
      .sort((a, b) => b.daysLate - a.daysLate),
    salariesDue: salariesDue.map((salary) => {
      const placement = placementById.get(salary.placementId);
      return {
        id: salary.id,
        period: salary.period,
        candidateName: placement ? candidateNames.get(placement.candidateId) ?? "Candidat" : "Candidat",
        netSalary: salary.netSalary,
        status: salary.status,
      };
    }),
    cashFlow: months,
  };
}

// ---- Accounting export (SYSCOHADA) ------------------------------------------
// Default SYSCOHADA accounts. Salaries are booked net: social contributions
// (CNSS/INPS/IPRES…) and income tax aren't tracked in BaaraMatch yet.
export const SYSCOHADA_ACCOUNTS = {
  clients: { number: "411100", label: "Clients" },
  services: { number: "706100", label: "Services vendus" },
  vatCollected: { number: "443100", label: "TVA facturée sur ventes" },
  bank: { number: "521100", label: "Banques" },
  cash: { number: "571100", label: "Caisse" },
  salaries: { number: "661100", label: "Rémunérations directes versées au personnel" },
  staffPayable: { number: "422100", label: "Personnel, rémunérations dues" },
} as const;

const JOURNALS = { VE: "Ventes", BQ: "Trésorerie", SA: "Salaires" } as const;
type JournalCode = keyof typeof JOURNALS;

type Entry = {
  journal: JournalCode;
  date: Date;
  reference: string;
  account: string;
  accountLabel: string;
  thirdParty: string;
  label: string;
  debit: number;
  credit: number;
};

// Cash is booked to 571 (caisse), everything else (virement, chèque, mobile
// money…) to 521 (banques).
const treasuryAccount = (method: string | null | undefined) =>
  /esp[eè]ce|cash|caisse|liquide/i.test(method ?? "") ? SYSCOHADA_ACCOUNTS.cash : SYSCOHADA_ACCOUNTS.bank;

async function buildEntries(agencyId: string, period: { start: Date; end: Date }) {
  await markOverdueInvoices(agencyId);
  const [allInvoices, salaries, placements, clientsById] = await Promise.all([
    storage.listInvoices(agencyId),
    storage.listSalaryPayments(agencyId),
    storage.getAgencyPlacements(agencyId),
    loadAgencyClientsById(agencyId),
  ]);
  const entries: Entry[] = [];
  const A = SYSCOHADA_ACCOUNTS;

  for (const invoice of allInvoices) {
    if (invoice.status === "draft" || invoice.status === "cancelled") continue;
    const client = clientOf(invoice, clientsById)?.name ?? "Client";
    if (inPeriod(invoice.issueDate, period)) {
      const base = { journal: "VE" as const, date: new Date(invoice.issueDate), reference: invoice.invoiceNumber, thirdParty: client };
      entries.push({ ...base, account: A.clients.number, accountLabel: A.clients.label, label: `Facture ${invoice.invoiceNumber} — ${client}`, debit: invoice.totalAmount, credit: 0 });
      entries.push({ ...base, account: A.services.number, accountLabel: A.services.label, label: `Prestations ${invoice.invoiceNumber}`, debit: 0, credit: invoice.subtotal });
      if (invoice.taxAmount) {
        entries.push({ ...base, account: A.vatCollected.number, accountLabel: A.vatCollected.label, label: `TVA ${invoice.taxRate}% ${invoice.invoiceNumber}`, debit: 0, credit: invoice.taxAmount });
      }
    }
    if (invoice.status === "paid" && inPeriod(invoice.paidDate, period)) {
      const treasury = treasuryAccount(invoice.paymentMethod);
      const base = { journal: "BQ" as const, date: new Date(invoice.paidDate!), reference: invoice.invoiceNumber, thirdParty: client };
      const label = `Règlement ${invoice.invoiceNumber} — ${client}${invoice.paymentMethod ? ` (${invoice.paymentMethod})` : ""}`;
      entries.push({ ...base, account: treasury.number, accountLabel: treasury.label, label, debit: invoice.totalAmount, credit: 0 });
      entries.push({ ...base, account: A.clients.number, accountLabel: A.clients.label, label, debit: 0, credit: invoice.totalAmount });
    }
  }

  const placementById = new Map(placements.map((placement) => [placement.id, placement]));
  const names = new Map<string, string>();
  const nameOf = async (candidateId: string) => {
    if (!names.has(candidateId)) names.set(candidateId, (await storage.getUser(candidateId))?.fullName ?? "Salarié");
    return names.get(candidateId)!;
  };
  for (const salary of salaries) {
    if (salary.status === "cancelled") continue;
    const placement = placementById.get(salary.placementId);
    const employee = placement ? await nameOf(placement.candidateId) : "Salarié";
    const reference = `PAIE-${salary.period}-${salary.id.slice(0, 6).toUpperCase()}`;
    // Accrual: the salary is an expense of its period, booked on the last day
    // of the month — or on the payment date when paid earlier, so an export
    // run mid-month never shows a payment without its expense.
    const [year, month] = salary.period.split("-").map(Number);
    const monthEnd = year && month ? new Date(year, month, 0, 12) : new Date(salary.createdAt ?? Date.now());
    const paidEarly = salary.status === "paid" && salary.paymentDate && new Date(salary.paymentDate) < monthEnd;
    const accrualDate = paidEarly ? new Date(salary.paymentDate!) : monthEnd;
    if (inPeriod(accrualDate, period)) {
      const base = { journal: "SA" as const, date: accrualDate, reference, thirdParty: employee };
      entries.push({ ...base, account: A.salaries.number, accountLabel: A.salaries.label, label: `Salaire ${salary.period} — ${employee}`, debit: salary.netSalary, credit: 0 });
      entries.push({ ...base, account: A.staffPayable.number, accountLabel: A.staffPayable.label, label: `Salaire ${salary.period} — ${employee}`, debit: 0, credit: salary.netSalary });
    }
    if (salary.status === "paid" && inPeriod(salary.paymentDate, period)) {
      const treasury = treasuryAccount(salary.paymentMethod);
      const base = { journal: "BQ" as const, date: new Date(salary.paymentDate!), reference, thirdParty: employee };
      const label = `Paiement salaire ${salary.period} — ${employee}${salary.paymentMethod ? ` (${salary.paymentMethod})` : ""}`;
      entries.push({ ...base, account: A.staffPayable.number, accountLabel: A.staffPayable.label, label, debit: salary.netSalary, credit: 0 });
      entries.push({ ...base, account: treasury.number, accountLabel: treasury.label, label, debit: 0, credit: salary.netSalary });
    }
  }

  entries.sort((a, b) => a.date.getTime() - b.date.getTime() || a.journal.localeCompare(b.journal) || a.reference.localeCompare(b.reference));
  const totalDebit = entries.reduce((sum, entry) => sum + entry.debit, 0);
  const totalCredit = entries.reduce((sum, entry) => sum + entry.credit, 0);
  const byJournal = (Object.keys(JOURNALS) as JournalCode[]).map((code) => {
    const rows = entries.filter((entry) => entry.journal === code);
    return { code, label: JOURNALS[code], lines: rows.length, debit: rows.reduce((s, e) => s + e.debit, 0), credit: rows.reduce((s, e) => s + e.credit, 0) };
  });
  const balance = new Map<string, { account: string; label: string; debit: number; credit: number }>();
  for (const entry of entries) {
    const row = balance.get(entry.account) ?? { account: entry.account, label: entry.accountLabel, debit: 0, credit: 0 };
    row.debit += entry.debit;
    row.credit += entry.credit;
    balance.set(entry.account, row);
  }
  return { entries, totalDebit, totalCredit, balanced: totalDebit === totalCredit, byJournal, balance: Array.from(balance.values()).sort((a, b) => a.account.localeCompare(b.account)) };
}

const exportSchema = z.object({ format: z.enum(["xlsx", "csv"]).default("xlsx") });

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
  row.alignment = { vertical: "middle" };
}
const FCFA = '#,##0 "FCFA"';

export function registerAgencyBillingRoutes(app: Express, requireRole: RequireRole, requirePartnerPlan: RequestHandler) {
  const guard = [requireRole("agency"), requirePartnerPlan];

  // Send an invoice (draft → pending) or a payment reminder, by email, to the
  // client's primary contact unless another address is given. The PDF is
  // built in the browser (same document as "Télécharger PDF") and attached.
  app.post("/api/agency/invoices/:id/send", ...guard, async (req: Request, res: Response) => {
    try {
      const agencyId = req.session.userId!;
      const body = z.object({
        kind: z.enum(["send", "reminder"]),
        to: z.string().trim().email("Adresse email invalide").optional(),
        message: z.string().trim().max(2000).optional(),
        pdfBase64: z.string().optional(),
      }).parse(req.body);

      await markOverdueInvoices(agencyId);
      const invoice = await storage.getInvoice(String(req.params.id), agencyId);
      if (!invoice) return res.status(404).json({ message: "Facture non trouvée" });
      if (invoice.status === "cancelled" || invoice.status === "paid") {
        return res.status(409).json({ message: invoice.status === "paid" ? "Cette facture est déjà payée." : "Cette facture est annulée." });
      }
      if (body.kind === "reminder" && invoice.status === "draft") {
        return res.status(409).json({ message: "Envoyez d'abord la facture avant de relancer." });
      }

      const clientsById = await loadAgencyClientsById(agencyId);
      const client = invoice.agencyClientId ? clientsById.get(invoice.agencyClientId) : undefined;
      const to = body.to ?? client?.email ?? null;
      if (!to) {
        return res.status(400).json({ message: "Aucun email pour ce client : ajoutez un contact RH avec email à sa fiche, ou saisissez une adresse." });
      }

      let attachments;
      if (body.pdfBase64) {
        const content = Buffer.from(body.pdfBase64, "base64");
        if (content.length > MAX_PDF_BYTES || content.subarray(0, 5).toString("latin1") !== "%PDF-") {
          return res.status(400).json({ message: "Pièce jointe PDF invalide." });
        }
        attachments = [{ filename: `facture_${invoice.invoiceNumber}.pdf`, content, contentType: "application/pdf" }];
      }

      const [agencyProfile, agencyUser, paymentMethods] = await Promise.all([
        storage.getAgencyProfile(agencyId),
        storage.getUser(agencyId),
        storage.listPaymentMethodSettings(agencyId),
      ]);
      const agencyName = agencyProfile?.agencyName ?? agencyUser?.fullName ?? "Votre agence";
      const isReminder = body.kind === "reminder";
      const daysLate = Math.floor((Date.now() - new Date(invoice.dueDate).getTime()) / DAY_MS);
      const methods = paymentMethods.filter((method) => method.isActive !== false);
      const subject = isReminder
        ? `Rappel de paiement — facture ${invoice.invoiceNumber}`
        : `Facture ${invoice.invoiceNumber} — ${agencyName}`;
      const html = `
        <p>Bonjour${client?.contactName ? ` ${escapeHtml(client.contactName)}` : ""},</p>
        ${body.message ? `<p>${escapeHtml(body.message).replace(/\n/g, "<br>")}</p>` : ""}
        <p>${isReminder
          ? `Sauf erreur de notre part, la facture <strong>${invoice.invoiceNumber}</strong> ${daysLate > 0 ? `est échue depuis ${daysLate} jour${daysLate > 1 ? "s" : ""}` : `arrive à échéance le ${frDate(invoice.dueDate)}`}.`
          : `Veuillez trouver ci-joint la facture <strong>${invoice.invoiceNumber}</strong>.`}</p>
        <table style="border-collapse:collapse">
          <tr><td style="padding:2px 12px 2px 0">Montant TTC</td><td><strong>${money(invoice.totalAmount, invoice.currency ?? "XOF")}</strong></td></tr>
          <tr><td style="padding:2px 12px 2px 0">Date d'émission</td><td>${frDate(invoice.issueDate)}</td></tr>
          <tr><td style="padding:2px 12px 2px 0">Échéance</td><td>${frDate(invoice.dueDate)}</td></tr>
        </table>
        ${methods.length ? `<p>Moyens de paiement acceptés : ${methods.map((method) => escapeHtml(method.name)).join(", ")}.</p>` : ""}
        <p>Cordialement,<br>${escapeHtml(agencyName)}</p>`;

      const delivered = await sendEmail({ to, subject, html, replyTo: agencyUser?.email, attachments });
      if (!delivered) {
        return res.status(502).json({ message: "L'email n'a pas pu être envoyé (service d'envoi non configuré ou refusé). Rien n'a été modifié." });
      }

      const now = new Date();
      const updated = await storage.updateInvoice(invoice.id, agencyId, isReminder
        ? { lastReminderAt: now, reminderCount: (invoice.reminderCount ?? 0) + 1 }
        : { sentAt: now, sentTo: to, ...(invoice.status === "draft" ? { status: "pending" as const } : {}) });

      // Journaled in the client's exchanges (CRM › Suivi échanges).
      await logPlatformInteraction(agencyId, invoice.agencyClientId, {
        type: "email",
        subject: isReminder ? `Rappel de paiement — facture ${invoice.invoiceNumber}` : `Facture ${invoice.invoiceNumber} envoyée`,
        body: body.message ?? null,
        emailTo: to,
      });

      await storage.createActivityLog({
        action: isReminder ? "invoice_reminder_sent" : "invoice_sent",
        userId: agencyId,
        userLabel: agencyUser?.email ?? agencyName,
        ipAddress: req.ip ?? null,
        status: "success",
        details: `${isReminder ? "Rappel" : "Envoi"} facture ${invoice.invoiceNumber} à ${to}`,
      });
      res.json({ invoice: updated, sentTo: to });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0]?.message ?? "Données invalides" });
      console.error("Error sending invoice:", error);
      res.status(500).json({ message: "Erreur lors de l'envoi de la facture" });
    }
  });

  app.get("/api/agency/payment-statement", ...guard, async (req: Request, res: Response) => {
    try {
      res.json(await buildStatement(req.session.userId!, resolvePeriod(req.query)));
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0]?.message ?? "Période invalide" });
      console.error("Error building payment statement:", error);
      res.status(500).json({ message: "Erreur lors du calcul des états de paiement" });
    }
  });

  app.get("/api/agency/payment-statement/export", ...guard, async (req: Request, res: Response) => {
    try {
      const statement = await buildStatement(req.session.userId!, resolvePeriod(req.query));
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "BaaraMatch";

      const summary = workbook.addWorksheet("Synthèse");
      summary.columns = [{ key: "label", width: 34 }, { key: "value", width: 22 }];
      summary.addRow({ label: "États de paiement", value: "" }).font = { bold: true, size: 14 };
      summary.addRow({ label: "Période", value: `${frDate(statement.period.from)} → ${frDate(statement.period.to)}` });
      summary.addRow({});
      const totals: [string, number][] = [
        ["Facturé sur la période", statement.totals.invoiced],
        ["Encaissé sur la période", statement.totals.collected],
        ["Reste à encaisser (fin de période)", statement.totals.outstanding],
        ["dont en retard", statement.totals.overdue],
        ["Salaires versés", statement.totals.salariesPaid],
        ["Salaires restant à payer", statement.totals.salariesDue],
        ["Trésorerie nette (encaissé − salaires)", statement.totals.netCash],
      ];
      for (const [label, value] of totals) summary.addRow({ label, value }).getCell("value").numFmt = FCFA;
      summary.addRow({});
      summary.addRow({ label: "Ancienneté des créances", value: "" }).font = { bold: true };
      for (const bucket of statement.aging) summary.addRow({ label: bucket.label, value: bucket.amount }).getCell("value").numFmt = FCFA;

      const clientsSheet = workbook.addWorksheet("Créances par client", { views: [{ state: "frozen", ySplit: 1 }] });
      clientsSheet.columns = [
        { header: "Client", key: "clientName", width: 30 }, { header: "Factures ouvertes", key: "invoices", width: 16 },
        { header: "Reste dû", key: "outstanding", width: 18 }, { header: "Dont en retard", key: "overdue", width: 18 },
        { header: "Plus ancienne échéance", key: "oldestDue", width: 20 }, { header: "Email", key: "email", width: 28 },
      ];
      styleHeader(clientsSheet.getRow(1));
      for (const row of statement.byClient) {
        const added = clientsSheet.addRow({ ...row, oldestDue: row.oldestDue ? new Date(row.oldestDue) : null });
        added.getCell("outstanding").numFmt = FCFA; added.getCell("overdue").numFmt = FCFA; added.getCell("oldestDue").numFmt = "dd/mm/yyyy";
      }

      const invoicesSheet = workbook.addWorksheet("Factures ouvertes", { views: [{ state: "frozen", ySplit: 1 }] });
      invoicesSheet.columns = [
        { header: "N° facture", key: "invoiceNumber", width: 16 }, { header: "Client", key: "clientName", width: 28 },
        { header: "Émise le", key: "issueDate", width: 12 }, { header: "Échéance", key: "dueDate", width: 12 },
        { header: "Montant TTC", key: "totalAmount", width: 16 }, { header: "Jours de retard", key: "daysLate", width: 14 },
        { header: "Relances", key: "reminderCount", width: 10 },
      ];
      styleHeader(invoicesSheet.getRow(1));
      for (const row of statement.openInvoices) {
        const added = invoicesSheet.addRow({ ...row, issueDate: row.issueDate ? new Date(row.issueDate) : null, dueDate: row.dueDate ? new Date(row.dueDate) : null });
        added.getCell("totalAmount").numFmt = FCFA; added.getCell("issueDate").numFmt = "dd/mm/yyyy"; added.getCell("dueDate").numFmt = "dd/mm/yyyy";
      }

      const flowSheet = workbook.addWorksheet("Trésorerie mensuelle");
      flowSheet.columns = [
        { header: "Mois", key: "month", width: 10 }, { header: "Encaissements", key: "inflow", width: 18 },
        { header: "Salaires versés", key: "outflow", width: 18 }, { header: "Solde", key: "net", width: 18 },
      ];
      styleHeader(flowSheet.getRow(1));
      for (const row of statement.cashFlow) {
        const added = flowSheet.addRow({ month: row.month, inflow: row.inflow, outflow: row.outflow, net: row.inflow - row.outflow });
        ["inflow", "outflow", "net"].forEach((key) => { added.getCell(key).numFmt = FCFA; });
      }

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="etats-de-paiement-${statement.period.from!.slice(0, 10)}_${statement.period.to!.slice(0, 10)}.xlsx"`);
      res.setHeader("Cache-Control", "private, no-store");
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0]?.message ?? "Période invalide" });
      console.error("Error exporting payment statement:", error);
      res.status(500).json({ message: "Erreur lors de l'export" });
    }
  });

  // Preview: journals, balance check and the first lines.
  app.get("/api/agency/accounting-export/preview", ...guard, async (req: Request, res: Response) => {
    try {
      const result = await buildEntries(req.session.userId!, resolvePeriod(req.query));
      res.json({
        accounts: SYSCOHADA_ACCOUNTS,
        journals: result.byJournal,
        totalDebit: result.totalDebit,
        totalCredit: result.totalCredit,
        balanced: result.balanced,
        lineCount: result.entries.length,
        balance: result.balance,
        sample: result.entries.slice(0, 50).map((entry) => ({ ...entry, date: iso(entry.date) })),
      });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0]?.message ?? "Période invalide" });
      console.error("Error previewing accounting export:", error);
      res.status(500).json({ message: "Erreur lors de la préparation de l'export comptable" });
    }
  });

  app.get("/api/agency/accounting-export", ...guard, async (req: Request, res: Response) => {
    try {
      const period = resolvePeriod(req.query);
      const { format } = exportSchema.parse(req.query);
      const agencyId = req.session.userId!;
      const result = await buildEntries(agencyId, period);
      const stamp = `${period.start.toISOString().slice(0, 10)}_${period.end.toISOString().slice(0, 10)}`;

      const agencyUser = await storage.getUser(agencyId);
      await storage.createActivityLog({
        action: "accounting_export",
        userId: agencyId,
        userLabel: agencyUser?.email ?? agencyId,
        ipAddress: req.ip ?? null,
        status: "success",
        details: `Export comptable ${format.toUpperCase()} ${stamp} (${result.entries.length} lignes)`,
      });

      if (format === "csv") {
        // ";" + comma decimals + BOM: opens as columns in French-locale Excel
        // and imports into Sage / Ciel-style tools.
        const cell = (value: string | number) => {
          const text = typeof value === "number" ? (value ? String(value) : "") : value;
          return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        };
        const header = ["Journal", "Date", "N° pièce", "Compte", "Libellé compte", "Tiers", "Libellé", "Débit", "Crédit"];
        const lines = result.entries.map((entry) => [
          entry.journal, entry.date.toLocaleDateString("fr-FR"), entry.reference, entry.account, entry.accountLabel,
          entry.thirdParty, entry.label, entry.debit, entry.credit,
        ].map(cell).join(";"));
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="export-comptable-${stamp}.csv"`);
        res.setHeader("Cache-Control", "private, no-store");
        return res.send("\uFEFF" + [header.join(";"), ...lines].join("\r\n"));
      }

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "BaaraMatch";
      const sheet = workbook.addWorksheet("Écritures", { views: [{ state: "frozen", ySplit: 1 }] });
      sheet.columns = [
        { header: "Journal", key: "journal", width: 9 }, { header: "Date", key: "date", width: 12 },
        { header: "N° pièce", key: "reference", width: 22 }, { header: "Compte", key: "account", width: 10 },
        { header: "Libellé compte", key: "accountLabel", width: 34 }, { header: "Tiers", key: "thirdParty", width: 26 },
        { header: "Libellé", key: "label", width: 46 }, { header: "Débit", key: "debit", width: 16 }, { header: "Crédit", key: "credit", width: 16 },
      ];
      styleHeader(sheet.getRow(1));
      for (const entry of result.entries) {
        const row = sheet.addRow({ ...entry, debit: entry.debit || null, credit: entry.credit || null });
        row.getCell("date").numFmt = "dd/mm/yyyy"; row.getCell("debit").numFmt = FCFA; row.getCell("credit").numFmt = FCFA;
      }
      const totalRow = sheet.addRow({ label: "TOTAL", debit: result.totalDebit, credit: result.totalCredit });
      totalRow.font = { bold: true };
      totalRow.getCell("debit").numFmt = FCFA; totalRow.getCell("credit").numFmt = FCFA;
      sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 9 } };

      const balanceSheet = workbook.addWorksheet("Balance");
      balanceSheet.columns = [
        { header: "Compte", key: "account", width: 10 }, { header: "Libellé", key: "label", width: 40 },
        { header: "Débit", key: "debit", width: 16 }, { header: "Crédit", key: "credit", width: 16 }, { header: "Solde", key: "solde", width: 16 },
      ];
      styleHeader(balanceSheet.getRow(1));
      for (const row of result.balance) {
        const added = balanceSheet.addRow({ ...row, solde: row.debit - row.credit });
        ["debit", "credit", "solde"].forEach((key) => { added.getCell(key).numFmt = FCFA; });
      }

      const info = workbook.addWorksheet("Paramètres");
      info.columns = [{ key: "a", width: 30 }, { key: "b", width: 60 }];
      [
        ["Référentiel", "SYSCOHADA révisé (plan comptable OHADA)"],
        ["Période", `${period.start.toLocaleDateString("fr-FR")} → ${period.end.toLocaleDateString("fr-FR")}`],
        ["Équilibre débit / crédit", result.balanced ? "OK" : "DÉSÉQUILIBRÉ — vérifier les données"],
        ["", ""],
        ...Object.values(SYSCOHADA_ACCOUNTS).map((account) => [account.number, account.label]),
        ["", ""],
        ["Journaux", "VE = Ventes (factures émises), BQ = Trésorerie (encaissements et paiements), SA = Salaires"],
        ["Limite", "Salaires comptabilisés en net : cotisations sociales et impôt sur salaire non suivis dans BaaraMatch."],
      ].forEach(([a, b]) => info.addRow({ a, b }));

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="export-comptable-${stamp}.xlsx"`);
      res.setHeader("Cache-Control", "private, no-store");
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: error.errors[0]?.message ?? "Paramètres invalides" });
      console.error("Error exporting accounting entries:", error);
      res.status(500).json({ message: "Erreur lors de l'export comptable" });
    }
  });
}
