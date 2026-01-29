import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Briefcase,
  Users,
  Building2,
  Search,
  MapPin,
  TrendingUp,
  Shield,
  Award,
  ArrowRight,
  CheckCircle2,
  Globe,
  Handshake,
  Star,
  BadgeCheck,
} from "lucide-react";
import type { User, AgencyProfile, CompanyProfile } from "@shared/schema";

const stats = [
  { value: "15,000+", label: "Candidats inscrits", icon: Users },
  { value: "500+", label: "Entreprises partenaires", icon: Building2 },
  { value: "120+", label: "Agences de placement", icon: Briefcase },
  { value: "8,500+", label: "Placements réussis", icon: Award },
];

const features = [
  {
    title: "Candidats",
    description: "Créez votre profil, postulez aux offres et laissez les recruteurs vous trouver.",
    icon: Users,
    color: "bg-primary/10 text-primary",
    link: "/register?type=candidate",
  },
  {
    title: "Agences de Placement",
    description: "Gérez vos candidats, publiez des offres et connectez talents et entreprises.",
    icon: Handshake,
    color: "bg-secondary/10 text-secondary",
    link: "/register?type=agency",
  },
  {
    title: "Entreprises",
    description: "Publiez vos offres d'emploi et accédez à une base de talents qualifiés.",
    icon: Building2,
    color: "bg-accent/10 text-accent",
    link: "/register?type=company",
  },
];

const benefits = [
  {
    icon: Globe,
    title: "Couverture Panafricaine",
    description: "Accédez à des opportunités dans plus de 20 pays africains.",
  },
  {
    icon: Shield,
    title: "Profils Vérifiés",
    description: "Tous les candidats et agences sont vérifiés pour garantir la qualité.",
  },
  {
    icon: TrendingUp,
    title: "Matching Intelligent",
    description: "Notre algorithme connecte les bons profils aux bonnes opportunités.",
  },
];

const recentJobs = [
  {
    id: "1",
    title: "Développeur Full Stack",
    company: "TechAfrica Solutions",
    location: "Dakar, Sénégal",
    type: "CDI",
    salary: "800,000 - 1,200,000 FCFA",
    category: "Tech",
  },
  {
    id: "2",
    title: "Responsable Marketing Digital",
    company: "Jumia Sénégal",
    location: "Dakar, Sénégal",
    type: "CDI",
    salary: "600,000 - 900,000 FCFA",
    category: "Marketing",
  },
  {
    id: "3",
    title: "Comptable Senior",
    company: "Orange Finances",
    location: "Abidjan, Côte d'Ivoire",
    type: "CDI",
    salary: "700,000 - 1,000,000 FCFA",
    category: "Finance",
  },
  {
    id: "4",
    title: "Chef de Projet BTP",
    company: "Afrique Construction",
    location: "Bamako, Mali",
    type: "CDD",
    salary: "900,000 - 1,500,000 FCFA",
    category: "Construction",
  },
];

type AgencyWithProfile = User & { profile?: AgencyProfile };
type CompanyWithProfile = User & { profile?: CompanyProfile };

