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
  Search,
  MapPin,
  Briefcase,
  Clock,
  Filter,
  Building2,
  DollarSign,
  ChevronRight,
  Heart,
  Share2,
  X,
  Loader2,
  Navigation,
  Sparkles,
} from "lucide-react";
import { LandmarkSearch } from "@/components/landmark-search";
import { useAuth } from "@/lib/auth";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import type { JobPosting } from "@shared/schema";

const jobCategories = [
  "Technologie",
  "Finance",
  "Marketing",
  "Ressources Humaines",
  "Ventes",
  "Administration",
  "Ingénierie",
  "Santé",
  "Éducation",
  "Construction",
];

const jobTypes = [
  { value: "cdi", label: "CDI" },
  { value: "cdd", label: "CDD" },
  { value: "stage", label: "Stage" },
  { value: "freelance", label: "Freelance" },
  { value: "temps-partiel", label: "Temps partiel" },
];

const experienceLevels = [
  { value: "junior", label: "Junior (0-2 ans)" },
  { value: "intermediate", label: "Intermédiaire (2-5 ans)" },
  { value: "senior", label: "Senior (5-10 ans)" },
  { value: "expert", label: "Expert (10+ ans)" },
];

export default function JobsPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"search" | "landmarks">("search");
  const [selectedLandmark, setSelectedLandmark] = useState<any>(null);

  const { data: jobs = [], isLoading, error } = useQuery<JobPosting[]>({
    queryKey: ["/api/jobs"],
  });

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

  const filteredJobs = jobs.filter((job) => {
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

    return matchesSearch && matchesLocation && matchesCategory && matchesType;
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

      <div>
        <h3 className="font-medium mb-3">Niveau d'expérience</h3>
        <div className="space-y-2">
          {experienceLevels.map((level) => (
            <div key={level.value} className="flex items-center space-x-2">
              <Checkbox
                id={`exp-${level.value}`}
                data-testid={`checkbox-experience-${level.value}`}
              />
              <Label
                htmlFor={`exp-${level.value}`}
                className="text-sm font-normal cursor-pointer"
              >
                {level.label}
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
              Rechercher un emploi
            </h1>
            <p className="text-sm text-muted-foreground">
              {filteredJobs.length} offres disponibles à Bamako
            </p>
          </div>
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
        </header>

        <div className="p-4 space-y-4">
          {mobileTab === "search" ? (
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
                              <p className="text-sm text-muted-foreground truncate">{job.companyId}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 bg-gradient-to-r from-primary/20 to-accent/20 rounded-full px-2.5 py-1 shrink-0">
                            <Sparkles className="h-3.5 w-3.5 text-primary" />
                            <span className="font-bold text-xs">{Math.floor(70 + Math.random() * 25)}%</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <MapPin className="h-3 w-3" />
                            {job.location}
                          </Badge>
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <Briefcase className="h-3 w-3" />
                            {job.jobType}
                          </Badge>
                          {job.salaryRange && (
                            <Badge variant="outline" className="text-xs">
                              {job.salaryRange}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t">
                          <span className="text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 inline mr-1" />
                            Il y a 2 jours
                          </span>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" data-testid={`button-save-${job.id}`}>
                              <Heart className="h-4 w-4" />
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

              {filteredJobs.length === 0 && !isLoading && (
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
                Offres d'emploi
              </h1>
              <p className="text-muted-foreground">
                Découvrez {filteredJobs.length} opportunités disponibles
              </p>
            </div>

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

                <Select defaultValue="recent">
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
                            <p className="text-muted-foreground">Entreprise partenaire</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              data-testid={`button-save-job-${job.id}`}
                            >
                              <Heart className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              data-testid={`button-share-job-${job.id}`}
                            >
                              <Share2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {job.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-4 w-4" />
                            {job.jobType}
                          </span>
                          {job.salaryRange && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            {job.salaryRange}
                          </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            Récent
                          </span>
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {job.description}
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
              
              {filteredJobs.length === 0 && (
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
