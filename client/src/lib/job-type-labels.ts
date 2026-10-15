// Canonical job-type label map — consolidates what used to be several
// separate, inconsistent copies (job-card.tsx, missions-management.tsx,
// company-profile.tsx, company-jobs.tsx, agency-jobs.tsx each had their own,
// disagreeing on labels for the same raw value). Covers both the current
// OfferForm vocabulary (cdi/cdd/...) and legacy values still present on job
// postings created before OfferForm existed.
export const jobTypeLabels: Record<string, string> = {
  // Current vocabulary — OfferForm's French labor-law contract categories.
  cdi: "CDI",
  cdd: "CDD",
  interim: "Intérim",
  stage: "Stage",
  journalier: "Journalier",
  prestation: "Prestation",
  // Legacy vocabulary — job postings created before OfferForm existed.
  "full-time": "Temps plein",
  "part-time": "Temps partiel",
  full_time: "Temps plein",
  part_time: "Temps partiel",
  contract: "Contrat",
  internship: "Stage",
  temporary: "Intérim",
  freelance: "Freelance",
};

export function formatJobType(jobType: string | null | undefined): string | null {
  if (!jobType) return null;
  return jobTypeLabels[jobType] ?? jobTypeLabels[jobType.toLowerCase()] ?? jobType;
}

// Code de contrat comparable, quelle que soit la façon dont il a été saisi :
// la base contient « CDD », « cdi », « CDI »… et des valeurs anciennes
// (internship, temporary). Les valeurs sans équivalent (full-time…) restent
// telles quelles et ne correspondent à aucun filtre de contrat.
export function normaliserTypeContrat(jobType: string | null | undefined): string {
  const code = (jobType ?? "").trim().toLowerCase();
  if (code === "internship") return "stage";
  if (code === "temporary") return "interim";
  return code;
}
