// Plan effectif d'une agence. Offre de lancement : chaque agence est en plan
// Partenaire pendant DUREE_ESSAI_PARTENAIRE_JOURS à partir de son inscription
// (ou de la reprise de son compte prospect), puis repasse en Standard.
// Un passage en Partenaire fait à la main par le Super Admin n'a pas de date
// de fin (partnerTrialEndsAt nul) et ne s'arrête donc pas tout seul.
export const DUREE_ESSAI_PARTENAIRE_JOURS = 60;

const JOUR_MS = 24 * 60 * 60 * 1000;

export type PlanAgence = "standard" | "partner";

export interface ProfilPlanAgence {
  subscriptionPlan?: string | null;
  partnerTrialEndsAt?: Date | string | null;
}

export function planAgenceEffectif(profil: ProfilPlanAgence | null | undefined, maintenant: Date = new Date()): PlanAgence {
  if (!profil || profil.subscriptionPlan !== "partner") return "standard";
  if (!profil.partnerTrialEndsAt) return "partner";
  return new Date(profil.partnerTrialEndsAt).getTime() > maintenant.getTime() ? "partner" : "standard";
}

export function estPartenaire(profil: ProfilPlanAgence | null | undefined, maintenant: Date = new Date()): boolean {
  return planAgenceEffectif(profil, maintenant) === "partner";
}

/** Champs à écrire sur agency_profiles pour ouvrir l'essai Partenaire. */
export function debutEssaiPartenaire(maintenant: Date = new Date(), jours: number = DUREE_ESSAI_PARTENAIRE_JOURS) {
  return {
    subscriptionPlan: "partner" as const,
    subscriptionUpdatedAt: maintenant,
    partnerTrialEndsAt: new Date(maintenant.getTime() + jours * JOUR_MS),
  };
}
