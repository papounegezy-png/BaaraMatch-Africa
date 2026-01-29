import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Briefcase,
  Users,
  Building2,
  FileText,
  TrendingUp,
  Bell,
  Settings,
  Edit,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  ArrowRight,
  MapPin,
  Search,
  Mic,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { SwipableJobCards } from "@/components/swipable-job-cards";
import { AgencyAnalytics } from "@/components/agency-analytics";
import { MobileProfileEditor } from "@/components/mobile-profile-editor";
import type { User, UserType, JobPosting, Application, CandidateProfile } from "@shared/schema";

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

function calculateProfileCompletion(user: User, profile?: CandidateProfile): number {
  let score = 0;
  const total = 10;
  
  if (user.fullName) score++;
  if (user.phone) score++;
  if (user.city) score++;
  if (profile?.title) score++;
  if (profile?.bio) score++;
  if (profile?.experience) score++;
  if (profile?.education) score++;
  if (profile?.whatsappNumber) score++;
  if (profile?.skills && profile.skills.length > 0) score++;
  if (profile?.voiceCvUrl) score++;
  
  return Math.round((score / total) * 100);
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

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("home");

  const { data: jobs = [] } = useQuery<JobPosting[]>({
    queryKey: ["/api/jobs"],
  });

  const { data: applications = [] } = useQuery<Application[]>({
    queryKey: ["/api/applications"],
    enabled: !!user,
  });

  const { data: profile } = useQuery<CandidateProfile>({
    queryKey: ["/api/profile"],
    enabled: !!user && user.userType === "candidate",
  });

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
    // Redirect agency users to their dedicated dashboard
    if (!isLoading && user && user.userType === "agency") {
      setLocation("/agency/dashboard");
    }
    // Redirect company users to their dedicated dashboard
    if (!isLoading && user && user.userType === "company") {
      setLocation("/company/dashboard");
    }
  }, [user, isLoading, setLocation]);

  const candidateStats = [
    { 
      label: "Candidatures", 
      value: applications.length, 
      icon: FileText, 
      trend: applications.length > 0 ? `${applications.filter(a => a.status === "pending").length} en attente` : "Aucune" 
    },
    { 
      label: "Offres vues", 
      value: jobs.length, 
      icon: Eye, 
      trend: "Disponibles" 
    },
    { 
      label: "Entretiens", 
      value: applications.filter(a => a.status === "interview").length, 
      icon: Users, 
      trend: applications.filter(a => a.status === "interview").length > 0 ? "Planifiés" : "Aucun" 
    },
    { 
      label: "Acceptés", 
      value: applications.filter(a => a.status === "hired" || a.status === "offered").length, 
      icon: CheckCircle2, 
      trend: applications.filter(a => a.status === "hired").length > 0 ? "Félicitations!" : "-" 
    },
  ];

  const companyStats = [
    { label: "Offres", value: jobs.filter(j => j.isActive).length, icon: Briefcase, trend: "Actives" },
    { label: "Candidatures", value: applications.length, icon: FileText, trend: "Reçues" },
    { label: "Entretiens", value: applications.filter(a => a.status === "interview").length, icon: Users, trend: "Planifiés" },
    { label: "Pourvus", value: applications.filter(a => a.status === "hired").length, icon: CheckCircle2, trend: "Ce mois" },
  ];

  const agencyStats = [
    { label: "Candidats", value: 0, icon: Users, trend: "Actifs" },
    { label: "Placements", value: 0, icon: CheckCircle2, trend: "Ce mois" },
    { label: "Partenaires", value: 0, icon: Building2, trend: "Actifs" },
    { label: "Offres", value: jobs.length, icon: Briefcase, trend: "Disponibles" },
  ];

  const getStats = () => {
    switch (user?.userType) {
      case "candidate": return candidateStats;
      case "company": return companyStats;
      case "agency": return agencyStats;
      default: return candidateStats;
    }
  };

  const profileCompletion = user && profile ? calculateProfileCompletion(user, profile) : 
    (user ? calculateProfileCompletion(user) : 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="p-4 space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const stats = getStats();

  const handleJobLike = (jobId: string) => {
    console.log("Liked job:", jobId);
  };

  const handleJobSkip = (jobId: string) => {
    console.log("Skipped job:", jobId);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="lg:hidden">
        <MobileDashboard 
          user={user} 
          stats={stats} 
          jobs={jobs}
          applications={applications}
          profileCompletion={profileCompletion}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onJobLike={handleJobLike}
          onJobSkip={handleJobSkip}
        />
        <MobileBottomNav userType={user.userType} />
      </div>

      <div className="hidden lg:block">
        <DesktopDashboard 
          user={user} 
          stats={stats} 
          jobs={jobs}
          applications={applications}
          profileCompletion={profileCompletion}
        />
      </div>
    </div>
  );
}

interface StatItem {
  label: string;
  value: number;
  icon: typeof FileText;
  trend: string;
}

interface DashboardProps {
  user: User;
  stats: StatItem[];
  jobs: JobPosting[];
  applications: Application[];
  profileCompletion: number;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  onJobLike?: (jobId: string) => void;
  onJobSkip?: (jobId: string) => void;
}

