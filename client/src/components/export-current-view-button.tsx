import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Download, FileDown } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ReportExportSummary } from "@/components/generer-rapport-modal";

function currentPeriode(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// One-click "export what I'm looking at right now" — always the platform
// KPIs for the current month. For a specific report with parameters,
// see the Rapports page instead.
export function ExportCurrentViewButton() {
  const { toast } = useToast();
  const [status, setStatus] = useState<"idle" | "en_attente" | "en_cours" | "termine" | "echec">("idle");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const startExport = async () => {
    setStatus("en_attente");
    setDownloadUrl(null);
    try {
      const res = await apiRequest("POST", "/api/admin/reports/generer", {
        type: "kpis_globaux",
        parametres: { periode: currentPeriode() },
      });
      const report: ReportExportSummary = await res.json();
      setStatus(report.status);

      pollRef.current = setInterval(async () => {
        const pollRes = await apiRequest("GET", `/api/admin/reports/${report.id}`);
        const updated: ReportExportSummary = await pollRes.json();
        setStatus(updated.status);
        if (updated.status === "termine" || updated.status === "echec") {
          if (pollRef.current) clearInterval(pollRef.current);
          if (updated.status === "termine") {
            setDownloadUrl(updated.downloadUrl);
          } else {
            toast({ title: "Erreur", description: updated.error || "La génération de l'export a échoué.", variant: "destructive" });
          }
        }
      }, 2000);
    } catch (error) {
      setStatus("echec");
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de lancer l'export",
        variant: "destructive",
      });
    }
  };

  if (status === "termine" && downloadUrl) {
    return (
      <Button asChild variant="outline" className="gap-2" data-testid="button-download-view-export">
        <a href={downloadUrl}>
          <Download className="h-4 w-4" />
          Télécharger l'export
        </a>
      </Button>
    );
  }

  const isBusy = status === "en_attente" || status === "en_cours";

  return (
    <Button
      variant="outline"
      className="gap-2"
      onClick={startExport}
      disabled={isBusy}
      data-testid="button-export-current-view"
      aria-live="polite"
    >
      {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
      {isBusy ? "Génération en cours..." : "Exporter cette vue en Excel"}
    </Button>
  );
}
