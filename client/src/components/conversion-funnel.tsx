import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Filter } from "lucide-react";

type ApplicationFunnel = Record<string, number>;

const STAGES: { key: string[]; label: string }[] = [
  { key: ["pending", "reviewing"], label: "Reçue" },
  { key: ["shortlisted"], label: "Présélection" },
  { key: ["interview"], label: "Entretien" },
  { key: ["offered"], label: "Offre envoyée" },
  { key: ["hired"], label: "Embauchée" },
];

export function ConversionFunnel() {
  const funnelQuery = useQuery<ApplicationFunnel>({
    queryKey: ["/api/admin/dashboard/application-funnel"],
  });

  const funnel = funnelQuery.data;
  const stageValues = STAGES.map((stage) => ({
    label: stage.label,
    value: funnel ? stage.key.reduce((sum, k) => sum + (funnel[k] ?? 0), 0) : 0,
  }));
  const maxValue = Math.max(1, ...stageValues.map((s) => s.value));
  const hasAnyData = stageValues.some((s) => s.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-blue-500" />
          Funnel de conversion des candidatures
        </CardTitle>
      </CardHeader>
      <CardContent>
        {funnelQuery.isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : !hasAnyData ? (
          <p className="text-sm text-muted-foreground text-center py-6" data-testid="text-funnel-no-data">
            Pas encore de candidatures pour construire ce funnel.
          </p>
        ) : (
          <div className="space-y-3">
            {stageValues.map((stage, index) => {
              const previous = index > 0 ? stageValues[index - 1].value : null;
              const conversionRate = previous && previous > 0 ? Math.round((stage.value / previous) * 100) : null;
              const widthPercent = Math.max(4, Math.round((stage.value / maxValue) * 100));

              return (
                <div key={stage.label} data-testid={`funnel-stage-${index}`}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">{stage.label}</span>
                    <span className="text-muted-foreground">
                      <span className="font-semibold text-foreground">{stage.value}</span>
                      {conversionRate !== null && ` (${conversionRate}% depuis l'étape précédente)`}
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
