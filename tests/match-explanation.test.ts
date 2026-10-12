/**
 * The one-line explanation shown under the V0 match score in the company
 * and agency applications lists (shared/matching.ts). Pure function — no
 * server or database needed.
 */
import { describe, expect, it } from "vitest";
import { calculateMatchScore, explainMatchScore } from "@shared/matching";

function explain(candidate: Parameters<typeof calculateMatchScore>[0], job: Parameters<typeof calculateMatchScore>[1]) {
  return explainMatchScore(calculateMatchScore(candidate, job).details);
}

describe("explainMatchScore", () => {
  it("ville et compétences qui correspondent", () => {
    expect(explain(
      { skills: ["Maçonnerie", "Coffrage"], city: "Bamako" },
      { requiredSkills: ["maçonnerie", "coffrage"], location: "bamako" },
    )).toBe("compétences et ville correspondent");
  });

  it("compétences partielles avec le ratio", () => {
    expect(explain(
      { skills: ["Maçonnerie"], city: "Kayes" },
      { requiredSkills: ["Maçonnerie", "Coffrage", "Ferraillage"], location: "Bamako" },
    )).toBe("compétences (1/3) correspondent");
  });

  it("les trois critères", () => {
    expect(explain(
      { skills: ["Soudure"], city: "Sikasso", experienceYears: 5 },
      { requiredSkills: ["Soudure"], location: "Sikasso", experienceMin: 3 },
    )).toBe("compétences, ville et expérience correspondent");
  });

  it("aucun critère", () => {
    expect(explain(
      { skills: ["Comptabilité"], city: "Kayes", experienceYears: 1 },
      { requiredSkills: ["Soudure"], location: "Bamako", experienceMin: 5 },
    )).toBe("peu de critères correspondent");
  });

  it("deux candidats de niveaux différents ont des scores et explications différents", () => {
    const job = { requiredSkills: ["Soudure", "Lecture de plans"], location: "Bamako", experienceMin: 2 };
    const strong = calculateMatchScore({ skills: ["Soudure", "Lecture de plans"], city: "Bamako", experienceYears: 4 }, job);
    const weak = calculateMatchScore({ skills: ["Soudure"], city: "Kayes", experienceYears: 0 }, job);
    expect(strong.score).toBeGreaterThan(weak.score);
    expect(explainMatchScore(strong.details)).not.toBe(explainMatchScore(weak.details));
  });
});

describe("explainMatchScore — accord", () => {
  it("ville seule au singulier", () => {
    expect(explain({ skills: [], city: "Bamako" }, { requiredSkills: ["Soudure"], location: "Bamako" })).toBe("ville correspond");
  });
});
