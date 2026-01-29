import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin,
  Briefcase,
  Users,
  Star,
  Globe,
  CheckCircle2,
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  Shield,
  Building2,
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
  } | null;
}

export default function AgencyProfilePage() {
  const { id } = useParams<{ id: string }>();

  const { data: agencies, isLoading } = useQuery<AgencyWithProfile[]>({
    queryKey: ["/api/agencies"],
  });

  const agency = agencies?.find((a) => a.id === id);

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
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-32 mb-6" />
          <Card>
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row gap-8">
                <Skeleton className="h-32 w-32 rounded-full" />
                <div className="flex-1 space-y-4">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Link href="/agencies">
          <Button variant="ghost" className="mb-6 gap-2" data-testid="button-back-agencies">
            <ArrowLeft className="h-4 w-4" />
            Retour aux agences
          </Button>
        </Link>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="relative flex-shrink-0 mx-auto md:mx-0">
                    <Avatar className="h-24 w-24 md:h-32 md:w-32">
                      <AvatarImage src={agency.avatarUrl || undefined} />
                      <AvatarFallback className="text-2xl bg-secondary text-secondary-foreground">
                        {getInitials(agency.profile?.agencyName || agency.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    {agency.isVerified && (
                      <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-background">
                        <CheckCircle2 className="h-6 w-6 text-accent" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 text-center md:text-left space-y-4">
                    <div>
                      <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                        <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-agency-name">
                          {agency.profile?.agencyName || agency.fullName}
                        </h1>
                        {agency.profile?.verificationStatus === "verified" && (
                          <Badge variant="secondary" className="gap-1">
                            <Shield className="h-3 w-3" />
                            APDP Vérifié
                          </Badge>
                        )}
                      </div>
                      {location && (
                        <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-1">
                          <MapPin className="h-4 w-4" />
                          {location}
                        </p>
                      )}
                    </div>

                    {agency.profile?.description && (
                      <p className="text-muted-foreground" data-testid="text-agency-description">
                        {agency.profile.description}
                      </p>
                    )}

                    {agency.profile?.specializations && agency.profile.specializations.length > 0 && (
                      <div className="flex flex-wrap justify-center md:justify-start gap-2">
                        {agency.profile.specializations.map((spec) => (
                          <Badge key={spec} variant="outline">
                            {spec}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  Offres d'emploi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Consultez les offres d'emploi de cette agence
                  </p>
                  <Link href={`/agencies/${id}/jobs`}>
                    <Button className="gap-2" data-testid="button-view-agency-jobs">
                      <Briefcase className="h-4 w-4" />
                      Voir les offres
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Statistiques</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Candidats placés
                  </span>
                  <span className="font-semibold" data-testid="text-candidates-placed">
                    {agency.profile?.candidatesPlaced?.toLocaleString() || 0}
                  </span>
                </div>
                {agency.profile?.foundedYear && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Fondée en
                    </span>
                    <span className="font-semibold">{agency.profile.foundedYear}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Évaluation
                  </span>
                  <span className="font-semibold flex items-center gap-1 text-yellow-500">
                    <Star className="h-4 w-4 fill-current" />
                    4.8
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {agency.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`mailto:${agency.email}`}
                      className="text-primary hover:underline"
                      data-testid="link-agency-email"
                    >
                      {agency.email}
                    </a>
                  </div>
                )}
                {agency.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`tel:${agency.phone}`}
                      className="text-primary hover:underline"
                      data-testid="link-agency-phone"
                    >
                      {agency.phone}
                    </a>
                  </div>
                )}
                {agency.profile?.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={agency.profile.website.startsWith("http") ? agency.profile.website : `https://${agency.profile.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                      data-testid="link-agency-website"
                    >
                      {agency.profile.website}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            <Link href={`/agencies/${id}/jobs`} className="block">
              <Button className="w-full gap-2" size="lg" data-testid="button-see-all-jobs">
                <Briefcase className="h-4 w-4" />
                Voir toutes les offres
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
