import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Search, 
  Plus,
  Briefcase,
  MapPin,
  Calendar,
  Eye,
  Users,
  Clock,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  AlertTriangle,
  Banknote,
  GraduationCap,
  Globe,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatJobType } from "@/lib/job-type-labels";
import { sanitizeJobDescriptionHtml } from "@/lib/sanitize-html";
import { jobCategoryOptions as categories } from "@/lib/options-offre";
import { MissionCardsGrid, getMissionStatus, type MissionCardData, type MissionStatus } from "@/components/mission-cards-grid";
import type { JobPosting } from "@shared/schema";

type AgencyJobRow = JobPosting & {
  applicationCount: number;
  hiredCount: number;
  daysOpen: number;
  clientCompanyName: string;
  isPendingModeration: boolean;
};

const statusTabs: { value: "all" | MissionStatus; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "urgente", label: "Urgentes" },
  { value: "en_cours", label: "En cours" },
  { value: "en_attente", label: "En attente" },
  { value: "pourvue", label: "Pourvues" },
];

const educationLevels = [
  { value: "none", label: "Sans diplôme" },
  { value: "bac", label: "Baccalauréat" },
  { value: "bac+2", label: "Bac+2 (BTS, DUT)" },
  { value: "bac+3", label: "Bac+3 (Licence)" },
  { value: "bac+5", label: "Bac+5 (Master)" },
  { value: "bac+8", label: "Doctorat" },
];

