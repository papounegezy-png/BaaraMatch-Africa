import { describe, expect, it } from "vitest";
import { erreursDemandeDemo, messageEchecDemo, typeContact } from "../shared/demande-demo";

const valide = { fullName: "Awa Traoré", company: "Groupe Sahel", contact: "awa@groupesahel.ml", profileType: "entreprise" };

describe("demande de démo — validation", () => {
  it("reconnaît un e-mail ou un numéro plausible", () => {
    expect(typeContact("awa@groupesahel.ml")).toBe("email");
    expect(typeContact("+223 76 24 75 57")).toBe("telephone");
    expect(typeContact("76247557")).toBe("telephone");
    expect(typeContact("(+223) 20-22-33-44")).toBe("telephone");
  });

  it("refuse un contact ni e-mail ni numéro", () => {
    for (const v of ["awa@", "1234", "appelez-moi", "+223 76 24 75 57 12 34 56", ""]) expect(typeContact(v), v).toBeNull();
  });

  it("accepte une demande complète", () => {
    expect(erreursDemandeDemo(valide)).toEqual({});
    expect(erreursDemandeDemo({ ...valide, contact: "76 24 75 57", profileType: "agence" })).toEqual({});
  });

  it("signale chaque champ vide ou invalide par un message en texte", () => {
    const erreurs = erreursDemandeDemo({ fullName: " ", company: "", contact: "abc", profileType: "autre" });
    expect(Object.keys(erreurs).sort()).toEqual(["company", "contact", "fullName", "profileType"]);
    expect(erreurs.contact).toMatch(/e-mail valide ou un numéro/);
  });

  it("choisit un message d'échec selon la cause", () => {
    expect(messageEchecDemo()).toMatch(/connexion internet/);
    expect(messageEchecDemo(429)).toMatch(/Trop de demandes/);
    expect(messageEchecDemo(400)).toMatch(/Vérifiez les champs/);
    expect(messageEchecDemo(500)).toMatch(/n'a pas pu être enregistrée/);
  });
});
