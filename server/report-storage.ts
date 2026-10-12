import fs from "fs/promises";
import path from "path";

// Outside client/dist and outside anything Express serves statically —
// files here are only ever reachable through the authenticated
// GET /api/admin/reports/:id/download route, never a raw path.
const REPORTS_DIR = path.join(process.cwd(), "storage", "reports");

async function ensureReportsDir(): Promise<void> {
  await fs.mkdir(REPORTS_DIR, { recursive: true });
}

export async function saveReportFile(reportId: string, buffer: Buffer): Promise<string> {
  await ensureReportsDir();
  const filename = `${reportId}.xlsx`;
  await fs.writeFile(path.join(REPORTS_DIR, filename), buffer);
  return filename;
}

export async function readReportFile(filename: string): Promise<Buffer> {
  return fs.readFile(path.join(REPORTS_DIR, filename));
}
