import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Eye,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowLeft,
  TrendingUp,
  Calendar,
  MapPin,
  Building2,
  Briefcase,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import type { JobPosting, Application } from "@shared/schema";

const statusConfig = {
  pending: { label: "En attente", icon: Clock, className: "bg-primary/10 text-primary" },
  reviewing: { label: "En examen", icon: Eye, className: "bg-primary/10 text-primary" },
  shortlisted: { label: "Présélectionné", icon: CheckCircle2, className: "bg-secondary/10 text-secondary" },
  interview: { label: "Entretien", icon: Users, className: "bg-accent/10 text-accent" },
  offered: { label: "Offre reçue", icon: CheckCircle2, className: "bg-accent/10 text-accent" },
  hired: { label: "Embauché", icon: CheckCircle2, className: "bg-accent/10 text-accent" },
  rejected: { label: "Refusé", icon: XCircle, className: "bg-destructive/10 text-destructive" },
  withdrawn: { label: "Retiré", icon: XCircle, className: "bg-muted text-muted-foreground" },
};

function formatDate(date: Date | string | null): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatRelativeDate(date: Date | string | null): string {
  if (!date) return "";
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaine${Math.floor(diffDays / 7) > 1 ? 's' : ''}`;
  return `Il y a ${Math.floor(diffDays / 30)} mois`;
}

export default function StatisticsPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const tabFromUrl = urlParams.get("tab") || "candidatures";
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  
  useEffect(() => {
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const { data: jobs = [] } = useQuery<JobPosting[]>({
    queryKey: ["/api/jobs"],
  });

  const { data: applications = [] } = useQuery<Application[]>({
    queryKey: ["/api/applications"],
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="p-4 space-y-4">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  const candidatures = applications;
  const interviews = applications.filter(a => a.status === "interview");
  const accepted = applications.filter(a => a.status === "hired" || a.status === "offered");
  const pending = applications.filter(a => a.status === "pending" || a.status === "reviewing");

  const stats = [
    { 
      key: "candidatures",
      label: "Candidatures", 
      value: candidatures.length, 
      icon: FileText, 
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    { 
      key: "offres",
      label: "Offres vues", 
      value: jobs.length, 
      icon: Eye, 
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    { 
      key: "entretiens",
      label: "Entretiens", 
      value: interviews.length, 
      icon: Users, 
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    { 
      key: "acceptes",
      label: "Acceptés", 
      value: accepted.length, 
      icon: CheckCircle2, 
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
  ];

  const successRate = candidatures.length > 0 
    ? Math.round((accepted.length / candidatures.length) * 100) 
    : 0;

  const interviewRate = candidatures.length > 0 
    ? Math.round((interviews.length / candidatures.length) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="gradient-gold p-4 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/espace-personnel">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white" data-testid="text-page-title">
              Statistiques
            </h1>
            <p className="text-sm text-white/70">Suivi de vos candidatures</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <Card 
              key={stat.key} 
              className={`cursor-pointer transition-all ${activeTab === stat.key ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setActiveTab(stat.key)}
              data-testid={`stat-card-${stat.key}`}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xl font-bold" data-testid={`stat-value-${stat.key}`}>
                      {stat.value}
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="px-4 -mt-2 space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Taux de réussite
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Taux d'acceptation</span>
                <span className="font-medium">{successRate}%</span>
              </div>
              <Progress value={successRate} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Taux d'entretien</span>
                <span className="font-medium">{interviewRate}%</span>
              </div>
              <Progress value={interviewRate} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="candidatures" className="text-xs" data-testid="tab-candidatures">
              Candidatures
            </TabsTrigger>
            <TabsTrigger value="offres" className="text-xs" data-testid="tab-offres">
              Offres
            </TabsTrigger>
            <TabsTrigger value="entretiens" className="text-xs" data-testid="tab-entretiens">
              Entretiens
            </TabsTrigger>
            <TabsTrigger value="acceptes" className="text-xs" data-testid="tab-acceptes">
              Acceptés
            </TabsTrigger>
          </TabsList>

          <TabsContent value="candidatures" className="mt-4 space-y-3">
            {candidatures.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Aucune candidature pour le moment</p>
                  <Link href="/jobs">
                    <Button className="mt-4" data-testid="button-browse-jobs">
                      Parcourir les offres
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              candidatures.map((app) => {
                const status = statusConfig[app.status as keyof typeof statusConfig] || statusConfig.pending;
                const job = jobs.find(j => j.id === app.jobId);
                return (
                  <Card key={app.id} data-testid={`application-card-${app.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{job?.title || "Offre d'emploi"}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Building2 className="h-3 w-3" />
                            <span>Entreprise</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>{job?.location || "Localisation"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{formatRelativeDate(app.createdAt)}</span>
                          </div>
                        </div>
                        <Badge className={status.className}>
                          <status.icon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="offres" className="mt-4 space-y-3">
            {jobs.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Aucune offre disponible</p>
                </CardContent>
              </Card>
            ) : (
              jobs.slice(0, 10).map((job) => (
                <Card key={job.id} data-testid={`job-card-${job.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{job.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Building2 className="h-3 w-3" />
                          <span>Entreprise</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span>{job.location}</span>
                        </div>
                        {job.salaryMin && job.salaryMax && (
                          <p className="text-sm text-accent font-medium mt-1">
                            {job.salaryMin.toLocaleString()} - {job.salaryMax.toLocaleString()} FCFA
                          </p>
                        )}
                      </div>
                      <Link href={`/jobs/${job.id}`}>
                        <Button size="sm" variant="outline" data-testid={`button-view-job-${job.id}`}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="entretiens" className="mt-4 space-y-3">
            {interviews.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Aucun entretien planifié</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Continuez à postuler pour décrocher des entretiens
                  </p>
                </CardContent>
              </Card>
            ) : (
              interviews.map((app) => {
                const job = jobs.find(j => j.id === app.jobId);
                return (
                  <Card key={app.id} className="bg-accent/5" data-testid={`interview-card-${app.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{job?.title || "Offre d'emploi"}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Building2 className="h-3 w-3" />
                            <span>Entreprise</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>{job?.location || "Localisation"}</span>
                          </div>
                          {app.interviewDate && (
                            <div className="flex items-center gap-2 text-sm text-accent font-medium mt-2">
                              <Calendar className="h-3 w-3" />
                              <span>Entretien: {formatDate(app.interviewDate)}</span>
                            </div>
                          )}
                        </div>
                        <Badge className="bg-accent/10 text-accent">
                          <Users className="h-3 w-3 mr-1" />
                          Entretien
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="acceptes" className="mt-4 space-y-3">
            {accepted.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Aucune offre acceptée</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Les offres reçues et embauches apparaîtront ici
                  </p>
                </CardContent>
              </Card>
            ) : (
              accepted.map((app) => {
                const status = statusConfig[app.status as keyof typeof statusConfig];
                const job = jobs.find(j => j.id === app.jobId);
                return (
                  <Card key={app.id} className="bg-accent/10" data-testid={`accepted-card-${app.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{job?.title || "Offre d'emploi"}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Building2 className="h-3 w-3" />
                            <span>Entreprise</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>{job?.location || "Localisation"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{formatRelativeDate(app.updatedAt)}</span>
                          </div>
                        </div>
                        <Badge className={status?.className || "bg-accent/10 text-accent"}>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {status?.label || "Accepté"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>

      <MobileBottomNav userType={user.userType} />
    </div>
  );
}
