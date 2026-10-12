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
  Briefcase,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Star,
  Target,
  UserCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";

type CandidateStatus = "available" | "in_process" | "placed";

type CandidateRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  city: string | null;
  country: string | null;
  avatarUrl: string | null;
  title: string | null;
  skills: string[];
  experienceYears: number | null;
  educationLevel: string | null;
  languages: string[];
  availableFrom: string | null;
  hasCv: boolean;
  hasVoiceCv: boolean;
  completeness: number;
  registeredAt: string | null;
  status: CandidateStatus;
  applicationsCount: number;
  currentProcess: { jobTitle: string; status: string } | null;
  placementsCount: number;
  currentPlacement: { position: string | null; endDate: string | null } | null;
  averageRating: number | null;
  documentsCount: number;
  matchScore: number | null;
};

type AgencyJob = { id: string; title: string; location: string; isActive: boolean | null; requiredSkills: string[] | null; experienceMin: number | null };

const STATUS: Record<CandidateStatus, { label: string; className: string }> = {
  available: { label: "Disponible", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  in_process: { label: "En processus", className: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  placed: { label: "En mission", className: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" },
};

const PROCESS_LABEL: Record<string, string> = {
  shortlisted: "présélectionné",
  interview_proposed: "créneaux proposés",
  interview: "entretien",
  offered: "offre faite",
};

const PAGE_SIZE = 20;
const ALL = "all";
const cardClass = "rounded-2xl border border-border/60 bg-card shadow-sm";

// Must stay in step with applyFilters() in server/agency-candidates.ts, so
// the Excel export contains exactly the rows on screen.
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

type Filters = { search: string; status: string; skill: string; city: string; minExperience: string; hasCv: string };
const EMPTY_FILTERS: Filters = { search: "", status: ALL, skill: ALL, city: ALL, minExperience: ALL, hasCv: ALL };

function toQuery(filters: Filters, jobId: string) {
  const params = new URLSearchParams();
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.status !== ALL) params.set("status", filters.status);
  if (filters.skill !== ALL) params.set("skill", filters.skill);
  if (filters.city !== ALL) params.set("city", filters.city);
  if (filters.minExperience !== ALL) params.set("minExperience", filters.minExperience);
  if (filters.hasCv !== ALL) params.set("hasCv", filters.hasCv);
  if (jobId !== ALL) params.set("jobId", jobId);
  return params.toString();
}

function initialsOf(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
}

const whatsappLink = (number: string) => `https://wa.me/${number.replace(/[^\d]/g, "")}`;

function StatCard({ icon: Icon, value, label, tone, active, onClick }: { icon: React.ElementType; value: number; label: string; tone: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${cardClass} flex items-center gap-3 p-4 text-left transition hover:shadow-md ${active ? "ring-2 ring-primary" : ""}`}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span>
      <span className="min-w-0">
        <span className="block text-2xl font-bold tabular-nums text-foreground">{value}</span>
        <span className="block text-xs leading-tight text-muted-foreground">{label}</span>
      </span>
    </button>
  );
}

function ShortlistDialog({ candidate, jobs, onClose }: { candidate: CandidateRow | null; jobs: AgencyJob[]; onClose: () => void }) {
  const { toast } = useToast();
  const [jobId, setJobId] = useState("");
  const [note, setNote] = useState("");
  const [slots, setSlots] = useState<string[]>([""]);

  useEffect(() => {
    if (candidate) { setJobId(""); setNote(""); setSlots([""]); }
  }, [candidate?.id]);

  const submit = useMutation({
    mutationFn: async () => {
      const application = await (await apiRequest("POST", `/api/agency/candidates/${candidate!.id}/shortlist`, { jobId, note: note.trim() || undefined })).json() as { id: string };
      const chosen = slots.filter(Boolean).map((value) => new Date(value).toISOString());
      // Interview proposal goes through the existing candidate-choice flow
      // (notification + email, candidate picks the slot).
      if (chosen.length) await apiRequest("POST", `/api/applications/${application.id}/interview-slots`, { slots: chosen });
      return chosen.length;
    },
    onSuccess: (slotCount) => {
      queryClient.invalidateQueries({ queryKey: ["/api/agency/candidate-base"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agency/jobs-with-applications"] });
      const job = jobs.find((item) => item.id === jobId);
      toast({
        title: "Candidat présélectionné",
        description: `${candidate!.fullName} est positionné(e) sur « ${job?.title} »${slotCount ? ` — ${slotCount} créneau${slotCount > 1 ? "x" : ""} proposé${slotCount > 1 ? "s" : ""}` : ""}.`,
      });
      onClose();
    },
    onError: (error: Error) => toast({ title: "Présélection impossible", description: error.message, variant: "destructive" }),
  });

  // <input type="datetime-local"> works in local time, not UTC.
  const inOneHour = new Date(Date.now() + 3_600_000);
  const minSlot = new Date(inOneHour.getTime() - inOneHour.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

  return (
    <Dialog open={!!candidate} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Présélectionner sur une mission</DialogTitle>
          <DialogDescription>{candidate?.fullName}{candidate?.title ? ` · ${candidate.title}` : ""}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Mission *</Label>
            <Select value={jobId} onValueChange={setJobId}>
              <SelectTrigger data-testid="select-shortlist-job"><SelectValue placeholder={jobs.length ? "Choisir une de vos missions" : "Aucune mission"} /></SelectTrigger>
              <SelectContent>
                {jobs.map((job) => <SelectItem key={job.id} value={job.id}>{job.title} · {job.location}{job.isActive ? "" : " (brouillon)"}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Proposer des créneaux d'entretien <span className="text-muted-foreground">(optionnel)</span></Label>
            {slots.map((value, index) => (
              <div key={index} className="flex gap-2">
                <Input type="datetime-local" min={minSlot} value={value} onChange={(e) => setSlots((current) => current.map((slot, i) => (i === index ? e.target.value : slot)))} data-testid={`input-slot-${index}`} />
                {slots.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => setSlots((current) => current.filter((_, i) => i !== index))} aria-label="Retirer le créneau"><X className="h-4 w-4" /></Button>
                )}
              </div>
            ))}
            {slots.length < 4 && <Button type="button" variant="ghost" size="sm" onClick={() => setSlots((current) => [...current, ""])}><Plus /> Ajouter un créneau</Button>}
            <p className="text-xs text-muted-foreground">Le candidat est notifié par email et choisit le créneau qui lui convient.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="shortlist-note">Note interne</Label>
            <Textarea id="shortlist-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Pourquoi ce profil ? Points à vérifier en entretien…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => submit.mutate()} disabled={!jobId || submit.isPending} data-testid="button-confirm-shortlist">
            {submit.isPending ? <Loader2 className="animate-spin" /> : <CalendarPlus />} Présélectionner
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type SortKey = "recent" | "name" | "experience" | "completeness" | "score";

export function CandidateManagementTable() {
  const [, setLocation] = useLocation();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [jobId, setJobId] = useState(ALL);
  const [sort, setSort] = useState<SortKey>("recent");
  const [page, setPage] = useState(1);
  const [shortlisting, setShortlisting] = useState<CandidateRow | null>(null);

  // The whole (lean) base is loaded once and filtered locally for instant
  // feedback; only a target mission changes the query (server-side scores).
  const { data, isLoading, isError } = useQuery<{ total: number; rows: CandidateRow[] }>({
    queryKey: ["/api/agency/candidate-base", jobId],
    queryFn: async () => {
      const res = await fetch(`/api/agency/candidate-base${jobId !== ALL ? `?jobId=${encodeURIComponent(jobId)}` : ""}`, { credentials: "include" });
      if (!res.ok) throw new Error("Chargement impossible");
      return res.json();
    },
  });
  const { data: jobs = [] } = useQuery<AgencyJob[]>({ queryKey: ["/api/agency/jobs"] });
  const rows = data?.rows ?? [];
  const targetJob = jobs.find((job) => job.id === jobId);

  useEffect(() => { setSort(jobId !== ALL ? "score" : "recent"); }, [jobId]);
  useEffect(() => { setPage(1); }, [filters, jobId, sort]);

  const facets = useMemo(() => {
    const skillCount = new Map<string, number>();
    const cities = new Map<string, string>();
    for (const row of rows) {
      for (const skill of row.skills) skillCount.set(skill, (skillCount.get(skill) ?? 0) + 1);
      if (row.city) cities.set(normalize(row.city), row.city);
    }
    return {
      skills: Array.from(skillCount.entries()).sort((a, b) => b[1] - a[1]).slice(0, 60).map(([skill]) => skill),
      cities: Array.from(cities.values()).sort((a, b) => a.localeCompare(b)),
    };
  }, [rows]);

  const visible = useMemo(() => {
    const search = normalize(filters.search);
    const skill = filters.skill === ALL ? "" : normalize(filters.skill);
    const city = filters.city === ALL ? "" : normalize(filters.city);
    const minExperience = filters.minExperience === ALL ? null : Number(filters.minExperience);
    const list = rows.filter((row) =>
      (!search || [row.fullName, row.email, row.title ?? "", row.city ?? "", ...row.skills].some((value) => normalize(value).includes(search)))
      && (filters.status === ALL || row.status === filters.status)
      && (!skill || row.skills.some((value) => normalize(value) === skill))
      && (!city || normalize(row.city ?? "") === city)
      && (minExperience === null || (row.experienceYears ?? 0) >= minExperience)
      && (filters.hasCv === ALL || row.hasCv === (filters.hasCv === "yes")));
    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sort) {
        case "name": return a.fullName.localeCompare(b.fullName);
        case "experience": return (b.experienceYears ?? -1) - (a.experienceYears ?? -1);
        case "completeness": return b.completeness - a.completeness;
        case "score": return (b.matchScore ?? 0) - (a.matchScore ?? 0);
        default: return new Date(b.registeredAt ?? 0).getTime() - new Date(a.registeredAt ?? 0).getTime();
      }
    });
    return sorted;
  }, [rows, filters, sort]);

  const stats = {
    total: rows.length,
    available: rows.filter((row) => row.status === "available").length,
    inProcess: rows.filter((row) => row.status === "in_process").length,
    placed: rows.filter((row) => row.status === "placed").length,
  };

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => (key === "search" ? value.trim() !== "" : value !== ALL)).length;
  const exportHref = `/api/agency/candidate-base/export${toQuery(filters, jobId) ? `?${toQuery(filters, jobId)}` : ""}`;
  const set = (key: keyof Filters, value: string) => setFilters((current) => ({ ...current, [key]: value }));

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Base candidats</h1>
          <p className="text-sm text-muted-foreground">Recherchez, qualifiez et positionnez les profils sur vos missions.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild disabled={visible.length === 0}>
            <a href={exportHref} data-testid="button-export-excel" aria-disabled={visible.length === 0}>
              <FileSpreadsheet /> Exporter Excel ({visible.length})
            </a>
          </Button>
          <Button size="sm" onClick={() => setLocation("/agency/candidates/create")}><Plus /> Nouveau candidat</Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={Users} value={stats.total} label="Candidats dans la base" tone="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300" active={filters.status === ALL} onClick={() => set("status", ALL)} />
        <StatCard icon={UserRound} value={stats.available} label="Disponibles" tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300" active={filters.status === "available"} onClick={() => set("status", "available")} />
        <StatCard icon={Target} value={stats.inProcess} label="En processus chez vous" tone="bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300" active={filters.status === "in_process"} onClick={() => set("status", "in_process")} />
        <StatCard icon={UserCheck} value={stats.placed} label="En mission avec vous" tone="bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300" active={filters.status === "placed"} onClick={() => set("status", "placed")} />
      </div>

      <div className={`${cardClass} overflow-hidden`}>
        <div className="space-y-3 border-b border-border/60 p-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_280px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={filters.search} onChange={(e) => set("search", e.target.value)} placeholder="Nom, métier, compétence, ville, email…" className="pl-10" data-testid="input-search-candidates" />
            </div>
            <Select value={jobId} onValueChange={setJobId}>
              <SelectTrigger data-testid="select-target-job"><Target className="mr-2 h-4 w-4 text-primary" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Classer pour une mission…</SelectItem>
                {jobs.map((job) => <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
            <Select value={filters.status} onValueChange={(value) => set("status", value)}>
              <SelectTrigger data-testid="select-status-filter"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tous statuts</SelectItem>
                {Object.entries(STATUS).map(([value, { label }]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.skill} onValueChange={(value) => set("skill", value)}>
              <SelectTrigger data-testid="select-skill-filter"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Compétences</SelectItem>
                {facets.skills.map((skill) => <SelectItem key={skill} value={skill}>{skill}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.city} onValueChange={(value) => set("city", value)}>
              <SelectTrigger data-testid="select-city-filter"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Villes</SelectItem>
                {facets.cities.map((city) => <SelectItem key={city} value={city}>{city}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.minExperience} onValueChange={(value) => set("minExperience", value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Expérience</SelectItem>
                {[1, 2, 3, 5, 10].map((years) => <SelectItem key={years} value={String(years)}>{years}+ an{years > 1 ? "s" : ""}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.hasCv} onValueChange={(value) => set("hasCv", value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>CV : tous</SelectItem>
                <SelectItem value="yes">Avec CV</SelectItem>
                <SelectItem value="no">Sans CV</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
              <SelectTrigger data-testid="select-sort"><SelectValue /></SelectTrigger>
              <SelectContent>
                {jobId !== ALL && <SelectItem value="score">Meilleur score</SelectItem>}
                <SelectItem value="recent">Plus récents</SelectItem>
                <SelectItem value="name">Nom (A→Z)</SelectItem>
                <SelectItem value="experience">Expérience</SelectItem>
                <SelectItem value="completeness">Profil le plus complet</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {targetJob && !targetJob.requiredSkills?.length && targetJob.experienceMin === null && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
              « {targetJob.title} » n'a ni compétences requises ni expérience minimale : le score ne peut départager les candidats.{" "}
              <button type="button" className="font-semibold underline" onClick={() => setLocation(`/agency/missions/${targetJob.id}/edit`)}>Compléter la mission</button>
            </p>
          )}
          {activeFilterCount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{visible.length} candidat{visible.length > 1 ? "s" : ""} sur {rows.length}</span>
              <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}><X /> Réinitialiser les filtres</Button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
        ) : isError ? (
          <p className="p-10 text-center text-sm text-muted-foreground" role="alert">Impossible de charger la base candidats. Réessayez dans un instant.</p>
        ) : pageRows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground/60" />
            <p className="font-medium text-foreground">{rows.length ? "Aucun candidat ne correspond" : "La base est vide"}</p>
            {rows.length ? <Button variant="outline" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>Réinitialiser les filtres</Button> : <Button size="sm" onClick={() => setLocation("/agency/candidates/create")}><Plus /> Ajouter un candidat</Button>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]" data-testid="candidate-base-table">
              <thead>
                <tr className="bg-muted/40 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3">Candidat</th>
                  <th className="px-3 py-3">Localisation</th>
                  <th className="px-3 py-3">Exp.</th>
                  <th className="px-3 py-3">Compétences</th>
                  <th className="px-3 py-3">Statut agence</th>
                  <th className="px-3 py-3">Profil</th>
                  {jobId !== ALL && <th className="px-3 py-3">Score</th>}
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {pageRows.map((row) => (
                  <tr key={row.id} className="cursor-pointer transition-colors hover:bg-muted/30" onClick={() => setLocation(`/agency/candidates/${row.id}`)} data-testid={`row-candidate-${row.id}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={row.avatarUrl ?? undefined} />
                          <AvatarFallback className="text-xs">{initialsOf(row.fullName)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-foreground">
                            {row.fullName}
                            {row.hasCv && <FileText className="h-3.5 w-3.5 shrink-0 text-blue-600" aria-label="CV disponible" />}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{row.title || "Métier non renseigné"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm text-muted-foreground">{row.city ? <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{row.city}</span> : "—"}</td>
                    <td className="px-3 py-3 text-sm tabular-nums">{row.experienceYears !== null ? `${row.experienceYears} an${row.experienceYears > 1 ? "s" : ""}` : "—"}</td>
                    <td className="px-3 py-3">
                      <div className="flex max-w-[260px] flex-wrap gap-1">
                        {row.skills.slice(0, 3).map((skill) => <span key={skill} className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-foreground">{skill}</span>)}
                        {row.skills.length > 3 && <span className="px-1 text-[11px] text-muted-foreground">+{row.skills.length - 3}</span>}
                        {row.skills.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS[row.status].className}`}>{STATUS[row.status].label}</span>
                      <p className="mt-0.5 max-w-[200px] truncate text-[11px] text-muted-foreground">
                        {row.currentPlacement ? row.currentPlacement.position ?? "" : row.currentProcess ? `${row.currentProcess.jobTitle} · ${PROCESS_LABEL[row.currentProcess.status] ?? row.currentProcess.status}` : row.placementsCount ? `${row.placementsCount} placement${row.placementsCount > 1 ? "s" : ""} passé${row.placementsCount > 1 ? "s" : ""}` : ""}
                        {row.averageRating !== null && <span className="ml-1 inline-flex items-center gap-0.5"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{row.averageRating.toLocaleString("fr-FR")}</span>}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2" title={`Profil complet à ${row.completeness}%`}>
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                          <div className={`h-full rounded-full ${row.completeness >= 80 ? "bg-emerald-500" : row.completeness >= 50 ? "bg-amber-500" : "bg-red-400"}`} style={{ width: `${row.completeness}%` }} />
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground">{row.completeness}%</span>
                      </div>
                    </td>
                    {jobId !== ALL && (
                      <td className="px-3 py-3">
                        <span className={`text-sm font-bold tabular-nums ${(row.matchScore ?? 0) >= 70 ? "text-emerald-600" : (row.matchScore ?? 0) >= 40 ? "text-amber-600" : "text-muted-foreground"}`}>{row.matchScore ?? 0}%</span>
                      </td>
                    )}
                    <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="outline" size="sm" className="h-8" onClick={() => setShortlisting(row)} data-testid={`button-shortlist-${row.id}`}>
                          <Briefcase /> Présélectionner
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Plus d'actions"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setLocation(`/agency/candidates/${row.id}`)}><UserRound /> Voir le profil</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild><a href={`mailto:${row.email}`}><Mail /> {row.email}</a></DropdownMenuItem>
                            {row.phone && <DropdownMenuItem asChild><a href={`tel:${row.phone.replace(/\s/g, "")}`}><Phone /> {row.phone}</a></DropdownMenuItem>}
                            {(row.whatsapp || row.phone) && (
                              <DropdownMenuItem asChild><a href={whatsappLink(row.whatsapp || row.phone!)} target="_blank" rel="noopener noreferrer"><MessageCircle /> WhatsApp</a></DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && visible.length > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-border/60 px-5 py-3">
            <p className="text-sm text-muted-foreground">{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, visible.length)} sur {visible.length}</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} aria-label="Page précédente"><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm tabular-nums">{currentPage} / {totalPages}</span>
              <Button variant="outline" size="icon" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)} aria-label="Page suivante"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </div>

      <ShortlistDialog candidate={shortlisting} jobs={jobs} onClose={() => setShortlisting(null)} />
    </div>
  );
}
