import { describe, expect, it } from "vitest";
import { libelleDate, libelleExperience, libelleLieu, libelleSalaire } from "../client/src/lib/offres";
import { trancheExperience } from "../client/src/donnees/experience";
import { NB_SECTEURS_INITIAL, SECTEURS, secteurDeCategorie } from "../shared/secteurs";
import { contratDe } from "../client/src/types/offre";

const FINE = String.fromCharCode(0x202f);
const INSECABLE = String.fromCharCode(0x00a0);

describe("libelleExperience", () => {
  it("affiche une fourchette, un minimum, un maximum ou « Débutant accepté »", () => {
    expect(libelleExperience(3, 5)).toBe("3-5 ans");
    expect(libelleExperience(5, null)).toBe("5 ans et plus");
    expect(libelleExperience(1, null)).toBe("1 an et plus");
    expect(libelleExperience(null, 3)).toBe("Jusqu'à 3 ans");
    expect(libelleExperience(2, 2)).toBe("2 ans");
    expect(libelleExperience(0, null)).toBe("Débutant accepté");
    expect(libelleExperience(0, 0)).toBe("Débutant accepté");
  });
  it("ne renvoie rien sans donnée", () => {
    expect(libelleExperience(null, null)).toBeNull();
    expect(libelleExperience(undefined, undefined)).toBeNull();
  });
});

describe("libelleSalaire", () => {
  it("formate avec une espace fine insécable entre les milliers", () => {
    expect(libelleSalaire(350000, 500000, "XOF", "mois")).toBe(`350${FINE}000-500${FINE}000${INSECABLE}FCFA / mois`);
    expect(libelleSalaire(1250000, 1250000, "XOF")).toBe(`1${FINE}250${FINE}000${INSECABLE}FCFA`);
    expect(libelleSalaire(15000, null, "XOF", "jour")).toBe(`À partir de 15${FINE}000${INSECABLE}FCFA / jour`);
    expect(libelleSalaire(null, 800, "EUR", "mission")).toBe(`Jusqu'à 800${INSECABLE}€ / mission`);
  });
  it("affiche « Selon profil » sans salaire, sans jamais inventer de chiffre", () => {
    expect(libelleSalaire(null, null, "XOF", "mois")).toBe("Selon profil");
    expect(libelleSalaire(0, 0)).toBe("Selon profil");
    expect(libelleSalaire(undefined, undefined)).toBe("Selon profil");
  });
});

describe("libelleDate", () => {
  const maintenant = new Date(2026, 9, 20, 10, 0);
  const ilYa = (jours: number) => new Date(2026, 9, 20 - jours, 18, 30);
  it("gère aujourd'hui, hier et les jours", () => {
    expect(libelleDate(ilYa(0), maintenant)).toBe("Aujourd'hui");
    expect(libelleDate(ilYa(1), maintenant)).toBe("Hier");
    expect(libelleDate(ilYa(3), maintenant)).toBe("Il y a 3 jours");
  });
  it("respecte les frontières 6/7 et 13/14 jours", () => {
    expect(libelleDate(ilYa(6), maintenant)).toBe("Il y a 6 jours");
    expect(libelleDate(ilYa(7), maintenant)).toBe("Il y a 1 semaine");
    expect(libelleDate(ilYa(13), maintenant)).toBe("Il y a 1 semaine");
    expect(libelleDate(ilYa(14), maintenant)).toBe("Il y a 2 semaines");
  });
  it("passe aux mois puis aux années", () => {
    expect(libelleDate(ilYa(29), maintenant)).toBe("Il y a 4 semaines");
    expect(libelleDate(ilYa(30), maintenant)).toBe("Il y a 1 mois");
    expect(libelleDate(ilYa(65), maintenant)).toBe("Il y a 2 mois");
    expect(libelleDate(ilYa(400), maintenant)).toBe("Il y a 1 an");
  });
  it("ne renvoie rien pour une date absente ou invalide", () => {
    expect(libelleDate(null, maintenant)).toBeNull();
    expect(libelleDate("pas une date", maintenant)).toBeNull();
  });
});

describe("libelleLieu", () => {
  it("assemble ville et pays, et remet en forme les majuscules", () => {
    expect(libelleLieu("Bamako", "Mali")).toBe("Bamako, Mali");
    expect(libelleLieu("BAMAKO", null)).toBe("Bamako");
    expect(libelleLieu(null, "Sénégal")).toBe("Sénégal");
    expect(libelleLieu("  ", undefined)).toBeNull();
  });
});

describe("tranches d'expérience", () => {
  it("classe une offre d'après l'expérience minimale", () => {
    expect(trancheExperience(0, 1)?.id).toBe("0-2");
    expect(trancheExperience(2, 5)?.id).toBe("2-5");
    expect(trancheExperience(5, null)?.id).toBe("5-10");
    expect(trancheExperience(12, null)?.id).toBe("10+");
    expect(trancheExperience(null, 3)?.id).toBe("2-5");
    expect(trancheExperience(null, null)).toBeNull();
  });
});

describe("référentiel des secteurs", () => {
  it("compte 32 secteurs uniques et en affiche 10 d'abord", () => {
    expect(SECTEURS).toHaveLength(32);
    expect(new Set(SECTEURS).size).toBe(32);
    expect(NB_SECTEURS_INITIAL).toBe(10);
    expect(SECTEURS[0]).toBe("BTP et construction");
    expect(SECTEURS[31]).toBe("Culture, arts et loisirs");
  });
  it("rattache les anciennes catégories et les valeurs libres", () => {
    expect(secteurDeCategorie("BTP & Construction")).toBe("BTP et construction");
    expect(secteurDeCategorie("BTP")).toBe("BTP et construction");
    expect(secteurDeCategorie("INFORMATIQUE")).toBe("Informatique, IT et numérique");
    expect(secteurDeCategorie("dev")).toBe("Informatique, IT et numérique");
    expect(secteurDeCategorie("Télécoms")).toBe("Télécommunications");
    expect(secteurDeCategorie("mines et carrieres")).toBe("Mines et carrières");
    expect(secteurDeCategorie("Ressources Humaines")).toBe("Ressources humaines et recrutement");
  });
  it("ne rattache ni « Autre », ni une valeur inconnue ou vide", () => {
    expect(secteurDeCategorie("Autre")).toBeNull();
    expect(secteurDeCategorie("Direction ")).toBeNull();
    expect(secteurDeCategorie("")).toBeNull();
    expect(secteurDeCategorie(null)).toBeNull();
  });
});

describe("contrats", () => {
  it("reconnaît les codes du formulaire et les anciennes valeurs", () => {
    expect(contratDe("cdi")).toBe("CDI");
    expect(contratDe("CDD")).toBe("CDD");
    expect(contratDe("freelance")).toBe("Freelance");
    expect(contratDe("internship")).toBe("Stage");
    expect(contratDe("full-time")).toBeNull();
  });
});