function MobileDashboard({ user, stats, jobs, applications, profileCompletion, activeTab, setActiveTab, onJobLike, onJobSkip }: DashboardProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (user.userType === "agency") {
    return (
      <div className="p-4 pb-24">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold" data-testid="text-dashboard-title">Tableau de bord</h1>
            <p className="text-sm text-muted-foreground">Bienvenue, {user.fullName.split(" ")[0]}</p>
          </div>
          <Button variant="outline" size="icon" data-testid="button-notifications">
            <Bell className="h-4 w-4" />
          </Button>
        </div>
        <AgencyAnalytics />
      </div>
    );
  }

  return (
    <div className="pb-24">
      <div className="gradient-gold p-4 pb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 ring-2 ring-white/20">
              <AvatarImage src={user.avatarUrl || undefined} />
              <AvatarFallback className="bg-white/20 text-white">
                {getInitials(user.fullName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-white/80 text-sm">Bienvenue</p>
              <h1 className="text-white font-semibold" data-testid="text-user-name">
                {user.fullName.split(" ")[0]}
              </h1>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" data-testid="button-notifications">
            <Bell className="h-5 w-5" />
          </Button>
        </div>

        <Link href="/jobs">
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3 cursor-pointer hover:bg-white/20 transition-colors">
            <Search className="h-5 w-5 text-white/70" />
            <span className="text-white/70 text-sm">Rechercher un emploi...</span>
          </div>
        </Link>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat, index) => {
            const tabKeys = ["candidatures", "offres", "entretiens", "acceptes"];
            return (
              <Link key={stat.label} href={`/statistics?tab=${tabKeys[index]}`}>
                <Card className="overflow-hidden hover-elevate cursor-pointer" data-testid={`stat-card-${tabKeys[index]}`}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <stat.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xl font-bold" data-testid={`stat-${stat.label.toLowerCase()}`}>
                          {stat.value}
                        </p>
                        <p className="text-[10px] text-muted-foreground leading-tight">{stat.label}</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                      <TrendingUp className="h-2.5 w-2.5 text-accent" />
                      {stat.trend}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {user.userType === "candidate" && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold" data-testid="text-dashboard-title">Offres pour vous</h2>
              <Link href="/jobs">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  Voir tout <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>

            <SwipableJobCards 
              jobs={jobs} 
              onLike={onJobLike}
              onSkip={onJobSkip}
            />

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Candidatures récentes</CardTitle>
                  <Badge variant="secondary" className="text-xs">{applications.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {applications.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucune candidature pour le moment
                  </p>
                ) : (
                  applications.slice(0, 3).map((app) => {
                    const status = statusConfig[app.status as keyof typeof statusConfig] || statusConfig.pending;
                    const job = jobs.find(j => j.id === app.jobId);
                    return (
                      <div
                        key={app.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        data-testid={`application-${app.id}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{job?.title || "Offre d'emploi"}</p>
                          <p className="text-xs text-muted-foreground">
                            {job?.location || "Localisation inconnue"} • {formatRelativeDate(app.createdAt)}
                          </p>
                        </div>
                        <Badge className={`${status.className} shrink-0 ml-2`}>
                          <status.icon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-primary/10 to-accent/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-primary/20">
                    <Mic className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">CV Vocal</h3>
                    <p className="text-xs text-muted-foreground">
                      Enregistrez votre présentation audio
                    </p>
                  </div>
                  <Link href="/profile">
                    <Button size="sm" data-testid="button-record-cv">
                      Créer
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {user.userType === "company" && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Candidatures récentes</CardTitle>
                  <Link href="/applications">
                    <Button variant="ghost" size="sm" className="gap-1 text-xs">
                      Voir tout <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {applications.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucune candidature reçue
                  </p>
                ) : (
                  applications.slice(0, 4).map((app) => {
                    const status = statusConfig[app.status as keyof typeof statusConfig] || statusConfig.pending;
                    const job = jobs.find(j => j.id === app.jobId);
                    return (
                      <div
                        key={app.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        data-testid={`application-${app.id}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{job?.title || "Offre d'emploi"}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatRelativeDate(app.createdAt)}
                          </p>
                        </div>
                        <Badge className={`${status.className} shrink-0 ml-2`}>
                          <status.icon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Link href="/jobs/create">
              <Button className="w-full gap-2" data-testid="button-create-job">
                <Plus className="h-4 w-4" />
                Publier une nouvelle offre
              </Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function DesktopDashboard({ user, stats, jobs, applications, profileCompletion }: DashboardProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (user.userType === "agency") {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">Tableau de bord</h1>
            <p className="text-muted-foreground">Bienvenue, {user.fullName}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" data-testid="button-notifications">
              <Bell className="h-4 w-4" />
            </Button>
            <Link href="/jobs/create">
              <Button className="gap-2" data-testid="button-create-job">
                <Plus className="h-4 w-4" />
                Nouvelle offre
              </Button>
            </Link>
          </div>
        </div>
        <div className="max-w-4xl mx-auto">
          <AgencyAnalytics />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-80 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <Avatar className="h-20 w-20 mx-auto">
                  <AvatarImage src={user.avatarUrl || undefined} />
                  <AvatarFallback className="text-xl gradient-gold text-white">
                    {getInitials(user.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-semibold" data-testid="text-user-name">
                    {user.fullName}
                  </h2>
                  <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {user.city}, {user.country}
                  </p>
                  {user.isVerified && (
                    <Badge variant="secondary" className="mt-2">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Profil vérifié
                    </Badge>
                  )}
                </div>

                <div className="space-y-2 pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Profil complété</span>
                    <span className="font-medium">{profileCompletion}%</span>
                  </div>
                  <Progress value={profileCompletion} className="h-2" />
                </div>

                <div className="flex gap-2 pt-2">
                  <Link href="/profile" className="flex-1">
                    <Button variant="outline" className="w-full gap-2" size="sm" data-testid="button-edit-profile">
                      <Edit className="h-4 w-4" />
                      Modifier
                    </Button>
                  </Link>
                  <Link href="/profile/view" className="flex-1">
                    <Button variant="outline" className="w-full gap-2" size="sm" data-testid="button-view-profile">
                      <Eye className="h-4 w-4" />
                      Voir
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Actions rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {user.userType === "candidate" && (
                <>
                  <Link href="/jobs" className="block">
                    <Button variant="ghost" className="w-full justify-start gap-2" data-testid="button-quick-jobs">
                      <Briefcase className="h-4 w-4" />
                      Rechercher des offres
                    </Button>
                  </Link>
                  <Link href="/applications" className="block">
                    <Button variant="ghost" className="w-full justify-start gap-2" data-testid="button-quick-applications">
                      <FileText className="h-4 w-4" />
                      Mes candidatures
                    </Button>
                  </Link>
                </>
              )}
              {user.userType === "company" && (
                <>
                  <Link href="/jobs/create" className="block">
                    <Button variant="ghost" className="w-full justify-start gap-2" data-testid="button-quick-post-job">
                      <Plus className="h-4 w-4" />
                      Publier une offre
                    </Button>
                  </Link>
                  <Link href="/applications" className="block">
                    <Button variant="ghost" className="w-full justify-start gap-2" data-testid="button-quick-received">
                      <FileText className="h-4 w-4" />
                      Candidatures reçues
                    </Button>
                  </Link>
                </>
              )}
              <Link href="/settings" className="block">
                <Button variant="ghost" className="w-full justify-start gap-2" data-testid="button-quick-settings">
                  <Settings className="h-4 w-4" />
                  Paramètres
                </Button>
              </Link>
            </CardContent>
          </Card>
        </aside>

        <main className="flex-1 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">
                Tableau de bord
              </h1>
              <p className="text-muted-foreground">Bienvenue, {user.fullName.split(" ")[0]} !</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" data-testid="button-notifications">
                <Bell className="h-4 w-4" />
              </Button>
              {user.userType === "company" && (
                <Link href="/jobs/create">
                  <Button className="gap-2" data-testid="button-create-job">
                    <Plus className="h-4 w-4" />
                    Nouvelle offre
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <stat.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-accent" />
                    {stat.trend}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {user.userType === "candidate" && (
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">Offres recommandées</CardTitle>
                    <Link href="/jobs">
                      <Button variant="ghost" size="sm" className="gap-1">
                        Voir tout <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <SwipableJobCards jobs={jobs.slice(0, 5)} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">Candidatures récentes</CardTitle>
                    <Link href="/applications">
                      <Button variant="ghost" size="sm" className="gap-1">
                        Voir tout <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {applications.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Aucune candidature pour le moment
                      </p>
                    ) : (
                      applications.map((app) => {
                        const status = statusConfig[app.status as keyof typeof statusConfig] || statusConfig.pending;
                        const job = jobs.find(j => j.id === app.jobId);
                        return (
                          <div
                            key={app.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                          >
                            <div>
                              <p className="font-medium">{job?.title || "Offre d'emploi"}</p>
                              <p className="text-sm text-muted-foreground">
                                {job?.location} • {formatRelativeDate(app.createdAt)}
                              </p>
                            </div>
                            <Badge className={status.className}>
                              <status.icon className="h-3 w-3 mr-1" />
                              {status.label}
                            </Badge>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {user.userType === "company" && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Candidatures récentes</CardTitle>
                  <Link href="/applications">
                    <Button variant="ghost" size="sm" className="gap-1">
                      Voir tout <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {applications.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Aucune candidature reçue
                    </p>
                  ) : (
                    applications.map((app) => {
                      const status = statusConfig[app.status as keyof typeof statusConfig] || statusConfig.pending;
                      const job = jobs.find(j => j.id === app.jobId);
                      return (
                        <div
                        key={app.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div>
                            <p className="font-medium">{job?.title || "Offre d'emploi"}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatRelativeDate(app.createdAt)}
                            </p>
                          </div>
                          <Badge className={status.className}>
                            <status.icon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
