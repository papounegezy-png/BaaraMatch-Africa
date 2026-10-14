import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Search,
  MapPin,
  Briefcase,
  Clock,
  Filter,
  Building2,
  DollarSign,
  ChevronRight,
  Heart,
  X,
  Loader2,
  Navigation,
  Sparkles,
} from "lucide-react";
import { LandmarkSearch } from "@/components/landmark-search";
import { useAuth } from "@/lib/auth";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import type { CandidateProfile, JobPosting, User } from "@shared/schema";
import { calculateMatchScore, explainMatchScore } from "@shared/matching";
import { formatJobType } from "@/lib/job-type-labels";
import { formatJobPostedLabel } from "@/lib/format-posted-date";
import { contractTypeOptions, jobCategoryOptions } from "@/components/offer-form";
import { stripJobDescriptionHtml } from "@/lib/sanitize-html";
import { formatJobSalary } from "@/lib/format-job-salary";
import { useSavedJobs } from "@/hooks/use-saved-jobs";
import { ShareJobMenu } from "@/components/share-job-menu";

// Same vocabulary OfferForm writes when a job is actually posted — this used
// to be a separate, disagreeing list ("Finance", "Construction"...) that
// couldn't match jobs posted through the real posting form (which writes
// "Finance & Comptabilité", "BTP & Construction"...), so filtering by
// category silently returned zero results.
const jobCategories = jobCategoryOptions;

// Same vocabulary OfferForm writes (cdi/cdd/interim/stage/journalier/
// prestation) — this used to be a separate, disagreeing list (cdi/cdd/stage/
// freelance/temps-partiel) that couldn't actually match jobs posted through
// the real posting form.
const jobTypes = contractTypeOptions;

// No "Niveau d'expérience" filter: no posting form (OfferForm, agency,
// admin) ever writes experienceMin/experienceMax, so every job read as
// "0 to ∞ years" and matched every level — the filter changed nothing.
// À rebrancher quand le champ existera dans OfferForm (filtrer alors sur
// job.experienceMin/experienceMax).

function MatchBadge({ match }: { match: { score: number; explanation: string } | null }) {
  if (!match) return null;
  return (
    <div
      className="flex items-center gap-1.5 bg-gradient-to-r from-primary/20 to-accent/20 rounded-full px-2.5 py-1 shrink-0"
      title={`Correspondance : ${match.explanation}`}
    >
      <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
      <span className="font-bold text-xs" aria-label={`Correspondance ${match.score} %, ${match.explanation}`}>
        {match.score}%
      </span>
    </div>
  );
}

