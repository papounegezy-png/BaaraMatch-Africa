import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// BambooHR-style self-scheduling: the recruiter proposes several candidate
// time slots instead of picking one fixed date — the candidate then chooses
// (first click wins). Replaces the old single-datetime "Planifier entretien".
export function ProposeInterviewSlotsDialog({
  applicationId,
  candidateName,
  open,
  onOpenChange,
  onProposed,
}: {
  applicationId: string | null;
  candidateName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProposed?: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [slots, setSlots] = useState<string[]>([""]);

  const addSlot = () => {
    if (slots.length >= 8) return;
    setSlots((prev) => [...prev, ""]);
  };
  const removeSlot = (index: number) => setSlots((prev) => prev.filter((_, i) => i !== index));
  const updateSlot = (index: number, value: string) => setSlots((prev) => prev.map((s, i) => (i === index ? value : s)));

  const validSlots = slots.filter((s) => s.trim().length > 0);

  const proposeMutation = useMutation({
    mutationFn: async () => {
      if (!applicationId) throw new Error("Candidature introuvable");
      await apiRequest("POST", `/api/applications/${applicationId}/interview-slots`, {
        slots: validSlots.map((s) => new Date(s).toISOString()),
      });
    },
    onSuccess: async () => {
      toast({
        title: "Créneaux proposés",
        description: `${candidateName ?? "Le candidat"} a reçu une notification pour choisir un créneau.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      await onProposed?.();
      setSlots([""]);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message || "Impossible de proposer ces créneaux.", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-propose-interview-slots">
        <DialogHeader>
          <DialogTitle>Proposer un entretien{candidateName ? ` à ${candidateName}` : ""}</DialogTitle>
          <DialogDescription>
            Proposez plusieurs créneaux — le candidat choisira celui qui lui convient (premier arrivé, premier servi).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {slots.map((slot, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                type="datetime-local"
                value={slot}
                onChange={(e) => updateSlot(index, e.target.value)}
                data-testid={`input-interview-slot-${index}`}
              />
              {slots.length > 1 && (
                <Button type="button" variant="ghost" size="icon" onClick={() => removeSlot(index)} data-testid={`button-remove-slot-${index}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {slots.length < 8 && (
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={addSlot} data-testid="button-add-slot">
              <Plus className="h-4 w-4" />
              Ajouter un créneau
            </Button>
          )}
        </div>
        {proposeMutation.isError && (
          <p className="text-sm text-destructive" role="alert">
            {proposeMutation.error instanceof Error ? proposeMutation.error.message : "Une erreur est survenue"}
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} data-testid="button-cancel-propose-slots">
            Annuler
          </Button>
          <Button
            type="button"
            onClick={() => proposeMutation.mutate()}
            disabled={validSlots.length === 0 || proposeMutation.isPending}
            data-testid="button-submit-propose-slots"
          >
            {proposeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Envoyer la proposition
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
