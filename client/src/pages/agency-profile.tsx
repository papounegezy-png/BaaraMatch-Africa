import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MapPin,
  Briefcase,
  Users,
  Globe,
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  Building2,
  Play,
  ImageIcon,
  FileText,
  Bell,
  Star,
  Share2,
} from "lucide-react";

interface AgencyWithProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  city: string | null;
  country: string | null;
  isVerified: boolean;
  profile: {
    agencyName: string | null;
    description: string | null;
    website: string | null;
    specializations: string[] | null;
    candidatesPlaced: number | null;
    verificationStatus: string | null;
    foundedYear: number | null;
    employeeCount: number | null;
    averageAge: number | null;
    genderRatioMale: number | null;
  } | null;
}

interface JobPosting {
  id: string;
  agencyId: string | null;
  isActive: boolean;
}

export default function AgencyProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("about");

  const { data: agencies, isLoading } = useQuery<AgencyWithProfile[]>({
    queryKey: ["/api/agencies"],
  });

  const { data: allJobs } = useQuery<JobPosting[]>({
    queryKey: ["/api/jobs"],
  });

  const agency = agencies?.find((a) => a.id === id);
  const jobCount = allJobs?.filter((job) => job.agencyId === id && job.isActive).length || 0;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getEmployeeRange = (count: number | null | undefined) => {
    if (!count) return "1 - 50";
    if (count <= 10) return "1 - 10";
    if (count <= 50) return "1 - 50";
    if (count <= 100) return "50 - 100";
    if (count <= 250) return "100 - 250";
    return "250+";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="w-full lg:w-80">
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col items-center">
                    <Skeleton className="h-28 w-28 rounded-full mb-4" />
                    <Skeleton className="h-6 w-40 mb-4" />
                    <div className="flex gap-2 mb-4">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-24" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 w-full">
                      <Skeleton className="h-20" />
                      <Skeleton className="h-20" />
                      <Skeleton className="h-20" />
                      <Skeleton className="h-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="flex-1">
              <Skeleton className="h-12 w-64 mb-6" />
              <Skeleton className="h-64 w-full mb-6" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!agency) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Link href="/agencies">
            <Button variant="ghost" className="mb-6 gap-2" data-testid="button-back-agencies">
              <ArrowLeft className="h-4 w-4" />
              Retour aux agences
            </Button>
          </Link>
          <Card>
            <CardContent className="p-12 text-center">
              <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Agence non trouvée</h2>
              <p className="text-muted-foreground mb-6">
                Cette agence n'existe pas ou a été supprimée.
              </p>
              <Link href="/agencies">
                <Button data-testid="button-browse-agencies">Voir toutes les agences</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const location = [agency.city, agency.country].filter(Boolean).join(", ");
  const agencyName = agency.profile?.agencyName || agency.fullName;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Link href="/agencies">
          <Button variant="ghost" className="mb-6 gap-2" data-testid="button-back-agencies">
            <ArrowLeft className="h-4 w-4" />
            Retour aux agences
          </Button>
        </Link>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-80 flex-shrink-0">
            <Card className="sticky top-4">
              <CardContent className="p-6">
                <div className="flex flex-col items-center">
                  <div className="relative mb-4">
                    <div className="p-4 rounded-full bg-blue-50 dark:bg-blue-950/30">
                      <Avatar className="h-24 w-24 border-4 border-background">
                        <AvatarImage src={agency.avatarUrl || undefined} />
                        <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                          {getInitials(agencyName)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>

                  <h1 className="text-xl font-bold text-center mb-3" data-testid="text-agency-name">
                    {agencyName}
                  </h1>

                  {agency.profile?.specializations && agency.profile.specializations.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2 mb-4">
                      {agency.profile.specializations.slice(0, 3).map((spec) => (
                        <Badge 
                          key={spec} 
                          variant="secondary"
                          className="bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 hover:bg-blue-100 border-0"
                        >
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground mb-6">
                    Entre {getEmployeeRange(agency.profile?.employeeCount || agency.profile?.candidatesPlaced)} collaborateurs
                  </p>

                  <div className="grid grid-cols-2 gap-3 w-full">
                    <div className="bg-muted/50 rounded-lg p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Année de création</p>
                      <p className="text-lg font-bold text-foreground" data-testid="stat-founded-year">
                        {agency.profile?.foundedYear || "N/A"}
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Collaborateurs</p>
                      <p className="text-lg font-bold text-foreground" data-testid="stat-employee-count">
                        {agency.profile?.employeeCount || "N/A"}
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Age moyen</p>
                      <p className="text-lg font-bold text-foreground" data-testid="stat-average-age">
                        {agency.profile?.averageAge ? `${agency.profile.averageAge} ans` : "N/A"}
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Parité</p>
                      <p className="text-lg font-bold text-foreground" data-testid="stat-gender-ratio">
                        {agency.profile?.genderRatioMale != null ? (
                          <>
                            <span className="text-blue-600">♂ {agency.profile.genderRatioMale}%</span>{" "}
                            <span className="text-pink-600">♀ {100 - agency.profile.genderRatioMale}%</span>
                          </>
                        ) : "N/A"}
                      </p>
                    </div>
                  </div>

                  {location && (
                    <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {location}
                    </div>
                  )}

                  <div className="flex flex-col gap-2 w-full mt-6">
                    {agency.phone && (
                      <Button variant="outline" className="w-full gap-2" asChild>
                        <a href={`tel:${agency.phone}`}>
                          <Phone className="h-4 w-4" />
                          Appeler
                        </a>
                      </Button>
                    )}
                    <Button variant="outline" className="w-full gap-2" asChild>
                      <a href={`mailto:${agency.email}`}>
                        <Mail className="h-4 w-4" />
                        Contacter
                      </a>
                    </Button>
                    {agency.profile?.website && (
                      <Button variant="outline" className="w-full gap-2" asChild>
                        <a href={agency.profile.website} target="_blank" rel="noopener noreferrer">
                          <Globe className="h-4 w-4" />
                          Site web
                        </a>
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 w-full mt-4 pt-4 border-t">
                    <Button 
                      variant="default" 
                      className="w-full gap-2"
                      data-testid="button-follow-agency"
                    >
                      <Bell className="h-4 w-4" />
                      Suivre
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full gap-2"
                      data-testid="button-write-review"
                    >
                      <Star className="h-4 w-4" />
                      Écrire un avis
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full gap-2"
                      data-testid="button-link-social"
                    >
                      <Share2 className="h-4 w-4" />
                      Réseaux sociaux
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex-1">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="mb-6 bg-transparent border-b w-full justify-start rounded-none h-auto p-0">
                <TabsTrigger 
                  value="about" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none pb-3 px-6"
                  data-testid="tab-about"
                >
                  A propos
                </TabsTrigger>
                <TabsTrigger 
                  value="jobs" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none pb-3 px-6 gap-2"
                  data-testid="tab-jobs"
                >
                  Emplois
                  <Badge 
                    variant="secondary" 
                    className="bg-primary text-primary-foreground ml-1 h-5 min-w-5 px-1.5"
                  >
                    {jobCount}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger 
                  value="media" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none pb-3 px-6"
                  data-testid="tab-media"
                >
                  Médias
                </TabsTrigger>
              </TabsList>

              <TabsContent value="about" className="mt-0">
                <div className="relative rounded-xl overflow-hidden mb-8 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-950/30 dark:to-blue-900/20">
                  <div className="aspect-video flex items-center justify-center">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white dark:bg-background shadow-lg mb-4 cursor-pointer hover:scale-105 transition-transform">
                        <Play className="h-6 w-6 text-primary ml-1" />
                      </div>
                      <p className="text-foreground font-medium">
                        Rencontrez l'équipe {agencyName}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold text-primary mb-4">Présentation</h2>
                    <p className="text-muted-foreground leading-relaxed" data-testid="text-agency-description">
                      {agency.profile?.description || 
                        `${agencyName} est une agence de recrutement leader dans son domaine en Afrique de l'Ouest. 
                        Nous accompagnons les entreprises dans leur recherche de talents et aidons les candidats 
                        à trouver les meilleures opportunités professionnelles.`}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Nos services</h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <Users className="h-5 w-5 text-primary" />
                        <span>Recrutement de talents</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <Briefcase className="h-5 w-5 text-primary" />
                        <span>Placement temporaire</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <FileText className="h-5 w-5 text-primary" />
                        <span>Gestion des contrats</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <Calendar className="h-5 w-5 text-primary" />
                        <span>Suivi des missions</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="jobs" className="mt-0">
                <div className="text-center py-12">
                  <Briefcase className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">
                    {jobCount > 0 ? `${jobCount} offre(s) disponible(s)` : "Aucune offre disponible"}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {jobCount > 0 
                      ? "Consultez les offres d'emploi de cette agence"
                      : "Cette agence n'a pas d'offres actives actuellement"}
                  </p>
                  <Link href={`/agencies/${id}/jobs`}>
                    <Button className="gap-2" data-testid="button-view-agency-jobs">
                      <Briefcase className="h-4 w-4" />
                      Voir toutes les offres
                    </Button>
                  </Link>
                </div>
              </TabsContent>

              <TabsContent value="media" className="mt-0">
                <div className="text-center py-12">
                  <ImageIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Médias</h3>
                  <p className="text-muted-foreground">
                    Aucun média disponible pour le moment
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
