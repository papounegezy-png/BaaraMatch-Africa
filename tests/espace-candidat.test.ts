import { describe, expect, it } from "vitest";
import { phraseResume, prenom } from "../client/src/lib/espace-candidat";

describe("espace candidat : textes", () => {
  it("prend le prénom", () => {
    expect(prenom("  Aminata  Diallo ")).toBe("Aminata");
    expect(prenom("")).toBe("");
    expect(prenom(null)).toBe("");
  });
  it("résume entretiens et candidatures en attente", () => {
    expect(phraseResume(2, 2)).toBe("Vous avez 2 entretiens et 2 candidatures en attente de réponse.");
    expect(phraseResume(1, 0)).toBe("Vous avez 1 entretien.");
    expect(phraseResume(0, 1)).toBe("Vous avez 1 candidature en attente de réponse.");
    expect(phraseResume(0, 0)).toBe("Prêt à trouver votre prochaine offre ?");
  });
});
