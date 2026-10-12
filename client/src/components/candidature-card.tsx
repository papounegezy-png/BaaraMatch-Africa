import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Building2,
  MapPin,
  Briefcase,
  Clock,
  Eye,
  CheckCircle2,
  XCircle,
  Calendar,
  CalendarCheck,
  CalendarClock,
} from "lucide-react";
import { formatJobType } from "@/lib/job-type-labels";
import type { Application } from "@shared/schema";

export type CandidatureCardData = Application & {
  jobTitle: string;
  organizationName: string | null;
  location: string;
  jobType: string;
};

export const withdrawableStatuses = ["pending", "reviewing", "shortlisted", "interview_proposed", "interview"];

const statusConfig: Record<string, { label: string; className: string; icon: typeof Clock }> = {
  pending: { label: "Reçue", className: "bg-primary/10 text-primary", icon: Clock },
  reviewing: { label: "En revue", className: "bg-primary/10 text-primary", icon: Eye },
  shortlisted: { label: "Présélectionnée", className: "bg-secondary/15 text-secondary", icon: CheckCircle2 },
  interview_proposed: { label: "Créneaux à choisir", className: "bg-amber-100 text-amber-700", icon: Calendar },
  interview: { label: "Entretien", className: "bg-accent/10 text-accent", icon: CalendarCheck },
  offered: { label: "Offre envoyée", className: "bg-accent/10 text-accent", icon: CheckCircle2 },
  hired: { label: "Embauché(e)", className: "bg-green-100 text-green-700", icon: CheckCircle2 },
  rejected: { label: "Refusée", className: "bg-destructive/10 text-destructive", icon: XCircle },
  withdrawn: { label: "Retirée", className: "bg-muted text-muted-foreground", icon: XCircle },
};

function formatAppliedDate(date: Date | string | null): string {
  if (!date) return "-";
  const applied = new Date(date);
  const diffDays = Math.floor((Date.now() - applied.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Aujourd'hui";
  if (diffDays === 1) return "Il y a 1 jour";
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  return `Postulé le ${applied.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`;
}

interface CandidatureCardProps {
  application: CandidatureCardData;
  onPickSlot?: () => void;
  onWithdraw: (applicationId: string) => void;
  isWithdrawing?: boolean;
}

export function CandidatureCard({ application, onPickSlot, onWithdraw, isWithdrawing }: CandidatureCardProps) {
  const status = statusConfig[application.status ?? "pending"] ?? statusConfig.pending;
  const StatusIcon = status.icon;
  const canWithdraw = withdrawableStatuses.includes(application.status ?? "pending");

  return (
    <Card className="overflow-hidden" data-testid={`candidature-card-${application.id}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/jobs/${application.jobId}`} className="flex items-center gap-3 min-w-0 hover-elevate rounded-md -m-1 p-1">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold truncate" data-testid={`text-candidature-title-${application.id}`}>
                {application.jobTitle}
              </h3>
              <p className="text-sm text-muted-foreground truncate">
                {application.organizationName ?? "Organisation"}
              </p>
            </div>
          </Link>
          <Badge className={`gap-1 shrink-0 border-0 ${status.className}`} data-testid={`badge-status-${application.id}`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {status.label}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          {application.location && (
            <Badge variant="secondary" className="gap-1 text-xs">
              <MapPin className="h-3 w-3" />
              {application.location}
            </Badge>
          )}
          {application.jobType && (
            <Badge variant="secondary" className="gap-1 text-xs">
              <Briefcase className="h-3 w-3" />
              {formatJobType(application.jobType)}
            </Badge>
          )}
        </div>

        <p className="text-xs text-muted-foreground" data-testid={`text-applied-date-${application.id}`}>
          {formatAppliedDate(application.createdAt)}
        </p>

        {application.status === "interview" && application.interviewDate && (
          <div
            className="flex items-center gap-2 rounded-lg bg-accent/10 border border-accent/20 px-3 py-2.5"
            data-testid={`interview-date-${application.id}`}
          >
            <CalendarClock className="h-4 w-4 text-accent shrink-0" />
            <p className="text-sm font-medium text-accent-foreground">
              Entretien le {new Date(application.interviewDate).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          {application.status === "interview_proposed" ? (
            <Button
              size="sm"
              className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
              onClick={onPickSlot}
              data-testid={`button-pick-slot-${application.id}`}
            >
              <CalendarCheck className="h-4 w-4" />
              Choisir un créneau
            </Button>
          ) : (
            <Link href={`/jobs/${application.jobId}`}>
              <Button variant="ghost" size="sm" className="gap-1.5" data-testid={`button-view-job-${application.id}`}>
                <Eye className="h-4 w-4" />
                Voir l'offre
              </Button>
            </Link>
          )}

          {canWithdraw && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-destructive hover:text-destructive"
                  disabled={isWithdrawing}
                  data-testid={`button-withdraw-${application.id}`}
                >
                  <XCircle className="h-4 w-4" />
                  Retirer ma candidature
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Retirer votre candidature ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Vous êtes sur le point de retirer votre candidature pour "{application.jobTitle}". Cette action est
                    définitive — vous devrez postuler à nouveau si vous changez d'avis.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => onWithdraw(application.id)}
                    data-testid={`button-confirm-withdraw-${application.id}`}
                  >
                    Retirer ma candidature
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
