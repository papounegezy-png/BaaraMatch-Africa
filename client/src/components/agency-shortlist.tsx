import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Building2,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Handshake,
  ListChecks,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  UserCheck,
  Users,
  X,
} from "lucide-react";

type Stage = "shortlisted" | "interview_proposed" | "interview" | "offered";

type ShortlistRow = {
  applicationId: string;
  status: Stage;
  matchScore: number | null;
  reviewerNotes: string | null;
  statusChangedAt: string | null;
  interviewAt: string | null;
  proposedSlots: string[];
  candidate: { id: string; fullName: string; email: string; phone: string | null; city: string | null; avatarUrl: string | null; title: string | null; skills: string[]; experienceYears: number | null };
  job: { id: string; title: string; location: string; positions: number; isActive: boolean; clientName: string | null };
};

const STAGES: Record<Stage, { label: string; className: string }> = {
  shortlisted: { label: "Présélectionné", className: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  interview_proposed: { label: "Créneaux proposés", className: "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300" },
  interview: { label: "Entretien", className: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" },
  offered: { label: "Offre faite", className: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
};
const STAGE_ORDER: Stage[] = ["offered", "interview", "interview_proposed", "shortlisted"];

const SHORTLIST_KEY = ["/api/agency/shortlist"];
const cardClass = "rounded-2xl border border-border/60 bg-card shadow-sm";

const refresh = () => {
  for (const queryKey of [SHORTLIST_KEY, ["/api/agency/assignments"], ["/api/agency/candidate-base"], ["/api/agency/jobs-with-applications"]]) {
    queryClient.invalidateQueries({ queryKey });
  }
};

function initialsOf(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
}

function daysSince(value: string | null) {
  if (!value) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000));
}

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// <input type="datetime-local"> works in local time.
function localMin(offsetMs: number) {
  const date = new Date(Date.now() + offsetMs);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

type DialogState =
  | { kind: "slots"; row: ShortlistRow }
  | { kind: "offer"; row: ShortlistRow }
  | { kind: "reject"; row: ShortlistRow }
  | null;

function ActionDialog({ state, onClose }: { state: DialogState; onClose: () => void }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [slots, setSlots] = useState<string[]>([""]);
  const [salary, setSalary] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => { setSlots([""]); setSalary(""); setReason(""); }, [state?.row.applicationId, state?.kind]);

  const submit = useMutation({
    mutationFn: async () => {
      const id = state!.row.applicationId;
      if (state!.kind === "slots") {
        await apiRequest("POST", `/api/applications/${id}/interview-slots`, { slots: slots.filter(Boolean).map((value) => new Date(value).toISOString()) });
      } else if (state!.kind === "offer") {
        await apiRequest("PATCH", `/api/applications/${id}`, { status: "offered", offeredSalary: salary.trim() ? Math.round(Number(salary.replace(/\s/g, ""))) : null });
      } else {
        await apiRequest("PATCH", `/api/applications/${id}`, { status: "rejected", rejectionReason: reason.trim() || null });
      }
    },
    onSuccess: () => {
      refresh();
      const name = state!.row.candidate.fullName;
      if (state!.kind === "slots") toast({ title: "Créneaux proposés", description: `${name} reçoit un email et choisit son créneau.` });
      else if (state!.kind === "offer") toast({ title: "Offre enregistrée", description: `${name} est notifié(e). Retenez-le quand il accepte.` });
      else toast({ title: "Candidat écarté", description: `${name} est notifié(e).` });
      onClose();
    },
    onError: (error: Error) => toast({ title: "Action impossible", description: error.message, variant: "destructive" }),
  });

  if (!state) return null;
  const { row } = state;
  const titles = { slots: "Proposer un entretien", offer: "Faire une offre", reject: "Écarter le candidat" };
  const valid = state.kind === "slots" ? slots.some(Boolean) : true;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titles[state.kind]}</DialogTitle>
          <DialogDescription>{row.candidate.fullName} · {row.job.title}</DialogDescription>
        </DialogHeader>
        {state.kind === "slots" && (
          <div className="space-y-2">
            {slots.map((value, index) => (
              <div key={index} className="flex gap-2">
                <Input type="datetime-local" min={localMin(3_600_000)} value={value} onChange={(e) => setSlots((current) => current.map((slot, i) => (i === index ? e.target.value : slot)))} data-testid={`input-slot-${index}`} />
                {slots.length > 1 && <Button variant="ghost" size="icon" onClick={() => setSlots((current) => current.filter((_, i) => i !== index))} aria-label="Retirer"><X className="h-4 w-4" /></Button>}
              </div>
            ))}
            {slots.length < 4 && <Button variant="ghost" size="sm" onClick={() => setSlots((current) => [...current, ""])}><Plus /> Ajouter un créneau</Button>}
            <p className="text-xs text-muted-foreground">Le candidat reçoit un email et choisit le créneau qui lui convient ; il apparaît ensuite ici et dans le calendrier.</p>
          </div>
        )}
        {state.kind === "offer" && (
          <div className="space-y-1.5">
            <Label htmlFor="offer-salary">Salaire proposé (FCFA / mois)</Label>
            <Input id="offer-salary" inputMode="numeric" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="ex. 350000" data-testid="input-offer-salary" />
            <p className="text-xs text-muted-foreground">Repris automatiquement dans le contrat lors de l'affectation.</p>
          </div>
        )}
        {state.kind === "reject" && (
          <div className="space-y-1.5">
            <Label htmlFor="reject-reason">Motif (interne)</Label>
            <Textarea id="reject-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Profil retenu ailleurs, prétentions trop élevées…" />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button variant={state.kind === "reject" ? "destructive" : "default"} disabled={!valid || submit.isPending} onClick={() => submit.mutate()} data-testid="button-confirm-action">
            {submit.isPending && <Loader2 className="animate-spin" />} Confirmer
          </Button>
        </DialogFooter>
        {state.kind === "offer" && (
          <button type="button" className="text-left text-xs text-muted-foreground hover:underline" onClick={() => setLocation(`/agency/candidates/${row.candidate.id}`)}>Voir le profil complet</button>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function AgencyShortlist() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState<"all" | Stage>("all");
  const [dialog, setDialog] = useState<DialogState>(null);
  const { data: rows = [], isLoading, isError } = useQuery<ShortlistRow[]>({ queryKey: SHORTLIST_KEY });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiRequest("PATCH", `/api/applications/${id}`, { status }),
    onSuccess: (_, { status }) => {
      refresh();
      if (status === "hired") {
        toast({ title: "Candidat retenu", description: "Il vous attend dans « Affectations » pour la création du contrat." });
      }
    },
    onError: (error: Error) => toast({ title: "Action impossible", description: error.message, variant: "destructive" }),
  });

  const jobs = useMemo(() => Array.from(new Map(rows.map((row) => [row.job.id, row.job])).values()).sort((a, b) => a.title.localeCompare(b.title)), [rows]);
  const query = search.trim().toLowerCase();
  const visible = rows.filter((row) =>
    (jobFilter === "all" || row.job.id === jobFilter)
    && (stageFilter === "all" || row.status === stageFilter)
    && (!query || [row.candidate.fullName, row.candidate.title ?? "", row.job.title, row.job.clientName ?? ""].some((value) => value.toLowerCase().includes(query))));

  const groups = useMemo(() => {
    const map = new Map<string, ShortlistRow[]>();
    for (const row of visible) map.set(row.job.id, [...(map.get(row.job.id) ?? []), row]);
    return Array.from(map.values()).map((items) => items.sort((a, b) =>
      STAGE_ORDER.indexOf(a.status) - STAGE_ORDER.indexOf(b.status) || (b.matchScore ?? 0) - (a.matchScore ?? 0)));
  }, [visible]);

  const now = Date.now();
  const stats = {
    total: rows.length,
    upcoming: rows.filter((row) => row.interviewAt && new Date(row.interviewAt).getTime() >= now).length,
    offers: rows.filter((row) => row.status === "offered").length,
    missions: jobs.length,
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Shortlist</h1>
          <p className="text-sm text-muted-foreground">Les candidats en sélection sur vos missions : de la présélection jusqu'à l'offre.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setLocation("/agency/candidates")}><Plus /> Présélectionner depuis la base</Button>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[
          { icon: ListChecks, value: stats.total, label: "Candidats en sélection", tone: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300" },
          { icon: CalendarClock, value: stats.upcoming, label: "Entretiens à venir", tone: "bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300" },
          { icon: Handshake, value: stats.offers, label: "Offres en attente", tone: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300" },
          { icon: Users, value: stats.missions, label: "Missions concernées", tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300" },
        ].map((stat) => (
          <div key={stat.label} className={`${cardClass} flex items-center gap-3 p-4`}>
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${stat.tone}`}><stat.icon className="h-5 w-5" /></span>
            <span className="min-w-0">
              <span className="block text-2xl font-bold tabular-nums text-foreground">{stat.value}</span>
              <span className="block text-xs leading-tight text-muted-foreground">{stat.label}</span>
            </span>
          </div>
        ))}
      </div>

      <div className={`${cardClass} grid grid-cols-2 gap-3 p-4 md:grid-cols-[minmax(0,1fr)_260px_200px]`}>
        <div className="relative col-span-2 md:col-span-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Candidat, mission, client…" className="pl-10" data-testid="input-search-shortlist" />
        </div>
        <Select value={jobFilter} onValueChange={setJobFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les missions</SelectItem>
            {jobs.map((job) => <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={stageFilter} onValueChange={(value) => setStageFilter(value as typeof stageFilter)}>
          <SelectTrigger data-testid="select-stage"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes étapes</SelectItem>
            {(Object.keys(STAGES) as Stage[]).map((stage) => <SelectItem key={stage} value={stage}>{STAGES[stage].label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}</div>
      ) : isError ? (
        <p className={`${cardClass} p-10 text-center text-sm text-muted-foreground`} role="alert">Impossible de charger la shortlist. Réessayez dans un instant.</p>
      ) : groups.length === 0 ? (
        <div className={`${cardClass} flex flex-col items-center gap-3 p-12 text-center`}>
          <ListChecks className="h-10 w-10 text-muted-foreground/60" />
          <div>
            <p className="font-medium text-foreground">{rows.length ? "Aucun candidat dans ce filtre" : "Aucun candidat en sélection"}</p>
            <p className="text-sm text-muted-foreground">Présélectionnez des profils depuis la base candidats ou les candidatures reçues.</p>
          </div>
          <Button size="sm" onClick={() => setLocation("/agency/candidates")}>Ouvrir la base candidats</Button>
        </div>
      ) : (
        groups.map((items) => {
          const job = items[0].job;
          return (
            <section key={job.id} className={`${cardClass} overflow-hidden`} data-testid={`shortlist-job-${job.id}`}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-5 py-3">
                <div className="min-w-0">
                  <button type="button" className="text-left text-base font-semibold text-foreground hover:underline" onClick={() => setLocation(`/agency/missions/${job.id}/edit`)}>{job.title}</button>
                  <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    {job.clientName && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{job.clientName}</span>}
                    <span>{job.location}</span>
                    <span>· {job.positions} poste{job.positions > 1 ? "s" : ""}</span>
                    {!job.isActive && <span className="rounded bg-muted px-1.5 font-medium">brouillon</span>}
                  </p>
                </div>
                <span className="text-xs font-medium text-muted-foreground">{items.length} candidat{items.length > 1 ? "s" : ""}</span>
              </div>
              <ul className="divide-y divide-border/60">
                {items.map((row) => {
                  const days = daysSince(row.statusChangedAt);
                  const interviewPassed = row.interviewAt && new Date(row.interviewAt).getTime() < now;
                  return (
                    <li key={row.applicationId} className="flex flex-col gap-3 px-5 py-3.5 lg:flex-row lg:items-center" data-testid={`shortlist-row-${row.applicationId}`}>
                      <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setLocation(`/agency/candidates/${row.candidate.id}`)}>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={row.candidate.avatarUrl ?? undefined} />
                          <AvatarFallback className="text-xs">{initialsOf(row.candidate.fullName)}</AvatarFallback>
                        </Avatar>
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-semibold text-foreground">{row.candidate.fullName}</span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STAGES[row.status].className}`}>{STAGES[row.status].label}</span>
                            {row.matchScore !== null && (
                              <span className={`text-xs font-bold tabular-nums ${row.matchScore >= 70 ? "text-emerald-600" : row.matchScore >= 40 ? "text-amber-600" : "text-muted-foreground"}`}>{Math.round(row.matchScore)}%</span>
                            )}
                          </span>
                          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                            <span>{row.candidate.title || "Métier non renseigné"}</span>
                            {row.candidate.city && <span>· {row.candidate.city}</span>}
                            {days !== null && <span className={`flex items-center gap-1 ${days >= 7 ? "font-medium text-amber-700 dark:text-amber-300" : ""}`}><Clock className="h-3 w-3" />{days === 0 ? "aujourd'hui" : `depuis ${days} j`}</span>}
                          </span>
                          {row.interviewAt && (
                            <span className={`mt-1 flex items-center gap-1 text-xs font-medium ${interviewPassed ? "text-muted-foreground" : "text-violet-700 dark:text-violet-300"}`}>
                              <CalendarClock className="h-3 w-3" /> Entretien {interviewPassed ? "passé" : "prévu"} le {formatDateTime(row.interviewAt)}
                            </span>
                          )}
                          {row.status === "interview_proposed" && row.proposedSlots.length > 0 && (
                            <span className="mt-1 block text-xs text-muted-foreground">{row.proposedSlots.length} créneau{row.proposedSlots.length > 1 ? "x" : ""} proposé{row.proposedSlots.length > 1 ? "s" : ""} — en attente du choix du candidat</span>
                          )}
                        </span>
                      </button>
                      <div className="flex shrink-0 items-center gap-2">
                        {row.status === "shortlisted" && (
                          <Button size="sm" variant="outline" onClick={() => setDialog({ kind: "slots", row })} data-testid={`button-slots-${row.applicationId}`}><CalendarPlus /> Proposer un entretien</Button>
                        )}
                        {row.status === "interview_proposed" && (
                          <Button size="sm" variant="outline" onClick={() => setDialog({ kind: "slots", row })}><CalendarPlus /> Autres créneaux</Button>
                        )}
                        {row.status === "interview" && (
                          <Button size="sm" onClick={() => setDialog({ kind: "offer", row })} data-testid={`button-offer-${row.applicationId}`}><Handshake /> Faire une offre</Button>
                        )}
                        {row.status === "offered" && (
                          <Button size="sm" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id: row.applicationId, status: "hired" })} data-testid={`button-hire-${row.applicationId}`}><UserCheck /> Retenir</Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Plus d'actions"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setLocation(`/agency/candidates/${row.candidate.id}`)}>Voir le profil</DropdownMenuItem>
                            {row.status !== "interview" && row.status !== "offered" && (
                              <DropdownMenuItem onClick={() => setStatus.mutate({ id: row.applicationId, status: "interview" })}>Entretien réalisé hors plateforme</DropdownMenuItem>
                            )}
                            {row.status !== "offered" && <DropdownMenuItem onClick={() => setDialog({ kind: "offer", row })}>Faire une offre</DropdownMenuItem>}
                            <DropdownMenuItem onClick={() => setStatus.mutate({ id: row.applicationId, status: "hired" })}><CheckCircle2 /> Retenir directement</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => setDialog({ kind: "reject", row })}>Écarter</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}

      <ActionDialog state={dialog} onClose={() => setDialog(null)} />
    </div>
  );
}
