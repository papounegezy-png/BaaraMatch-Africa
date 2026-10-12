import type { JobPosting } from "@shared/schema";

// job.salaryRange is a legacy free-text field some creation paths never
// populate (OfferForm collects salaryMin/salaryMax instead) — fall back to
// a formatted range so a job posted through OfferForm still shows a salary.
// Shared by the job list, job detail and swipe cards so they can't disagree.
export function formatJobSalary(
  job: Pick<JobPosting, "salaryRange" | "salaryMin" | "salaryMax" | "salaryCurrency">,
): string | null {
  if (job.salaryRange) return job.salaryRange;
  const currency = job.salaryCurrency ?? "XOF";
  if (job.salaryMin && job.salaryMax) return `${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()} ${currency}`;
  if (job.salaryMin) return `À partir de ${job.salaryMin.toLocaleString()} ${currency}`;
  if (job.salaryMax) return `Jusqu'à ${job.salaryMax.toLocaleString()} ${currency}`;
  return null;
}
