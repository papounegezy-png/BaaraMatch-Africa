import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cleProfil } from "@/hooks/use-profil-employeur";
import type { ProfilEmployeur } from "@/types/profil-employeur";

// Suivi d'un employeur par un candidat (POST / DELETE
// /api/employeurs/:id/suivi). L'état vient du profil (suiviParMoi) et n'est
// mis à jour qu'après la réponse du serveur, jamais par anticipation.

export function useSuiviEmployeur(id: string, suivi: boolean) {
  const client = useQueryClient();
  const { toast } = useToast();
  const basculer = useMutation({
    mutationFn: async (suivre: boolean): Promise<{ suivi: boolean }> =>
      (await apiRequest(suivre ? "POST" : "DELETE", `/api/employeurs/${id}/suivi`)).json(),
    onSuccess: (reponse) => {
      client.setQueryData<ProfilEmployeur>(cleProfil(id), (p) => (p ? { ...p, suiviParMoi: reponse.suivi } : p));
      toast({ title: reponse.suivi ? "Employeur suivi" : "Vous ne suivez plus cet employeur", description: reponse.suivi ? "Vous serez prévenu de ses nouvelles offres." : undefined });
    },
    onError: () => toast({ title: "Le suivi n'a pas pu être enregistré", description: "Réessayez dans un instant.", variant: "destructive" }),
  });
  return { suivi, enCours: basculer.isPending, basculer: () => basculer.mutate(!suivi) };
}
