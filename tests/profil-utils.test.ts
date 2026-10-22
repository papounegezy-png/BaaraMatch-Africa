import { describe, expect, it } from "vitest";
import { formaterTelephone, libelleTypeFichier } from "../client/src/utils/profil";

describe("formaterTelephone", () => {
  it("groupe un numéro national par paires", () => {
    expect(formaterTelephone("76234567")).toBe("76 23 45 67");
    expect(formaterTelephone(" 76 23-45.67 ")).toBe("76 23 45 67");
    expect(formaterTelephone("0707123456")).toBe("07 07 12 34 56");
  });
  it("sépare l'indicatif, avec « + », « 00 » ou un numéro de 11 chiffres", () => {
    expect(formaterTelephone("+22376234567")).toBe("+223 76 23 45 67");
    expect(formaterTelephone("0022376234567")).toBe("+223 76 23 45 67");
    expect(formaterTelephone("22376234567")).toBe("+223 76 23 45 67");
    expect(formaterTelephone("+221 77 123 45 67")).toBe("+221 77 123 45 67");
    expect(formaterTelephone("+2250707123456")).toBe("+225 07 07 12 34 56");
  });
  it("garde un indicatif inconnu sans le deviner", () => {
    expect(formaterTelephone("+1 415 555 0100")).toBe("+1 415 555 0100");
    expect(formaterTelephone("+1  415 555-0100")).toBe("+1 415 555-0100");
  });
  it("renvoie null pour une valeur absente ou sans chiffre", () => {
    expect(formaterTelephone("")).toBeNull();
    expect(formaterTelephone("   ")).toBeNull();
    expect(formaterTelephone(null)).toBeNull();
    expect(formaterTelephone(undefined)).toBeNull();
    expect(formaterTelephone("+")).toBeNull();
  });
});

describe("libelleTypeFichier", () => {
  it("traduit le type MIME", () => {
    expect(libelleTypeFichier("application/pdf")).toBe("Document PDF");
    expect(libelleTypeFichier("application/msword")).toBe("Document Word");
    expect(libelleTypeFichier("application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe("Document Word");
    expect(libelleTypeFichier("image/jpeg")).toBe("Image");
  });
  it("se rabat sur l'extension, puis sur « Fichier »", () => {
    expect(libelleTypeFichier(null, "CV Aminata Diallo.PDF")).toBe("Document PDF");
    expect(libelleTypeFichier("", "cv.docx")).toBe("Document Word");
    expect(libelleTypeFichier("application/octet-stream", "cv")).toBe("Fichier");
    expect(libelleTypeFichier(undefined, undefined)).toBe("Fichier");
  });
});
