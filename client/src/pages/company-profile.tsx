import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { formatJobType } from "@/lib/job-type-labels";
import { usePageTitle } from "@/lib/page-title";
import {
  ArrowLeft,
  BadgeCheck,
  BellPlus,
  Briefcase,
  Building2,
  ChevronRight,
  Globe,
  Mail,
  MapPin,
  MessageSquareOff,
  Phone,
  Star,
} from "lucide-react";

interface CompanyWithProfile {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  avatarUrl: string | null;
  city: string | null;
  country: string | null;
  isVerified: boolean;
  profile: {
    companyName: string | null;
    description: string | null;
    website: string | null;
    logoUrl: string | null;
    coverImageUrl: string | null;
    industry: string | null;
    employeeCount: number | null;
    foundedYear: number | null;
    rating: number | null;
  } | null;
}

interface JobPostingSummary {
  id: string;
  title: string;
  location: string;
  jobType: string | null;
  isActive: boolean;
  companyId: string;
  createdAt: string;
}

function formatRelativeDate(dateString: string) {
  const date = new Date(dateString);
  const diffDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Publiée aujourd'hui";
  if (diffDays === 1) return "Publiée il y a 1 jour";
  if (diffDays < 30) return `Publiée il y a ${diffDays} jours`;
  return `Publiée le ${date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`;
}

