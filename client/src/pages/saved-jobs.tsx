import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { JobCard } from "@/components/job-card";
import { ArrowRight, Bookmark, Eye, Loader2, Search, Trash2 } from "lucide-react";
import type { JobPosting, SavedJob } from "@shared/schema";

function formatDate(date: Date | string | null) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("fr-FR");
}

export default function SavedJobsPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: savedJobs = [], isLoading: savedLoading } = useQuery<
    (SavedJob & { job: (JobPosting & { organizationName: string | null }) | undefined })[]
  >({
    queryKey: ["/api/saved-jobs"],
    enabled: !!user && user.userType === "candidate",
  });

  const unsaveMutation = useMutation({
    mutationFn: async (jobId: string) => {
      await apiRequest("DELETE", `/api/saved-jobs/${jobId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-jobs"] });
      toast({ title: "Offre retirée", description: "L'offre a été retirée de vos favoris." });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message || "Impossible de retirer cette offre.", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
    if (!isLoading && user && user.userType !== "candidate") {
      setLocation("/");
    }
  }, [isLoading, setLocation, user]);

  if (isLoading || savedLoading) {
    return (
      <div className="min-h-screen bg-background p-4 pb-24 space-y-4">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (!user || user.userType !== "candidate") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 pb-24">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <div className="mb-2">
          <Link href="/espace-personnel">
            <Button variant="ghost" className="gap-2 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-900 transition-colors">
              <ArrowRight className="h-4 w-4 rotate-180" />
              Retour au Dashboard
            </Button>
          </Link>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white/80 rounded-2xl shadow-lg p-6 border border-indigo-100">
          <div>
            <h1 className="text-3xl font-extrabold text-indigo-700 mb-1" data-testid="text-saved-jobs-title">
              <span className="inline-block align-middle mr-2"><Bookmark className="inline h-8 w-8 text-indigo-400" /></span>
              Offres sauvegardées
            </h1>
            <p className="text-indigo-400 font-medium">{savedJobs.length} offre{savedJobs.length > 1 ? "s" : ""} sauvegardée{savedJobs.length > 1 ? "s" : ""}</p>
          </div>
          <Link href="/jobs">
            <Button className="gap-2 bg-gradient-to-r from-indigo-500 to-blue-400 text-white shadow-md hover:scale-105 transition-transform duration-200" data-testid="button-find-jobs">
              <Search className="h-5 w-5" />
              Rechercher des offres
            </Button>
          </Link>
        </div>

        {savedJobs.length === 0 ? (
          <Card className="rounded-2xl shadow-lg border-0 bg-white/90">
            <CardContent className="py-16 text-center text-indigo-300">
              <Bookmark className="h-12 w-12 mx-auto mb-3 opacity-60" />
              <p className="font-medium text-indigo-500">Aucune offre sauvegardée pour l'instant.</p>
              <p className="text-sm mt-1">Cliquez sur le cœur d'une offre pour la retrouver ici.</p>
              <Link href="/jobs">
                <Button className="mt-4 bg-gradient-to-r from-indigo-500 to-blue-400 text-white shadow-md hover:scale-105 transition-transform duration-200" variant="outline">
                  Découvrir les offres
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {savedJobs.map(({ id, job, jobId, createdAt }) => (
              <div key={id} data-testid={`saved-job-row-${jobId}`}>
                {job ? (
                  <div className="relative">
                    <Link href={`/jobs/${job.id}`}>
                      <JobCard
                        job={{
                          title: job.title,
                          organizationName: job.organizationName ?? "Entreprise partenaire",
                          location: job.location,
                          jobType: job.jobType,
                          skills: job.requiredSkills ?? [],
                        }}
                      />
                    </Link>
                    <div className="flex items-center justify-between mt-2 px-1">
                      <span className="text-xs text-indigo-400">Sauvegardée le {formatDate(createdAt)}</span>
                      <div className="flex gap-2">
                        <Link href={`/jobs/${job.id}`}>
                          <Button variant="ghost" size="sm" className="gap-1 text-indigo-600" data-testid={`button-view-saved-job-${jobId}`}>
                            <Eye className="h-4 w-4" />
                            Voir l'offre
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-destructive"
                          onClick={() => unsaveMutation.mutate(jobId)}
                          disabled={unsaveMutation.isPending && unsaveMutation.variables === jobId}
                          data-testid={`button-remove-saved-job-${jobId}`}
                        >
                          {unsaveMutation.isPending && unsaveMutation.variables === jobId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          Retirer
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <p className="text-sm text-muted-foreground">Cette offre n'est plus disponible.</p>
                      <Button variant="ghost" size="sm" className="gap-1 text-destructive" onClick={() => unsaveMutation.mutate(jobId)}>
                        <Trash2 className="h-4 w-4" />
                        Retirer
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="block md:hidden">
          <MobileBottomNav userType="candidate" />
        </div>
      </div>
    </div>
  );
}
