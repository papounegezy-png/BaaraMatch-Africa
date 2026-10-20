import { describe, expect, it } from "vitest";
import { adresseDepuisEtat, ETAT_VIDE, etatDepuisAdresse, libelleResultats, pagesAAfficher } from "../client/src/lib/etat-offres";

describe("adresse de la page Offres", () => {
  it("relit ce qu'elle écrit", () => {
    const etat = { ...ETAT_VIDE, recherche: "chef", lieu: "Bamako", contrat: "CDI" as const, secteurs: ["Mines et carrières" as const], villes: ["bamako", "kayes"], experiences: ["2-5"], publieeDepuisJours: 7, page: 2 };
    const adresse = adresseDepuisEtat(etat);
    expect(adresse).toBe("?q=chef&lieu=Bamako&contrat=CDI&secteur=Mines+et+carri%C3%A8res&ville=bamako&ville=kayes&exp=2-5&publiee_depuis_jours=7&page=2");
    expect(etatDepuisAdresse(adresse)).toEqual(etat);
  });

  it("n'écrit rien pour l'état vide", () => {
    expect(adresseDepuisEtat(ETAT_VIDE)).toBe("");
    expect(etatDepuisAdresse("")).toEqual(ETAT_VIDE);
  });

  it("comprend les anciens paramètres de l'accueil et de la page Employeurs", () => {
    const e = etatDepuisAdresse("?q=chef&location=bamako&type=cdi&category=BTP%20%26%20Construction");
    expect([e.recherche, e.lieu, e.contrat, e.secteurs]).toEqual(["chef", "bamako", "CDI", ["BTP et construction"]]);
    const emp = etatDepuisAdresse("?companyId=abc&employerName=Sahel%20BTP");
    expect(emp.employeur).toEqual({ cle: "companyId", id: "abc", nom: "Sahel BTP" });
    expect(adresseDepuisEtat(emp)).toBe("?companyId=abc&employerName=Sahel+BTP");
  });

  it("ramène une page invalide à 1", () => {
    expect(etatDepuisAdresse("?page=0").page).toBe(1);
    expect(etatDepuisAdresse("?page=abc").page).toBe(1);
  });
});

describe("pagination", () => {
  it("affiche tout jusqu'à 7 pages", () => {
    expect(pagesAAfficher(1, 1)).toEqual([1]);
    expect(pagesAAfficher(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
  it("abrège avec des points de suspension", () => {
    expect(pagesAAfficher(5, 20)).toEqual([1, "…", 4, 5, 6, "…", 20]);
    expect(pagesAAfficher(1, 20)).toEqual([1, 2, 3, 4, "…", 20]);
    expect(pagesAAfficher(20, 20)).toEqual([1, "…", 17, 18, 19, 20]);
    expect(pagesAAfficher(3, 20)).toEqual([1, 2, 3, 4, "…", 20]);
  });
});

describe("libellé des résultats", () => {
  const FINE = String.fromCharCode(0x202f);
  it("donne la plage et le total", () => {
    expect(libelleResultats(1, 17964)).toBe(`1–20 sur 17${FINE}964 offres`);
    expect(libelleResultats(2, 35)).toBe("21–35 sur 35 offres");
    expect(libelleResultats(1, 15)).toBe("1–15 sur 15 offres");
  });
  it("gère le singulier et le vide", () => {
    expect(libelleResultats(1, 1)).toBe("1 offre");
    expect(libelleResultats(1, 0)).toBe("0 offre");
  });
});
