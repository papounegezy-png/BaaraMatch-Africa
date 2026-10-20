import { describe, expect, it } from "vitest";
import { initiales, libelleLieu, libelleLieuSimple, normaliser, regrouperValeurs } from "../client/src/lib/employeurs";
import { agenceVersEmployeur, entrepriseVersEmployeur, lienProfil, offresParEmployeur } from "../client/src/types/employeur";

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
  const offres = offresParEmployeur([
    { agencyId: "a1", companyId: "a1" },
    { agencyId: null, companyId: "c1" },
    { agencyId: null, companyId: "c1" },
  ]);

  it("compte les offres de l'agence et celles de l'entreprise séparément", () => {
    expect([offres.get("a1"), offres.get("c1"), offres.get("x")]).toEqual([1, 2, undefined]);
  });

  it("ne marque jamais vérifié sans verifiedAt, et n'invente rien", () => {
    const a = agenceVersEmployeur({ id: "a1", fullName: "Contact", avatarUrl: null, city: " BAMAKO ", country: null, profile: { agencyName: "AG " } }, offres);
    expect(a).toEqual({ id: "a1", nom: "AG", type: "agence", logoUrl: undefined, ville: "BAMAKO", pays: undefined, offresPubliees: 1, verifie: false });
    expect(a).not.toHaveProperty("note");
    const e = entrepriseVersEmployeur({ id: "c1", fullName: "X", avatarUrl: null, city: null, country: "Mali", profile: { companyName: "MinesCo", industry: "Mines", logoUrl: "/l.png", verifiedAt: "2026-10-20" } }, offres);
    expect(e).toMatchObject({ secteur: "Mines et carrières", logoUrl: "/l.png", verifie: true, offresPubliees: 2 });
    expect(entrepriseVersEmployeur({ id: "c2", fullName: "Y", avatarUrl: null, city: null, country: null, profile: { companyName: "Y", industry: "Divers", logoUrl: null } }, offres).secteur).toBeUndefined();
  });

  it("mène au bon profil", () => {
    expect(lienProfil({ id: "a1", type: "agence" })).toBe("/agencies/a1");
    expect(lienProfil({ id: "c1", type: "entreprise" })).toBe("/companies/c1");
  });
});
