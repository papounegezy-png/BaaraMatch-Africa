import { useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { formatJobType } from "@/lib/job-type-labels";
import { stripJobDescriptionHtml } from "@/lib/sanitize-html";
import {
  MapPin,
  Briefcase,
  ArrowLeft,
  Clock,
  DollarSign,
  Building2,
  Calendar,
  Users,
  CheckCircle2,
} from "lucide-react";

interface CompanyWithProfile {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  city: string | null;
  country: string | null;
  isVerified: boolean;
  profile: {
    companyName: string | null;
    logoUrl: string | null;
    industry: string | null;
  } | null;
}

interface JobPosting {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  jobType: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  experienceLevel: string | null;
  isActive: boolean;
  createdAt: string;
  agencyId: string | null;
  companyId: string;
}

export default function CompanyJobsPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const { data: companies, isLoading: loadingCompanies } = useQuery<CompanyWithProfile[]>({
    queryKey: ["/api/companies"],
  });

  const { data: allJobs, isLoading: loadingJobs } = useQuery<JobPosting[]>({
    queryKey: ["/api/jobs"],
  });

  const company = companies?.find((item) => item.id === id);
  const companyJobs = allJobs?.filter((job) => job.companyId === id && job.isActive) || [];
  const companyImageUrl = company?.profile?.logoUrl || company?.avatarUrl || undefined;
  const hasCompanyLogo = Boolean(company?.profile?.logoUrl);

  const isLoading = loadingCompanies || loadingJobs;

  useEffect(() => {
    if (!id) return;
    setLocation(`/jobs?companyId=${encodeURIComponent(id)}`);
  }, [id, setLocation]);

  if (id) {
    return null;
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatSalary = (min: number | null, max: number | null, currency: string | null) => {
    if (!min && !max) return null;
    const curr = currency || "XOF";
    if (min && max) {
      return `${min.toLocaleString()} - ${max.toLocaleString()} ${curr}`;
    }
    if (min) return `À partir de ${min.toLocaleString()} ${curr}`;
    if (max) return `Jusqu'à ${max.toLocaleString()} ${curr}`;
    return null;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaine${Math.floor(diffDays / 7) > 1 ? "s" : ""}`;
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-40 mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-64 mb-2" />
                  <Skeleton className="h-4 w-48 mb-4" />
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Link href="/agencies">
            <Button variant="ghost" className="mb-6 gap-2" data-testid="button-back-employers">
              <ArrowLeft className="h-4 w-4" />
              Retour aux employeurs
            </Button>
          </Link>
          <Card>
            <CardContent className="p-12 text-center">
              <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Entreprise non trouvée</h2>
              <p className="text-muted-foreground mb-6">
                Cette entreprise n'existe pas ou a été supprimée.
              </p>
              <Link href="/agencies">
                <Button data-testid="button-browse-employers">Voir tous les employeurs</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const location = [company.city, company.country].filter(Boolean).join(", ");

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b py-8">
        <div className="container mx-auto px-4">
          <Link href="/agencies">
            <Button variant="ghost" className="mb-4 gap-2" data-testid="button-back-employers">
              <ArrowLeft className="h-4 w-4" />
              Retour aux employeurs
            </Button>
          </Link>

          <div className="flex flex-col md:flex-row items-center md:items-start gap-4">
            <div className="relative">
              <Avatar className={`h-16 w-16 ${hasCompanyLogo ? "bg-muted/40 ring-1 ring-border/50" : ""}`}>
                <AvatarImage src={companyImageUrl} className="object-contain p-1" />
                <AvatarFallback className="text-lg bg-secondary text-secondary-foreground">
                  {getInitials(company.profile?.companyName || company.fullName)}
                </AvatarFallback>
              </Avatar>
              {company.isVerified && (
                <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-background">
                  <CheckCircle2 className="h-5 w-5 text-accent" />
                </div>
              )}
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-2xl font-bold" data-testid="text-company-name">
                Offres de {company.profile?.companyName || company.fullName}
              </h1>
              {location && (
                <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-1 mt-1">
                  <MapPin className="h-4 w-4" />
                  {location}
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                {companyJobs.length} offre{companyJobs.length > 1 ? "s" : ""} d'emploi active{companyJobs.length > 1 ? "s" : ""}
              </p>
            </div>
            <div className="md:ml-auto">
              <Link href={`/companies/${id}`}>
                <Button variant="outline" className="gap-2" data-testid="button-view-company-profile">
                  <Building2 className="h-4 w-4" />
                  Voir le profil
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {companyJobs.length > 0 ? (
          <div className="space-y-4">
            {companyJobs.map((job) => (
              <Card key={job.id} className="hover-elevate" data-testid={`card-company-job-${job.id}`}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    <div className="flex-1 space-y-3">
                      <div>
                        <h3 className="text-lg font-semibold" data-testid={`text-job-title-${job.id}`}>
                          {job.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
                          {job.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {job.location}
                            </span>
                          )}
                          {formatJobType(job.jobType) && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatJobType(job.jobType)}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(job.createdAt)}
                          </span>
                        </div>
                      </div>

                      {job.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {stripJobDescriptionHtml(job.description)}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {job.experienceLevel && (
                          <Badge variant="outline">
                            <Users className="h-3 w-3 mr-1" />
                            {job.experienceLevel}
                          </Badge>
                        )}
                        {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency) && (
                          <Badge variant="secondary" className="text-accent">
                            <DollarSign className="h-3 w-3 mr-1" />
                            {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 md:flex-col">
                      <Link href={`/jobs/${job.id}`} className="flex-1 md:flex-none">
                        <Button className="w-full" data-testid={`button-view-job-${job.id}`}>
                          Voir l'offre
                        </Button>
                      </Link>
                      <Link href={`/jobs/${job.id}/apply`} className="flex-1 md:flex-none">
                        <Button variant="outline" className="w-full" data-testid={`button-apply-job-${job.id}`}>
                          Postuler
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Briefcase className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Aucune offre active</h2>
              <p className="text-muted-foreground mb-6">
                Cet employeur n'a pas encore publié d'offres d'emploi actives.
              </p>
              <Link href="/agencies">
                <Button data-testid="button-browse-other-employers">Parcourir d'autres employeurs</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
