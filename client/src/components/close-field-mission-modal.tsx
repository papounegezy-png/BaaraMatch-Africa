import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Star } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function todayDateInputValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

interface CloseFieldMissionModalProps {
  missionId: string | null;
  jobTitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Client feedback only — no candidate-side note/comment here on purpose,
// that's collected separately in a future iteration (spec explicitly wants
// this modal kept simple, one feedback source at a time).
export function CloseFieldMissionModal({ missionId, jobTitle, open, onOpenChange }: CloseFieldMissionModalProps) {
  const { toast } = useToast();
  const [actualEndDate, setActualEndDate] = useState(todayDateInputValue());
  const [noteClient, setNoteClient] = useState<number | null>(null);
  const [commentaireClient, setCommentaireClient] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setActualEndDate(todayDateInputValue());
      setNoteClient(null);
      setCommentaireClient("");
      setFormError(null);
    }
  }, [open, missionId]);

  const closeMutation = useMutation({
    mutationFn: async () => {
      if (!missionId) throw new Error("Mission introuvable");
      await apiRequest("PATCH", `/api/agency/field-missions/${missionId}/status`, {
        status: "completed",
        actualEndDate: new Date(actualEndDate).toISOString(),
        feedback: {
          noteClient,
          commentaireClient: commentaireClient.trim() || undefined,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agency/field-missions"] });
      toast({ title: "Mission clôturée", description: "La mission a été marquée comme terminée." });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      // Deliberately don't reset the form or close the dialog here — the
      // mission stays in its previous status server-side, and the user
      // shouldn't have to re-type everything because of a network blip.
      setFormError(error.message || "Impossible de clôturer la mission. Réessayez.");
    },
  });

  const handleSubmit = () => {
    setFormError(null);
    if (!actualEndDate) {
      setFormError("La date de fin réelle est obligatoire.");
      return;
    }
    if (!noteClient) {
      setFormError("Indiquez une note client (1 à 5).");
      return;
    }
    closeMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-close-field-mission">
        <DialogHeader>
          <DialogTitle>Clôturer la mission{jobTitle ? ` — ${jobTitle}` : ""}</DialogTitle>
          <DialogDescription>Renseignez la date de fin réelle et l'évaluation du client.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="mission-actual-end">Date de fin réelle</Label>
            <Input
              id="mission-actual-end"
              type="date"
              autoFocus
              value={actualEndDate}
              onChange={(e) => setActualEndDate(e.target.value)}
              data-testid="input-actual-end-date"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Note client</Label>
            <div className="flex gap-1" role="radiogroup" aria-label="Note client de 1 à 5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNoteClient(n)}
                  aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
                  aria-pressed={noteClient === n}
                  data-testid={`button-rating-${n}`}
                >
                  <Star className={`h-6 w-6 ${noteClient !== null && n <= noteClient ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mission-comment">Commentaire client (optionnel)</Label>
            <Textarea
              id="mission-comment"
              rows={3}
              value={commentaireClient}
              onChange={(e) => setCommentaireClient(e.target.value)}
              data-testid="input-client-comment"
            />
          </div>

          {formError && (
            <p className="text-sm text-destructive" role="alert" data-testid="text-close-mission-error">
              {formError}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} data-testid="button-cancel-close-mission">
            Annuler
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={closeMutation.isPending} data-testid="button-submit-close-mission">
            {closeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Clôturer la mission
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
