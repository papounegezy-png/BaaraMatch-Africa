import { describe, expect, it } from "vitest";
import { libelleDuree, joursEcoules } from "../shared/espace";

const MAINTENANT = new Date("2026-10-21T12:00:00Z");
const ilYa = (j: number) => new Date(MAINTENANT.getTime() - j * 86_400_000).toISOString();
const dansJ = (j: number) => new Date(MAINTENANT.getTime() + j * 86_400_000).toISOString();

describe("libelleDuree", () => {
  it("passe des jours aux mois puis à « plus de 6 mois » aux bonnes frontières", () => {
    expect([0, 1, 29, 30, 39, 59].map(libelleDuree)).toEqual(["moins d'un jour", "1 jour", "29 jours", "30 jours", "39 jours", "59 jours"]);
    expect([60, 89, 90, 179].map(libelleDuree)).toEqual(["2 mois", "2 mois", "3 mois", "5 mois"]);
    expect([180, 191, 400].map(libelleDuree)).toEqual(["plus de 6 mois", "plus de 6 mois", "plus de 6 mois"]);
  });
  it("compte les jours entiers écoulés", () => {
    expect(joursEcoules(ilYa(30), MAINTENANT)).toBe(30);
    expect(joursEcoules(dansJ(2), MAINTENANT)).toBe(0);
  });
});
