import { describe, expect, it } from "vitest";
import { initiales, libelleLieu, libelleLieuSimple, normaliser, regrouperValeurs } from "../client/src/lib/employeurs";
import { employeurDepuisLigne, lienProfil } from "../shared/employeur";

describe("utilitaires Employeurs", () => {
  it("normalise sans accents, casse ni espaces superflues", () => {
    expect(normaliser("  BAMAKÓ  ")).toBe("bamako");
    expect(normaliser("Côte  d'Ivoire")).toBe("cote d'ivoire");
    expect(normaliser(null)).toBe("");
  });

  it("forme le lieu, même s'il manque la ville ou le pays", () => {
    expect(libelleLieu("BAMAKO", "Mali")).toBe("Bamako, Mali");
    expect(libelleLieu(null, "Sénégal")).toBe("Sénégal");
    expect(libelleLieu("Dakar", undefined)).toBe("Dakar");
    expect(libelleLieu("", "  ")).toBeNull();
    expect(libelleLieuSimple("  KAYES ")).toBe("Kayes");
  });

  it("donne deux initiales au plus, sans les petits mots", () => {
    expect(initiales("Mamary Dembele")).toBe("MD");
    expect(initiales("Initiative pour le Développement de l’Afrique (IDA Sarl)")).toBe("ID");
    expect(initiales("AG ")).toBe("AG");
    expect(initiales("BuildAfrica")).toBe("BU");
    expect(initiales("Société d'État")).toBe("SÉ");
    expect(initiales("")).toBe("");
  });

  it("regroupe « Bamako » et « BAMAKO », graphie la plus fréquente", () => {
    expect(regrouperValeurs(["BAMAKO", "Bamako", "Bamako", "Dakar", null, " "])).toEqual([
      { valeur: "bamako", libelle: "Bamako", nombre: 3 },
      { valeur: "dakar", libelle: "Dakar", nombre: 1 },
    ]);
  });
});

describe("modèle Employeur", () => {
  const ligne = { id: "a1", type: "agency" as const, nom: "AG ", logoUrl: null, ville: " BAMAKO ", pays: null, secteur: null, verifieLe: null, offres: 1 };

  it("ne marque jamais vérifié sans verifiedAt, et n'invente rien", () => {
    const a = employeurDepuisLigne(ligne);
    expect(a).toEqual({ id: "a1", nom: "AG", type: "agence", logoUrl: undefined, ville: "BAMAKO", pays: undefined, secteur: undefined, offresPubliees: 1, verifie: false });
    expect(a).not.toHaveProperty("note");
    expect(employeurDepuisLigne({ ...ligne, type: "company", secteur: "Mines et carrières", logoUrl: "/l.png", verifieLe: "2026-10-20" }))
      .toMatchObject({ type: "entreprise", secteur: "Mines et carrières", logoUrl: "/l.png", verifie: true });
  });

  it("ignore un secteur hors des 32", () => {
    expect(employeurDepuisLigne({ ...ligne, secteur: "Divers" }).secteur).toBeUndefined();
  });

  it("mène au bon profil", () => {
    expect(lienProfil({ id: "a1", type: "agence" })).toBe("/agencies/a1");
    expect(lienProfil({ id: "c1", type: "entreprise" })).toBe("/companies/c1");
  });
});
