import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MapPin, Clock, Banknote, Users, MoreHorizontal, AlertCircle, Briefcase } from "lucide-react";
import { formatJobType } from "@/lib/job-type-labels";

export interface MissionCardData {
  id: string;
  title: string;
  clientLabel: string;
  location: string;
  jobType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  applicationCount: number;
  positions: number;
  hiredCount: number;
  isUrgent: boolean;
  isActive: boolean;
  // True only while a standard-plan agency's job is waiting on admin
  // review (see POST /api/jobs's moderation gate) — isActive is false for
  // this exact same reason, but "closed" would be a flatly wrong label for
  // a job that was never live yet, so this needs its own status.
  isPendingModeration: boolean;
  daysOpen: number;
  skills: string[];
}

export type MissionStatus = "pourvue" | "urgente" | "en_cours" | "en_attente" | "fermee";

// A mission's displayed status is always derived from real facts (hires vs
// positions needed, isActive, isUrgent, moderation state) — never a
// separately-stored value that could drift out of sync with what actually
// happened.
export function getMissionStatus(mission: MissionCardData): MissionStatus {
  if (mission.hiredCount >= mission.positions) return "pourvue";
  if (mission.isPendingModeration) return "en_attente";
  if (!mission.isActive) return "fermee";
  if (mission.isUrgent) return "urgente";
  return "en_cours";
}

const statusConfig: Record<MissionStatus, { label: string; className: string; dot: string }> = {
  urgente: { label: "Urgente", className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800", dot: "bg-red-500" },
  en_cours: { label: "En cours", className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800", dot: "bg-blue-500" },
  pourvue: { label: "Pourvue", className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800", dot: "bg-green-500" },
  en_attente: { label: "En attente de validation", className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800", dot: "bg-amber-500" },
  // Offline and not under review: a draft never published, or a job taken
  // offline — the data can't tell those apart, so the label covers both.
  fermee: { label: "Brouillon / hors ligne", className: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700", dot: "bg-gray-400" },
};

function formatSalary(min: number | null, max: number | null, currency: string | null) {
  const curr = currency || "XOF";
  if (min && max) return `${min.toLocaleString("fr-FR")} - ${max.toLocaleString("fr-FR")} ${curr}`;
  if (min) return `À partir de ${min.toLocaleString("fr-FR")} ${curr}`;
  if (max) return `Jusqu'à ${max.toLocaleString("fr-FR")} ${curr}`;
  return "Salaire non spécifié";
}

function MissionCard({
  mission,
  onViewDetails,
  onEdit,
  onDelete,
  onPublish,
}: {
  mission: MissionCardData;
  onViewDetails: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPublish?: () => void;
}) {
  const status = getMissionStatus(mission);
  const config = statusConfig[status];
  const coveragePercent = Math.min(100, Math.round((mission.hiredCount / mission.positions) * 100));

  return (
    <Card data-testid={`card-mission-${mission.id}`}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold truncate">{mission.title}</h3>
              <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
                <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1.5 ${config.dot}`} />
                {config.label}
              </Badge>
              {(status === "urgente" || status === "en_cours") && mission.daysOpen >= 0 && (
                <Badge variant="outline" className="text-xs font-normal text-muted-foreground gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Ouvert depuis {mission.daysOpen}j
                </Badge>
              )}
              {status === "en_attente" && (
                <Badge variant="outline" className="text-xs font-normal text-muted-foreground gap-1" data-testid={`badge-review-delay-${mission.id}`}>
                  <Clock className="h-3 w-3" />
                  Réponse sous 24h
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">{mission.clientLabel}</p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {mission.location}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {formatJobType(mission.jobType) ?? mission.jobType}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Banknote className="h-3.5 w-3.5" />
                {formatSalary(mission.salaryMin, mission.salaryMax, mission.salaryCurrency)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {mission.applicationCount} candidat{mission.applicationCount !== 1 ? "s" : ""} / {mission.positions} poste{mission.positions !== 1 ? "s" : ""}
              </span>
            </div>

            {mission.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {mission.skills.slice(0, 4).map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs font-normal">
                    {skill}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex sm:flex-col items-center sm:items-end gap-3 shrink-0">
            <div className="flex gap-2">
              <Button size="sm" onClick={onViewDetails} data-testid={`button-view-mission-${mission.id}`}>
                Voir détails
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" data-testid={`button-actions-mission-${mission.id}`}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onPublish && status === "fermee" && (
                    <DropdownMenuItem onClick={onPublish} data-testid={`button-publish-mission-${mission.id}`}>Publier</DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={onEdit}>Modifier</DropdownMenuItem>
                  <DropdownMenuItem onClick={onDelete} className="text-destructive">Supprimer</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-28">
              <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${status === "pourvue" ? "bg-green-500" : "bg-primary"}`}
                  style={{ width: `${coveragePercent}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{coveragePercent}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function MissionCardsGrid({
  missions,
  isLoading,
  onViewDetails,
  onEdit,
  onDelete,
  onPublish,
}: {
  missions: MissionCardData[];
  isLoading: boolean;
  onViewDetails: (mission: MissionCardData) => void;
  onEdit: (mission: MissionCardData) => void;
  onDelete: (mission: MissionCardData) => void;
  // Offered on offline missions (drafts, closed jobs) when provided.
  onPublish?: (mission: MissionCardData) => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-5 h-24 animate-pulse bg-muted/50" />
          </Card>
        ))}
      </div>
    );
  }

  if (missions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-medium">Aucune mission trouvée</h3>
          <p className="text-sm text-muted-foreground">Créez votre première offre</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {missions.map((mission) => (
        <MissionCard
          key={mission.id}
          mission={mission}
          onViewDetails={() => onViewDetails(mission)}
          onEdit={() => onEdit(mission)}
          onDelete={() => onDelete(mission)}
          onPublish={onPublish ? () => onPublish(mission) : undefined}
        />
      ))}
    </div>
  );
}
