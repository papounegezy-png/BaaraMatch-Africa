import { describe, expect, it } from "vitest";
import { debutEssaiPartenaire, DUREE_ESSAI_PARTENAIRE_JOURS, estPartenaire, planAgenceEffectif } from "../shared/plans";

const maintenant = new Date("2026-10-19T12:00:00Z");
const jour = 24 * 60 * 60 * 1000;

describe("plan effectif d'une agence", () => {
  it("Standard sans profil ou en plan standard", () => {
    expect(planAgenceEffectif(null, maintenant)).toBe("standard");
    expect(planAgenceEffectif({ subscriptionPlan: "standard" }, maintenant)).toBe("standard");
  });

  it("Partenaire choisi à la main : sans date de fin, définitif", () => {
    expect(planAgenceEffectif({ subscriptionPlan: "partner", partnerTrialEndsAt: null }, maintenant)).toBe("partner");
  });

  it("essai en cours puis terminé", () => {
    const fin = new Date(maintenant.getTime() + jour);
    expect(estPartenaire({ subscriptionPlan: "partner", partnerTrialEndsAt: fin }, maintenant)).toBe(true);
    expect(estPartenaire({ subscriptionPlan: "partner", partnerTrialEndsAt: fin.toISOString() }, new Date(fin.getTime() + 1))).toBe(false);
  });

  it("l'essai de lancement dure 60 jours", () => {
    const essai = debutEssaiPartenaire(maintenant);
    expect(DUREE_ESSAI_PARTENAIRE_JOURS).toBe(60);
    expect(essai.subscriptionPlan).toBe("partner");
    expect(essai.partnerTrialEndsAt.getTime() - maintenant.getTime()).toBe(60 * jour);
  });
});
