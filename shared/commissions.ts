// Taux de commission d'une agence, réglés par client et par type de contrat.
// Une ligne de réglage sans client vaut pour tous les clients ; sans type de
// contrat, pour tous les contrats. Le taux applicable à un placement suit
// l'ordre décidé avec le produit (du plus précis au plus général) :
//   1. réglage du client pour ce type de contrat
//   2. réglage du client pour tous les contrats
//   3. accord signé en cours avec ce client
//   4. réglage par défaut de l'agence pour ce type de contrat
//   5. réglage par défaut de l'agence pour tous les contrats
// Le taux trouvé préremplit le formulaire de placement ; l'agence peut le
// modifier ou le vider (aucune commission).

export const placementContractTypes = ["CDI", "CDD", "Intérim", "Stage", "Journalier", "Prestation", "Mission", "Freelance"] as const;
export type PlacementContractType = (typeof placementContractTypes)[number];

export interface ReglageTaux {
  agencyClientId: string | null;
  contractType: string | null;
  rate: number;
  isActive?: boolean | null;
}

export interface AccordTaux {
  agencyClientId: string;
  status: string;
  commissionRate: number | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
}

export type SourceTaux = "client_contrat" | "client" | "accord" | "agence_contrat" | "agence";

export interface TauxApplicable {
  taux: number;
  source: SourceTaux;
}

const date = (d: Date | string | null | undefined) => (d ? new Date(d).getTime() : null);

/** Accord signé, commencé et pas encore terminé, avec un taux ; le plus récent. */
function accordEnCours(accords: AccordTaux[], clientId: string, maintenant: Date): AccordTaux | undefined {
  const t = maintenant.getTime();
  return accords
    .filter((a) => a.agencyClientId === clientId && a.status === "signed" && a.commissionRate != null)
    .filter((a) => (date(a.startDate) ?? -Infinity) <= t && (date(a.endDate) ?? Infinity) > t)
    .sort((a, b) => (date(b.startDate) ?? 0) - (date(a.startDate) ?? 0))[0];
}

export function tauxCommissionApplicable(
  { reglages, accords = [], clientId, contractType, maintenant = new Date() }: {
    reglages: ReglageTaux[];
    accords?: AccordTaux[];
    clientId: string | null | undefined;
    contractType: string | null | undefined;
    maintenant?: Date;
  },
): TauxApplicable | null {
  const actifs = reglages.filter((r) => r.isActive !== false);
  const trouver = (client: string | null, contrat: string | null) =>
    actifs.find((r) => (r.agencyClientId ?? null) === client && (r.contractType ?? null) === contrat);

  if (clientId) {
    const clientContrat = contractType ? trouver(clientId, contractType) : undefined;
    if (clientContrat) return { taux: clientContrat.rate, source: "client_contrat" };
    const client = trouver(clientId, null);
    if (client) return { taux: client.rate, source: "client" };
    const accord = accordEnCours(accords, clientId, maintenant);
    if (accord) return { taux: accord.commissionRate!, source: "accord" };
  }
  const agenceContrat = contractType ? trouver(null, contractType) : undefined;
  if (agenceContrat) return { taux: agenceContrat.rate, source: "agence_contrat" };
  const agence = trouver(null, null);
  if (agence) return { taux: agence.rate, source: "agence" };
  return null;
}

/** Phrase courte sous le champ du placement : d'où vient le taux proposé. */
export function libelleSourceTaux(source: SourceTaux, contractType?: string | null): string {
  switch (source) {
    case "client_contrat": return `Taux réglé pour ce client${contractType ? ` en ${contractType}` : ""}.`;
    case "client": return "Taux réglé pour ce client, tous contrats.";
    case "accord": return "Taux de l'accord signé avec ce client.";
    case "agence_contrat": return `Taux par défaut de l'agence${contractType ? ` en ${contractType}` : ""}.`;
    case "agence": return "Taux par défaut de l'agence.";
  }
}
