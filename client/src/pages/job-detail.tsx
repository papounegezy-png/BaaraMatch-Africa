import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  MapPin,
  Briefcase,
  Clock,
  Building2,
  DollarSign,
  Heart,
  Share2,
  CheckCircle,
  Users,
  GraduationCap,
  Languages,
  Calendar,
} from "lucide-react";
import type { JobPosting } from "@shared/schema";

export default function JobDetailPage() {
  const [match, params] = useRoute("/jobs/:id");
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: job, isLoading, error } = useQuery<JobPosting>({
    queryKey: ["/api/jobs", params?.id],
    enabled: !!params?.id,
  });

  const handleApply = async () => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour postuler à cette offre.",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiRequest("POST", "/api/applications", {
        jobId: params?.id,
      });
      toast({
        title: "Candidature envoyée",
        description: "Votre candidature a été envoyée avec succès.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center py-12">
          <Briefcase className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="font-medium text-lg">Offre introuvable</h3>
          <p className="text-muted-foreground text-sm mt-1">
            Cette offre n'existe plus ou a été retirée.
          </p>
          <Link href="/jobs">
            <Button className="mt-4" data-testid="button-back-to-jobs">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux offres
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href="/jobs">
        <Button variant="ghost" className="mb-6" data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux offres
        </Button>
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h1 className="text-2xl font-bold" data-testid="text-job-title">
                        {job.title}
                      </h1>
                      <p className="text-muted-foreground text-lg">
                        Entreprise partenaire
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" data-testid="button-save">
                        <Heart className="h-5 w-5" />
                      </Button>
                      <Button variant="ghost" size="icon" data-testid="button-share">
                        <Share2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    <Badge variant="secondary" className="gap-1">
                      <MapPin className="h-3 w-3" />
                      {job.location}
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <Briefcase className="h-3 w-3" />
                      {job.jobType}
                    </Badge>
                    {job.category && (
                      <Badge className="bg-primary/10 text-primary">
                        {job.category}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Description du poste</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-line" data-testid="text-description">
                {job.description}
              </p>
            </CardContent>
          </Card>

          {job.requirements && job.requirements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Exigences</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {job.requirements.map((req, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="sticky top-24">
            <CardContent className="p-6 space-y-4">
              {job.salaryRange && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Salaire</p>
                    <p className="font-semibold" data-testid="text-salary">{job.salaryRange}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type de contrat</p>
                  <p className="font-semibold">{job.jobType}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Localisation</p>
                  <p className="font-semibold">{job.location}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Publié</p>
                  <p className="font-semibold">
                    {job.createdAt ? new Date(job.createdAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }) : "Date non disponible"}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button 
                  className="w-full" 
                  size="lg" 
                  onClick={handleApply}
                  data-testid="button-apply"
                >
                  Postuler maintenant
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Candidature simple et rapide
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
