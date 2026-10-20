import { describe, expect, it } from "vitest";
import type { Employeur } from "../shared/employeur";
import { lireParametresEmployeurs, rechercherEmployeurs } from "../shared/recherche-employeurs";

const e = (id: string, o: Partial<Employeur>): Employeur => ({ id, nom: id, type: "entreprise", offresPubliees: 0, verifie: false, ...o });
const TOUS: Employeur[] = [
  e("Global", { type: "agence", ville: "BAMAKO", pays: "Mali", offresPubliees: 5 }),
  e("Sahel Talents", { type: "agence", ville: "Bamako", pays: "Sénégal", offresPubliees: 5 }),
  e("IDA", { ville: "Bamako", pays: "Mali", offresPubliees: 2 }),
  e("MinesCo", { ville: "Kayes", pays: "SÉNÉGAL", secteur: "Mines et carrières" }),
  e("BuildAfrica", { ville: "Bamako", pays: "Sénégal", secteur: "BTP et construction" }),
  e("Autre Agence", { type: "agence", pays: "Sénégal" }),
];
const chercher = (q: Record<string, unknown>) => rechercherEmployeurs(TOUS, lireParametresEmployeurs(q));

describe("paramètres de GET /api/employeurs", () => {
  it("lit les listes répétées, avec ou sans crochets", () => {
    expect(lireParametresEmployeurs({ pays: ["Mali", "SÉNÉGAL"] }).pays).toEqual(["mali", "senegal"]);
    expect(lireParametresEmployeurs({ "secteur[]": "BTP & Construction" }).secteurs).toEqual(["BTP et construction"]);
  });
  it("ignore les valeurs inconnues", () => {
    const p = lireParametresEmployeurs({ type: "ong", tri: "note", offres: "oui", taille: "9999", page: "-1" });
    expect([p.type, p.tri, p.avecOffres, p.taille, p.page]).toEqual([null, "offres", false, 120, 1]);
  });
});

describe("recherche des employeurs", () => {
  it("compare pays et villes sans casse ni accents", () => {
    expect(chercher({ pays: "senegal" }).total).toBe(4);
    expect(chercher({ lieu: "bamako" }).total).toBe(4);
  });
  it("trie par offres (départage par nom) ou par nom", () => {
    expect(chercher({}).employeurs.map((x) => x.id).slice(0, 3)).toEqual(["Global", "Sahel Talents", "IDA"]);
    expect(chercher({ tri: "nom" }).employeurs.map((x) => x.id)[0]).toBe("Autre Agence");
  });
  it("pagine et ramène une page trop grande à la dernière", () => {
    const r = chercher({ taille: "4", page: "7" });
    expect([r.page, r.nbPages, r.employeurs.length, r.total]).toEqual([2, 2, 2, 6]);
  });
  it("compte chaque facette avec les autres filtres, sans le sien", () => {
    const f = chercher({ type: "agences", pays: "mali" }).facettes;
    expect(f.types).toEqual({ tous: 2, entreprise: 1, agence: 1 });
    expect(f.pays.map((p) => `${p.libelle}:${p.nombre}`)).toEqual(["Sénégal:2", "Mali:1"]);
    expect(f.avecOffres).toBe(1);
    expect(f.secteurs).toHaveLength(32);
  });
  it("combine secteur et offres en cours", () => {
    expect(chercher({ secteur: "Mines et carrières" }).employeurs.map((x) => x.id)).toEqual(["MinesCo"]);
    expect(chercher({ offres: "1" }).total).toBe(3);
  });
});
