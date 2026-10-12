import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { OrganisationPickerOrCreate, type PickedOrganization } from "@/components/organization-picker-or-create";
import { useToast } from "@/hooks/use-toast";

export type ReportTemplate = {
  type: string;
  label: string;
  description: string;
  requiresOrganization: boolean;
};

export type ReportExportSummary = {
  id: string;
  type: string;
  parameters: Record<string, unknown>;
  status: "en_attente" | "en_cours" | "termine" | "echec";
  error: string | null;
  createdAt: string;
  updatedAt: string;
  downloadUrl: string | null;
};

function currentPeriode(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function GenererRapportModal({
  template,
  onOpenChange,
  onGenerated,
}: {
  template: ReportTemplate | null;
  onOpenChange: (open: boolean) => void;
  onGenerated: (report: ReportExportSummary) => void;
}) {
  const { toast } = useToast();
  const [periode, setPeriode] = useState(currentPeriode());
  const [organization, setOrganization] = useState<PickedOrganization | null>(null);

  const generateMutation = useMutation({
    mutationFn: async (): Promise<ReportExportSummary> => {
      const parametres: Record<string, unknown> = { periode };
      if (template?.requiresOrganization) {
        parametres.organizationId = organization?.id;
      }
      const res = await apiRequest("POST", "/api/admin/reports/generer", { type: template?.type, parametres });
      return res.json();
    },
    onSuccess: (report) => {
      onGenerated(report);
      setOrganization(null);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de lancer la génération du rapport",
        variant: "destructive",
      });
    },
  });

  const canSubmit = !!periode && (!template?.requiresOrganization || !!organization);

  return (
    <Dialog open={!!template} onOpenChange={(open) => { if (!open) { setOrganization(null); onOpenChange(false); } }}>
      <DialogContent data-testid="dialog-generer-rapport">
        <DialogHeader>
          <DialogTitle>{template?.label}</DialogTitle>
          <DialogDescription>{template?.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rapport-periode">Période</Label>
            <Input
              id="rapport-periode"
              type="month"
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
              data-testid="input-rapport-periode"
            />
          </div>

          {template?.requiresOrganization && (
            <div className="space-y-1.5">
              <Label>Agence</Label>
              {organization ? (
                <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <span className="text-sm font-medium">{organization.name}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setOrganization(null)} data-testid="button-change-organization">
                    Changer
                  </Button>
                </div>
              ) : (
                <OrganisationPickerOrCreate
                  mode="search-only"
                  userTypeFilter="agency"
                  onSelect={(org) => setOrganization(org)}
                />
              )}
            </div>
          )}
        </div>

        {generateMutation.isError && (
          <p className="text-sm text-destructive" role="alert" data-testid="text-generer-rapport-error">
            {generateMutation.error instanceof Error ? generateMutation.error.message : "Une erreur est survenue"}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} data-testid="button-cancel-generer-rapport">
            Annuler
          </Button>
          <Button
            type="button"
            onClick={() => generateMutation.mutate()}
            disabled={!canSubmit || generateMutation.isPending}
            data-testid="button-submit-generer-rapport"
          >
            {generateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Générer le rapport
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