export function MissionsManagement() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState<"all" | MissionStatus>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedJob, setSelectedJob] = useState<AgencyJobRow | null>(null);
  const itemsPerPage = 8;

  // This agency's own postings only — not the public job board (GET
  // /api/jobs, every active job on the platform). This screen edits/deletes/
  // toggles jobs, so it must never show anyone else's.
  const { data: jobs = [], isLoading } = useQuery<AgencyJobRow[]>({
    queryKey: ['/api/agency/jobs'],
  });

  // Publish an offline job (draft or closed). The server decides: a
  // partner-plan agency's job goes live, a standard-plan agency's
  // never-validated job goes to the admin review queue instead.
  const publishJobMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('PATCH', `/api/jobs/${id}`, { isActive: true });
      return res.json() as Promise<{ isActive: boolean | null }>;
    },
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: ['/api/agency/jobs'] });
      toast(job.isActive
        ? { title: "Offre publiée", description: "L'offre est visible immédiatement par les candidats." }
        : { title: "Offre soumise pour validation", description: "L'équipe BaaraMatch l'examinera sous 24h maximum. Vous serez notifié dès sa validation." });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de publier l'offre",
        variant: "destructive",
      });
    },
  });

  // Delete job mutation
  const deleteJobMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/jobs/${id}`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agency/jobs'] });
      toast({
        title: "Offre supprimée",
        description: "L'offre d'emploi a été supprimée",
      });
      setSelectedJob(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer l'offre",
        variant: "destructive",
      });
    },
  });

  const missionCards: MissionCardData[] = jobs.map((job) => ({
    id: job.id,
    title: job.title,
    clientLabel: job.clientCompanyName,
    location: job.location,
    jobType: job.jobType,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    salaryCurrency: job.salaryCurrency,
    applicationCount: job.applicationCount,
    positions: job.positions ?? 1,
    hiredCount: job.hiredCount,
    isUrgent: !!job.isUrgent,
    isActive: !!job.isActive,
    isPendingModeration: job.isPendingModeration,
    daysOpen: job.daysOpen,
    skills: job.requiredSkills ?? [],
  }));

  const statusCounts: Record<"all" | MissionStatus, number> = {
    all: jobs.length,
    urgente: missionCards.filter((m) => getMissionStatus(m) === "urgente").length,
    en_cours: missionCards.filter((m) => getMissionStatus(m) === "en_cours").length,
    en_attente: missionCards.filter((m) => getMissionStatus(m) === "en_attente").length,
    pourvue: missionCards.filter((m) => getMissionStatus(m) === "pourvue").length,
    fermee: missionCards.filter((m) => getMissionStatus(m) === "fermee").length,
  };

  // Filter jobs
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(searchQuery.toLowerCase());

    const mission = missionCards.find((m) => m.id === job.id)!;
    const matchesStatus = statusTab === "all" || getMissionStatus(mission) === statusTab;

    const matchesCategory = !categoryFilter || categoryFilter === "all" || job.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });
  const filteredMissionCards = filteredJobs.map((job) => missionCards.find((m) => m.id === job.id)!);

  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
  const paginatedJobs = filteredJobs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const paginatedMissionCards = filteredMissionCards.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const jobTypeBadgeColors: Record<string, string> = {
    "full-time": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    "part-time": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    contract: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    internship: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    temporary: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    cdi: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    cdd: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    interim: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    stage: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    journalier: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    prestation: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  };

  const getJobTypeBadge = (type: string) => ({
    label: formatJobType(type) ?? type,
    className: jobTypeBadgeColors[type] ?? "bg-gray-100 text-gray-800",
  });

  const formatSalary = (min?: number | null, max?: number | null, currency?: string | null) => {
    if (!min && !max) return "Non spécifié";
    const curr = currency || "XOF";
    if (min && max) return `${min.toLocaleString()} - ${max.toLocaleString()} ${curr}`;
    if (min) return `À partir de ${min.toLocaleString()} ${curr}`;
    if (max) return `Jusqu'à ${max.toLocaleString()} ${curr}`;
    return "Non spécifié";
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statusCounts.all}</p>
                <p className="text-xs text-muted-foreground">Total missions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-300" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statusCounts.urgente}</p>
                <p className="text-xs text-muted-foreground">Urgentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statusCounts.en_cours}</p>
                <p className="text-xs text-muted-foreground">En cours</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                <Users className="h-5 w-5 text-green-600 dark:text-green-300" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statusCounts.pourvue}</p>
                <p className="text-xs text-muted-foreground">Pourvues</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status tabs + create button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex rounded-lg border p-1 bg-card flex-wrap">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setStatusTab(tab.value); setCurrentPage(1); }}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${statusTab === tab.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              data-testid={`filter-mission-status-${tab.value}`}
            >
              {tab.label} <span className="ml-1 opacity-80">{statusCounts[tab.value]}</span>
            </button>
          ))}
        </div>
        <Button onClick={() => setLocation("/agency/missions/new")} data-testid="button-create-job">
          <Plus className="h-4 w-4 mr-2" />
          Créer une mission
        </Button>
      </div>

      {/* Search + category filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une mission..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-jobs"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-category-filter">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Mission cards */}
      <MissionCardsGrid
        missions={paginatedMissionCards}
        isLoading={isLoading}
        onViewDetails={(mission) => setSelectedJob(jobs.find((j) => j.id === mission.id) ?? null)}
        onEdit={(mission) => setLocation(`/agency/missions/${mission.id}/edit`)}
        onDelete={(mission) => deleteJobMutation.mutate(mission.id)}
        onPublish={(mission) => publishJobMutation.mutate(mission.id)}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredJobs.length} offre(s) trouvée(s)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Job Details Sheet */}
      <Sheet open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="space-y-4 pb-4 border-b">
            <div className="flex items-start justify-between">
              <div>
                <SheetTitle className="text-xl">{selectedJob?.title}</SheetTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={selectedJob ? getJobTypeBadge(selectedJob.jobType).className : ""}>
                    {selectedJob ? getJobTypeBadge(selectedJob.jobType).label : ""}
                  </Badge>
                  {selectedJob?.isUrgent && (
                    <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                      Urgent
                    </Badge>
                  )}
                  {selectedJob?.isRemote && (
                    <Badge variant="outline">
                      <Globe className="h-3 w-3 mr-1" />
                      Télétravail
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </SheetHeader>

          {selectedJob && (
            <div className="space-y-6 pt-6">
              {/* Location & Category */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedJob.location}</span>
                </div>
                {selectedJob.category && (
                  <div className="flex items-center gap-3 text-sm">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedJob.category}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Description
                </h3>
                <div
                  className="text-sm prose prose-sm max-w-none [&_p]:whitespace-pre-line"
                  data-testid="text-mission-description"
                  dangerouslySetInnerHTML={{ __html: sanitizeJobDescriptionHtml(selectedJob.description) }}
                />
              </div>

              {/* Salary */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Rémunération
                </h3>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Banknote className="h-5 w-5 text-primary" />
                  <span className="font-medium">
                    {formatSalary(selectedJob.salaryMin, selectedJob.salaryMax, selectedJob.salaryCurrency)}
                  </span>
                </div>
              </div>

              {/* Experience */}
              {(selectedJob.experienceMin || selectedJob.experienceMax) && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Expérience requise
                  </h3>
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {selectedJob.experienceMin && selectedJob.experienceMax
                        ? `${selectedJob.experienceMin} - ${selectedJob.experienceMax} ans`
                        : selectedJob.experienceMin
                        ? `Minimum ${selectedJob.experienceMin} ans`
                        : `Maximum ${selectedJob.experienceMax} ans`}
                    </span>
                  </div>
                </div>
              )}

              {/* Education */}
              {selectedJob.educationLevel && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Niveau d'études
                  </h3>
                  <div className="flex items-center gap-3 text-sm">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {educationLevels.find(e => e.value === selectedJob.educationLevel)?.label || selectedJob.educationLevel}
                    </span>
                  </div>
                </div>
              )}

              {/* Skills */}
              {selectedJob.requiredSkills && selectedJob.requiredSkills.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Compétences requises
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.requiredSkills.map((skill) => (
                      <Badge key={skill} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Requirements */}
              {selectedJob.requirements && selectedJob.requirements.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Exigences
                  </h3>
                  <ul className="space-y-1 text-sm list-disc list-inside">
                    {selectedJob.requirements.map((req, idx) => (
                      <li key={idx}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Benefits */}
              {selectedJob.benefits && selectedJob.benefits.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Avantages
                  </h3>
                  <ul className="space-y-1 text-sm list-disc list-inside">
                    {selectedJob.benefits.map((benefit, idx) => (
                      <li key={idx}>{benefit}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Stats */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Statistiques
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{selectedJob.viewCount || 0}</p>
                      <p className="text-xs text-muted-foreground">Vues</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{selectedJob.applicationCount || 0}</p>
                      <p className="text-xs text-muted-foreground">Candidatures</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Dates
                </h3>
                <div className="space-y-2 text-sm">
                  {selectedJob.applicationDeadline && (
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Date limite: {new Date(selectedJob.applicationDeadline).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  )}
                  {selectedJob.startDate && (
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Début: {new Date(selectedJob.startDate).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Publiée le {selectedJob.createdAt ? new Date(selectedJob.createdAt).toLocaleDateString('fr-FR') : "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setLocation(`/agency/missions/${selectedJob.id}/edit`)}
                  data-testid="button-edit-job-detail"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier
                </Button>
                <Button 
                  variant="destructive" 
                  className="flex-1"
                  onClick={() => {
                    deleteJobMutation.mutate(selectedJob.id);
                  }}
                  data-testid="button-delete-job-detail"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
