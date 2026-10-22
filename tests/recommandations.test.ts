import { describe, expect, it } from "vitest";
import { correspondance, raisonCorrespondance, recommander } from "../client/src/lib/recommandations";

const offre = (id: string, o: Record<string, unknown> = {}) => ({ id, titre: "Technicien réseau", ville: "Bamako", ...o });

describe("correspondance", () => {
  it("ne donne aucun score sans critère comparable", () => {
    expect(correspondance({}, offre("a"))).toBeNull();
    expect(correspondance({ competences: ["Excel"] }, offre("a"))).toBeNull();
  });
  it("ne compte que les critères renseignés des deux côtés", () => {
    expect(correspondance({ ville: "Bamako" }, offre("a"))).toEqual({ score: 100, correspondent: ["ville"] });
    expect(correspondance({ ville: "Dakar" }, offre("a"))).toEqual({ score: 0, correspondent: [] });
    expect(correspondance({ ville: "bamako", metier: "Technicienne réseaux" }, offre("a", { ville: "Goulamina / Bamako" }))?.correspondent).toEqual(["ville"]);
    expect(correspondance({ ville: "Bamako", metier: "Ingénieur réseau" }, offre("a"))).toEqual({ score: 100, correspondent: ["ville", "metier"] });
  });
  it("pondère compétences et expérience", () => {
    const c = correspondance({ competences: ["Cisco", "Linux"], experienceAnnees: 1 }, offre("a", { competencesRequises: ["cisco", "Fibre"], experienceMin: 2 }));
    // (0.35 × 0.5 + 0.2 × 0.5) / 0.55 = 50 %
    expect(c).toEqual({ score: 50, correspondent: [] });
  });
  it("ignore les mots trop généraux pour le métier", () => {
    expect(correspondance({ metier: "Chef de projet" }, offre("a", { titre: "Chef de chantier" }))).toEqual({ score: 0, correspondent: [] });
  });
});

describe("raisonCorrespondance", () => {
  it("écrit une phrase accordée", () => {
    expect(raisonCorrespondance(["ville", "metier"])).toBe("Ville et métier correspondent");
    expect(raisonCorrespondance(["ville"])).toBe("Ville correspond");
    expect(raisonCorrespondance(["competences"])).toBe("Compétences correspondent");
    expect(raisonCorrespondance(["ville", "metier", "experience"])).toBe("Ville, métier et expérience correspondent");
    expect(raisonCorrespondance([])).toBeNull();
  });
});

describe("recommander", () => {
  it("trie, écarte les candidatures envoyées et les scores nuls, limite à 4", () => {
    const offres = [offre("a"), offre("b", { ville: "Dakar" }), offre("c", { titre: "Comptable" }), offre("d"), offre("e"), offre("f"), offre("g")];
    const r = recommander({ ville: "Bamako", metier: "Technicien réseau" }, offres, new Set(["a"]));
    expect(r.map((o) => o.id)).toEqual(["d", "e", "f", "g"]);
    expect(recommander({ ville: "Bamako", metier: "Technicien réseau" }, offres.slice(0, 3), new Set()).map((o) => [o.id, o.correspondance.score])).toEqual([["a", 100], ["b", 56], ["c", 44]]);
  });
});
