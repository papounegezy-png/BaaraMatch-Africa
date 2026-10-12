import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, PlayCircle, CheckCircle2, AlertTriangle, XCircle, Loader2, MapPin, Banknote, Calendar, Star } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FieldMissionStatusBadge } from "@/components/field-mission-status-badge";
import { CloseFieldMissionModal } from "@/components/close-field-mission-modal";
import type { FieldMission } from "@shared/schema";

type MissionDetail = FieldMission & { candidateName: string };

function formatDate(date: Date | string | null) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export function FieldMissionDetail({ missionId, backHref = "/agency/placements" }: { missionId: string; backHref?: string }) {
  const { toast } = useToast();
  const [closeOpen, setCloseOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");

  const { data: mission, isLoading, isError } = useQuery<MissionDetail>({
    queryKey: ["/api/agency/field-missions", missionId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/agency/field-missions/${missionId}`);
      return res.json();
    },
  });

  const startMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/agency/field-missions/${missionId}/status`, { status: "in_progress" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agency/field-missions"] });
      toast({ title: "Mission démarrée" });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message || "Impossible de démarrer la mission.", variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/agency/field-missions/${missionId}/status`, { status: "cancelled" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agency/field-missions"] });
      toast({ title: "Mission annulée" });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message || "Impossible d'annuler la mission.", variant: "destructive" });
    },
  });

  const disputeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/agency/field-missions/${missionId}/status`, { status: "disputed", disputeReason: disputeReason.trim() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agency/field-missions"] });
      toast({ title: "Litige signalé" });
      setDisputeOpen(false);
      setDisputeReason("");
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message || "Impossible de signaler le litige.", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !mission) {
    return (
      <div className="space-y-4">
        <Link href={backHref}><Button variant="ghost" size="sm" className="gap-2"><ArrowLeft className="h-4 w-4" />Retour aux missions</Button></Link>
        <p className="text-sm text-destructive" role="alert">Impossible de charger cette mission.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href={backHref}><Button variant="ghost" size="sm" className="gap-2 -ml-2"><ArrowLeft className="h-4 w-4" />Retour aux missions</Button></Link>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-xl" data-testid="text-mission-detail-title">{mission.jobTitle}</CardTitle>
            <p className="text-muted-foreground text-sm mt-1">{mission.candidateName} — {mission.clientName}</p>
          </div>
          <FieldMissionStatusBadge status={mission.status} />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />{mission.location}</div>
            <div className="flex items-center gap-2"><Banknote className="h-4 w-4 text-muted-foreground" />{mission.dailyRateFcfa.toLocaleString("fr-FR")} FCFA / jour</div>
            <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" />Début : {formatDate(mission.startDate)}</div>
            <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" />Fin prévue : {formatDate(mission.plannedEndDate)}</div>
            {mission.actualEndDate && (
              <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" />Fin réelle : {formatDate(mission.actualEndDate)}</div>
            )}
          </div>

          {mission.status === "disputed" && mission.disputeReason && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-sm font-medium text-destructive flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" />Motif du litige</p>
              <p className="text-sm mt-1">{mission.disputeReason}</p>
            </div>
          )}

          {mission.status === "completed" && mission.clientRating && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
              <p className="text-sm font-medium">Évaluation client</p>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} className={`h-4 w-4 ${n <= mission.clientRating! ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                ))}
              </div>
              {mission.clientFeedback && <p className="text-sm text-muted-foreground">{mission.clientFeedback}</p>}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {mission.status === "planned" && (
              <Button className="gap-2" onClick={() => startMutation.mutate()} disabled={startMutation.isPending} data-testid="button-start-mission">
                {startMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                Démarrer la mission
              </Button>
            )}
            {mission.status === "in_progress" && (
              <Button className="gap-2" onClick={() => setCloseOpen(true)} data-testid="button-close-mission">
                <CheckCircle2 className="h-4 w-4" />
                Clôturer la mission
              </Button>
            )}
            {(mission.status === "planned" || mission.status === "in_progress") && (
              <>
                <Button variant="outline" className="gap-2 text-destructive hover:text-destructive" onClick={() => setDisputeOpen(true)} data-testid="button-report-dispute">
                  <AlertTriangle className="h-4 w-4" />
                  Signaler un litige
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" className="gap-2 text-muted-foreground" data-testid="button-cancel-mission">
                      <XCircle className="h-4 w-4" />
                      Annuler
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Annuler cette mission ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        La mission "{mission.jobTitle}" sera marquée comme annulée. Cette action est définitive.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Retour</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => cancelMutation.mutate()}
                        data-testid="button-confirm-cancel-mission"
                      >
                        Annuler la mission
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <CloseFieldMissionModal missionId={mission.id} jobTitle={mission.jobTitle} open={closeOpen} onOpenChange={setCloseOpen} />

      <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <DialogContent data-testid="dialog-report-dispute">
          <DialogHeader>
            <DialogTitle>Signaler un litige</DialogTitle>
            <DialogDescription>Décrivez le motif du litige pour cette mission.</DialogDescription>
          </DialogHeader>
          <Textarea
            autoFocus
            rows={4}
            placeholder="Motif du litige..."
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            data-testid="input-dispute-reason"
          />
          {disputeMutation.isError && (
            <p className="text-sm text-destructive" role="alert">
              {disputeMutation.error instanceof Error ? disputeMutation.error.message : "Une erreur est survenue"}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDisputeOpen(false)} data-testid="button-cancel-dispute">
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!disputeReason.trim() || disputeMutation.isPending}
              onClick={() => disputeMutation.mutate()}
              data-testid="button-submit-dispute"
            >
              {disputeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Signaler le litige
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
