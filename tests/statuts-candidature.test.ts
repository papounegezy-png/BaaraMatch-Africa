import { describe, expect, it } from "vitest";
import { applicationStatuses } from "../shared/schema";
import { dateExacte, depuisQuand, STATUTS_CANDIDATURE, statutCandidature } from "../client/src/lib/statuts-candidature";

const MAINTENANT = new Date("2026-10-22T12:00:00Z");
const ilYa = (j: number) => new Date(MAINTENANT.getTime() - j * 86_400_000);

describe("statuts de candidature", () => {
  it("couvre chaque statut du schéma, avec un mot et une icône", () => {
    for (const s of applicationStatuses) {
      expect(STATUTS_CANDIDATURE[s]?.libelle).toBeTruthy();
      expect(STATUTS_CANDIDATURE[s]?.Icone).toBeTruthy();
    }
  });
  it("n'utilise ni vert ni rouge", () => {
    for (const { classes } of Object.values(STATUTS_CANDIDATURE)) expect(classes).not.toMatch(/green|emerald|red|rose|verifie|urgent/);
  });
  it("garde les couleurs demandées pour Entretien et En attente", () => {
    expect(statutCandidature("interview")).toMatchObject({ libelle: "Entretien" });
    expect(statutCandidature("interview").classes).toContain("bg-baara-moyen");
    expect(statutCandidature(null)).toMatchObject({ libelle: "En attente" });
    expect(statutCandidature("pending").classes).toContain("bg-[#FBF2DC] text-[#7A5A0C]");
  });
});

describe("dates", () => {
  it("écrit la durée relative", () => {
    expect([0, 1, 2, 39, 75, 200].map((j) => depuisQuand(ilYa(j), MAINTENANT))).toEqual(["aujourd'hui", "hier", "il y a 2 jours", "il y a 39 jours", "il y a 2 mois", "il y a plus de 6 mois"]);
  });
  it("écrit la date exacte en français", () => {
    expect(dateExacte("2026-10-21T10:00:00Z")).toBe("21 octobre 2026");
  });
});
