import { describe, expect, it } from "vitest";
import type { CandidateProfile, User } from "../shared/schema";
import { calculateProfileCompletion, nextProfileStep } from "../client/src/lib/completion-profil";

const utilisateur = { fullName: "Aminata Diallo", phone: "+223 70 00 00 00", city: "Bamako" } as User;
const complet = {
  title: "Technicienne réseau",
  bio: "Cinq ans sur le terrain.",
  experience: "Orange Mali",
  educationEntries: [{ diplome: "BTS" }],
  certifications: [{ nom: "CCNA" }],
  resumeUrl: "/cv.pdf",
  skills: ["Cisco"],
} as unknown as CandidateProfile;

describe("complétion du profil", () => {
  it("vaut 100 % quand les 10 critères sont remplis, sans étape suivante", () => {
    expect(calculateProfileCompletion(utilisateur, complet)).toBe(100);
    expect(nextProfileStep(utilisateur, complet)).toBeNull();
  });
  it("vaut 60 % avec 6 critères sur 10, et propose d'abord le CV", () => {
    const partiel = { ...complet, resumeUrl: null, certifications: [], bio: null, skills: [] } as unknown as CandidateProfile;
    expect(calculateProfileCompletion(utilisateur, partiel)).toBe(60);
    expect(nextProfileStep(utilisateur, partiel)).toEqual({ label: "Importer votre CV", section: "cv" });
  });
  it("compte les coordonnées sans profil", () => {
    expect(calculateProfileCompletion(utilisateur)).toBe(30);
  });
});
