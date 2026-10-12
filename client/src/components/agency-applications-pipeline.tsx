import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MatchScoreCell } from "@/components/match-score-cell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { exportApplicationsToExcel } from "@/lib/export-applications-excel";
import { ArrowLeft, Users, FileDown, FileText, MapPin, Clock, Calendar, Building2 } from "lucide-react";
import { ProposeInterviewSlotsDialog } from "@/components/propose-interview-slots-dialog";

type AgencyJobSummary = {
  id: string;
  title: string;
  category: string | null;
  location: string;
  createdAt: string | null;
  isActive: boolean | null;
  applicationCount: number;
  client: AgencyJobClient | null;
};

type AgencyJobClient = { id: string; name: string; logoUrl: string | null };

const ALL_CLIENTS = "all";
const NO_CLIENT_GROUP = "Sans client associé";

type AgencyApplication = {
  id: string;
  jobId: string;
  status: string;
  matchScore: number;
  matchExplanation?: string | null;
  createdAt: string | null;
  voiceIntroUrl: string | null;
  candidate: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    city: string | null;
    avatarUrl: string | null;
    title: string | null;
    resumeUrl: string | null;
    resumeFileName: string | null;
  } | null;
};

function formatDate(value?: string | null) {
  if (!value) return "-";
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

// The agency's "Candidatures" screen — organizes the pipeline by Poste
// (select an offer first, then work its candidatures) rather than one flat
// list across every job, with a real CV link and a real Excel export per
// offer. Reuses the existing PATCH /api/applications/:id stage-change route,
// already authorized for agency-owned jobs.
export function AgencyApplicationsPipeline() {
  const { toast } = useToast();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [interviewTarget, setInterviewTarget] = useState<{ applicationId: string; candidateName?: string } | null>(null);
  const [clientFilter, setClientFilter] = useState<string>(ALL_CLIENTS);

  const jobsQuery = useQuery<AgencyJobSummary[]>({
    queryKey: ["/api/agency/jobs-with-applications"],
  });

  const applicationsQuery = useQuery<AgencyApplication[]>({
    queryKey: ["/api/jobs", selectedJobId, "applications"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/jobs/${selectedJobId}/applications`);
      return res.json();
    },
    enabled: !!selectedJobId,
  });

  const stageChangeMutation = useMutation({
    mutationFn: async ({ applicationId, status }: { applicationId: string; status: string }) => {
      await apiRequest("PATCH", `/api/applications/${applicationId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", selectedJobId, "applications"] });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message || "Impossible de mettre à jour l'étape.", variant: "destructive" });
    },
  });

  const selectedJob = jobsQuery.data?.find((job) => job.id === selectedJobId);

  // Distinct end clients with at least one active offer, alphabetical.
  const clientOptions = useMemo(() => {
    const byId = new Map<string, AgencyJobClient>();
    for (const job of jobsQuery.data ?? []) {
      if (job.client && job.isActive !== false) byId.set(job.client.id, job.client);
    }
    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }, [jobsQuery.data]);

  const selectedClient = clientOptions.find((client) => client.id === clientFilter) ?? null;
  const visibleJobs = selectedClient
    ? (jobsQuery.data ?? []).filter((job) => job.client?.id === selectedClient.id)
    : jobsQuery.data ?? [];

  // Every offer grouped by client, for the « Changer d'offre » switcher.
  const jobsByClient = useMemo(() => {
    const groups = new Map<string, AgencyJobSummary[]>();
    for (const job of jobsQuery.data ?? []) {
      const key = job.client?.name ?? NO_CLIENT_GROUP;
      groups.set(key, [...(groups.get(key) ?? []), job]);
    }
    return Array.from(groups.entries()).sort(([a], [b]) =>
      a === NO_CLIENT_GROUP ? 1 : b === NO_CLIENT_GROUP ? -1 : a.localeCompare(b, "fr"),
    );
  }, [jobsQuery.data]);

  const handleExport = async () => {
    if (!selectedJob || !applicationsQuery.data) return;
    setIsExporting(true);
    try {
      await exportApplicationsToExcel(selectedJob.title, applicationsQuery.data);
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de générer le fichier Excel.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (!selectedJobId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Candidatures</h1>
          <p className="text-muted-foreground">Choisissez une offre pour gérer ses candidatures</p>
        </div>

        {clientOptions.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <label htmlFor="agency-client-filter" className="text-sm font-medium">Filtrer par client</label>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger id="agency-client-filter" className="w-full sm:w-[260px]" data-testid="select-client-filter">
                <SelectValue placeholder="Tous les clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CLIENTS}>Tous les clients</SelectItem>
                {clientOptions.map((client) => (
                  <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground" role="status" aria-live="polite" data-testid="text-client-filter-status">
              {selectedClient ? `Client : ${selectedClient.name} — ` : "Tous les clients — "}
              {visibleJobs.length} offre{visibleJobs.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}

        {jobsQuery.isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        ) : visibleJobs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Aucune offre publiée pour le moment.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Poste</TableHead>
                  <TableHead>Localisation</TableHead>
                  <TableHead>Publiée</TableHead>
                  <TableHead>Candidatures</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleJobs.map((job) => (
                  <TableRow key={job.id} data-testid={`row-agency-job-${job.id}`}>
                    <TableCell>
                      <p className="font-medium">{job.title}</p>
                      {job.category && <p className="text-sm text-muted-foreground">{job.category}</p>}
                      {job.client && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Building2 className="h-3 w-3" />
                          {job.client.name}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {job.location}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDate(job.createdAt)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="gap-1">
                        <Users className="h-3 w-3" />
                        {job.applicationCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedJobId(job.id)}
                        data-testid={`button-view-pipeline-${job.id}`}
                      >
                        Voir les candidatures
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    );
  }

  const applications = applicationsQuery.data ?? [];
  const groupedCounts = {
    all: applications.length,
    new: applications.filter((app) => app.status === "pending").length,
    shortlist: applications.filter((app) => ["reviewing", "shortlisted"].includes(app.status)).length,
    interview: applications.filter((app) => app.status === "interview").length,
  };

  return (
    <div className="space-y-6">
      {selectedJob && (
        <div
          className="sticky top-0 z-20 -mx-6 -mt-6 px-6 py-3 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 flex items-center gap-3 flex-wrap"
          data-testid="banner-job-context"
        >
          <Avatar className="h-9 w-9 shrink-0 rounded-md">
            {selectedJob.client?.logoUrl && <AvatarImage src={selectedJob.client.logoUrl} alt="" className="object-contain" />}
            <AvatarFallback className="rounded-md bg-primary/10 text-primary text-xs font-semibold">
              {selectedJob.client ? getInitials(selectedJob.client.name) : <Building2 className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate" data-testid="text-context-client">
              {selectedJob.client?.name ?? "Client non renseigné"}
            </p>
            <p className="text-xs text-muted-foreground truncate" data-testid="text-context-job">{selectedJob.title}</p>
          </div>
          <Select value={selectedJob.id} onValueChange={setSelectedJobId}>
            <SelectTrigger className="w-full sm:w-[260px]" aria-label="Changer d'offre" data-testid="select-switch-job">
              <SelectValue placeholder="Changer d'offre" />
            </SelectTrigger>
            <SelectContent>
              {jobsByClient.map(([clientName, jobs]) => (
                <SelectGroup key={clientName}>
                  <SelectLabel>{clientName}</SelectLabel>
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Button variant="ghost" size="sm" className="gap-2 -ml-2 mb-1" onClick={() => setSelectedJobId(null)} data-testid="button-back-to-jobs">
            <ArrowLeft className="h-4 w-4" />
            Toutes les offres
          </Button>
          <h1 className="text-2xl font-bold">{selectedJob?.title ?? "Candidatures"}</h1>
          <p className="text-muted-foreground">Gérez les candidatures reçues pour cette offre</p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={handleExport}
          disabled={isExporting || applications.length === 0}
          data-testid="button-export-applications-excel"
        >
          <FileDown className="h-4 w-4" />
          Exporter en Excel
        </Button>
      </div>

      {applicationsQuery.isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : (
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-applications-all">Toutes ({groupedCounts.all})</TabsTrigger>
            <TabsTrigger value="new" data-testid="tab-applications-new">Nouvelles ({groupedCounts.new})</TabsTrigger>
            <TabsTrigger value="shortlist" data-testid="tab-applications-shortlist">Présélection ({groupedCounts.shortlist})</TabsTrigger>
            <TabsTrigger value="interview" data-testid="tab-applications-interview">Entretien ({groupedCounts.interview})</TabsTrigger>
          </TabsList>

          {(["all", "new", "shortlist", "interview"] as const).map((tab) => {
            const filtered = tab === "all"
              ? applications
              : tab === "new"
              ? applications.filter((app) => app.status === "pending")
              : tab === "shortlist"
              ? applications.filter((app) => ["reviewing", "shortlisted"].includes(app.status))
              : applications.filter((app) => app.status === "interview");

            return (
              <TabsContent key={tab} value={tab} className="mt-6">
                <Card>
                  {filtered.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-10 text-center">Aucune candidature dans cette catégorie.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Candidat</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Étape</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>CV</TableHead>
                          <TableHead>Vocal</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((app) => (
                          <TableRow key={app.id} data-testid={`row-application-${app.id}`}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-pink-500 text-white">
                                    {getInitials(app.candidate?.name ?? "?")}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{app.candidate?.name ?? "Candidat inconnu"}</p>
                                  <p className="text-sm text-muted-foreground">{app.candidate?.email ?? "-"}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <MatchScoreCell score={app.matchScore} explanation={app.matchExplanation} />
                            </TableCell>
                            <TableCell>
                              <Select
                                value={app.status}
                                onValueChange={(value) => stageChangeMutation.mutate({ applicationId: app.id, status: value })}
                                disabled={stageChangeMutation.isPending}
                              >
                                <SelectTrigger
                                  className="w-36"
                                  aria-label={`Étape de la candidature de ${app.candidate?.name ?? "ce candidat"}`}
                                  data-testid={`select-stage-${app.id}`}
                                ><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Nouveau</SelectItem>
                                  <SelectItem value="reviewing">En revue</SelectItem>
                                  <SelectItem value="shortlisted">Présélection</SelectItem>
                                  <SelectItem value="interview">Entretien</SelectItem>
                                  <SelectItem value="offered">Offre</SelectItem>
                                  <SelectItem value="hired">Recruté</SelectItem>
                                  <SelectItem value="rejected">Refusé</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell><span className="text-sm text-muted-foreground">{formatDate(app.createdAt)}</span></TableCell>
                            <TableCell>
                              {app.candidate?.resumeUrl ? (
                                <a
                                  href={app.candidate.resumeUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                                  data-testid={`link-resume-${app.id}`}
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  Voir le CV
                                </a>
                              ) : (
                                <span className="text-sm text-muted-foreground">Aucun CV</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {app.voiceIntroUrl ? (
                                <audio
                                  controls
                                  src={app.voiceIntroUrl}
                                  className="h-8 w-40"
                                  data-testid={`audio-voice-intro-${app.id}`}
                                />
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Planifier entretien"
                                onClick={() => setInterviewTarget({ applicationId: app.id, candidateName: app.candidate?.name })}
                                data-testid={`button-schedule-interview-${app.id}`}
                              >
                                <Calendar className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>
      )}

      <ProposeInterviewSlotsDialog
        applicationId={interviewTarget?.applicationId ?? null}
        candidateName={interviewTarget?.candidateName}
        open={!!interviewTarget}
        onOpenChange={(open) => { if (!open) setInterviewTarget(null); }}
        onProposed={() => queryClient.invalidateQueries({ queryKey: ["/api/jobs", selectedJobId, "applications"] })}
      />
    </div>
  );
}
