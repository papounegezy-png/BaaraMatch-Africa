// V0 matching score: simple, explainable rule-based scoring to stand in for
// embeddings-based matching until V1.1 (pgvector needs data volume to be
// reliable — see server/embeddings.ts / server/init-pgvector.ts, currently
// also blocked by the OpenAI account having no credits). Pure function, no
// I/O, so it's trivially testable, swappable later, and usable from both the
// server (scoring a real application/notification) and the client
// (previewing a match score against data already on the page).

export interface MatchingCandidate {
  skills?: string[] | null;
  city?: string | null;
  experienceYears?: number | null;
}

export interface MatchingJob {
  requiredSkills?: string[] | null;
  location?: string | null;
  experienceMin?: number | null;
}

export interface MatchScoreResult {
  score: number;
  details: {
    sharedSkills: string[];
    requiredSkillsTotal: number;
    sameCity: boolean;
    experienceSufficient: boolean;
  };
}

/**
 * One short line saying why the score is what it is, from the same
 * criteria the score uses — e.g. "ville et compétences correspondent",
 * "compétences (2/3) correspondent", "peu de critères correspondent".
 */
export function explainMatchScore(details: MatchScoreResult["details"]): string {
  const matching: string[] = [];
  if (details.requiredSkillsTotal > 0 && details.sharedSkills.length > 0) {
    matching.push(
      details.sharedSkills.length === details.requiredSkillsTotal
        ? "compétences"
        : `compétences (${details.sharedSkills.length}/${details.requiredSkillsTotal})`,
    );
  }
  if (details.sameCity) matching.push("ville");
  if (details.experienceSufficient) matching.push("expérience");

  if (matching.length === 0) return "peu de critères correspondent";
  const list = matching.length === 1
    ? matching[0]
    : `${matching.slice(0, -1).join(", ")} et ${matching[matching.length - 1]}`;
  // "compétences" is plural on its own; "ville"/"expérience" alone are not.
  const isPlural = matching.length > 1 || matching[0].startsWith("compétences");
  return `${list} ${isPlural ? "correspondent" : "correspond"}`;
}

export function calculateMatchScore(candidate: MatchingCandidate, job: MatchingJob): MatchScoreResult {
  const candidateSkills = new Set((candidate.skills ?? []).map((skill) => skill.toLowerCase()));
  const requiredSkills = job.requiredSkills ?? [];
  const sharedSkills = requiredSkills.filter((skill) => candidateSkills.has(skill.toLowerCase()));
  const skillsScore = requiredSkills.length > 0
    ? sharedSkills.length / requiredSkills.length
    : 0.5; // neutral when the job didn't specify required skills

  let cityScore = 0.5; // neutral when either side is missing the info
  if (candidate.city && job.location) {
    cityScore = candidate.city.toLowerCase() === job.location.toLowerCase() ? 1 : 0.5; // TODO: refine with region/proximity later
  }

  const experienceMinRequired = job.experienceMin ?? null;
  let experienceScore = 0.5;
  if (experienceMinRequired !== null && candidate.experienceYears != null) {
    experienceScore = candidate.experienceYears >= experienceMinRequired
      ? 1
      : Math.max(0, candidate.experienceYears / experienceMinRequired);
  }

  const score = Math.round(
    (0.4 * skillsScore + 0.3 * cityScore + 0.3 * experienceScore) * 100,
  );

  return {
    score,
    details: {
      sharedSkills,
      requiredSkillsTotal: requiredSkills.length,
      sameCity: cityScore === 1,
      experienceSufficient: experienceScore >= 1,
    },
  };
}
