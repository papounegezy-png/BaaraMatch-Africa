import ExcelJS from "exceljs";

export type ExportableApplication = {
  matchScore: number;
  status: string;
  createdAt: string | null;
  candidate: {
    name: string;
    email: string;
    phone: string | null;
    city: string | null;
  } | null;
};

const stageLabels: Record<string, string> = {
  pending: "Nouveau",
  reviewing: "En revue",
  shortlisted: "Présélection",
  interview: "Entretien",
  offered: "Offre",
  hired: "Recruté",
  rejected: "Refusé",
  withdrawn: "Retiré",
};

// Builds a real .xlsx (not CSV) so it opens with formatted headers/widths —
// used by the agency's per-Poste candidatures export.
export async function exportApplicationsToExcel(jobTitle: string, applications: ExportableApplication[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Candidatures");

  sheet.columns = [
    { header: "Candidat", key: "name", width: 28 },
    { header: "Email", key: "email", width: 30 },
    { header: "Téléphone", key: "phone", width: 18 },
    { header: "Ville", key: "city", width: 18 },
    { header: "Score (%)", key: "score", width: 12 },
    { header: "Étape", key: "stage", width: 16 },
    { header: "Date de candidature", key: "date", width: 20 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const application of applications) {
    sheet.addRow({
      name: application.candidate?.name ?? "Candidat inconnu",
      email: application.candidate?.email ?? "-",
      phone: application.candidate?.phone ?? "-",
      city: application.candidate?.city ?? "-",
      score: application.matchScore,
      stage: stageLabels[application.status] ?? application.status,
      date: application.createdAt ? new Date(application.createdAt).toLocaleDateString("fr-FR") : "-",
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const safeTitle = jobTitle.replace(/[^a-z0-9]+/gi, "-").toLowerCase().replace(/^-+|-+$/g, "");
  link.download = `candidatures-${safeTitle || "offre"}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
