import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search,
  MapPin,
  Briefcase,
  Users,
  Star,
  Filter,
  Globe,
  CheckCircle2,
  Building2,
  TrendingUp,
  Award,
  Shield,
} from "lucide-react";

interface AgencyWithProfile {
  id: string;
  fullName: string;
  email: string;
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

export default function AgenciesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [sortBy, setSortBy] = useState("rating");

  const { data: agencies, isLoading } = useQuery<AgencyWithProfile[]>({
    queryKey: ["/api/agencies"],
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getLocation = (agency: AgencyWithProfile) => {
    return [agency.city, agency.country].filter(Boolean).join(", ");
  };

  const filteredAgencies = agencies?.filter((agency) => {
    const displayName = agency.profile?.agencyName || agency.fullName;
    const location = getLocation(agency);
    const specs = agency.profile?.specializations || [];
    
    const matchesSearch =
      searchQuery === "" ||
      displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      specs.some((spec) =>
        spec.toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesLocation =
      locationQuery === "" ||
      location.toLowerCase().includes(locationQuery.toLowerCase());

    return matchesSearch && matchesLocation;
  }) || [];

  const sortedAgencies = [...filteredAgencies].sort((a, b) => {
    switch (sortBy) {
      case "placements":
        return (b.profile?.candidatesPlaced || 0) - (a.profile?.candidatesPlaced || 0);
      case "name":
        return (a.profile?.agencyName || a.fullName).localeCompare(b.profile?.agencyName || b.fullName);
      default:
        return 0;
    }
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold" data-testid="text-agencies-page-title">
                Agences de Placement
              </h1>
              <p className="text-muted-foreground">
                Découvrez {filteredAgencies.length} agence{filteredAgencies.length > 1 ? "s" : ""} partenaire{filteredAgencies.length > 1 ? "s" : ""} de confiance
              </p>
            </div>

            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Nom ou spécialisation..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      data-testid="input-agency-search"
                    />
                  </div>
                  <div className="relative flex-1">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Ville ou pays..."
                      className="pl-10"
                      value={locationQuery}
                      onChange={(e) => setLocationQuery(e.target.value)}
                      data-testid="input-agency-location"
                    />
                  </div>
                  <Button className="gap-2" data-testid="button-search-agencies">
                    <Search className="h-4 w-4" />
                    Rechercher
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted-foreground">
            {filteredAgencies.length} agence{filteredAgencies.length > 1 ? "s" : ""} trouvée
            {filteredAgencies.length > 1 ? "s" : ""}
          </p>

          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" data-testid="button-filter-agencies">
              <Filter className="h-4 w-4" />
              Filtres
            </Button>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40" data-testid="select-sort-agencies">
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">Mieux notées</SelectItem>
                <SelectItem value="placements">Plus de placements</SelectItem>
                <SelectItem value="name">Nom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sortedAgencies.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {sortedAgencies.map((agency) => {
              const displayName = agency.profile?.agencyName || agency.fullName;
              const location = getLocation(agency);
              const specs = agency.profile?.specializations || [];
              const isApdpVerified = agency.profile?.verificationStatus === "verified";

              return (
                <Card key={agency.id} className="hover-elevate overflow-visible" data-testid={`card-agency-${agency.id}`}>
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={agency.avatarUrl || undefined} />
                          <AvatarFallback className="text-lg bg-secondary text-secondary-foreground">
                            {getInitials(displayName)}
                          </AvatarFallback>
                        </Avatar>
                        {agency.isVerified && (
                          <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-background">
                            <CheckCircle2 className="h-5 w-5 text-accent" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 space-y-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg" data-testid={`text-agency-name-${agency.id}`}>
                              {displayName}
                            </h3>
                            {isApdpVerified && (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <Shield className="h-3 w-3" />
                                Vérifiée
                              </Badge>
                            )}
                          </div>
                          {location && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {location}
                              {agency.profile?.foundedYear && (
                                <>
                                  <span className="mx-2">•</span>
                                  Depuis {agency.profile.foundedYear}
                                </>
                              )}
                            </p>
                          )}
                        </div>

                        {agency.profile?.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {agency.profile.description}
                          </p>
                        )}

                        {specs.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {specs.slice(0, 3).map((spec) => (
                              <Badge key={spec} variant="outline" className="text-xs">
                                {spec}
                              </Badge>
                            ))}
                            {specs.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{specs.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          <div className="flex items-center gap-1 text-yellow-500">
                            <Star className="h-4 w-4 fill-current" />
                            <span className="font-medium">4.8</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>{(agency.profile?.candidatesPlaced || 0).toLocaleString()} placés</span>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Link href={`/agencies/${agency.id}`} className="flex-1">
                            <Button variant="outline" className="w-full" data-testid={`button-view-agency-${agency.id}`}>
                              Voir le profil
                            </Button>
                          </Link>
                          <Link href={`/agencies/${agency.id}/jobs`} className="flex-1">
                            <Button className="w-full gap-2" data-testid={`button-agency-jobs-${agency.id}`}>
                              <Briefcase className="h-4 w-4" />
                              Voir les offres
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucune agence trouvée</h3>
              <p className="text-muted-foreground">
                Essayez de modifier vos critères de recherche.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="mt-12 bg-card border rounded-lg p-8">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-full gradient-gold mx-auto flex items-center justify-center">
              <Award className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold" data-testid="text-become-partner">
              Vous êtes une agence de placement ?
            </h2>
            <p className="text-muted-foreground">
              Rejoignez le réseau BaaraMatch et accédez à des milliers de candidats qualifiés et d'entreprises partenaires.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/register?type=agency">
                <Button size="lg" className="gap-2" data-testid="button-register-agency">
                  <TrendingUp className="h-4 w-4" />
                  Devenir partenaire
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="gap-2" data-testid="button-contact-us">
                  <Globe className="h-4 w-4" />
                  En savoir plus
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
