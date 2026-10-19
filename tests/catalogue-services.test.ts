import { describe, expect, it } from "vitest";
import { catalogueServices, libellesProfils, ordreProfils } from "../client/src/donnees/services";

describe("catalogue des services", () => {
  it("contient les 3 profils, dans l'ordre", () => {
    expect(ordreProfils).toEqual(["candidats", "entreprises", "agences"]);
    expect(Object.keys(catalogueServices).sort()).toEqual([...ordreProfils].sort());
    expect(ordreProfils.map((p) => libellesProfils[p])).toEqual(["Candidats", "Entreprises", "Agences"]);
  });

  const groupes = ordreProfils.flatMap((p) => catalogueServices[p].groupes.map((g) => ({ profil: p, ...g })));
  const services = groupes.flatMap((g) => g.services.map((s) => ({ profil: g.profil, groupe: g.titre, ...s })));

  it("n'a aucun groupe vide", () => {
    for (const g of groupes) expect(g.services.length, `${g.profil} / ${g.titre}`).toBeGreaterThan(0);
  });

  it("n'a aucun nom ni description vide", () => {
    for (const s of services) {
      expect(s.nom.trim(), `${s.profil} / ${s.groupe}`).not.toBe("");
      expect(s.desc.trim(), `${s.profil} / ${s.nom}`).not.toBe("");
    }
  });

  it("garde chaque description sous 60 caractères", () => {
    for (const s of services) expect(s.desc.length, `${s.nom} : « ${s.desc} »`).toBeLessThanOrEqual(60);
  });
});