export default function HomePage() {
  const { data: agencies = [] } = useQuery<AgencyWithProfile[]>({
    queryKey: ["/api/agencies"],
  });

  const { data: companies = [] } = useQuery<CompanyWithProfile[]>({
    queryKey: ["/api/companies"],
  });

  const featuredAgencies = agencies.slice(0, 4);
  const featuredCompanies = companies.slice(0, 4);

  return (
    <div className="flex flex-col min-h-screen">
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-card to-muted py-20 md:py-32">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNGNEE0MjAiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <Badge variant="secondary" className="px-4 py-1.5" data-testid="badge-hero">
              <span className="mr-2">La plateforme N°1 en Afrique</span>
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight" data-testid="text-hero-title">
              Connectez les <span className="text-gradient-gold">talents africains</span> aux meilleures opportunités
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto" data-testid="text-hero-description">
              BaaraMatch Africa réunit candidats, agences de placement et entreprises pour créer des opportunités d'emploi durables à travers le continent.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="gap-2 px-8" data-testid="button-hero-register">
                  Commencer gratuitement
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/jobs">
                <Button size="lg" variant="outline" className="gap-2 px-8" data-testid="button-hero-jobs">
                  <Search className="h-4 w-4" />
                  Voir les offres
                </Button>
              </Link>
            </div>

            <Card className="max-w-2xl mx-auto mt-8">
              <CardContent className="p-4">
                <form className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher un emploi..."
                      className="pl-10"
                      data-testid="input-search-job"
                    />
                  </div>
                  <div className="relative flex-1">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Ville ou pays..."
                      className="pl-10"
                      data-testid="input-search-location"
                    />
                  </div>
                  <Button type="submit" className="gap-2" data-testid="button-search">
                    <Search className="h-4 w-4" />
                    Rechercher
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-12 bg-card border-y">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center space-y-2">
                <div className="flex items-center justify-center mb-2">
                  <div className="p-2 rounded-full bg-primary/10">
                    <stat.icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <p className="text-2xl md:text-3xl font-bold text-gradient-gold" data-testid={`text-stat-${stat.label.replace(/\s+/g, '-').toLowerCase()}`}>
                  {stat.value}
                </p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl md:text-4xl font-bold" data-testid="text-features-title">
              Une plateforme pour tous
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Que vous soyez candidat, agence de placement ou entreprise, BaaraMatch vous offre les outils pour réussir.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="hover-elevate group">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg ${feature.color} flex items-center justify-center mb-4`}>
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href={feature.link}>
                    <Button variant="ghost" className="gap-2 p-0 h-auto" data-testid={`link-feature-${feature.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      En savoir plus
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl md:text-4xl font-bold" data-testid="text-jobs-title">
              Dernières offres d'emploi
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Découvrez les opportunités les plus récentes publiées sur notre plateforme.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {recentJobs.map((job) => (
              <Card key={job.id} className="hover-elevate">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{job.category}</Badge>
                        <Badge variant="outline">{job.type}</Badge>
                      </div>
                      <h3 className="text-lg font-semibold" data-testid={`text-job-title-${job.id}`}>
                        {job.title}
                      </h3>
                      <p className="text-muted-foreground">{job.company}</p>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {job.location}
                        </span>
                        <span className="font-medium text-foreground">{job.salary}</span>
                      </div>
                    </div>
                    <Link href={`/jobs/${job.id}`}>
                      <Button variant="outline" data-testid={`button-view-job-${job.id}`}>
                        Voir l'offre
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link href="/jobs">
              <Button size="lg" variant="outline" className="gap-2" data-testid="button-view-all-jobs">
                Voir toutes les offres
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Agencies Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl md:text-4xl font-bold" data-testid="text-agencies-title">
              Agences de Placement Partenaires
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Découvrez nos agences de placement certifiées qui vous accompagnent dans votre recherche d'emploi.
            </p>
          </div>

          {featuredAgencies.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredAgencies.map((agency) => (
                <Card key={agency.id} className="hover-elevate text-center" data-testid={`card-agency-${agency.id}`}>
                  <CardContent className="p-6 space-y-4">
                    <Avatar className="h-20 w-20 mx-auto">
                      <AvatarImage src={agency.avatarUrl || undefined} alt={agency.fullName} />
                      <AvatarFallback className="bg-secondary/20 text-secondary text-xl">
                        {agency.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <h3 className="font-semibold flex items-center justify-center gap-1">
                        {agency.fullName}
                        {agency.isVerified && <BadgeCheck className="h-4 w-4 text-accent" />}
                      </h3>
                      {agency.profile?.specializations && (
                        <p className="text-sm text-muted-foreground">
                          {agency.profile.specializations.slice(0, 2).join(' • ')}
                        </p>
                      )}
                      {(agency.city || agency.country) && (
                        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {[agency.city, agency.country].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                    {agency.profile?.verificationStatus === "verified" && (
                      <Badge variant="secondary" className="text-xs">
                        <Shield className="h-3 w-3 mr-1" />
                        APDP Vérifié
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="max-w-md mx-auto">
              <CardContent className="p-8 text-center">
                <Handshake className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucune agence de placement disponible pour le moment.</p>
              </CardContent>
            </Card>
          )}

          <div className="text-center mt-8">
            <Link href="/agencies">
              <Button size="lg" variant="outline" className="gap-2" data-testid="button-view-all-agencies">
                Voir toutes les agences
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Companies Section */}
      <section className="py-16 md:py-24 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl md:text-4xl font-bold" data-testid="text-companies-title">
              Entreprises Partenaires
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Rejoignez les entreprises qui recrutent les meilleurs talents africains.
            </p>
          </div>

          {featuredCompanies.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredCompanies.map((company) => (
                <Card key={company.id} className="hover-elevate text-center" data-testid={`card-company-${company.id}`}>
                  <CardContent className="p-6 space-y-4">
                    <Avatar className="h-20 w-20 mx-auto">
                      <AvatarImage src={company.avatarUrl || undefined} alt={company.fullName} />
                      <AvatarFallback className="bg-accent/20 text-accent text-xl">
                        {company.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <h3 className="font-semibold flex items-center justify-center gap-1">
                        {company.fullName}
                        {company.isVerified && <BadgeCheck className="h-4 w-4 text-accent" />}
                      </h3>
                      {company.profile?.industry && (
                        <Badge variant="outline" className="text-xs">
                          {company.profile.industry}
                        </Badge>
                      )}
                      {(company.city || company.country) && (
                        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {[company.city, company.country].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                    {company.profile?.employeeCount && (
                      <p className="text-xs text-muted-foreground">
                        <Users className="h-3 w-3 inline mr-1" />
                        {company.profile.employeeCount} employés
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="max-w-md mx-auto">
              <CardContent className="p-8 text-center">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucune entreprise partenaire disponible pour le moment.</p>
              </CardContent>
            </Card>
          )}

          <div className="text-center mt-8">
            <Link href="/companies">
              <Button size="lg" variant="outline" className="gap-2" data-testid="button-view-all-companies">
                Voir toutes les entreprises
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl md:text-4xl font-bold" data-testid="text-benefits-title">
              Pourquoi choisir BaaraMatch ?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Nous nous engageons à créer des connexions durables et de qualité.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full gradient-gold mx-auto flex items-center justify-center">
                  <benefit.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold">{benefit.title}</h3>
                <p className="text-muted-foreground">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
        <div className="container mx-auto px-4">
          <Card className="max-w-4xl mx-auto border-none shadow-xl overflow-hidden">
            <div className="gradient-gold p-1">
              <CardContent className="bg-card p-8 md:p-12">
                <div className="text-center space-y-6">
                  <h2 className="text-3xl md:text-4xl font-bold" data-testid="text-cta-title">
                    Prêt à transformer votre carrière ?
                  </h2>
                  <p className="text-muted-foreground max-w-xl mx-auto">
                    Rejoignez des milliers de professionnels africains qui font confiance à BaaraMatch pour leurs opportunités de carrière.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                    <Link href="/register">
                      <Button size="lg" className="gap-2 px-8" data-testid="button-cta-register">
                        Créer mon compte gratuit
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                  <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground pt-4">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-accent" />
                      Inscription gratuite
                    </span>
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-accent" />
                      Accès illimité aux offres
                    </span>
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-accent" />
                      Profil visible par les recruteurs
                    </span>
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
