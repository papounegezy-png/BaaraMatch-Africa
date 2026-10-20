import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

/**
 * Console admin : vérification d'un employeur par l'équipe BaaraMatch
 * (PATCH /api/admin/employeurs/:id/verification). C'est la seule source du
 * badge « Employeur vérifié » des offres ; confirmation avant chaque
 * changement.
 */
export function VerificationEmployeur({ employeurId, nom, verifieLe, cleListe }: {
  employeurId: string;
  nom: string;
  verifieLe: string | null;
  // Liste admin à recharger après le changement.
  cleListe: string;
}) {
  const { toast } = useToast();
  const [confirmation, setConfirmation] = useState(false);
  const bouton = useRef<HTMLButtonElement>(null);
  const verifie = !!verifieLe;
  const mutation = useMutation({
    mutationFn: async (valeur: boolean) => (await apiRequest("PATCH", `/api/admin/employeurs/${employeurId}/verification`, { verifie: valeur })).json(),
    onSuccess: (_d, valeur) => {
      queryClient.invalidateQueries({ queryKey: [cleListe] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/offres"] });
      toast({ title: valeur ? `${nom} est vérifié` : `${nom} n'est plus vérifié` });
    },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message || "La vérification n'a pas pu être enregistrée.", variant: "destructive" }),
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {verifie && (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-baara-verifie">
          <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Vérifié le {new Date(verifieLe!).toLocaleDateString("fr-FR")}
        </span>
      )}
      <Button
        ref={bouton}
        type="button"
        size="sm"
        variant={verifie ? "ghost" : "outline"}
        disabled={mutation.isPending}
        onClick={() => setConfirmation(true)}
        aria-label={verifie ? `Retirer la vérification de ${nom}` : `Vérifier ${nom}`}
        data-testid={`bouton-verifier-${employeurId}`}
      >
        {verifie ? "Retirer" : "Vérifier"}
      </Button>
      <AlertDialog open={confirmation} onOpenChange={setConfirmation}>
        <AlertDialogContent onCloseAutoFocus={(e) => { e.preventDefault(); bouton.current?.focus(); }}>
          <AlertDialogHeader>
            <AlertDialogTitle>{verifie ? "Retirer la vérification ?" : `Vérifier ${nom} ?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {verifie
                ? "Le badge « Employeur vérifié » disparaîtra de ses offres immédiatement."
                : "Ses offres afficheront le badge « Employeur vérifié par BaaraMatch ». Confirmez seulement après avoir contrôlé ses documents (RCCM, existence réelle de l'organisation)."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => mutation.mutate(!verifie)} data-testid={`confirmer-verification-${employeurId}`}>
              {verifie ? "Retirer la vérification" : "Vérifier l'employeur"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
