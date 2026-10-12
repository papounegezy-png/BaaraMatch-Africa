import cron from "node-cron";
import { calculateDailyMetrics } from "./metrics-aggregation";

// Runs every night at 01:00 and aggregates the PREVIOUS day (the day that
// just fully ended) — never "today", which is still in progress.
export function scheduleMetricsAggregation(): void {
  cron.schedule("0 1 * * *", async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    try {
      const summary = await calculateDailyMetrics(yesterday);
      console.log(`[metrics-cron] Aggregated ${summary.date}: ${summary.rowsWritten} rows`);
    } catch (error) {
      console.error("[metrics-cron] Aggregation failed:", error);
    }
  });
}
