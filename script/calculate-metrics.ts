// Manual trigger for the daily metrics aggregation — same function the
// nightly cron calls, so this is only ever a rerun/backfill tool, never a
// second implementation. Usage: npm run metrics:calculate -- --date=2026-09-14
import "dotenv/config";
import { calculateDailyMetrics } from "../server/metrics-aggregation";

const dateArg = process.argv.find((arg) => arg.startsWith("--date="))?.split("=")[1];
const targetDate = dateArg ? new Date(dateArg) : new Date(Date.now() - 24 * 60 * 60 * 1000);

if (Number.isNaN(targetDate.getTime())) {
  console.error(`Date invalide: "${dateArg}". Format attendu: --date=AAAA-MM-JJ`);
  process.exit(1);
}

calculateDailyMetrics(targetDate)
  .then((summary) => {
    console.log(`Métriques calculées pour ${summary.date} — ${summary.rowsWritten} lignes écrites.`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("Échec du calcul des métriques:", error);
    process.exit(1);
  });
