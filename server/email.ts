import nodemailer from "nodemailer";

// nodemailer v10 ships its own types with no exported "Transporter"
// namespace member (unlike the older @types/nodemailer) — deriving the type
// from createTransport's return value is version-agnostic.
type MailTransporter = ReturnType<typeof nodemailer.createTransport>;

let transporter: MailTransporter | null | undefined;

// Lazily built (not at module load) so a missing SMTP config never crashes
// the process — same reasoning as objectStorage.ts's lazy client. Returns
// null when SMTP_HOST isn't set, meaning "email genuinely isn't configured
// yet", not an error to hide.
function getTransporter(): MailTransporter | null {
  if (transporter !== undefined) return transporter;
  // Dev/test: EMAIL_TRANSPORT=capture builds messages without any network
  // call, and EMAIL_CAPTURE_FILE (if set) records them as JSON lines — so
  // automated tests never reach a real mailbox.
  if (process.env.EMAIL_TRANSPORT === "capture") {
    transporter = nodemailer.createTransport({ jsonTransport: true });
    return transporter;
  }
  if (!process.env.SMTP_HOST) {
    transporter = null;
    return transporter;
  }
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  return transporter;
}

export function isEmailConfigured(): boolean {
  return getTransporter() !== null;
}

// Never throws — a failed/unconfigured email must never break the calling
// flow (an in-app notification already covers delivery; email is an
// enhancement on top of it, not the only channel).
export type EmailAttachment = { filename: string; content: Buffer; contentType: string };

export async function sendEmail({
  to,
  subject,
  html,
  replyTo,
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}): Promise<boolean> {
  const client = getTransporter();
  if (!client) {
    console.warn(`[email] Not sent (SMTP_HOST not configured): "${subject}" to ${to}`);
    return false;
  }
  try {
    await client.sendMail({
      from: process.env.EMAIL_FROM || "BaaraMatch <no-reply@baaramatch.africa>",
      to,
      subject,
      html,
      ...(replyTo ? { replyTo } : {}),
      ...(attachments?.length ? { attachments } : {}),
    });
    if (process.env.EMAIL_TRANSPORT === "capture" && process.env.EMAIL_CAPTURE_FILE) {
      const { appendFileSync } = await import("fs");
      appendFileSync(process.env.EMAIL_CAPTURE_FILE, JSON.stringify({
        to, subject, replyTo: replyTo ?? null, html,
        attachments: (attachments ?? []).map((file) => ({ filename: file.filename, contentType: file.contentType, size: file.content.length })),
      }) + "\n");
    }
    return true;
  } catch (error) {
    console.error(`[email] Failed to send "${subject}" to ${to}:`, error);
    return false;
  }
}
