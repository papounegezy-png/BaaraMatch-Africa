import { describe, expect, it } from "vitest";
import {
  accorderNombre,
  initiales,
  libelleObtention,
  libellePretentions,
  motAccorde,
  niveauDistinct,
  libelleAnneesExperience,
  libelleContrat,
  libelleDateLongue,
  libelleDisponibilite,
  libellePeriode,
  libelleSalaire,
  lirePretentions,
} from "../client/src/utils/profil";

const NB = "\u00A0";

describe("libellePeriode", () => {
  it("écrit le mois en toutes lettres, en cours ou terminé", () => {
    expect(libellePeriode("2021-03-02", null, true)).toBe("Mars 2021 – en cours");
    expect(libellePeriode("2018-03-02", "2020-06-30", false)).toBe("Mars 2018 – juin 2020");
    expect(libellePeriode("2020", "2023")).toBe("2020 – 2023");
    expect(libellePeriode("2021-03", "2021-03-31")).toBe("Mars 2021");
  });
  it("ne montre jamais « - - » quand la fin manque", () => {
    expect(libellePeriode("2018-03-02", null, false)).toBe("Mars 2018 – fin non renseignée");
    expect(libellePeriode("2018-03-02", "", false)).toBe("Mars 2018 – fin non renseignée");
    expect(libellePeriode("2020", "")).toBe("2020 – fin non renseignée");
  });
  it("remet dans l'ordre une fin avant le début", () => {
    expect(libellePeriode("2023", "2020")).toBe("2020 – 2023");
    expect(libellePeriode("2021-06-01", "2019-01-15")).toBe("Janvier 2019 – juin 2021");
  });
  it("gère les débuts absents et les valeurs vides", () => {
    expect(libellePeriode(null, "2020-06-01")).toBe("Jusqu'en juin 2020");
    expect(libellePeriode("", null, true)).toBe("En cours");
    expect(libellePeriode(undefined, undefined)).toBeNull();
    expect(libellePeriode("bientôt", "plus tard")).toBeNull();
  });
});

describe("libelleDateLongue", () => {
  it("écrit la date en français", () => {
    expect(libelleDateLongue("2021-03-02")).toBe("2 mars 2021");
    expect(libelleDateLongue("2026-04-01")).toBe("1er avril 2026");
    expect(libelleDateLongue("2014-04")).toBe("avril 2014");
    expect(libelleDateLongue(new Date(2026, 3, 10, 15, 30))).toBe("10 avril 2026");
  });
  it("renvoie null pour une valeur absente ou illisible", () => {
    expect(libelleDateLongue("")).toBeNull();
    expect(libelleDateLongue(null)).toBeNull();
    expect(libelleDateLongue("hier")).toBeNull();
  });
});

describe("libelleDisponibilite", () => {
  it("traduit les valeurs de l'éditeur", () => {
    expect(libelleDisponibilite("immediate")).toBe("Disponible immédiatement");
    expect(libelleDisponibilite("1-month")).toBe("Disponible sous 1 mois");
    expect(libelleDisponibilite("2-weeks")).toBe("Disponible sous 2 semaines");
    expect(libelleDisponibilite("2026-11-02")).toBe("Disponible à partir du 2 novembre 2026");
  });
  it("renvoie undefined pour une valeur inconnue ou vide", () => {
    expect(libelleDisponibilite("bientôt")).toBeUndefined();
    expect(libelleDisponibilite("")).toBeUndefined();
    expect(libelleDisponibilite(null)).toBeUndefined();
  });
});

describe("prétentions salariales", () => {
  it("lit les valeurs de l'éditeur, en milliers de francs", () => {
    expect(lirePretentions("600-800")).toEqual({ min: 600_000, max: 800_000 });
    expect(lirePretentions("800-1M")).toEqual({ min: 800_000, max: 1_000_000 });
    expect(lirePretentions("1M+")).toEqual({ min: 1_000_000 });
    expect(lirePretentions("beaucoup")).toBeUndefined();
    expect(lirePretentions("")).toBeUndefined();
  });
  it("formate avec des espaces insécables", () => {
    expect(libelleSalaire(600_000, 800_000)).toBe(`600${NB}000 – 800${NB}000 FCFA / mois`);
    expect(libelleSalaire(800_000, 600_000)).toBe(`600${NB}000 – 800${NB}000 FCFA / mois`);
    expect(libelleSalaire(1_000_000)).toBe(`À partir de 1${NB}000${NB}000 FCFA / mois`);
    expect(libelleSalaire(500_000, 500_000, "FCFA", "mission")).toBe(`500${NB}000 FCFA / mission`);
    expect(libelleSalaire()).toBeUndefined();
  });
});

describe("autres libellés", () => {
  it("années d'expérience et contrat", () => {
    expect(libelleAnneesExperience("3-5")).toBe("3 à 5 ans d'expérience");
    expect(libelleAnneesExperience("10+")).toBe("Plus de 10 ans d'expérience");
    expect(libelleAnneesExperience("x")).toBeUndefined();
    expect(libelleContrat("Interim")).toBe("Intérim");
    expect(libelleContrat("CDI")).toBe("CDI");
    expect(libelleContrat("  ")).toBeUndefined();
  });
});

describe("accorderNombre", () => {
  it("accorde au singulier et au pluriel, rien pour zéro", () => {
    expect(accorderNombre(0, "expérience ajoutée", "expériences ajoutées")).toBeNull();
    expect(accorderNombre(1, "expérience ajoutée", "expériences ajoutées")).toBe("1 expérience ajoutée");
    expect(accorderNombre(2, "expérience ajoutée", "expériences ajoutées")).toBe("2 expériences ajoutées");
  });
});

describe("petits libellés", () => {
  it("accorde un mot seul", () => {
    expect([0, 1, 2].map((n) => motAccorde(n, "Expérience", "Expériences"))).toEqual(["Expérience", "Expérience", "Expériences"]);
  });
  it("tire les initiales", () => {
    expect(initiales("Aminata Diallo")).toBe("AD");
    expect(initiales("  oumar  ")).toBe("O");
    expect(initiales("Aïssata Bâ Traoré")).toBe("AB");
    expect(initiales("")).toBe("?");
    expect(initiales(null)).toBe("?");
  });
  it("écrit la date d'obtention", () => {
    expect(libelleObtention("2021-03-02")).toBe("Obtenue le 2 mars 2021");
    expect(libelleObtention("2024-04")).toBe("Obtenue en avril 2024");
    expect(libelleObtention("2019")).toBe("Obtenue en 2019");
    expect(libelleObtention("")).toBe("Date non renseignée");
    expect(libelleObtention(undefined)).toBe("Date non renseignée");
  });
  it("n'affiche pas deux fois le même diplôme", () => {
    expect(niveauDistinct("Doctorat", "Doctorat")).toBeUndefined();
    expect(niveauDistinct("doctorat ", "Doctorat")).toBeUndefined();
    expect(niveauDistinct("Bac+5 (Master)", "Master réseaux")).toBe("Bac+5 (Master)");
    expect(niveauDistinct("", "Master")).toBeUndefined();
  });
  it("lit les prétentions de l'éditeur", () => {
    expect(libellePretentions("600-800")).toBe(`600${NB}000 – 800${NB}000 FCFA / mois`);
    expect(libellePretentions("1M+")).toBe(`À partir de 1${NB}000${NB}000 FCFA / mois`);
    expect(libellePretentions(null)).toBeUndefined();
  });
});