// integre : affichée dans ProfilEmployeur, qui fournit l'en-tête, le lien de
// retour et le conteneur (refonte du profil employeur, prompts 1 à 3).
export default function CompanyProfilePage({ integre = false }: { integre?: boolean } = {}) {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("overview");
  const { user } = useAuth();

  // Fire-and-forget — feeds the admin "Top organisations visitées"
  // statistic. Doesn't touch the existing data fetch below at all.
  useEffect(() => {
    if (!id) return;
    apiRequest("POST", `/api/companies/${id}/view`).catch(() => {});
  }, [id]);

  const { data: companies, isLoading } = useQuery<CompanyWithProfile[]>({
    queryKey: ["/api/companies"],
  });

  const { data: jobs = [] } = useQuery<JobPostingSummary[]>({
    queryKey: ["/api/jobs"],
  });

  const company = companies?.find((item) => item.id === id);
  const companyJobs = jobs.filter((job) => job.companyId === id && job.isActive);
  usePageTitle(company ? company.profile?.companyName || company.fullName : null, "Entreprise");

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className={integre ? "" : "min-h-screen bg-background"}>
        <div className={integre ? "space-y-4" : "container mx-auto px-4 py-8 space-y-4"}>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <div className="flex gap-5">
            <Skeleton className="h-64 flex-1" />
            <Skeleton className="h-64 w-56 hidden lg:block" />
          </div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className={integre ? "" : "min-h-screen bg-background"}>
        <div className={integre ? "" : "container mx-auto px-4 py-8"}>
          {!integre && (
          <Link href="/jobs">
            <Button variant="ghost" className="mb-6 gap-2" data-testid="button-back-jobs">
              <ArrowLeft className="h-4 w-4" />
              Retour aux offres
            </Button>
          </Link>
          )}
          <Card>
            <CardContent className="p-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Entreprise non trouvée</h2>
              <p className="text-muted-foreground">Cette entreprise n'existe pas ou n'est plus disponible.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const location = [company.city, company.country].filter(Boolean).join(", ");
  const displayName = company.profile?.companyName || company.fullName;
  const companyImageUrl = company.profile?.logoUrl || company.avatarUrl || undefined;
  const hasCompanyLogo = Boolean(company.profile?.logoUrl);
  const rating = company.profile?.rating;

  return (
    <div className={integre ? "" : "min-h-screen bg-background"}>
      <div className={integre ? "" : "container mx-auto px-4 py-8"}>
        {!integre && (
        <Link href="/jobs">
          <Button variant="ghost" className="mb-6 gap-2" data-testid="button-back-jobs">
            <ArrowLeft className="h-4 w-4" />
            Retour aux offres
          </Button>
        </Link>
        )}

        <div className="rounded-xl overflow-hidden border bg-card">
          {/* Remplacé par CarteProfilEmployeur dans ProfilEmployeur. */}
          {!integre && (<>
          {/* Bannière */}
          <div
            className="relative h-[130px] bg-primary-dark bg-cover bg-center overflow-hidden"
            style={company.profile?.coverImageUrl ? { backgroundImage: `url(${company.profile.coverImageUrl})` } : undefined}
          >
            {!company.profile?.coverImageUrl && (
              <>
                <div className="absolute w-64 h-64 rounded-full bg-[#16386F] -top-36 -right-10" />
                <div className="absolute w-36 h-36 rounded-full border-2 border-gold/35 -bottom-[70px] right-28" />
              </>
            )}
            {company.profile?.coverImageUrl && (
              <div className="absolute inset-0 bg-black/20" />
            )}
            {company.isVerified && (
              <div className="absolute top-3.5 right-4 flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5">
                <BadgeCheck className="h-3.5 w-3.5 text-white" />
                <span className="text-[11.5px] font-medium text-white">Vérifiée par BaaraMatch</span>
              </div>
            )}
          </div>

          {/* Identité */}
          <div className="px-6 pb-[18px] relative">
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div className="flex items-end gap-4">
                <div className="w-[76px] h-[76px] -mt-9 rounded-2xl bg-white border-[3px] border-white shadow-[0_0_0_0.5px_hsl(var(--border))] flex items-center justify-center flex-shrink-0">
                  {hasCompanyLogo ? (
                    <Avatar className="w-full h-full rounded-[11px]">
                      <AvatarImage src={companyImageUrl} className="object-contain p-1" />
                      <AvatarFallback className="rounded-[11px] bg-primary-dark text-gold text-xl font-medium">
                        {getInitials(displayName)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-full h-full rounded-[11px] bg-primary-dark flex items-center justify-center text-xl font-medium text-gold">
                      {getInitials(displayName)}
                    </div>
                  )}
                </div>
                <div className="pb-1">
                  <p className="text-xl font-medium text-foreground" data-testid="text-company-name">{displayName}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {[company.profile?.industry, location].filter(Boolean).join(" · ") || "Entreprise partenaire"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 pb-1 flex-shrink-0">
                <Button variant="outline" size="sm" className="gap-1.5" data-testid="button-follow-company">
                  <BellPlus className="h-3.5 w-3.5" />
                  Suivre
                </Button>
                {companyJobs.length > 0 ? (
                  <Link href={`/jobs?companyId=${id}&employerName=${encodeURIComponent(displayName)}`}>
                    <Button size="sm" className="bg-primary hover:bg-primary/90" data-testid="button-view-jobs">
                      Voir les {companyJobs.length} offre{companyJobs.length > 1 ? "s" : ""}
                    </Button>
                  </Link>
                ) : (
                  <Button size="sm" variant="secondary" disabled data-testid="button-no-jobs">
                    Aucune offre pour le moment
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-3.5">
              {company.isVerified && (
                <span className="bg-gold-light text-gold-dark text-[11.5px] font-medium px-2.5 py-1 rounded-full">
                  Entreprise vérifiée
                </span>
              )}
              {company.profile?.industry && (
                <span className="bg-muted text-foreground text-[11.5px] px-2.5 py-1 rounded-full">
                  {company.profile.industry}
                </span>
              )}
            </div>

            {!user && (
              <p className="text-xs text-muted-foreground mt-3.5">
                <Link href="/register" className="text-primary font-medium hover:underline">
                  Créez votre compte
                </Link>{" "}
                pour suivre {displayName} et postuler à ses offres.
              </p>
            )}
          </div>

          </>)}
          {/* Onglets */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-transparent border-t border-b w-full justify-start rounded-none h-auto p-0 px-6">
              <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none py-3 px-4 text-[13.5px]" data-testid="tab-overview">
                Aperçu
              </TabsTrigger>
              <TabsTrigger value="jobs" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none py-3 px-4 text-[13.5px] gap-1.5" data-testid="tab-jobs">
                Offres
                <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[11px]">{companyJobs.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="about" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none py-3 px-4 text-[13.5px]" data-testid="tab-about">
                À propos
              </TabsTrigger>
              <TabsTrigger value="reviews" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none py-3 px-4 text-[13.5px]" data-testid="tab-reviews">
                Avis
              </TabsTrigger>
            </TabsList>

            {/* Contenu */}
            <div className="flex flex-col lg:flex-row gap-5 p-6">
              <div className="flex-1 min-w-0">
                <TabsContent value="overview" className="mt-0 space-y-3.5">
                  <Card>
                    <CardContent className="p-[18px]">
                      <p className="text-sm font-medium mb-2">À propos</p>
                      <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-company-description">
                        {company.profile?.description || "Cette entreprise n'a pas encore ajouté de description."}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-[18px]">
                      <p className="text-sm font-medium mb-3">Offres actives</p>
                      {companyJobs.length > 0 ? (
                        <>
                          {companyJobs.slice(0, 3).map((job, index) => (
                            <Link key={job.id} href={`/jobs/${job.id}`}>
                              <div className={`flex items-center justify-between py-2.5 hover-elevate rounded-md px-1 -mx-1 ${index < Math.min(companyJobs.length, 3) - 1 ? "border-b" : ""}`} data-testid={`link-active-job-${job.id}`}>
                                <div>
                                  <p className="text-[13px] font-medium">{job.title}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {[formatJobType(job.jobType), job.location, formatRelativeDate(job.createdAt)].filter(Boolean).join(" · ")}
                                  </p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              </div>
                            </Link>
                          ))}
                          {companyJobs.length > 3 && (
                            <Link href={`/jobs?companyId=${id}&employerName=${encodeURIComponent(displayName)}`}>
                              <p className="text-[12.5px] text-primary font-medium mt-3.5 hover:underline">
                                Voir les {companyJobs.length} offres →
                              </p>
                            </Link>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">Aucune offre active pour le moment.</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="jobs" className="mt-0">
                  {companyJobs.length > 0 ? (
                    <div className="space-y-3">
                      {companyJobs.map((job) => (
                        <Card key={job.id} className="hover-elevate" data-testid={`card-job-${job.id}`}>
                          <CardContent className="p-4 flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-medium">{job.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {[formatJobType(job.jobType), job.location, formatRelativeDate(job.createdAt)].filter(Boolean).join(" · ")}
                              </p>
                            </div>
                            <Link href={`/jobs/${job.id}`}>
                              <Button size="sm" variant="outline" data-testid={`button-view-job-${job.id}`}>Voir l'offre</Button>
                            </Link>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Aucune offre disponible</h3>
                      <p className="text-muted-foreground">Cet employeur n'a pas d'offres actives actuellement.</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="about" className="mt-0 space-y-4">
                  <Card>
                    <CardContent className="p-[18px] space-y-4">
                      <div>
                        <p className="text-sm font-medium mb-2">Présentation</p>
                        <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-company-full-description">
                          {company.profile?.description || `${displayName} est une entreprise partenaire de BaaraMatch qui recrute des talents qualifiés et construit des équipes performantes.`}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2.5 pt-2 border-t text-sm">
                        {location && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4 flex-shrink-0" />
                            {location}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4 flex-shrink-0" />
                          <a href={`mailto:${company.email}`} className="hover:underline" data-testid="link-company-email">{company.email}</a>
                        </div>
                        {company.phone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-4 w-4 flex-shrink-0" />
                            <a href={`tel:${company.phone}`} className="hover:underline" data-testid="link-company-phone">{company.phone}</a>
                          </div>
                        )}
                        {company.profile?.website && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Globe className="h-4 w-4 flex-shrink-0" />
                            <a href={company.profile.website} target="_blank" rel="noopener noreferrer" className="hover:underline" data-testid="link-company-website">
                              {company.profile.website}
                            </a>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="reviews" className="mt-0">
                  <div className="text-center py-12">
                    <MessageSquareOff className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Aucun avis pour le moment</h3>
                    <p className="text-muted-foreground">Les avis candidats seront bientôt disponibles sur cette page.</p>
                  </div>
                </TabsContent>
              </div>

              {/* Chiffres clés */}
              <div className="w-full lg:w-[220px] flex-shrink-0 space-y-3.5">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-3">Chiffres clés</p>
                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <p className="text-[11px] text-muted-foreground">Année de création</p>
                        <p className="text-[15px] font-medium mt-0.5" data-testid="stat-company-founded-year">
                          {company.profile?.foundedYear || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">Secteur</p>
                        <p className="text-[15px] font-medium mt-0.5 truncate" data-testid="stat-company-industry">
                          {company.profile?.industry || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">Ville</p>
                        <p className="text-[15px] font-medium mt-0.5" data-testid="stat-company-city">
                          {company.city || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">Offres publiées</p>
                        <p className="text-[15px] font-medium mt-0.5" data-testid="stat-company-jobs-count">
                          {companyJobs.length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {rating != null && (
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1.5">Satisfaction candidats</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-medium">{rating.toFixed(1)}</span>
                        <Star className="h-3.5 w-3.5 fill-gold text-gold mb-0.5" />
                      </div>
                      <div className="h-[5px] bg-muted rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-accent" style={{ width: `${Math.min(rating / 5, 1) * 100}%` }} />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
