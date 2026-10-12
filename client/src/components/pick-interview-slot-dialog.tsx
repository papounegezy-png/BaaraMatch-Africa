import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Clock } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { InterviewSlot } from "@shared/schema";

export function PickInterviewSlotDialog({
  applicationId,
  jobTitle,
  open,
  onOpenChange,
}: {
  applicationId: string | null;
  jobTitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();

  const slotsQuery = useQuery<InterviewSlot[]>({
    queryKey: ["/api/applications", applicationId, "interview-slots"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/applications/${applicationId}/interview-slots`);
      return res.json();
    },
    enabled: open && !!applicationId,
  });

  const selectMutation = useMutation({
    mutationFn: async (slotId: string) => {
      if (!applicationId) throw new Error("Candidature introuvable");
      const res = await apiRequest("POST", `/api/applications/${applicationId}/interview-slots/${slotId}/select`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Entretien confirmé", description: "Le recruteur a été notifié de votre choix." });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Créneau indisponible",
        description: error.message || "Ce créneau vient d'être pris — veuillez en choisir un autre.",
        variant: "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/applications", applicationId, "interview-slots"] });
    },
  });

  const availableSlots = (slotsQuery.data ?? []).filter((slot) => !slot.isSelected);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-pick-interview-slot">
        <DialogHeader>
          <DialogTitle>Choisissez votre créneau d'entretien{jobTitle ? ` — ${jobTitle}` : ""}</DialogTitle>
          <DialogDescription>
            Premier créneau choisi, premier servi — sélectionnez celui qui vous convient.
          </DialogDescription>
        </DialogHeader>

        {slotsQuery.isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-11 w-full" />)}</div>
        ) : availableSlots.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6" data-testid="text-no-slots-available">
            Aucun créneau disponible — ils ont peut-être déjà tous été pris.
          </p>
        ) : (
          <div className="space-y-2">
            {availableSlots.map((slot) => (
              <Button
                key={slot.id}
                type="button"
                variant="outline"
                className="w-full justify-start gap-2"
                disabled={selectMutation.isPending}
                onClick={() => selectMutation.mutate(slot.id)}
                data-testid={`button-pick-slot-${slot.id}`}
              >
                {selectMutation.isPending && selectMutation.variables === slot.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Clock className="h-4 w-4" />
                )}
                {new Date(slot.startTime).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })}
              </Button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
