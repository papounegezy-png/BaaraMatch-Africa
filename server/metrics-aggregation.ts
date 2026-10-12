import { db } from "./db";
import { eq, and, gte, lt, sql } from "drizzle-orm";
import {
  dailyMetrics,
  jobPostings,
  applications,
  agencyPlacements,
  users,
} from "@shared/schema";

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date): Date {
  return new Date(startOfDay(date).getTime() + 24 * 60 * 60 * 1000);
}

// Upserts one (date, key, organizationId) row. Postgres treats every NULL as
// distinct from every other NULL, so the plain 3-column unique constraint
// never actually catches a duplicate platform-wide row (organizationId is
// null) on a rerun — the partial unique index (migration 0019) is what makes
// that case idempotent too, and ON CONFLICT has to target it explicitly.
async function upsertMetric(date: Date, key: string, value: number, organizationId: string | null) {
  if (organizationId === null) {
    await db
      .insert(dailyMetrics)
      .values({ date, key, value, organizationId: null })
      .onConflictDoUpdate({
        target: [dailyMetrics.date, dailyMetrics.key],
        targetWhere: sql`${dailyMetrics.organizationId} IS NULL`,
        set: { value },
      });
  } else {
    await db
      .insert(dailyMetrics)
      .values({ date, key, value, organizationId })
      .onConflictDoUpdate({
        target: [dailyMetrics.date, dailyMetrics.key, dailyMetrics.organizationId],
        set: { value },
      });
  }
}

function countByOrg<T>(rows: T[], getOrgId: (row: T) => string | null): Map<string | null, number> {
  const counts = new Map<string | null, number>();
  counts.set(null, rows.length);
  for (const row of rows) {
    const orgId = getOrgId(row);
    if (orgId) {
      counts.set(orgId, (counts.get(orgId) ?? 0) + 1);
    }
  }
  return counts;
}

export type DailyMetricsSummary = {
  date: string;
  rowsWritten: number;
};

// Aggregates the previous day's activity into daily_metrics. Idempotent
// (safe to rerun for the same date — e.g. after a bug, via the CLI script)
// and independent of any scheduler; node-cron (or the CLI) is only ever a
// trigger around this.
export async function calculateDailyMetrics(date: Date): Promise<DailyMetricsSummary> {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);
  let rowsWritten = 0;

  const jobsThatDay = await db
    .select({ id: jobPostings.id, companyId: jobPostings.companyId })
    .from(jobPostings)
    .where(and(gte(jobPostings.createdAt, dayStart), lt(jobPostings.createdAt, dayEnd)));

  const applicationsThatDay = await db
    .select({ id: applications.id, companyId: jobPostings.companyId })
    .from(applications)
    .innerJoin(jobPostings, eq(applications.jobId, jobPostings.id))
    .where(and(gte(applications.createdAt, dayStart), lt(applications.createdAt, dayEnd)));

  const placementsCompletedThatDay = await db
    .select({ id: agencyPlacements.id, agencyId: agencyPlacements.agencyId })
    .from(agencyPlacements)
    .where(and(
      eq(agencyPlacements.status, "completed"),
      gte(agencyPlacements.updatedAt, dayStart),
      lt(agencyPlacements.updatedAt, dayEnd),
    ));

  const newCandidatesThatDay = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.userType, "candidate"), gte(users.createdAt, dayStart), lt(users.createdAt, dayEnd)));

  const metricsToWrite: { key: string; counts: Map<string | null, number> }[] = [
    { key: "offres_publiees", counts: countByOrg(jobsThatDay, (row) => row.companyId) },
    { key: "candidatures_recues", counts: countByOrg(applicationsThatDay, (row) => row.companyId) },
    { key: "missions_terminees", counts: countByOrg(placementsCompletedThatDay, (row) => row.agencyId) },
    // Candidates aren't owned by an organization — global count only.
    { key: "nouveaux_candidats", counts: new Map([[null, newCandidatesThatDay.length]]) },
  ];

  for (const { key, counts } of metricsToWrite) {
    for (const [organizationId, value] of Array.from(counts)) {
      await upsertMetric(dayStart, key, value, organizationId);
      rowsWritten += 1;
    }
  }

  return { date: dayStart.toISOString().slice(0, 10), rowsWritten };
}
