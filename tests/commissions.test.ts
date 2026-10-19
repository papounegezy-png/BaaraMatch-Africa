import { describe, expect, it } from "vitest";
import { tauxCommissionApplicable, type AccordTaux, type ReglageTaux } from "../shared/commissions";

const maintenant = new Date("2026-10-19T12:00:00Z");
const A = "client-a";

const reglages: ReglageTaux[] = [
  { agencyClientId: null, contractType: null, rate: 8 },
  { agencyClientId: null, contractType: "CDI", rate: 10 },
  { agencyClientId: A, contractType: null, rate: 12 },
  { agencyClientId: A, contractType: "CDD", rate: 15 },
];
const accord: AccordTaux = { agencyClientId: A, status: "signed", commissionRate: 11, startDate: "2026-01-01", endDate: null };

const taux = (r: ReglageTaux[], clientId: string | null, contractType: string | null, accords: AccordTaux[] = []) =>
  tauxCommissionApplicable({ reglages: r, accords, clientId, contractType, maintenant });

describe("taux de commission applicable", () => {
  it("préfère le réglage du client pour ce type de contrat", () => {
    expect(taux(reglages, A, "CDD", [accord])).toEqual({ taux: 15, source: "client_contrat" });
  });

  it("puis le réglage du client pour tous les contrats", () => {
    expect(taux(reglages, A, "CDI", [accord])).toEqual({ taux: 12, source: "client" });
  });

  it("puis l'accord signé en cours, avant les taux de l'agence", () => {
    const sansClient = reglages.filter((r) => r.agencyClientId === null);
    expect(taux(sansClient, A, "CDI", [accord])).toEqual({ taux: 11, source: "accord" });
  });

  it("ignore un accord non signé, pas commencé ou terminé", () => {
    const sansClient = reglages.filter((r) => r.agencyClientId === null);
    const ignores: AccordTaux[] = [
      { ...accord, status: "sent" },
      { ...accord, startDate: "2027-01-01" },
      { ...accord, endDate: "2026-06-30" },
    ];
    expect(taux(sansClient, A, "CDI", ignores)).toEqual({ taux: 10, source: "agence_contrat" });
  });

  it("puis le taux de l'agence par type de contrat, puis tous contrats", () => {
    expect(taux(reglages, "autre-client", "CDI")).toEqual({ taux: 10, source: "agence_contrat" });
    expect(taux(reglages, null, "Stage")).toEqual({ taux: 8, source: "agence" });
  });

  it("ignore les réglages désactivés et renvoie null sans aucun taux", () => {
    expect(taux([{ agencyClientId: A, contractType: null, rate: 12, isActive: false }], A, "CDI")).toBeNull();
    expect(taux([], A, "CDI")).toBeNull();
  });
});
