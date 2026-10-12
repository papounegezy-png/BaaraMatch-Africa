import ExcelJS from "exceljs";
import { storage } from "./storage";
import { loadAgencyClientsById } from "./agency-crm";

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFE8ECF3" },
};

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
  });
}

const FCFA_FORMAT = '#,##0 "FCFA"';
const DATE_FORMAT = "dd/mm/yyyy";

function parsePeriode(periode: string): { start: Date; end: Date; label: string } {
  const [yearStr, monthStr] = periode.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr) - 1;
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);
  const label = start.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return { start, end, label };
}

const METRIC_LABELS: Record<string, string> = {
  offres_publiees: "Offres publiées",
  candidatures_recues: "Candidatures reçues",
  missions_terminees: "Missions terminées",
  nouveaux_candidats: "Nouveaux candidats",
};

async function buildKpisGlobauxWorkbook(parameters: { periode: string }): Promise<ExcelJS.Workbook> {
  const { start, end, label } = parsePeriode(parameters.periode);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Résumé");

  sheet.columns = [
    { header: "Métrique", key: "label", width: 30 },
    { header: "Valeur", key: "value", width: 16 },
  ];
  styleHeaderRow(sheet.getRow(1));

  sheet.addRow(["Période", label]);
  sheet.addRow([]);

  for (const key of Object.keys(METRIC_LABELS)) {
    const series = await storage.getMetricsSeries(key, start, new Date(end.getTime() - 1), null);
    const total = series.reduce((sum, row) => sum + row.value, 0);
    sheet.addRow({ label: METRIC_LABELS[key], value: total });
  }

  return workbook;
}

async function buildRapportMensuelAgenceWorkbook(parameters: { periode: string; organizationId: string }): Promise<ExcelJS.Workbook> {
  const { start, end, label } = parsePeriode(parameters.periode);
  const agency = await storage.getUser(parameters.organizationId);
  const agencyProfile = await storage.getAgencyProfile(parameters.organizationId);
  const placements = await storage.getAgencyPlacements(parameters.organizationId);
  const placementsThisMonth = placements.filter((placement) => {
    const startDate = placement.startDate ? new Date(placement.startDate) : null;
    return startDate && startDate >= start && startDate < end;
  });

  const totalCommission = placementsThisMonth.reduce((sum, placement) => sum + (placement.commissionAmount ?? 0), 0);

  const workbook = new ExcelJS.Workbook();

  const summarySheet = workbook.addWorksheet("Résumé");
  summarySheet.columns = [
    { header: "Indicateur", key: "label", width: 30 },
    { header: "Valeur", key: "value", width: 20 },
  ];
  styleHeaderRow(summarySheet.getRow(1));
  summarySheet.addRow(["Agence", agencyProfile?.agencyName ?? agency?.fullName ?? "-"]);
  summarySheet.addRow(["Période", label]);
  summarySheet.addRow(["Missions du mois", placementsThisMonth.length]);
  const commissionRow = summarySheet.addRow(["CA facturé (commissions)", totalCommission]);
  commissionRow.getCell(2).numFmt = FCFA_FORMAT;

  const detailSheet = workbook.addWorksheet("Détail missions");
  detailSheet.columns = [
    { header: "Candidat", key: "candidate", width: 28 },
    { header: "Entreprise", key: "company", width: 28 },
    { header: "Statut", key: "status", width: 16 },
    { header: "Date de début", key: "startDate", width: 16 },
    { header: "Date de fin", key: "endDate", width: 16 },
    { header: "Commission", key: "commission", width: 16 },
  ];
  styleHeaderRow(detailSheet.getRow(1));

  const statusLabels: Record<string, string> = {
    active: "En cours",
    completed: "Terminée",
    terminated: "Résiliée",
    on_leave: "En congé",
  };

  // The client of record is the agency's fiche (it may not be on BaaraMatch).
  const clientsById = await loadAgencyClientsById(parameters.organizationId);
  for (const placement of placementsThisMonth) {
    const [candidate, company] = await Promise.all([
      storage.getUser(placement.candidateId),
      placement.companyId ? storage.getUser(placement.companyId) : Promise.resolve(undefined),
    ]);
    const row = detailSheet.addRow({
      candidate: candidate?.fullName ?? "Candidat inconnu",
      company: (placement.agencyClientId && clientsById.get(placement.agencyClientId)?.name) ?? company?.fullName ?? "Entreprise inconnue",
      status: statusLabels[placement.status ?? "active"] ?? placement.status,
      startDate: placement.startDate ? new Date(placement.startDate) : null,
      endDate: placement.endDate ? new Date(placement.endDate) : null,
      commission: placement.commissionAmount ?? 0,
    });
    row.getCell("startDate").numFmt = DATE_FORMAT;
    row.getCell("endDate").numFmt = DATE_FORMAT;
    row.getCell("commission").numFmt = FCFA_FORMAT;
  }

  return workbook;
}

export const reportTemplates = [
  { type: "kpis_globaux", label: "KPIs globaux", description: "Métriques plateforme agrégées sur une période", requiresOrganization: false },
  { type: "rapport_mensuel_agence", label: "Rapport mensuel par agence", description: "Missions et facturation d'une agence sur un mois", requiresOrganization: true },
] as const;

export async function buildReportWorkbook(type: string, parameters: Record<string, unknown>): Promise<ExcelJS.Workbook> {
  if (type === "kpis_globaux") {
    const periode = String(parameters.periode ?? "");
    if (!periode) throw new Error("Le paramètre 'periode' est requis");
    return buildKpisGlobauxWorkbook({ periode });
  }
  if (type === "rapport_mensuel_agence") {
    const periode = String(parameters.periode ?? "");
    const organizationId = String(parameters.organizationId ?? "");
    if (!periode || !organizationId) throw new Error("Les paramètres 'periode' et 'organizationId' sont requis");
    return buildRapportMensuelAgenceWorkbook({ periode, organizationId });
  }
  throw new Error(`Type de rapport inconnu: "${type}"`);
}
