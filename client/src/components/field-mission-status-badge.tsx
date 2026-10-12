import { Badge } from "@/components/ui/badge";
import { Calendar, PlayCircle, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import type { FieldMissionStatus } from "@shared/schema";

export const fieldMissionStatusConfig: Record<FieldMissionStatus, { label: string; className: string; icon: typeof Calendar }> = {
  planned: { label: "Planifiée", className: "bg-blue-100 text-blue-700", icon: Calendar },
  in_progress: { label: "En cours", className: "bg-green-100 text-green-700", icon: PlayCircle },
  completed: { label: "Terminée", className: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  cancelled: { label: "Annulée", className: "bg-muted text-muted-foreground", icon: XCircle },
  disputed: { label: "Litige", className: "bg-destructive/10 text-destructive", icon: AlertTriangle },
};

export function FieldMissionStatusBadge({ status }: { status: FieldMissionStatus | string | null }) {
  const config = fieldMissionStatusConfig[(status ?? "planned") as FieldMissionStatus] ?? fieldMissionStatusConfig.planned;
  const Icon = config.icon;
  return (
    <Badge className={`gap-1 border-0 ${config.className}`} data-testid="badge-field-mission-status">
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </Badge>
  );
}
