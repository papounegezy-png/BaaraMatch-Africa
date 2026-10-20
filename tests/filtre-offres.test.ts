import { describe, expect, it } from "vitest";
import { compterParContrat, contratDepuisParametre, correspondTexte, filtrerOffres, normaliserTexte } from "../client/src/lib/filtre-offres";
import type { Offre } from "../client/src/types/offre";

const offre = (o: Partial<Offre>): Offre => ({
  id: o.id ?? "x", titre: "Offre", employeurId: "e1", employeurNom: "Employeur", employeurVerifie: false,
  contrat: "CDI", description: "", urgent: false, publieLe: "2026-10-20T00:00:00.000Z", ...o,
});

const offres = [
  offre({ id: "1", titre: "Chef de chantier", employeurNom: "Sahel BTP", ville: "Bamako", contrat: "CDI" }),
  offre({ id: "2", titre: "Électricien industriel", employeurNom: "Énergie Plus", ville: "BAMAKO", contrat: "CDD" }),
  offre({ id: "3", titre: "Comptable", employeurNom: "Cabinet Kènè", ville: "Dakar", contrat: "CDD", employeurId: "e2" }),
  offre({ id: "4", titre: "Développeur", employeurNom: "Tech Mali", ville: "Ségou", contrat: "Freelance" }),
  offre({ id: "5", titre: "Agent journalier", employeurNom: "Sahel BTP", ville: "Kayes", contrat: "Journalier" }),
];

describe("filtrage des offres", () => {
  it("compare sans accents ni casse", () => {
    expect(normaliserTexte("  BAMAKO  ")).toBe("bamako");
    expect(normaliserTexte("Électricien")).toBe("electricien");
    expect(correspondTexte("electricien", ["Électricien industriel"])).toBe(true);
    expect(correspondTexte("kene", ["Cabinet Kènè"])).toBe(true);
  });

  it("exige chaque mot de la recherche, dans le titre ou l'employeur", () => {
    expect(filtrerOffres(offres, { recherche: "chef chantier" }).map((o) => o.id)).toEqual(["1"]);
    expect(filtrerOffres(offres, { recherche: "sahel" }).map((o) => o.id)).toEqual(["1", "5"]);
    expect(filtrerOffres(offres, { recherche: "chef dakar" })).toHaveLength(0);
  });

  it("filtre par lieu, contrat et employeur, critères combinés", () => {
    expect(filtrerOffres(offres, { lieu: "bamako" }).map((o) => o.id)).toEqual(["1", "2"]);
    expect(filtrerOffres(offres, { lieu: "segou" }).map((o) => o.id)).toEqual(["4"]);
    expect(filtrerOffres(offres, { lieu: "bamako", contrat: "CDD" }).map((o) => o.id)).toEqual(["2"]);
    expect(filtrerOffres(offres, { employeurId: "e2" }).map((o) => o.id)).toEqual(["3"]);
  });

  it("compte par contrat avec les autres critères appliqués", () => {
    expect(compterParContrat(offres, { contrat: "CDI" })).toEqual({ toutes: 5, CDI: 1, CDD: 2, Freelance: 1 });
    expect(compterParContrat(offres, { lieu: "bamako" })).toEqual({ toutes: 2, CDI: 1, CDD: 1, Freelance: 0 });
  });

  it("lit le contrat de l'adresse, ancien ou nouveau paramètre", () => {
    expect(contratDepuisParametre("cdi")).toBe("CDI");
    expect(contratDepuisParametre("Freelance")).toBe("Freelance");
    expect(contratDepuisParametre("stage")).toBeNull();
    expect(contratDepuisParametre(null)).toBeNull();
  });
});