export default function JobsPage() {
  const { user } = useAuth();
  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const agencyIdFilter = searchParams.get("agencyId");
  const companyIdFilter = searchParams.get("companyId");
  const employerNameFilter = searchParams.get("employerName");
  const isEmployerFilteredView = Boolean(agencyIdFilter || companyIdFilter);
  const employerProfileHref = companyIdFilter
    ? `/companies/${companyIdFilter}`
    : agencyIdFilter
      ? `/agencies/${agencyIdFilter}`
      : null;
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") ?? "");
  const [locationQuery, setLocationQuery] = useState(() => searchParams.get("location") ?? "");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    const category = searchParams.get("category");
    return category ? [category] : [];
  });
  // ?type=cdi (recherche de l'accueil) présélectionne ce type de contrat ;
  // une valeur inconnue est ignorée.
  const [selectedTypes, setSelectedTypes] = useState<string[]>(() => {
    const type = searchParams.get("type");
    return type && jobTypes.some((t) => t.value === type) ? [type] : [];
  });
  const [sortBy, setSortBy] = useState("recent");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"search" | "landmarks">("search");
  const [selectedLandmark, setSelectedLandmark] = useState<any>(null);

  const { data: jobs = [], isLoading, error } = useQuery<(JobPosting & { organizationName: string | null })[]>({
    queryKey: ["/api/jobs"],
  });

  const { savedJobIds, toggleSave } = useSavedJobs();

  const isCandidate = user?.userType === "candidate";
  const { data: profileData } = useQuery<{ user: User; profile: CandidateProfile | null }>({
    queryKey: ["/api/profile"],
    enabled: isCandidate,
  });
  const candidateProfile = profileData?.profile ?? null;

  // Real V0 score (shared/matching.ts, same as the dashboard) — this badge
  // used to show Math.random() between 70 and 94 %. No profile (visitor,
  // non-candidate, profile not created / still loading / failed): no badge
  // at all rather than an invented number.
  const getMatch = (job: JobPosting) => {
    if (!isCandidate || !candidateProfile) return null;
    const result = calculateMatchScore(
      { skills: candidateProfile.skills, city: user?.city, experienceYears: candidateProfile.experienceYears },
      { requiredSkills: job.requiredSkills, location: job.location, experienceMin: job.experienceMin },
    );
    return { score: result.score, explanation: explainMatchScore(result.details) };
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedTypes([]);
    setSearchQuery("");
    setLocationQuery("");
  };

  const filteredJobs = jobs
    .filter((job) => {
      const matchesEmployer =
        (!agencyIdFilter || job.agencyId === agencyIdFilter) &&
        (!companyIdFilter || job.companyId === companyIdFilter);
      const matchesSearch =
        searchQuery === "" ||
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLocation =
        locationQuery === "" || job.location.toLowerCase().includes(locationQuery.toLowerCase());
      const matchesCategory =
        selectedCategories.length === 0 || (job.category && selectedCategories.includes(job.category));
      const matchesType =
        selectedTypes.length === 0 ||
        selectedTypes.some((t) => job.jobType.toLowerCase().includes(t.toLowerCase()));

      return matchesEmployer && matchesSearch && matchesLocation && matchesCategory && matchesType;
    })
    .sort((a, b) => {
      if (sortBy === "salary-high" || sortBy === "salary-low") {
        // Jobs with no numeric salary (none set, or only the legacy
        // free-text salaryRange) go last either way — treating them as 0
        // put them first under "Salaire croissant".
        const high = sortBy === "salary-high";
        const va = high ? a.salaryMax ?? a.salaryMin : a.salaryMin ?? a.salaryMax;
        const vb = high ? b.salaryMax ?? b.salaryMin : b.salaryMin ?? b.salaryMax;
        if (va == null || vb == null) return va == null ? (vb == null ? 0 : 1) : -1;
        return high ? vb - va : va - vb;
      }
      if (sortBy === "popular") return (b.viewCount ?? 0) + (b.applicationCount ?? 0) - ((a.viewCount ?? 0) + (a.applicationCount ?? 0));
      return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
    });

  const activeFiltersCount = selectedCategories.length + selectedTypes.length;

  const FilterContent = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium mb-3">Catégories</h3>
        <div className="space-y-2">
          {jobCategories.map((category) => (
            <div key={category} className="flex items-center space-x-2">
              <Checkbox
                id={`category-${category}`}
                checked={selectedCategories.includes(category)}
                onCheckedChange={() => toggleCategory(category)}
                data-testid={`checkbox-category-${category.toLowerCase().replace(/\s+/g, '-')}`}
              />
              <Label
                htmlFor={`category-${category}`}
                className="text-sm font-normal cursor-pointer"
              >
                {category}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-medium mb-3">Type de contrat</h3>
        <div className="space-y-2">
          {jobTypes.map((type) => (
            <div key={type.value} className="flex items-center space-x-2">
              <Checkbox
                id={`type-${type.value}`}
                checked={selectedTypes.includes(type.value)}
                onCheckedChange={() => toggleType(type.value)}
                data-testid={`checkbox-type-${type.value}`}
              />
              <Label
                htmlFor={`type-${type.value}`}
                className="text-sm font-normal cursor-pointer"
              >
                {type.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {activeFiltersCount > 0 && (
        <Button
          variant="outline"
          className="w-full"
          onClick={clearFilters}
          data-testid="button-clear-filters"
        >
          <X className="h-4 w-4 mr-2" />
          Effacer les filtres ({activeFiltersCount})
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="lg:hidden pb-24">
        <header className="sticky top-0 z-40 bg-background border-b">
          <div className="p-4">
            <h1 className="text-xl font-bold" data-testid="text-jobs-page-title-mobile">
              {isEmployerFilteredView ? `Offres de ${employerNameFilter || "cet employeur"}` : "Rechercher un emploi"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {filteredJobs.length} offre{filteredJobs.length > 1 ? "s" : ""} disponible{filteredJobs.length > 1 ? "s" : ""}
            </p>
            {isEmployerFilteredView && (
              <div className="flex flex-wrap gap-2 pt-3">
                <Link href="/agencies">
                  <Button variant="outline" size="sm" className="gap-2" data-testid="button-back-employers-mobile">
                    <ArrowLeft className="h-4 w-4" />
                    Retour
                  </Button>
                </Link>
                {employerProfileHref && (
                  <Link href={employerProfileHref}>
                    <Button size="sm" className="gap-2" data-testid="button-view-employer-profile-mobile">
                      <Building2 className="h-4 w-4" />
                      Voir profil
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>
          {!isEmployerFilteredView && (
            <Tabs value={mobileTab} onValueChange={(v) => setMobileTab(v as any)} className="px-4 pb-2">
              <TabsList className="w-full">
                <TabsTrigger value="search" className="flex-1 gap-1" data-testid="tab-search">
                  <Search className="h-3.5 w-3.5" />
                  Recherche
                </TabsTrigger>
                <TabsTrigger value="landmarks" className="flex-1 gap-1" data-testid="tab-landmarks">
                  <Navigation className="h-3.5 w-3.5" />
                  Par repères
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </header>

        <div className="p-4 space-y-4">
          {isEmployerFilteredView ? (
            <>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-32 w-full rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredJobs.map((job) => (
                    <Card key={job.id} className="overflow-hidden" data-testid={`job-card-mobile-${job.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                              <Building2 className="h-6 w-6 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-semibold truncate">{job.title}</h3>
                              <p className="text-sm text-muted-foreground truncate" style={{ minHeight: 20 }}>
                                {job.organizationName || (isLoading ? (
                                  <span className="inline-block w-24 h-4 bg-muted animate-pulse rounded" />
                                ) : (
                                  "Entreprise inconnue"
                                ))}
                              </p>
                            </div>
                          </div>
                          <MatchBadge match={getMatch(job)} />
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <MapPin className="h-3 w-3" />
                            {job.location}
                          </Badge>
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <Briefcase className="h-3 w-3" />
                            {formatJobType(job.jobType)}
                          </Badge>
                          {formatJobSalary(job) && (
                            <Badge variant="outline" className="text-xs">
                              {formatJobSalary(job)}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t">
                          <span className="text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {formatJobPostedLabel(job.createdAt)}
                          </span>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleSave(job.id)}
                              aria-pressed={savedJobIds.has(job.id)}
                              aria-label={savedJobIds.has(job.id) ? "Retirer des offres sauvegardées" : "Sauvegarder cette offre"}
                              data-testid={`button-save-${job.id}`}
                            >
                              <Heart className={`h-4 w-4 ${savedJobIds.has(job.id) ? "fill-current text-destructive" : ""}`} />
                            </Button>
                            <Link href={`/jobs/${job.id}`}>
                              <Button size="sm" data-testid={`button-apply-${job.id}`}>
                                Postuler
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {error && !isLoading && (
                <div className="text-center py-12" role="alert">
                  <Briefcase className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                  <h3 className="font-medium text-lg">Erreur de chargement</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Impossible de charger les offres. Réessayez plus tard.
                  </p>
                </div>
              )}

              {filteredJobs.length === 0 && !isLoading && !error && (
                <div className="text-center py-12">
                  <Briefcase className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                  <h3 className="font-medium text-lg">Aucune offre trouvée</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Cet employeur n'a pas d'offres actives pour le moment
                  </p>
                </div>
              )}
            </>
          ) : mobileTab === "search" ? (
            <>
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Poste, entreprise..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-job-search-mobile"
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  <Button 
                    variant={selectedTypes.length === 0 ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => setSelectedTypes([])}
                    className="shrink-0"
                  >
                    Tous
                  </Button>
                  {jobTypes.map((type) => (
                    <Button
                      key={type.value}
                      variant={selectedTypes.includes(type.value) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleType(type.value)}
                      className="shrink-0"
                      data-testid={`filter-type-${type.value}`}
                    >
                      {type.label}
                    </Button>
                  ))}
                </div>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-32 w-full rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredJobs.map((job) => (
                    <Card key={job.id} className="overflow-hidden" data-testid={`job-card-mobile-${job.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                              <Building2 className="h-6 w-6 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-semibold truncate">{job.title}</h3>
                              {job.organizationName && (
                                <p className="text-sm text-muted-foreground truncate">
                                  {job.organizationName}
                                </p>
                              )}
                            </div>
                          </div>
                          <MatchBadge match={getMatch(job)} />
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <MapPin className="h-3 w-3" />
                            {job.location}
                          </Badge>
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <Briefcase className="h-3 w-3" />
                            {formatJobType(job.jobType)}
                          </Badge>
                          {formatJobSalary(job) && (
                            <Badge variant="outline" className="text-xs">
                              {formatJobSalary(job)}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t">
                          <span className="text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {formatJobPostedLabel(job.createdAt)}
                          </span>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleSave(job.id)}
                              aria-pressed={savedJobIds.has(job.id)}
                              aria-label={savedJobIds.has(job.id) ? "Retirer des offres sauvegardées" : "Sauvegarder cette offre"}
                              data-testid={`button-save-${job.id}`}
                            >
                              <Heart className={`h-4 w-4 ${savedJobIds.has(job.id) ? "fill-current text-destructive" : ""}`} />
                            </Button>
                            <Link href={`/jobs/${job.id}`}>
                              <Button size="sm" data-testid={`button-apply-${job.id}`}>
                                Postuler
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {error && !isLoading && (
                <div className="text-center py-12" role="alert">
                  <Briefcase className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                  <h3 className="font-medium text-lg">Erreur de chargement</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Impossible de charger les offres. Réessayez plus tard.
                  </p>
                </div>
              )}

              {filteredJobs.length === 0 && !isLoading && !error && (
                <div className="text-center py-12">
                  <Briefcase className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                  <h3 className="font-medium text-lg">Aucune offre trouvée</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Essayez de modifier vos critères de recherche
                  </p>
                </div>
              )}
            </>
          ) : (
            <LandmarkSearch
              selectedLandmark={selectedLandmark}
              onSelect={(landmark) => {
                setSelectedLandmark(landmark);
                setLocationQuery(landmark.neighborhood);
                setMobileTab("search");
              }}
            />
          )}
        </div>

        {user && <MobileBottomNav userType={user.userType} />}
      </div>

      <div className="hidden lg:block bg-card border-b py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold" data-testid="text-jobs-page-title">
                {isEmployerFilteredView ? `Offres de ${employerNameFilter || "cet employeur"}` : "Offres d'emploi"}
              </h1>
              <p className="text-muted-foreground">
                Découvrez {filteredJobs.length} opportunités disponibles
              </p>
            </div>

            {isEmployerFilteredView && (
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/agencies">
                  <Button variant="outline" className="gap-2" data-testid="button-back-employers">
                    <ArrowLeft className="h-4 w-4" />
                    Retour
                  </Button>
                </Link>
                {employerProfileHref && (
                  <Link href={employerProfileHref}>
                    <Button className="gap-2" data-testid="button-view-employer-profile">
                      <Building2 className="h-4 w-4" />
                      Voir profil
                    </Button>
                  </Link>
                )}
                <Link href="/jobs">
                  <Button variant="ghost" className="gap-2" data-testid="button-clear-employer-jobs-filter">
                    <X className="h-4 w-4" />
                    Toutes les offres
                  </Button>
                </Link>
              </div>
            )}

            {!isEmployerFilteredView && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Poste, entreprise ou mot-clé..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        data-testid="input-job-search"
                      />
                    </div>
                    <div className="relative flex-1">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Ville ou pays..."
                        className="pl-10"
                        value={locationQuery}
                        onChange={(e) => setLocationQuery(e.target.value)}
                        data-testid="input-location-search"
                      />
                    </div>
                    <Button className="gap-2" data-testid="button-search-jobs">
                      <Search className="h-4 w-4" />
                      Rechercher
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <div className="hidden lg:block container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-72 flex-shrink-0">
            <Card className="sticky top-20">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtres
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100vh-16rem)]">
                  <FilterContent />
                </ScrollArea>
              </CardContent>
            </Card>
          </aside>

          <main className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {filteredJobs.length} offre{filteredJobs.length > 1 ? "s" : ""} trouvée
                {filteredJobs.length > 1 ? "s" : ""}
              </p>

              <div className="flex items-center gap-2">
                <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      className="lg:hidden gap-2"
                      data-testid="button-mobile-filters"
                    >
                      <Filter className="h-4 w-4" />
                      Filtres
                      {activeFiltersCount > 0 && (
                        <Badge variant="secondary" className="ml-1">
                          {activeFiltersCount}
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80">
                    <SheetHeader>
                      <SheetTitle className="flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        Filtres
                      </SheetTitle>
                    </SheetHeader>
                    <div className="mt-6">
                      <FilterContent />
                    </div>
                  </SheetContent>
                </Sheet>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40" data-testid="select-sort">
                    <SelectValue placeholder="Trier par" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Plus récentes</SelectItem>
                    <SelectItem value="salary-high">Salaire décroissant</SelectItem>
                    <SelectItem value="salary-low">Salaire croissant</SelectItem>
                    <SelectItem value="popular">Plus populaires</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedCategories.map((category) => (
                  <Badge
                    key={category}
                    variant="secondary"
                    className="gap-1 cursor-pointer"
                    onClick={() => toggleCategory(category)}
                    data-testid={`badge-filter-category-${category.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {category}
                    <X className="h-3 w-3" />
                  </Badge>
                ))}
                {selectedTypes.map((type) => {
                  const typeLabel = jobTypes.find((t) => t.value === type)?.label || type;
                  return (
                    <Badge
                      key={type}
                      variant="secondary"
                      className="gap-1 cursor-pointer"
                      onClick={() => toggleType(type)}
                      data-testid={`badge-filter-type-${type}`}
                    >
                      {typeLabel}
                      <X className="h-3 w-3" />
                    </Badge>
                  );
                })}
              </div>
            )}

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        <Skeleton className="w-14 h-14 rounded-lg" />
                        <div className="flex-1 space-y-3">
                          <Skeleton className="h-6 w-1/2" />
                          <Skeleton className="h-4 w-1/3" />
                          <Skeleton className="h-4 w-full" />
                          <div className="flex gap-2">
                            <Skeleton className="h-6 w-20" />
                            <Skeleton className="h-6 w-20" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
            <div className="space-y-4">
              {filteredJobs.map((job) => (
                <Card key={job.id} className="hover-elevate overflow-visible" data-testid={`card-job-${job.id}`}>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center">
                          <Building2 className="h-7 w-7 text-muted-foreground" />
                        </div>
                      </div>

                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <Link href={`/jobs/${job.id}`}>
                                <h3
                                  className="text-lg font-semibold hover:text-primary transition-colors cursor-pointer"
                                  data-testid={`text-job-title-${job.id}`}
                                >
                                  {job.title}
                                </h3>
                              </Link>
                              {job.category && (
                                <Badge className="bg-secondary text-secondary-foreground">
                                  {job.category}
                                </Badge>
                              )}
                            </div>
                            <p className="text-muted-foreground text-sm mb-1" style={{ minHeight: 20 }}>
                              {job.organizationName || (isLoading ? (
                                <span className="inline-block w-24 h-4 bg-muted animate-pulse rounded" />
                              ) : (
                                "Entreprise inconnue"
                              ))}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleSave(job.id)}
                              aria-pressed={savedJobIds.has(job.id)}
                              aria-label={savedJobIds.has(job.id) ? "Retirer des offres sauvegardées" : "Sauvegarder cette offre"}
                              data-testid={`button-save-job-${job.id}`}
                            >
                              <Heart className={`h-4 w-4 ${savedJobIds.has(job.id) ? "fill-current text-destructive" : ""}`} />
                            </Button>
                            <ShareJobMenu
                              job={{ title: job.title, organizationName: job.organizationName }}
                              url={`${window.location.origin}/jobs/${job.id}`}
                              testIdPrefix={`share-job-${job.id}`}
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {job.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-4 w-4" />
                            {formatJobType(job.jobType)}
                          </span>
                          {formatJobSalary(job) && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            {formatJobSalary(job)}
                          </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatJobPostedLabel(job.createdAt)}
                          </span>
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {stripJobDescriptionHtml(job.description)}
                        </p>

                        {job.requirements && job.requirements.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {job.requirements.slice(0, 4).map((req) => (
                              <Badge key={req} variant="outline" className="text-xs">
                                {req}
                              </Badge>
                            ))}
                            {job.requirements.length > 4 && (
                              <Badge variant="outline" className="text-xs">
                                +{job.requirements.length - 4}
                              </Badge>
                            )}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                          <Link href={`/jobs/${job.id}`}>
                            <Button className="gap-2" data-testid={`button-apply-job-${job.id}`}>
                              Voir l'offre
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {error && !isLoading && (
                <Card>
                  <CardContent className="p-12 text-center" role="alert">
                    <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Erreur de chargement</h3>
                    <p className="text-muted-foreground">
                      Impossible de charger les offres. Réessayez plus tard.
                    </p>
                  </CardContent>
                </Card>
              )}

              {filteredJobs.length === 0 && !isLoading && !error && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Aucune offre trouvée</h3>
                    <p className="text-muted-foreground mb-4">
                      Essayez de modifier vos critères de recherche ou de supprimer certains filtres.
                    </p>
                    <Button variant="outline" onClick={clearFilters} data-testid="button-clear-all-filters">
                      Effacer tous les filtres
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
