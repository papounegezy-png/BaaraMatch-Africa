import { useEffect, useRef, useState } from "react";
import { useLocation, Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/loading-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { CompanyRecruitmentKanban } from "@/components/recruitment-kanban-board";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { OfferForm, mapJobPostingToOfferFormValue, type OfferFormValue, type OfferSaveResult } from "@/components/offer-form";
import { ProposeInterviewSlotsDialog } from "@/components/propose-interview-slots-dialog";
import { InterviewCalendar } from "@/components/interview-calendar";
import { SendMessageDialog } from "@/components/send-message-dialog";
import { CandidateProfileView } from "@/components/candidate-profile-view";
import { CompanyApplicationsPipeline } from "@/components/company-applications-pipeline";
import { MissionCardsGrid, getMissionStatus, type MissionCardData, type MissionStatus } from "@/components/mission-cards-grid";
import { sanitizeJobDescriptionHtml } from "@/lib/sanitize-html";
import type { JobPosting } from "@shared/schema";
import {
  Briefcase,
  Users,
  Calendar,
  TrendingUp,
  Plus,
  Eye,
  Edit,
  Trash2,
  MapPin,
  Building2,
  Search,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  MessageSquare,
  Save,
  Camera,
  ImageIcon,
  Loader2,
} from "lucide-react";
import { EmployeeManagement } from "@/components/employee-management";
import { LeaveManagement } from "@/components/leave-management";
import { PayrollManagement } from "@/components/payroll-management";
import { OrgChart } from "@/components/org-chart";
import { DepartmentManagement } from "@/components/department-management";
import { PositionManagement } from "@/components/position-management";
import { SecurityManagement } from "@/components/security-management";
import { SitesManagement } from "@/components/sites-management";
import { CertificationsManagement } from "@/components/certifications-management";
import { EPIManagement } from "@/components/epi-management";
import { HSEManagement } from "@/components/hse-management";

type CompanyDashboardData = {
  user: {
    id: string;
    fullName: string;
    email: string;
    city: string | null;
    country: string | null;
  };
  profile: {
    companyName: string;
    industry: string | null;
    description: string | null;
    website: string | null;
    employeeCount: string | null;
    foundedYear: number | null;
    billingAddress: string | null;
    logoUrl: string | null;
    coverImageUrl: string | null;
  } | null;
  modules: string[];
  stats: {
    activeJobs: number;
    totalJobs: number;
    totalApplicationsReceived: number;
    interviewsScheduled: number;
    conversionRate: number;
    monthlyApplicationsDelta: number;
  };
  jobs: Array<{
    id: string;
    title: string;
    department: string;
    location: string;
    type: string;
    status: "active" | "paused";
    postedAt: string;
    salary: string;
    salaryMin: number | null;
    salaryMax: number | null;
    salaryCurrency: string | null;
    applications: number;
    newApplications: number;
    description: string;
    isUrgent: boolean;
    requiredSkills: string[];
    positions: number;
    hiredCount: number;
    daysOpen: number;
  }>;
  applications: Array<{
    id: string;
    jobId: string;
    jobTitle: string;
    stage: string;
    appliedAt: string;
    matchScore: number;
    candidate: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      city: string | null;
      avatarUrl: string | null;
      title: string | null;
    } | null;
  }>;
  recentApplications: Array<{
    id: string;
    jobId: string;
    jobTitle: string;
    stage: string;
    appliedAt: string;
    matchScore: number;
    candidate: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      city: string | null;
      avatarUrl: string | null;
      title: string | null;
    } | null;
  }>;
  pipeline: Array<{
    key: string;
    label: string;
    count: number;
  }>;
  monthlyApplications: Array<{
    month: string;
    count: number;
  }>;
};

const stageLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "Nouveau", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  reviewing: { label: "En revue", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300" },
  shortlisted: { label: "Présélection", color: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300" },
  interview: { label: "Entretien", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300" },
  offered: { label: "Offre", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  hired: { label: "Recruté", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300" },
  rejected: { label: "Refusé", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
  withdrawn: { label: "Retiré", color: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300" },
};

// PATCH body for an existing company job (draft continuation or edit).
// Cleared fields are sent as null so they're actually cleared server-side.
function buildJobUpdatePayload(form: OfferFormValue) {
  return {
    title: form.title,
    description: form.descriptionHtml,
    location: form.location,
    jobType: form.contractType,
    category: form.category,
    educationLevel: form.educationLevel || null,
    salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
    salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
    requiredSkills: form.skills,
    applicationDeadline: form.applicationDeadline || null,
    startDate: form.startDate || null,
    isRemote: form.isRemote,
    isUrgent: form.isUrgent,
    positions: form.positions ? Number(form.positions) : 1,
    visibleToAgencies: form.visibleToAgencies,
    acceptsPlatformApplications: form.acceptsPlatformApplications,
  };
}

function DashboardLoadingState({ title }: { title: string }) {
  return <LoadingState label={title} variant="block" rows={3} className="min-h-[50vh]" />;
}

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleDateString("fr-FR");
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function DashboardOverview({ data, onCreateJob }: { data: CompanyDashboardData; onCreateJob: () => void }) {
  const stats = [
    { title: "Postes ouverts", value: data.stats.activeJobs, change: data.stats.activeJobs, icon: Briefcase, color: "text-blue-600" },
    { title: "Candidatures totales", value: data.stats.totalApplicationsReceived, change: data.stats.monthlyApplicationsDelta, icon: Users, color: "text-green-600" },
    { title: "Entretiens planifiés", value: data.stats.interviewsScheduled, change: data.stats.interviewsScheduled, icon: Calendar, color: "text-purple-600" },
    { title: "Taux de conversion", value: `${data.stats.conversionRate}%`, change: data.stats.conversionRate, icon: TrendingUp, color: "text-amber-600" },
  ];

  const activeJobs = data.jobs.filter((job) => job.status === "active").slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Tableau de bord</h1>
          <p className="text-muted-foreground">Vue d'ensemble de vos activites de recrutement</p>
        </div>
        <Button className="gap-2" onClick={onCreateJob} data-testid="button-create-job">
          <Plus className="h-4 w-4" />
          Nouvelle offre
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full bg-muted ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1 text-sm">
                {stat.change >= 0 ? (
                  <>
                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">+{stat.change}</span>
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="h-4 w-4 text-red-600" />
                    <span className="text-red-600">{stat.change}</span>
                  </>
                )}
                <span className="text-muted-foreground">ce mois</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Candidatures récentes</CardTitle>
            <CardDescription>Les 5 dernières candidatures reçues</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentApplications.map((app) => (
                <div key={app.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-violet-500 to-pink-500 text-white">
                        {getInitials(app.candidate?.name ?? "?")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{app.candidate?.name ?? "Candidat inconnu"}</p>
                      <p className="text-sm text-muted-foreground">{app.jobTitle}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={stageLabels[app.stage]?.color ?? "bg-muted text-foreground"}>
                      {stageLabels[app.stage]?.label ?? app.stage}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">Score: {app.matchScore}%</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Postes actifs</CardTitle>
            <CardDescription>Vos offres d'emploi en cours</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{job.title}</p>
                      <Badge variant="outline" className="text-xs">{job.type}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>
                      <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{job.department}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{job.applications}</p>
                    <p className="text-xs text-muted-foreground">candidatures</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pipeline de recrutement</CardTitle>
          <CardDescription>Répartition des candidats par étape</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {data.pipeline.map((step) => (
              <div key={step.key} className="text-center">
                <div className="h-24 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <span className="text-2xl font-bold text-primary">{step.count}</span>
                </div>
                <p className="text-sm font-medium">{step.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function JobListings({
  jobs,
  onDelete,
}: {
  jobs: CompanyDashboardData["jobs"];
  onDelete: (jobId: string) => Promise<void>;
}) {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusTab, setStatusTab] = useState<"all" | MissionStatus>("all");
  const [selectedJob, setSelectedJob] = useState<CompanyDashboardData["jobs"][number] | null>(null);

  const missionCards: MissionCardData[] = jobs.map((job) => ({
    id: job.id,
    title: job.title,
    clientLabel: job.department,
    location: job.location,
    jobType: job.type,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    salaryCurrency: job.salaryCurrency,
    applicationCount: job.applications,
    positions: job.positions,
    hiredCount: job.hiredCount,
    isUrgent: job.isUrgent,
    isActive: job.status === "active",
    // Companies never go through the agency's moderation gate (see POST
    // /api/jobs) — their jobs are either active or explicitly paused, no
    // "pending review" state exists for them.
    isPendingModeration: false,
    daysOpen: job.daysOpen,
    skills: job.requiredSkills,
  }));

  const statusCounts: Record<"all" | MissionStatus, number> = {
    all: jobs.length,
    urgente: missionCards.filter((m) => getMissionStatus(m) === "urgente").length,
    en_cours: missionCards.filter((m) => getMissionStatus(m) === "en_cours").length,
    en_attente: 0,
    pourvue: missionCards.filter((m) => getMissionStatus(m) === "pourvue").length,
    fermee: missionCards.filter((m) => getMissionStatus(m) === "fermee").length,
  };

  const filteredMissionCards = missionCards.filter((mission) => {
    const matchesSearch = `${mission.title} ${mission.clientLabel} ${mission.location}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusTab === "all" || getMissionStatus(mission) === statusTab;
    return matchesSearch && matchesStatus;
  });

  const jobStatusTabs: { value: "all" | MissionStatus; label: string }[] = [
    { value: "all", label: "Toutes" },
    { value: "urgente", label: "Urgentes" },
    { value: "en_cours", label: "En cours" },
    { value: "pourvue", label: "Pourvues" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{statusCounts.all}</p><p className="text-xs text-muted-foreground">Total offres</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{statusCounts.urgente}</p><p className="text-xs text-muted-foreground">Urgentes</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{statusCounts.en_cours}</p><p className="text-xs text-muted-foreground">En cours</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{statusCounts.pourvue}</p><p className="text-xs text-muted-foreground">Pourvues</p></CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex rounded-lg border p-1 bg-card flex-wrap">
          {jobStatusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusTab(tab.value)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${statusTab === tab.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              data-testid={`filter-job-status-${tab.value}`}
            >
              {tab.label} <span className="ml-1 opacity-80">{statusCounts[tab.value]}</span>
            </button>
          ))}
        </div>
        <Button className="gap-2" onClick={() => setLocation("/company/jobs/new")} data-testid="button-create-job">
          <Plus className="h-4 w-4" />
          Nouvelle offre
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher une offre..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} data-testid="input-search-jobs" />
      </div>

      <MissionCardsGrid
        missions={filteredMissionCards}
        isLoading={false}
        onViewDetails={(mission) => setSelectedJob(jobs.find((j) => j.id === mission.id) ?? null)}
        onEdit={(mission) => setLocation(`/company/jobs/${mission.id}/edit`)}
        onDelete={(mission) => onDelete(mission.id)}
      />

      <Sheet open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="space-y-3 pb-4 border-b">
            <SheetTitle className="text-xl">{selectedJob?.title}</SheetTitle>
            {selectedJob && (
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">{selectedJob.type}</Badge>
                {selectedJob.isUrgent && <Badge variant="destructive">Urgent</Badge>}
                <Badge variant="outline">{selectedJob.department}</Badge>
              </div>
            )}
          </SheetHeader>
          {selectedJob && (
            <div className="space-y-6 pt-6">
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{selectedJob.location}</span>
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Description</h3>
                <div
                  className="text-sm prose prose-sm max-w-none [&_p]:whitespace-pre-line"
                  dangerouslySetInnerHTML={{ __html: sanitizeJobDescriptionHtml(selectedJob.description) }}
                />
              </div>
              {selectedJob.requiredSkills.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Compétences requises</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.requiredSkills.map((skill) => <Badge key={skill} variant="secondary">{skill}</Badge>)}
                  </div>
                </div>
              )}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Rémunération</h3>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <span className="font-medium">{selectedJob.salary}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{selectedJob.applications}</p>
                    <p className="text-xs text-muted-foreground">Candidatures</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{selectedJob.hiredCount}/{selectedJob.positions}</p>
                    <p className="text-xs text-muted-foreground">Postes pourvus</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" className="flex-1" onClick={() => setLocation(`/company/jobs/${selectedJob.id}/edit`)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier
                </Button>
                <Button variant="destructive" className="flex-1" onClick={() => { onDelete(selectedJob.id); setSelectedJob(null); }}>
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

function RecruitmentPipelinePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pipeline de recrutement</h1>
        <p className="text-muted-foreground">Suivi en direct de chaque étape du recrutement, tous postes confondus</p>
      </div>
      <CompanyRecruitmentKanban />
    </div>
  );
}

function RecruitmentStatisticsPage({ data }: { data: CompanyDashboardData }) {
  const maxCount = Math.max(...data.monthlyApplications.map((item) => item.count), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Statistiques de recrutement</h1>
        <p className="text-muted-foreground">Analyse des volumes et performances de recrutement</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Offres publiées</div><div className="text-2xl font-bold">{data.stats.totalJobs}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Candidatures reçues</div><div className="text-2xl font-bold">{data.stats.totalApplicationsReceived}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Taux de conversion</div><div className="text-2xl font-bold">{data.stats.conversionRate}%</div></CardContent></Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Volume mensuel des candidatures</CardTitle>
          <CardDescription>Derniers mois d'activité</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-3 h-52">
            {data.monthlyApplications.map((item) => (
              <div key={item.month} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex items-end justify-center h-40">
                  <div className="w-10 rounded-t bg-primary" style={{ height: `${(item.count / maxCount) * 100}%` }} />
                </div>
                <div className="text-xs text-center">
                  <p className="font-medium">{item.month}</p>
                  <p className="text-muted-foreground">{item.count}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CompanySettingsPage({
  data,
  onSave,
  isSaving,
}: {
  data: CompanyDashboardData;
  onSave: (payload: { userUpdates: Record<string, unknown>; profileUpdates: Record<string, unknown> }) => Promise<void>;
  isSaving: boolean;
}) {
  const [form, setForm] = useState({
    companyName: data.profile?.companyName ?? data.user.fullName,
    industry: data.profile?.industry ?? "",
    description: data.profile?.description ?? "",
    website: data.profile?.website ?? "",
    employeeCount: data.profile?.employeeCount ?? "",
    foundedYear: data.profile?.foundedYear?.toString() ?? "",
    billingAddress: data.profile?.billingAddress ?? "",
    city: data.user.city ?? "",
    country: data.user.country ?? "",
  });

  useEffect(() => {
    setForm({
      companyName: data.profile?.companyName ?? data.user.fullName,
      industry: data.profile?.industry ?? "",
      description: data.profile?.description ?? "",
      website: data.profile?.website ?? "",
      employeeCount: data.profile?.employeeCount ?? "",
      foundedYear: data.profile?.foundedYear?.toString() ?? "",
      billingAddress: data.profile?.billingAddress ?? "",
      city: data.user.city ?? "",
      country: data.user.country ?? "",
    });
  }, [data]);

  const { toast } = useToast();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Impossible de lire le fichier."));
      reader.readAsDataURL(file);
    });

  const logoMutation = useMutation({
    mutationFn: async (imageBase64: string) => {
      const response = await apiRequest("POST", "/api/company/logo/upload", { imageBase64 });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/company"] });
      toast({ title: "Logo mis à jour" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de télécharger le logo.", variant: "destructive" });
    },
  });

  const coverMutation = useMutation({
    mutationFn: async (imageBase64: string) => {
      const response = await apiRequest("POST", "/api/company/cover/upload", { imageBase64 });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/company"] });
      toast({ title: "Image de couverture mise à jour" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de télécharger l'image de couverture.", variant: "destructive" });
    },
  });

  const handleImageFile = async (
    file: File | undefined,
    maxMb: number,
    mutate: (dataUrl: string) => void,
  ) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Format invalide", description: "Veuillez sélectionner une image.", variant: "destructive" });
      return;
    }
    if (file.size > maxMb * 1024 * 1024) {
      toast({ title: "Fichier trop volumineux", description: `La taille maximum est de ${maxMb} Mo.`, variant: "destructive" });
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    mutate(dataUrl);
  };

  const getInitials = (name: string) =>
    name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground">Mettez à jour les informations de votre entreprise</p>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Logo et image de couverture</CardTitle>
          <CardDescription>Affichés sur votre profil public entreprise</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleImageFile(e.target.files?.[0], 5, (dataUrl) => coverMutation.mutate(dataUrl))}
            data-testid="input-cover-upload"
          />
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleImageFile(e.target.files?.[0], 2, (dataUrl) => logoMutation.mutate(dataUrl))}
            data-testid="input-logo-upload"
          />

          <div
            className="relative h-40 rounded-lg bg-gradient-to-br from-primary-dark to-primary bg-cover bg-center"
            style={data.profile?.coverImageUrl ? { backgroundImage: `url(${data.profile.coverImageUrl})` } : undefined}
          >
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="absolute top-3 right-3 gap-2"
              disabled={coverMutation.isPending}
              onClick={() => coverInputRef.current?.click()}
              data-testid="button-change-cover"
            >
              {coverMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
              {data.profile?.coverImageUrl ? "Changer la couverture" : "Ajouter une couverture"}
            </Button>

            <div className="absolute -bottom-8 left-6">
              <div className="relative">
                <Avatar className="h-20 w-20 border-4 border-background">
                  <AvatarImage src={data.profile?.logoUrl || undefined} className="object-contain bg-white p-1" />
                  <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                    {getInitials(form.companyName || "?")}
                  </AvatarFallback>
                </Avatar>
                <Button
                  type="button"
                  size="icon"
                  className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full"
                  disabled={logoMutation.isPending}
                  onClick={() => logoInputRef.current?.click()}
                  data-testid="button-change-logo"
                >
                  {logoMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          </div>
          <div className="h-8" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profil entreprise</CardTitle>
          <CardDescription>Informations visibles et utilisées dans vos recrutements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2"><Label>Nom de l'entreprise</Label><Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Secteur</Label><Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Site web</Label><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Effectif</Label><Input value={form.employeeCount} onChange={(e) => setForm({ ...form, employeeCount: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Année de création</Label><Input value={form.foundedYear} onChange={(e) => setForm({ ...form, foundedYear: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Adresse de facturation</Label><Input value={form.billingAddress} onChange={(e) => setForm({ ...form, billingAddress: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Ville</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Pays</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
          </div>
          <div className="grid gap-2"><Label>Description</Label><Textarea rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>

          <div className="space-y-2">
            <Label>Modules activés</Label>
            <div className="flex flex-wrap gap-2">
              {data.modules.length === 0 ? <Badge variant="outline">Aucun module activé</Badge> : data.modules.map((module) => <Badge key={module} variant="secondary">{module}</Badge>)}
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              className="gap-2"
              disabled={isSaving}
              onClick={() => onSave({
                userUpdates: {
                  fullName: form.companyName,
                  city: form.city || null,
                  country: form.country || null,
                },
                profileUpdates: {
                  companyName: form.companyName,
                  industry: form.industry || null,
                  description: form.description || null,
                  website: form.website || null,
                  employeeCount: form.employeeCount || null,
                  foundedYear: form.foundedYear ? Number(form.foundedYear) : null,
                  billingAddress: form.billingAddress || null,
                },
              })}
            >
              <Save className="h-4 w-4" />
              Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ComingSoonPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="p-6 rounded-full bg-muted mb-6">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-bold mb-2">{title}</h1>
      <p className="text-muted-foreground max-w-md">{description}</p>
    </div>
  );
}

export default function CompanyDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  const dashboardQuery = useQuery<CompanyDashboardData>({
    queryKey: ["/api/dashboard/company"],
    enabled: !!user && user.userType === "company",
  });

  const editJobMatch = location.match(/^\/company\/jobs\/([^/]+)\/edit$/);
  const editingJobId = editJobMatch ? editJobMatch[1] : null;
  const editJobQuery = useQuery<JobPosting>({
    queryKey: ["/api/jobs", editingJobId],
    enabled: !!editingJobId,
  });
  // An offline job opened for editing is continued as a draft. Frozen per
  // job: publishing it refetches it as live, which must not flip the form
  // back to plain edit mode (and lose its confirmation screen) mid-flow.
  const [draftEditJobId, setDraftEditJobId] = useState<string | null>(null);
  const editJobIsOffline = !!editJobQuery.data && editJobQuery.data.id === editingJobId && !editJobQuery.data.isActive;
  useEffect(() => {
    if (!editingJobId) setDraftEditJobId(null);
    else if (editJobIsOffline) setDraftEditJobId(editingJobId);
  }, [editingJobId, editJobIsOffline]);
  const editContinuesDraft = !!editingJobId && (draftEditJobId === editingJobId || editJobIsOffline);

  const jobMutation = useMutation({
    mutationFn: async ({ url, method, data }: { url: string; method: string; data?: unknown }) => {
      const response = await apiRequest(method, url, data);
      return response.json().catch(() => null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/company"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
    },
  });

  const profileMutation = useMutation({
    mutationFn: async (payload: { userUpdates: Record<string, unknown>; profileUpdates: Record<string, unknown> }) => {
      const response = await apiRequest("PATCH", "/api/profile", payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/company"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({ title: "Profil mis à jour", description: "Les paramètres de l'entreprise ont été enregistrés." });
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/login");
    }
    if (!authLoading && user && user.userType !== "company") {
      setLocation("/");
    }
  }, [authLoading, setLocation, user]);

  if (authLoading) {
    return <DashboardLoadingState title="Verification de la session entreprise..." />;
  }

  if (!user || user.userType !== "company") {
    return null;
  }

  if (dashboardQuery.isLoading || !dashboardQuery.data) {
    return <DashboardLoadingState title="Chargement de l'interface entreprise..." />;
  }

  const data = dashboardQuery.data;

  const deleteJob = async (jobId: string) => {
    await jobMutation.mutateAsync({ url: `/api/jobs/${jobId}`, method: "DELETE" });
    toast({ title: "Offre supprimée", description: "L'offre d'emploi a été supprimée." });
  };

  const renderContent = () => {
    if (location === "/company/dashboard" || location === "/company") {
      return <DashboardOverview data={data} onCreateJob={() => setLocation("/company/jobs")} />;
    }

    if (location === "/company/jobs/new") {
      const organizationName = data.profile?.companyName ?? data.user.fullName;

      const buildJobPayload = (form: OfferFormValue, isActive: boolean) => ({
        title: form.title,
        description: form.descriptionHtml,
        location: form.location,
        jobType: form.contractType,
        category: form.category,
        educationLevel: form.educationLevel || undefined,
        salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
        salaryMax: form.salaryMax ? Number(form.salaryMax) : undefined,
        requiredSkills: form.skills,
        applicationDeadline: form.applicationDeadline || undefined,
        startDate: form.startDate || undefined,
        isRemote: form.isRemote,
        isUrgent: form.isUrgent,
        positions: form.positions ? Number(form.positions) : 1,
        visibleToAgencies: form.visibleToAgencies,
        acceptsPlatformApplications: form.acceptsPlatformApplications,
        isActive,
      });

      return (
        <OfferForm
          organization={{ name: organizationName, userType: "company" }}
          backHref="/company/jobs"
          backLabel="Offres"
          onSaveDraft={async (form, draftId) => {
            // No draft/status field exists on job postings yet — the closest
            // honest option with real persistence is an inactive job row,
            // rather than inventing a separate draft store for this sprint.
            // Once it exists, later saves/publish update that same row.
            if (draftId) {
              await jobMutation.mutateAsync({ url: `/api/jobs/${draftId}`, method: "PATCH", data: buildJobUpdatePayload(form) });
              return draftId;
            }
            const created = await jobMutation.mutateAsync({ url: "/api/jobs", method: "POST", data: buildJobPayload(form, false) });
            return created.id as string;
          }}
          onPublish={async (form, draftId): Promise<OfferSaveResult> => {
            const saved = draftId
              ? await jobMutation.mutateAsync({ url: `/api/jobs/${draftId}`, method: "PATCH", data: { ...buildJobUpdatePayload(form), isActive: true } })
              : await jobMutation.mutateAsync({ url: "/api/jobs", method: "POST", data: buildJobPayload(form, true) });
            return { id: saved.id, status: "PUBLIEE" };
          }}
        />
      );
    }

    if (editingJobId) {
      const organizationName = data.profile?.companyName ?? data.user.fullName;
      // An offline job (draft, or closed) opens as a draft to continue,
      // whose main button publishes it; a live job opens in edit mode.
      const continuesDraft = editContinuesDraft;

      return (
        <OfferForm
          key={continuesDraft ? "draft" : "edit"}
          mode={continuesDraft ? "create" : "edit"}
          draftId={continuesDraft ? editingJobId : null}
          organization={{ name: organizationName, userType: "company" }}
          initialData={editJobQuery.data ? mapJobPostingToOfferFormValue(editJobQuery.data) : undefined}
          isLoadingInitialData={editJobQuery.isLoading || !editJobQuery.data}
          backHref="/company/jobs"
          backLabel="Offres"
          onSaveDraft={continuesDraft ? async (form) => {
            await jobMutation.mutateAsync({ url: `/api/jobs/${editingJobId}`, method: "PATCH", data: buildJobUpdatePayload(form) });
            return editingJobId;
          } : undefined}
          onPublish={async (form): Promise<OfferSaveResult> => {
            await jobMutation.mutateAsync({
              url: `/api/jobs/${editingJobId}`,
              method: "PATCH",
              data: continuesDraft ? { ...buildJobUpdatePayload(form), isActive: true } : buildJobUpdatePayload(form),
            });
            return { id: editingJobId, status: "PUBLIEE" };
          }}
        />
      );
    }

    if (location.startsWith("/company/jobs")) {
      return (
        <JobListings
          jobs={data.jobs}
          onDelete={deleteJob}
        />
      );
    }

    const candidateProfileMatch = location.match(/^\/company\/candidates\/([^/]+)$/);
    if (candidateProfileMatch) {
      return (
        <CandidateProfileView
          candidateId={candidateProfileMatch[1]}
          backHref="/company/applications"
          backLabel="Retour aux candidatures"
        />
      );
    }

    if (location.startsWith("/company/applications")) {
      return <CompanyApplicationsPipeline />;
    }

    if (location.startsWith("/company/calendar")) {
      return (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-calendar-title">Calendrier des entretiens</h1>
            <p className="text-muted-foreground">Vue d'ensemble des entretiens planifiés</p>
          </div>
          <InterviewCalendar />
        </div>
      );
    }

    if (location.startsWith("/company/pipeline")) {
      return <RecruitmentPipelinePage />;
    }

    if (location.startsWith("/company/statistics")) {
      return <RecruitmentStatisticsPage data={data} />;
    }

    if (location.startsWith("/company/employees")) {
      return <EmployeeManagement />;
    }

    if (location.startsWith("/company/leaves")) {
      return <LeaveManagement />;
    }

    if (location.startsWith("/company/payroll")) {
      return <PayrollManagement />;
    }

    if (location.startsWith("/company/orgchart")) {
      return <OrgChart />;
    }

    if (location.startsWith("/company/departments")) {
      return <DepartmentManagement />;
    }

    if (location.startsWith("/company/positions")) {
      return <PositionManagement />;
    }

    if (location.startsWith("/company/security")) {
      return <SecurityManagement />;
    }

    if (location.startsWith("/company/sites")) {
      return <SitesManagement />;
    }

    if (location.startsWith("/company/certifications")) {
      return <CertificationsManagement />;
    }

    if (location.startsWith("/company/epi")) {
      return <EPIManagement />;
    }

    if (location.startsWith("/company/hse")) {
      return <HSEManagement />;
    }

    if (location.startsWith("/company/settings")) {
      return <CompanySettingsPage data={data} onSave={async (payload) => profileMutation.mutateAsync(payload)} isSaving={profileMutation.isPending} />;
    }

    if (location.startsWith("/company/support")) {
      return <ComingSoonPage title="Support" description="Le centre d'aide sera bientot disponible." />;
    }

    return <DashboardOverview data={data} onCreateJob={() => setLocation("/company/jobs")} />;
  };

  return renderContent();
}
