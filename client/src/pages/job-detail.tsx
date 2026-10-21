import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { sanitizeJobDescriptionHtml } from "@/lib/sanitize-html";
import { formatJobType } from "@/lib/job-type-labels";
import { useSavedJobs } from "@/hooks/use-saved-jobs";
import { ShareJobMenu } from "@/components/share-job-menu";
import {
  ArrowLeft,
  MapPin,
  Briefcase,
  Clock,
  Building2,
  DollarSign,
  Heart,
  CheckCircle,
  Users,
  GraduationCap,
  Languages,
  Calendar,
  CalendarClock,
  House,
} from "lucide-react";
import type { JobPosting } from "@shared/schema";
import { formatJobSalary as formatSalaryDisplay } from "@/lib/format-job-salary";
import { libelleExperience } from "@/lib/offres";
import { educationLevelOptions } from "@/lib/options-offre";
import { usePageTitle } from "@/lib/page-title";

export default function JobDetailPage() {
  const [match, params] = useRoute("/jobs/:id");
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: job, isLoading, error } = useQuery<JobPosting & { organizationName: string | null }>({
    queryKey: ["/api/jobs", params?.id],
    enabled: !!params?.id,
  });
  usePageTitle(job?.title, "Offre d'emploi");
  const salaryDisplay = job ? formatSalaryDisplay(job) : null;
  // Champs enregistrés par le formulaire d'offre, affichés s'ils existent.
  const nettoyer = (l: string[] | null | undefined) => Array.from(new Set((l ?? []).map((v) => v.trim()).filter(Boolean)));
  const competencesRequises = nettoyer(job?.requiredSkills);
  const competencesAppreciees = nettoyer(job?.preferredSkills).filter((c) => !competencesRequises.includes(c));
  const langues = nettoyer(job?.languages);
  const experience = job ? libelleExperience(job.experienceMin, job.experienceMax) : null;
  const niveauEtudes = educationLevelOptions.find((o) => o.value === job?.educationLevel)?.label ?? null;
  const { savedJobIds, toggleSave, isPending: isSavePending } = useSavedJobs();
  const isSaved = !!job && savedJobIds.has(job.id);

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
                        {job.organizationName || "Entreprise partenaire"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleSave(job.id)}
                        disabled={isSavePending}
                        aria-pressed={isSaved}
                        aria-label={isSaved ? "Retirer des offres sauvegardées" : "Sauvegarder cette offre"}
                        data-testid="button-save"
                      >
                        <Heart className={`h-5 w-5 ${isSaved ? "fill-current text-destructive" : ""}`} />
                      </Button>
                      <ShareJobMenu
                        job={{ title: job.title, organizationName: job.organizationName }}
                        url={typeof window !== "undefined" ? window.location.href : `/jobs/${job.id}`}
                        testIdPrefix="share"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    <Badge variant="secondary" className="gap-1">
                      <MapPin className="h-3 w-3" />
                      {job.location}
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <Briefcase className="h-3 w-3" />
                      {formatJobType(job.jobType)}
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
              {/* job.description may contain HTML from the Tiptap-based
                  offer form — always sanitize before rendering, even though
                  the only source is an authenticated recruiter/admin. */}
              <div
                className="text-muted-foreground prose prose-sm max-w-none [&_p]:whitespace-pre-line"
                data-testid="text-description"
                dangerouslySetInnerHTML={{ __html: sanitizeJobDescriptionHtml(job.description) }}
              />
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

          {(competencesRequises.length > 0 || competencesAppreciees.length > 0) && (
            <Card data-testid="carte-competences">
              <CardHeader>
                <CardTitle>Compétences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {competencesRequises.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-medium">Requises</p>
                    <ul className="flex flex-wrap gap-2">
                      {competencesRequises.map((c) => <li key={c}><Badge>{c}</Badge></li>)}
                    </ul>
                  </div>
                )}
                {competencesAppreciees.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-medium">Appréciées</p>
                    <ul className="flex flex-wrap gap-2">
                      {competencesAppreciees.map((c) => <li key={c}><Badge variant="outline">{c}</Badge></li>)}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {langues.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Languages className="h-5 w-5" aria-hidden="true" />Langues</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-wrap gap-2">
                  {langues.map((l) => <li key={l}><Badge variant="secondary">{l}</Badge></li>)}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="sticky top-24">
            <CardContent className="p-6 space-y-4">
              {salaryDisplay && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Salaire</p>
                    <p className="font-semibold" data-testid="text-salary">{salaryDisplay}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type de contrat</p>
                  <p className="font-semibold">{formatJobType(job.jobType)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Localisation</p>
                  <p className="font-semibold">{job.location}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
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

              {job.startDate && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CalendarClock className="h-5 w-5 text-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date de début</p>
                    <p className="font-semibold" data-testid="text-start-date">
                      {new Date(job.startDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                </div>
              )}

              {experience && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-secondary" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Expérience</p>
                    <p className="font-semibold" data-testid="text-experience">{experience}</p>
                  </div>
                </div>
              )}

              {niveauEtudes && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                    <GraduationCap className="h-5 w-5 text-secondary" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Niveau d'études</p>
                    <p className="font-semibold">{niveauEtudes}</p>
                  </div>
                </div>
              )}

              {(job.positions ?? 1) > 1 && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Postes à pourvoir</p>
                    <p className="font-semibold">{job.positions}</p>
                  </div>
                </div>
              )}

              {job.isRemote && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <House className="h-5 w-5 text-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Télétravail</p>
                    <p className="font-semibold">Possible</p>
                  </div>
                </div>
              )}

              {job.applicationDeadline && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date limite de candidature</p>
                    <p className="font-semibold" data-testid="text-application-deadline">
                      {new Date(job.applicationDeadline).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              )}

              {job.acceptsPlatformApplications !== false ? (
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
              ) : (
                <div className="pt-4 border-t">
                  <p className="text-sm text-center text-muted-foreground" data-testid="text-no-platform-applications">
                    Cette offre n'accepte pas de candidature directe sur BaaraMatch.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
