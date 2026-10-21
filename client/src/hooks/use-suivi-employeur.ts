import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Suivi d'un employeur par un candidat : GET / POST / DELETE
// /api/employeurs/:id/suivi (prompt 6). Le bouton n'affiche « Suivi » que
// d'après la réponse du serveur, jamais par anticipation.

type EtatSuivi = { suivi: boolean };

export function useSuiviEmployeur(id: string, actif: boolean) {
  const client = useQueryClient();
  const { toast } = useToast();
  const cle = ["/api/employeurs", id, "suivi"];
  const etat = useQuery<EtatSuivi>({
    queryKey: cle,
    queryFn: async () => (await apiRequest("GET", `/api/employeurs/${id}/suivi`)).json(),
    enabled: actif,
    retry: false,
  });
  const basculer = useMutation({
    mutationFn: async (suivre: boolean): Promise<EtatSuivi> =>
      (await apiRequest(suivre ? "POST" : "DELETE", `/api/employeurs/${id}/suivi`)).json(),
    onSuccess: (reponse) => client.setQueryData(cle, reponse),
    onError: () => toast({ title: "Le suivi n'a pas pu être enregistré", description: "Réessayez dans un instant.", variant: "destructive" }),
  });
  return {
    suivi: etat.data?.suivi ?? false,
    enCours: basculer.isPending,
    basculer: () => basculer.mutate(!(etat.data?.suivi ?? false)),
  };
}

