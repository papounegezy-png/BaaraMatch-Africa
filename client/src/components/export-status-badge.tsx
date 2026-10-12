import { Badge } from "@/components/ui/badge";
import { Clock, Loader2, CheckCircle, XCircle } from "lucide-react";

export function ExportStatusBadge({ status }: { status: "en_attente" | "en_cours" | "termine" | "echec" }) {
  switch (status) {
    case "en_attente":
      return (
        <Badge variant="secondary" className="gap-1" data-testid="badge-export-status-en_attente">
          <Clock className="h-3 w-3" />
          En attente
        </Badge>
      );
    case "en_cours":
      return (
        <Badge className="gap-1 bg-blue-600 hover:bg-blue-600" data-testid="badge-export-status-en_cours">
          <Loader2 className="h-3 w-3 animate-spin" />
          En cours
        </Badge>
      );
    case "termine":
      return (
        <Badge className="gap-1 bg-green-600 hover:bg-green-600" data-testid="badge-export-status-termine">
          <CheckCircle className="h-3 w-3" />
          Prêt
        </Badge>
      );
    case "echec":
      return (
        <Badge variant="destructive" className="gap-1" data-testid="badge-export-status-echec">
          <XCircle className="h-3 w-3" />
          Échec
        </Badge>
      );
  }
}
