import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MatchScoreCell } from "@/components/match-score-cell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { exportApplicationsToExcel } from "@/lib/export-applications-excel";
import { ArrowLeft, Users, FileDown, FileText, MapPin, Clock, Eye, Calendar, MessageSquare } from "lucide-react";
import { ProposeInterviewSlotsDialog } from "@/components/propose-interview-slots-dialog";
import { SendMessageDialog } from "@/components/send-message-dialog";

type CompanyJobSummary = {
  id: string;
  title: string;
  category: string | null;
  location: string;
  createdAt: string | null;
  isActive: boolean | null;
  applicationCount: number;
};

type CompanyApplication = {
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

// The company's "Candidatures" screen — mirrors the agency pipeline model:
// pick an offer first, then work its candidatures, with a real CV link and
// a real Excel export per offer, plus the existing profile/interview/message
// actions.
export function CompanyApplicationsPipeline() {
  const { toast } = useToast();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [interviewTarget, setInterviewTarget] = useState<{ applicationId: string; candidateName?: string } | null>(null);
  const [messageTarget, setMessageTarget] = useState<{ candidateId: string; candidateName?: string } | null>(null);

  const jobsQuery = useQuery<CompanyJobSummary[]>({
    queryKey: ["/api/company/jobs-with-applications"],
  });

  const applicationsQuery = useQuery<CompanyApplication[]>({
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

        {jobsQuery.isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        ) : !jobsQuery.data || jobsQuery.data.length === 0 ? (
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
                {jobsQuery.data.map((job) => (
                  <TableRow key={job.id} data-testid={`row-company-job-${job.id}`}>
                    <TableCell>
                      <p className="font-medium">{job.title}</p>
                      {job.category && <p className="text-sm text-muted-foreground">{job.category}</p>}
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
                              <div className="flex justify-end gap-1">
                                {app.candidate?.id ? (
                                  <Link href={`/company/candidates/${app.candidate.id}`}>
                                    <Button variant="ghost" size="icon" title="Voir profil" data-testid={`button-view-profile-${app.id}`}>
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </Link>
                                ) : (
                                  <Button variant="ghost" size="icon" title="Voir profil" disabled>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Planifier entretien"
                                  onClick={() => setInterviewTarget({ applicationId: app.id, candidateName: app.candidate?.name })}
                                  data-testid={`button-schedule-interview-${app.id}`}
                                >
                                  <Calendar className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Envoyer message"
                                  disabled={!app.candidate?.id}
                                  onClick={() => app.candidate?.id && setMessageTarget({ candidateId: app.candidate.id, candidateName: app.candidate?.name })}
                                  data-testid={`button-send-message-${app.id}`}
                                >
                                  <MessageSquare className="h-4 w-4" />
                                </Button>
                              </div>
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
      <SendMessageDialog
        candidateId={messageTarget?.candidateId ?? null}
        candidateName={messageTarget?.candidateName}
        open={!!messageTarget}
        onOpenChange={(open) => { if (!open) setMessageTarget(null); }}
      />
    </div>
  );
}
