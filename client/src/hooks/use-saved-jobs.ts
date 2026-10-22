import { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

type SavedJobRow = { jobId: string };

// Backs the "Heart" save button on job-detail.tsx / offres.tsx — shared so
// every job card/detail view stays in sync on the same saved-state cache
// instead of each re-fetching and re-implementing the toggle.
export function useSavedJobs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isCandidate = user?.userType === "candidate";

  const savedQuery = useQuery<SavedJobRow[]>({
    queryKey: ["/api/saved-jobs"],
    enabled: isCandidate,
  });

  const savedJobIds = useMemo(
    () => new Set((savedQuery.data ?? []).map((row) => row.jobId)),
    [savedQuery.data],
  );

  // Mise à jour optimiste : le bouton change tout de suite ; en cas
  // d'erreur, la liste d'avant revient.
  const optimiste = async (modifier: (lignes: SavedJobRow[]) => SavedJobRow[]) => {
    await queryClient.cancelQueries({ queryKey: ["/api/saved-jobs"] });
    const avant = queryClient.getQueryData<SavedJobRow[]>(["/api/saved-jobs"]);
    queryClient.setQueryData<SavedJobRow[]>(["/api/saved-jobs"], modifier(avant ?? []));
    return { avant };
  };
  const revenir = (contexte?: { avant?: SavedJobRow[] }) => {
    if (contexte) queryClient.setQueryData(["/api/saved-jobs"], contexte.avant);
  };

  const saveMutation = useMutation({
    mutationFn: async (jobId: string) => {
      await apiRequest("POST", "/api/saved-jobs", { jobId });
    },
    onMutate: (jobId) => optimiste((lignes) => [...lignes, { jobId }]),
    onError: (error: Error, _jobId, contexte) => {
      revenir(contexte);
      toast({ title: "Erreur", description: error.message || "Impossible de sauvegarder l'offre.", variant: "destructive" });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["/api/saved-jobs"] }),
  });

  const unsaveMutation = useMutation({
    mutationFn: async (jobId: string) => {
      await apiRequest("DELETE", `/api/saved-jobs/${jobId}`);
    },
    onMutate: (jobId) => optimiste((lignes) => lignes.filter((l) => l.jobId !== jobId)),
    onError: (error: Error, _jobId, contexte) => {
      revenir(contexte);
      toast({ title: "Erreur", description: error.message || "Impossible de retirer l'offre.", variant: "destructive" });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["/api/saved-jobs"] }),
  });

  // surSucces(enregistree) : appelé une fois le serveur d'accord.
  const toggleSave = (jobId: string, surSucces?: (enregistree: boolean) => void) => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Connectez-vous pour sauvegarder des offres.",
        variant: "destructive",
      });
      return;
    }
    if (!isCandidate) {
      toast({
        title: "Réservé aux candidats",
        description: "Seuls les comptes candidat peuvent sauvegarder des offres.",
        variant: "destructive",
      });
      return;
    }
    if (savedJobIds.has(jobId)) {
      unsaveMutation.mutate(jobId, { onSuccess: () => surSucces?.(false) });
    } else {
      saveMutation.mutate(jobId, { onSuccess: () => surSucces?.(true) });
    }
  };

  return {
    savedJobIds,
    toggleSave,
    isPending: saveMutation.isPending || unsaveMutation.isPending,
  };
}
