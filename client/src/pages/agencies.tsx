import { useState, type Dispatch, type SetStateAction } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search,
  MapPin,
  Briefcase,
  Users,
  Star,
  X,
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
    rating: number | null;
    foundedYear: number | null;
    employeeCount: number | null;
  } | null;
}

interface JobPostingSummary {
  id: string;
  agencyId: string | null;
  companyId: string;
}

interface CompanyWithProfile {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  city: string | null;
  country: string | null;
  isVerified: boolean;
  profile: {
    companyName: string | null;
    description: string | null;
    website: string | null;
    rating: number | null;
    industry: string | null;
    employeeCount: number | null;
    foundedYear: number | null;
    logoUrl: string | null;
  } | null;
}

type EmployerItem = {
  id: string;
  type: "agency" | "company";
  displayName: string;
  email: string;
  avatarUrl: string | null;
  city: string | null;
  country: string | null;
  isVerified: boolean;
  description: string | null;
  website: string | null;
  tags: string[];
  foundedYear: number | null;
  collaboratorsCount: number;
  offersPublished: number;
  rating: number | null;
  hasCompanyLogo: boolean;
  industry?: string | null;
};

export default function AgenciesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [selectedTypeFilters, setSelectedTypeFilters] = useState<Array<"agency" | "company">>([]);
  const [selectedSectorFilters, setSelectedSectorFilters] = useState<string[]>([]);
  const [selectedCountryFilters, setSelectedCountryFilters] = useState<string[]>([]);
  const [selectedCityFilters, setSelectedCityFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("rating");

  const { data: agencies, isLoading } = useQuery<AgencyWithProfile[]>({
    queryKey: ["/api/agencies"],
  });

  const { data: companies, isLoading: isLoadingCompanies } = useQuery<CompanyWithProfile[]>({
    queryKey: ["/api/companies"],
  });

  const { data: jobs, isLoading: isLoadingJobs } = useQuery<JobPostingSummary[]>({
    queryKey: ["/api/jobs"],
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const employers: EmployerItem[] = [
    ...(agencies ?? []).map((agency) => {
      const offersPublished = (jobs ?? []).filter((job) => job.agencyId === agency.id).length;
      const collaboratorsCount = agency.profile?.employeeCount || 0;

      return {
        id: agency.id,
        type: "agency" as const,
        displayName: agency.profile?.agencyName || agency.fullName,
        email: agency.email,
        avatarUrl: agency.avatarUrl,
        city: agency.city,
        country: agency.country,
        isVerified: agency.isVerified,
        description: agency.profile?.description || null,
        website: agency.profile?.website || null,
        tags: agency.profile?.specializations || [],
        foundedYear: agency.profile?.foundedYear || null,
        collaboratorsCount,
        offersPublished,
        rating: agency.profile?.rating ?? null,
        hasCompanyLogo: false,
        industry: null,
      };
    }),
    ...(companies ?? []).map((company) => {
      const offersPublished = (jobs ?? []).filter((job) => job.companyId === company.id).length;
      const collaboratorsCount = company.profile?.employeeCount || 0;

      return {
        id: company.id,
        type: "company" as const,
        displayName: company.profile?.companyName || company.fullName,
        email: company.email,
        avatarUrl: company.profile?.logoUrl || company.avatarUrl,
        city: company.city,
        country: company.country,
        isVerified: company.isVerified,
        description: company.profile?.description || null,
        website: company.profile?.website || null,
        tags: company.profile?.industry ? [company.profile.industry] : [],
        foundedYear: company.profile?.foundedYear || null,
        collaboratorsCount,
        offersPublished,
        rating: company.profile?.rating ?? null,
        hasCompanyLogo: Boolean(company.profile?.logoUrl),
        industry: company.profile?.industry || null,
      };
    }),
  ];

  const toggleStringFilter = (
    value: string,
    setter: Dispatch<SetStateAction<string[]>>,
  ) => {
    setter((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  const toggleTypeFilter = (value: "agency" | "company") => {
    setSelectedTypeFilters((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
    );
  };

  const sectorOptions = Array.from(
    new Set(
      employers
        .flatMap((employer) => employer.tags)
        .filter((tag) => tag && tag.trim().length > 0),
    ),
  ).sort((a, b) => a.localeCompare(b, "fr"));

  const countryOptions = Array.from(
    new Set(
      employers
        .map((employer) => employer.country)
        .filter((country): country is string => Boolean(country && country.trim())),
    ),
  ).sort((a, b) => a.localeCompare(b, "fr"));

  const cityOptions = Array.from(
    new Set(
      employers
        .map((employer) => employer.city)
        .filter((city): city is string => Boolean(city && city.trim())),
    ),
  ).sort((a, b) => a.localeCompare(b, "fr"));

  const typeCounts: Record<"agency" | "company", number> = {
    agency: employers.filter((employer) => employer.type === "agency").length,
    company: employers.filter((employer) => employer.type === "company").length,
  };

  const sectorCounts = employers.reduce<Record<string, number>>((acc, employer) => {
    employer.tags.forEach((tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {});

  const countryCounts = employers.reduce<Record<string, number>>((acc, employer) => {
    if (employer.country) {
      acc[employer.country] = (acc[employer.country] || 0) + 1;
    }
    return acc;
  }, {});

  const cityCounts = employers.reduce<Record<string, number>>((acc, employer) => {
    if (employer.city) {
      acc[employer.city] = (acc[employer.city] || 0) + 1;
    }
    return acc;
  }, {});

  const clearSidebarFilters = () => {
    setSelectedTypeFilters([]);
    setSelectedSectorFilters([]);
    setSelectedCountryFilters([]);
    setSelectedCityFilters([]);
  };

  const activeFilterChips: Array<{
    key: string;
    label: string;
    onRemove: () => void;
  }> = [
    ...selectedTypeFilters.map((type) => ({
      key: `type-${type}`,
      label: `Type: ${type === "agency" ? "Agence" : "Entreprise"}`,
      onRemove: () => toggleTypeFilter(type),
    })),
    ...selectedSectorFilters.map((sector) => ({
      key: `sector-${sector}`,
      label: `Secteur: ${sector}`,
      onRemove: () => setSelectedSectorFilters((prev) => prev.filter((item) => item !== sector)),
    })),
    ...selectedCountryFilters.map((country) => ({
      key: `country-${country}`,
      label: `Pays: ${country}`,
      onRemove: () => setSelectedCountryFilters((prev) => prev.filter((item) => item !== country)),
    })),
    ...selectedCityFilters.map((city) => ({
      key: `city-${city}`,
      label: `Ville: ${city}`,
      onRemove: () => setSelectedCityFilters((prev) => prev.filter((item) => item !== city)),
    })),
    ...(searchQuery.trim()
      ? [
          {
            key: "search-query",
            label: `Recherche: ${searchQuery}`,
            onRemove: () => setSearchQuery(""),
          },
        ]
      : []),
    ...(locationQuery.trim()
      ? [
          {
            key: "location-query",
            label: `Localisation: ${locationQuery}`,
            onRemove: () => setLocationQuery(""),
          },
        ]
      : []),
  ];

  const filteredEmployers = employers.filter((employer) => {
    const location = [employer.city, employer.country].filter(Boolean).join(", ");

    const matchesSearch =
      searchQuery === "" ||
      employer.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employer.tags.some((spec) =>
        spec.toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesLocation =
      locationQuery === "" ||
      location.toLowerCase().includes(locationQuery.toLowerCase());
    const matchesType =
      selectedTypeFilters.length === 0 || selectedTypeFilters.includes(employer.type);
    const matchesSector =
      selectedSectorFilters.length === 0 ||
      employer.tags.some((tag) => selectedSectorFilters.includes(tag));
    const matchesCountry =
      selectedCountryFilters.length === 0 ||
      (employer.country !== null && selectedCountryFilters.includes(employer.country));
    const matchesCity =
      selectedCityFilters.length === 0 ||
      (employer.city !== null && selectedCityFilters.includes(employer.city));

    return matchesSearch && matchesLocation && matchesType && matchesSector && matchesCountry && matchesCity;
  });

  const sortedEmployers = [...filteredEmployers].sort((a, b) => {
    switch (sortBy) {
      case "rating":
        if (a.rating === null && b.rating === null) return b.offersPublished - a.offersPublished;
        if (a.rating === null) return 1;
        if (b.rating === null) return -1;
        return b.rating - a.rating;
      case "activity":
        return b.offersPublished - a.offersPublished;
      case "name":
        return a.displayName.localeCompare(b.displayName);
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
                Employeurs
              </h1>
              <p className="text-muted-foreground">
                Découvrez {filteredEmployers.length} employeur{filteredEmployers.length > 1 ? "s" : ""} partenaire{filteredEmployers.length > 1 ? "s" : ""} (agences et entreprises)
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)] items-start">
          <aside className="lg:sticky lg:top-24">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">Filtres</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSidebarFilters}
                    data-testid="button-clear-employers-filters"
                  >
                    Réinitialiser
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Type d'entreprise</h3>
                  <div className="space-y-2">
                    {[
                      { value: "agency", label: "Agence" },
                      { value: "company", label: "Entreprise" },
                    ].map((option) => {
                      const id = `type-filter-${option.value}`;
                      return (
                        <div key={option.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={id}
                            checked={selectedTypeFilters.includes(option.value as "agency" | "company")}
                            onCheckedChange={() => toggleTypeFilter(option.value as "agency" | "company")}
                          />
                          <Label htmlFor={id} className="text-sm font-normal cursor-pointer">
                            {option.label} ({typeCounts[option.value as "agency" | "company"] || 0})
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Secteur d'activité</h3>
                  <div className="space-y-2 max-h-44 overflow-auto pr-1">
                    {sectorOptions.length > 0 ? (
                      sectorOptions.map((sector) => {
                        const id = `sector-filter-${sector.replace(/\s+/g, "-").toLowerCase()}`;
                        return (
                          <div key={sector} className="flex items-center space-x-2">
                            <Checkbox
                              id={id}
                              checked={selectedSectorFilters.includes(sector)}
                              onCheckedChange={() => toggleStringFilter(sector, setSelectedSectorFilters)}
                            />
                            <Label htmlFor={id} className="text-sm font-normal cursor-pointer">
                              {sector} ({sectorCounts[sector] || 0})
                            </Label>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-muted-foreground">Aucun secteur disponible</p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold">Emplacement</h3>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pays</p>
                    <div className="space-y-2 max-h-32 overflow-auto pr-1">
                      {countryOptions.length > 0 ? (
                        countryOptions.map((country) => {
                          const id = `country-filter-${country.replace(/\s+/g, "-").toLowerCase()}`;
                          return (
                            <div key={country} className="flex items-center space-x-2">
                              <Checkbox
                                id={id}
                                checked={selectedCountryFilters.includes(country)}
                                onCheckedChange={() => toggleStringFilter(country, setSelectedCountryFilters)}
                              />
                              <Label htmlFor={id} className="text-sm font-normal cursor-pointer">
                                {country} ({countryCounts[country] || 0})
                              </Label>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-muted-foreground">Aucun pays disponible</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ville</p>
                    <div className="space-y-2 max-h-32 overflow-auto pr-1">
                      {cityOptions.length > 0 ? (
                        cityOptions.map((city) => {
                          const id = `city-filter-${city.replace(/\s+/g, "-").toLowerCase()}`;
                          return (
                            <div key={city} className="flex items-center space-x-2">
                              <Checkbox
                                id={id}
                                checked={selectedCityFilters.includes(city)}
                                onCheckedChange={() => toggleStringFilter(city, setSelectedCityFilters)}
                              />
                              <Label htmlFor={id} className="text-sm font-normal cursor-pointer">
                                {city} ({cityCounts[city] || 0})
                              </Label>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-muted-foreground">Aucune ville disponible</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>

          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-muted-foreground">
                {filteredEmployers.length} résultat{filteredEmployers.length > 1 ? "s" : ""} trouvé{filteredEmployers.length > 1 ? "s" : ""}
              </p>

              <div className="flex items-center gap-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40" data-testid="select-sort-agencies">
                    <SelectValue placeholder="Trier par" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rating">Mieux notées</SelectItem>
                    <SelectItem value="activity">Plus actifs</SelectItem>
                    <SelectItem value="name">Nom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {activeFilterChips.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-6" data-testid="active-filters-chips-bar">
                {activeFilterChips.map((chip) => (
                  <Badge key={chip.key} variant="secondary" className="gap-1.5 pr-1">
                    <span>{chip.label}</span>
                    <button
                      type="button"
                      onClick={chip.onRemove}
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-black/10"
                      aria-label={`Retirer le filtre ${chip.label}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {isLoading || isLoadingCompanies || isLoadingJobs ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            ) : sortedEmployers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sortedEmployers.map((employer) => {
                  const location = [employer.city, employer.country].filter(Boolean).join(", ");

                  return (
                    <Card key={`${employer.type}-${employer.id}`} className="hover-elevate overflow-visible" data-testid={`card-employer-${employer.type}-${employer.id}`}>
                      <CardContent className="p-6">
                        <div className="flex gap-4">
                          <div className="relative flex-shrink-0">
                            <Avatar className={`h-16 w-16 ${employer.type === "company" && employer.hasCompanyLogo ? "bg-muted/40 ring-1 ring-border/50" : ""}`}>
                              <AvatarImage
                                src={employer.avatarUrl || undefined}
                                className={employer.type === "company" ? "object-contain p-1" : "object-cover"}
                              />
                              <AvatarFallback className="text-lg bg-secondary text-secondary-foreground">
                                {getInitials(employer.displayName)}
                              </AvatarFallback>
                            </Avatar>
                            {employer.isVerified && (
                              <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-background">
                                <CheckCircle2 className="h-5 w-5 text-accent" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0 space-y-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <h3 className="font-semibold text-lg break-words" data-testid={`text-employer-name-${employer.id}`}>
                                  {employer.displayName}
                                </h3>
                                <Badge
                                  variant={employer.type === "agency" ? "secondary" : "outline"}
                                  className="text-xs gap-1"
                                >
                                  {employer.type === "agency" ? "Agence" : "Entreprise"}
                                </Badge>
                                {employer.isVerified && (
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
                                  {employer.foundedYear && (
                                    <>
                                      <span className="mx-2">•</span>
                                      Depuis {employer.foundedYear}
                                    </>
                                  )}
                                </p>
                              )}
                            </div>

                            {employer.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {employer.description}
                              </p>
                            )}

                            {employer.tags.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {employer.tags.slice(0, 3).map((spec) => (
                                  <Badge key={spec} variant="outline" className="text-xs">
                                    {spec}
                                  </Badge>
                                ))}
                                {employer.tags.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{employer.tags.length - 3}
                                  </Badge>
                                )}
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-2 text-sm">
                              <Badge variant="secondary" className="gap-1.5 text-xs">
                                <Briefcase className="h-3.5 w-3.5" />
                                {employer.offersPublished.toLocaleString()} offres publiées
                              </Badge>
                              <Badge variant="outline" className="gap-1.5 text-xs">
                                <Users className="h-3.5 w-3.5" />
                                {employer.collaboratorsCount.toLocaleString()} collaborateurs
                              </Badge>
                              <Badge variant="outline" className="gap-1.5 text-xs">
                                <Star className="h-3.5 w-3.5 text-amber-500" />
                                {employer.rating !== null ? `Notation ${employer.rating.toFixed(1)}/5` : "Notation indisponible"}
                              </Badge>
                            </div>

                            {/* Roboto Slab est large : sous ~280 px de carte, les deux boutons passent
                                l'un sous l'autre au lieu de couper leur libellé. */}
                            <div className="flex flex-wrap gap-2 pt-2">
                              {employer.type === "agency" ? (
                                <>
                                  <Link href={`/agencies/${employer.id}`} className="min-w-[8.5rem] flex-1">
                                    <Button variant="outline" className="w-full" data-testid={`button-view-agency-${employer.id}`}>
                                      Voir le profil
                                    </Button>
                                  </Link>
                                  <Link href={`/jobs?agencyId=${employer.id}&employerName=${encodeURIComponent(employer.displayName)}`} className="min-w-[8.5rem] flex-1">
                                    <Button className="w-full gap-2" data-testid={`button-agency-jobs-${employer.id}`}>
                                      <Briefcase className="h-4 w-4" />
                                      Voir les offres
                                    </Button>
                                  </Link>
                                </>
                              ) : (
                                <>
                                  <Link href={`/companies/${employer.id}`} className="min-w-[8.5rem] flex-1">
                                    <Button variant="outline" className="w-full" data-testid={`button-company-profile-${employer.id}`}>
                                      Voir profil
                                    </Button>
                                  </Link>
                                  <Link href={`/jobs?companyId=${employer.id}&employerName=${encodeURIComponent(employer.displayName)}`} className="min-w-[8.5rem] flex-1">
                                    <Button className="w-full gap-2" data-testid={`button-company-jobs-${employer.id}`}>
                                      <Briefcase className="h-4 w-4" />
                                      Voir les offres
                                    </Button>
                                  </Link>
                                </>
                              )}
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
                  <h3 className="text-lg font-semibold mb-2">Aucun employeur trouvé</h3>
                  <p className="text-muted-foreground">
                    Essayez de modifier vos critères de recherche.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

        </div>

        <div className="mt-12 bg-card border rounded-lg p-8">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-full gradient-gold mx-auto flex items-center justify-center">
              <Award className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold" data-testid="text-become-partner">
              Vous êtes une agence ou une entreprise ?
            </h2>
            <p className="text-muted-foreground">
              Rejoignez le réseau BaaraMatch et accédez à des candidats qualifiés avec des outils RH performants.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/register?type=agency">
                <Button size="lg" className="gap-2" data-testid="button-register-agency">
                  <TrendingUp className="h-4 w-4" />
                  Espace agence
                </Button>
              </Link>
              <Link href="/register?type=company">
                <Button size="lg" variant="outline" className="gap-2" data-testid="button-register-company">
                  <Building2 className="h-4 w-4" />
                  Espace entreprise
                </Button>
              </Link>
              <a href="mailto:contact@baaramatch.africa">
                <Button size="lg" variant="ghost" className="gap-2" data-testid="button-contact-us">
                  <Globe className="h-4 w-4" />
                  En savoir plus
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
