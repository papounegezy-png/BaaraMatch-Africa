import { describe, expect, it } from "vitest";
import { chiffre, MOTS_CHIFFRES, phraseResume, prenom } from "../client/src/lib/espace-candidat";

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

describe("chiffre", () => {
  it("remplace 0 par un mot et accorde le libellé", () => {
    expect(chiffre(0, MOTS_CHIFFRES.offresRecues)).toEqual({ valeur: "Aucune", libelle: "offre reçue", vide: true });
    expect(chiffre(0, MOTS_CHIFFRES.entretiens)).toMatchObject({ valeur: "Aucun", libelle: "entretien" });
    expect(chiffre(1, MOTS_CHIFFRES.candidatures)).toMatchObject({ valeur: "1", libelle: "candidature" });
    expect(chiffre(4, MOTS_CHIFFRES.offresDisponibles)).toMatchObject({ valeur: "4", libelle: "offres disponibles" });
  });
});
