import { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

type SavedJobRow = { jobId: string };

// Backs the "Heart" save button on job-detail.tsx / jobs.tsx — shared so
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

  const saveMutation = useMutation({
    mutationFn: async (jobId: string) => {
      await apiRequest("POST", "/api/saved-jobs", { jobId });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/saved-jobs"] }),
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message || "Impossible de sauvegarder l'offre.", variant: "destructive" });
    },
  });

  const unsaveMutation = useMutation({
    mutationFn: async (jobId: string) => {
      await apiRequest("DELETE", `/api/saved-jobs/${jobId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/saved-jobs"] }),
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message || "Impossible de retirer l'offre.", variant: "destructive" });
    },
  });

  const toggleSave = (jobId: string) => {
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
      unsaveMutation.mutate(jobId);
    } else {
      saveMutation.mutate(jobId);
    }
  };

  return {
    savedJobIds,
    toggleSave,
    isPending: saveMutation.isPending || unsaveMutation.isPending,
  };
}
