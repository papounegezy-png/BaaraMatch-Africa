import { describe, expect, it } from "vitest";
import { adresseDepuisEtat, ETAT_VIDE, etatDepuisAdresse, libelleAffiches, libelleNombre, trierEmployeurs } from "../client/src/lib/etat-employeurs";

describe("adresse de la page Employeurs", () => {
  it("relit ce qu'elle écrit", () => {
    const etat = { ...ETAT_VIDE, recherche: "sahel", lieu: "Bamako", type: "agence" as const, secteurs: ["Mines et carrières" as const], pays: ["mali"], avecOffres: true, tri: "nom" as const };
    const adresse = adresseDepuisEtat(etat);
    expect(adresse).toBe("?q=sahel&lieu=Bamako&type=agences&secteur=Mines+et+carri%C3%A8res&pays=mali&offres=1&tri=nom");
    expect(etatDepuisAdresse(adresse)).toEqual(etat);
  });

  it("n'écrit rien pour l'état vide", () => {
    expect(adresseDepuisEtat(ETAT_VIDE)).toBe("");
    expect(etatDepuisAdresse("")).toEqual(ETAT_VIDE);
  });

  it("ignore les valeurs inconnues et normalise les pays", () => {
    const e = etatDepuisAdresse("?type=ong&tri=note&secteur=Inconnu&pays=S%C3%A9n%C3%A9gal&pays=SENEGAL&offres=oui");
    expect([e.type, e.tri, e.secteurs, e.pays, e.avecOffres]).toEqual([null, "offres", [], ["senegal"], false]);
    expect(etatDepuisAdresse("?type=Entreprises").type).toBe("entreprise");
  });
});

describe("tri", () => {
  const liste = [
    { nom: "Global", offresPubliees: 1 },
    { nom: "BuildAfrica", offresPubliees: 0 },
    { nom: "Sahel Talents", offresPubliees: 5 },
    { nom: "AG", offresPubliees: 1 },
    { nom: "École du Sahel", offresPubliees: 0 },
  ];
  it("plus d'offres d'abord, départage par nom", () => {
    expect(trierEmployeurs(liste, "offres").map((e) => e.nom)).toEqual(["Sahel Talents", "AG", "Global", "BuildAfrica", "École du Sahel"]);
  });
  it("par nom, accents compris", () => {
    expect(trierEmployeurs(liste, "nom").map((e) => e.nom)).toEqual(["AG", "BuildAfrica", "École du Sahel", "Global", "Sahel Talents"]);
  });
  it("ne modifie pas la liste reçue", () => {
    const copie = [...liste];
    trierEmployeurs(liste, "nom");
    expect(liste).toEqual(copie);
  });
});

describe("libellés", () => {
  it("accorde au singulier et au pluriel", () => {
    expect([libelleNombre(0), libelleNombre(1), libelleNombre(22)]).toEqual(["0 employeur", "1 employeur", "22 employeurs"]);
    expect(libelleAffiches(12, 48)).toBe("12 sur 48");
  });
});
