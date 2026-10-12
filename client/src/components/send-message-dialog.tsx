import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// No chat/inbox exists in this app — this sends a real notification the
// candidate sees on /candidate-applications, not a live conversation. The
// dialog says so explicitly rather than implying a chat thread.
export function SendMessageDialog({
  candidateId,
  candidateName,
  open,
  onOpenChange,
}: {
  candidateId: string | null;
  candidateName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!candidateId) throw new Error("Candidat introuvable");
      await apiRequest("POST", `/api/candidates/${candidateId}/message`, { message });
    },
    onSuccess: () => {
      toast({ title: "Message envoyé", description: `${candidateName ?? "Le candidat"} le recevra dans ses notifications.` });
      setMessage("");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message || "Impossible d'envoyer le message.", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-send-message">
        <DialogHeader>
          <DialogTitle>Envoyer un message{candidateName ? ` à ${candidateName}` : ""}</DialogTitle>
          <DialogDescription>
            Le candidat recevra ce message dans ses notifications BaaraMatch.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Votre message..."
          rows={5}
          maxLength={2000}
          data-testid="textarea-message-body"
        />
        {sendMutation.isError && (
          <p className="text-sm text-destructive" role="alert">
            {sendMutation.error instanceof Error ? sendMutation.error.message : "Une erreur est survenue"}
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} data-testid="button-cancel-send-message">
            Annuler
          </Button>
          <Button
            type="button"
            onClick={() => sendMutation.mutate()}
            disabled={!message.trim() || sendMutation.isPending}
            data-testid="button-submit-send-message"
          >
            {sendMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Envoyer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
