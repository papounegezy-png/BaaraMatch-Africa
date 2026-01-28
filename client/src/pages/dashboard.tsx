import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { User, UserType } from "@shared/schema";

const mockUser: User = {
  id: "1",
  email: "john.doe@email.com",
  password: "",
  userType: "candidate",
  fullName: "John Doe",
  phone: "+221 77 000 00 00",
  city: "Dakar",
  country: "Sénégal",
  avatarUrl: null,
  isVerified: true,
};

const mockStats = {
  candidate: [
    { label: "Candidatures envoyées", value: 12, icon: FileText, trend: "+3 ce mois" },
    { label: "Vues du profil", value: 48, icon: Eye, trend: "+15% vs mois dernier" },
    { label: "Entretiens planifiés", value: 3, icon: Users, trend: "2 cette semaine" },
    { label: "Offres correspondantes", value: 24, icon: Briefcase, trend: "8 nouvelles" },
  ],
  agency: [
    { label: "Candidats gérés", value: 156, icon: Users, trend: "+12 ce mois" },
    { label: "Placements réussis", value: 34, icon: CheckCircle2, trend: "+5 ce mois" },
    { label: "Entreprises partenaires", value: 28, icon: Building2, trend: "+3 nouvelles" },
    { label: "Offres actives", value: 45, icon: Briefcase, trend: "12 en attente" },
  ],
  company: [
    { label: "Offres publiées", value: 8, icon: Briefcase, trend: "3 actives" },
    { label: "Candidatures reçues", value: 89, icon: FileText, trend: "+24 cette semaine" },
    { label: "Entretiens planifiés", value: 12, icon: Users, trend: "5 cette semaine" },
    { label: "Postes pourvus", value: 15, icon: CheckCircle2, trend: "+2 ce mois" },
  ],
};

const mockApplications = [
  { id: "1", jobTitle: "Développeur Full Stack", company: "TechAfrica Solutions", status: "pending", date: "Il y a 2 jours" },
  { id: "2", jobTitle: "Chef de Projet IT", company: "Orange Digital", status: "interview", date: "Il y a 5 jours" },
  { id: "3", jobTitle: "Analyste Business", company: "Sonatel", status: "rejected", date: "Il y a 1 semaine" },
  { id: "4", jobTitle: "DevOps Engineer", company: "Wave Mobile", status: "accepted", date: "Il y a 3 jours" },
];

const mockRecommendedJobs = [
  { id: "1", title: "Senior Backend Developer", company: "TechStartup", location: "Dakar", salary: "800K - 1.2M FCFA" },
  { id: "2", title: "Product Manager", company: "Jumia", location: "Abidjan", salary: "1M - 1.5M FCFA" },
  { id: "3", title: "Data Analyst", company: "Orange", location: "Dakar", salary: "600K - 900K FCFA" },
];

const statusConfig = {
  pending: { label: "En attente", icon: Clock, className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" },
  interview: { label: "Entretien", icon: Users, className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  accepted: { label: "Accepté", icon: CheckCircle2, className: "bg-green-500/10 text-green-600 dark:text-green-400" },
  rejected: { label: "Refusé", icon: XCircle, className: "bg-red-500/10 text-red-600 dark:text-red-400" },
};

export default function DashboardPage() {
  const user = mockUser;
  const stats = mockStats[user.userType];

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const profileCompletion = 75;

  return (
    <div className="min-h-screen bg-background">
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
                    <Link href="/profile/edit" className="flex-1">
                      <Button variant="outline" className="w-full gap-2" size="sm" data-testid="button-edit-profile">
                        <Edit className="h-4 w-4" />
                        Modifier
                      </Button>
                    </Link>
                    <Link href="/profile" className="flex-1">
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
                {user.userType === "agency" && (
                  <>
                    <Link href="/candidates/manage" className="block">
                      <Button variant="ghost" className="w-full justify-start gap-2" data-testid="button-quick-candidates">
                        <Users className="h-4 w-4" />
                        Gérer les candidats
                      </Button>
                    </Link>
                    <Link href="/jobs/create" className="block">
                      <Button variant="ghost" className="w-full justify-start gap-2" data-testid="button-quick-post-job">
                        <Plus className="h-4 w-4" />
                        Publier une offre
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
                    <Link href="/applications/received" className="block">
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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
                {(user.userType === "agency" || user.userType === "company") && (
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
                        <p className="text-2xl font-bold" data-testid={`text-stat-${stat.label.replace(/\s+/g, '-').toLowerCase()}`}>
                          {stat.value}
                        </p>
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
              <Tabs defaultValue="applications" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="applications" data-testid="tab-applications">Mes candidatures</TabsTrigger>
                  <TabsTrigger value="recommended" data-testid="tab-recommended">Recommandées</TabsTrigger>
                </TabsList>

                <TabsContent value="applications" className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">Candidatures récentes</CardTitle>
                        <Link href="/applications">
                          <Button variant="ghost" size="sm" className="gap-1" data-testid="link-all-applications">
                            Voir tout
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {mockApplications.map((app) => {
                          const status = statusConfig[app.status as keyof typeof statusConfig];
                          return (
                            <div
                              key={app.id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-muted/50"
                              data-testid={`application-${app.id}`}
                            >
                              <div className="space-y-1">
                                <p className="font-medium">{app.jobTitle}</p>
                                <p className="text-sm text-muted-foreground">{app.company}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-muted-foreground">{app.date}</span>
                                <Badge className={status.className}>
                                  <status.icon className="h-3 w-3 mr-1" />
                                  {status.label}
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="recommended" className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">Offres recommandées</CardTitle>
                        <Link href="/jobs">
                          <Button variant="ghost" size="sm" className="gap-1" data-testid="link-all-jobs">
                            Voir tout
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {mockRecommendedJobs.map((job) => (
                          <div
                            key={job.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-muted/50"
                            data-testid={`recommended-job-${job.id}`}
                          >
                            <div className="space-y-1">
                              <p className="font-medium">{job.title}</p>
                              <p className="text-sm text-muted-foreground">{job.company}</p>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {job.location}
                                </span>
                                <span>{job.salary}</span>
                              </div>
                            </div>
                            <Link href={`/jobs/${job.id}`}>
                              <Button variant="outline" size="sm" data-testid={`button-view-recommended-${job.id}`}>
                                Postuler
                              </Button>
                            </Link>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}

            {(user.userType === "agency" || user.userType === "company") && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">
                      {user.userType === "agency" ? "Activité récente" : "Candidatures récentes"}
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="gap-1" data-testid="link-all-activity">
                      Voir tout
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockApplications.slice(0, 3).map((app) => {
                      const status = statusConfig[app.status as keyof typeof statusConfig];
                      return (
                        <div
                          key={app.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-muted/50"
                          data-testid={`activity-${app.id}`}
                        >
                          <div className="space-y-1">
                            <p className="font-medium">{app.jobTitle}</p>
                            <p className="text-sm text-muted-foreground">
                              {user.userType === "agency" ? "Candidat placé chez " : "De "}
                              {app.company}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">{app.date}</span>
                            <Badge className={status.className}>
                              <status.icon className="h-3 w-3 mr-1" />
                              {status.label}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
