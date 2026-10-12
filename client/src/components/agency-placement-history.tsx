import { useMemo, useState } from "react";
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
import {
  Award,
  Briefcase,
  Building2,
  ChevronDown,
  Clock,
  Download,
  History,
  Loader2,
  Repeat,
  Search,
  Star,
  UserRound,
} from "lucide-react";

type PlacementStatus = "active" | "completed" | "terminated" | "on_leave";
type DisplayStatus = PlacementStatus | "expired";

type PlacementRow = {
  id: string;
  contractNumber: string;
  candidateId: string;
  candidateName: string;
  candidateAvatarUrl: string | null;
  position: string | null;
  companyId: string | null;
  agencyClientId: string | null;
  companyName: string;
  contractType: string | null;
  status: PlacementStatus;
  salary: number | null;
  salaryCurrency: string | null;
  startDate: string;
  endDate: string | null;
  performanceRating: number | null;
  notes: string | null;
};

type CandidateHistory = {
  candidateId: string;
  candidateName: string;
  avatarUrl: string | null;
  placements: PlacementRow[];
  clients: string[];
  totalDays: number;
  averageRating: number | null;
  pendingEvaluations: number;
  isActive: boolean;
  lastStart: number;
};

const DAY_MS = 86_400_000;
const RECOMMENDED_THRESHOLD = 4;

const STATUS_STYLES: Record<DisplayStatus, { label: string; className: string }> = {
  active: { label: "En cours", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  on_leave: { label: "En pause", className: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  expired: { label: "À clôturer", className: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
  completed: { label: "Terminé", className: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  terminated: { label: "Résilié", className: "bg-muted text-muted-foreground" },
};

// Same rule as the contracts page: an "active" row past its end date was
// simply never closed out, so it is shown as needing closure, not as running.
function displayStatus(row: PlacementRow): DisplayStatus {
  if (row.status === "active" && row.endDate && new Date(row.endDate).getTime() < Date.now()) return "expired";
  return row.status;
}

// The client of record is the agency's fiche; older rows may only carry a
// registered company id.
const clientKey = (row: PlacementRow) => row.agencyClientId ?? row.companyId ?? "unknown";

const isEnded = (row: PlacementRow) => ["completed", "terminated", "expired"].includes(displayStatus(row));

function durationDays(row: PlacementRow) {
  const start = new Date(row.startDate).getTime();
  const end = row.endDate ? Math.min(new Date(row.endDate).getTime(), Date.now()) : Date.now();
  return Math.max(0, Math.round((end - start) / DAY_MS));
}

function formatDuration(days: number) {
  if (days < 31) return `${days} j`;
  const months = Math.round(days / 30.4);
  if (months < 12) return `${months} mois`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest ? `${years} an${years > 1 ? "s" : ""} ${rest} mois` : `${years} an${years > 1 ? "s" : ""}`;
}

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—";

const formatMoney = (amount: number | null, currency: string | null) =>
  amount === null ? "—" : `${new Intl.NumberFormat("fr-FR").format(amount)} ${currency === "XOF" || !currency ? "FCFA" : currency}`;

function initialsOf(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
}

function Stars({ value, size = "h-3.5 w-3.5" }: { value: number | null; size?: string }) {
  if (value === null) return <span className="text-xs text-muted-foreground">Non évalué</span>;
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value.toFixed(1)} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`${size} ${i <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
      ))}
    </span>
  );
}

function exportCsv(rows: PlacementRow[]) {
  const header = ["Contrat", "Candidat", "Poste", "Entreprise", "Type", "Début", "Fin", "Durée (jours)", "Statut", "Salaire", "Devise", "Note", "Commentaire"];
  const escape = (value: unknown) => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = rows.map((row) => [
    row.contractNumber,
    row.candidateName,
    row.position ?? "",
    row.companyName,
    row.contractType ?? "",
    new Date(row.startDate).toLocaleDateString("fr-FR"),
    row.endDate ? new Date(row.endDate).toLocaleDateString("fr-FR") : "",
    durationDays(row),
    STATUS_STYLES[displayStatus(row)].label,
    row.salary ?? "",
    row.salaryCurrency ?? "",
    row.performanceRating ?? "",
    row.notes ?? "",
  ].map(escape).join(";"));
  // BOM + ";" separator so Excel (FR locale) opens accents and columns correctly.
  const blob = new Blob(["﻿" + [header.join(";"), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `historique-placements-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

const cardClass = "rounded-2xl border border-border/60 bg-card shadow-sm";

function StatCard({ icon: Icon, value, label, hint, tone }: { icon: React.ElementType; value: string; label: string; hint?: string; tone: string }) {
  return (
    <div className={`${cardClass} p-4`}>
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span>
        <div className="min-w-0">
          <p className="truncate text-2xl font-bold tabular-nums text-foreground">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
      {hint && <p className="mt-2 truncate text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function EvaluationDialog({ placement, onClose }: { placement: PlacementRow | null; onClose: () => void }) {
  const { toast } = useToast();
  const [rating, setRating] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [lastId, setLastId] = useState<string | null>(null);

  // Re-seed the form each time the dialog opens, so a cancelled edit never
  // resurfaces when the same placement is reopened.
  if (!placement && lastId !== null) {
    setLastId(null);
  } else if (placement && placement.id !== lastId) {
    setLastId(placement.id);
    setRating(placement.performanceRating);
    setNotes(placement.notes ?? "");
  }

  const save = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/agency/placements/${placement!.id}`, { performanceRating: rating, notes: notes.trim() || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agency/placements"] });
      toast({ title: "Évaluation enregistrée" });
      onClose();
    },
    onError: (error: Error) => toast({ title: "Enregistrement impossible", description: error.message, variant: "destructive" }),
  });

  const labels = ["", "Insuffisant", "À améliorer", "Correct", "Bon", "Excellent"];
  const shown = hover ?? rating;

  return (
    <Dialog open={!!placement} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Évaluer la mission</DialogTitle>
          <DialogDescription>
            {placement && `${placement.candidateName} · ${placement.position ?? "Poste"} chez ${placement.companyName}`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Performance</Label>
            <div className="flex items-center gap-3">
              <div className="flex" onMouseLeave={() => setHover(null)}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <button
                    key={i}
                    type="button"
                    onMouseEnter={() => setHover(i)}
                    onClick={() => setRating(i)}
                    className="rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`${i} étoile${i > 1 ? "s" : ""}`}
                    data-testid={`rating-star-${i}`}
                  >
                    <Star className={`h-7 w-7 transition-colors ${shown && i <= shown ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                  </button>
                ))}
              </div>
              <span className="text-sm font-medium text-muted-foreground">{shown ? labels[shown] : "Non évalué"}</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="placement-notes">Commentaire interne</Label>
            <Textarea
              id="placement-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={2000}
              rows={4}
              placeholder="Retour du client, points forts, à revoir avant un prochain placement…"
              data-testid="input-evaluation-notes"
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          {placement?.performanceRating !== null && placement?.performanceRating !== undefined && (
            <Button variant="ghost" className="mr-auto text-muted-foreground" onClick={() => setRating(null)}>Retirer la note</Button>
          )}
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending} data-testid="button-save-evaluation">
            {save.isPending && <Loader2 className="animate-spin" />} Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlacementTimeline({ placements, onEvaluate }: { placements: PlacementRow[]; onEvaluate: (row: PlacementRow) => void }) {
  return (
    <ol className="relative ml-4 space-y-4 border-l border-border/80 py-1 pl-6">
      {placements.map((row) => {
        const status = displayStatus(row);
        return (
          <li key={row.id} className="relative" data-testid={`history-placement-${row.id}`}>
            <span className={`absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-card ${status === "active" ? "bg-emerald-500" : status === "expired" ? "bg-red-500" : "bg-muted-foreground/50"}`} />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {row.position ?? "Poste non renseigné"} <span className="font-normal text-muted-foreground">chez</span> {row.companyName}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span>{formatDate(row.startDate)} → {row.endDate ? formatDate(row.endDate) : "sans fin"}</span>
                  <span>· {formatDuration(durationDays(row))}</span>
                  {row.contractType && <span className="rounded bg-blue-50 px-1.5 py-0.5 font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{row.contractType}</span>}
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${STATUS_STYLES[status].className}`}>{STATUS_STYLES[status].label}</span>
                  {row.salary !== null && <span>· {formatMoney(row.salary, row.salaryCurrency)}</span>}
                  <span className="text-muted-foreground/70">· {row.contractNumber}</span>
                </div>
                {row.notes && <p className="mt-2 rounded-lg bg-muted/50 px-3 py-2 text-xs italic text-muted-foreground">« {row.notes} »</p>}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Stars value={row.performanceRating} />
                <Button
                  variant={row.performanceRating === null && isEnded(row) ? "default" : "ghost"}
                  size="sm"
                  className="h-8"
                  onClick={() => onEvaluate(row)}
                  data-testid={`button-evaluate-${row.id}`}
                >
                  {row.performanceRating === null ? "Évaluer" : "Modifier"}
                </Button>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

type StatusFilter = "all" | "running" | "ended" | "to_evaluate" | "recommended";
type SortKey = "recent" | "placements" | "rating" | "name";

export function AgencyPlacementHistory() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [company, setCompany] = useState("all");
  const [year, setYear] = useState("all");
  const [sort, setSort] = useState<SortKey>("recent");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [evaluating, setEvaluating] = useState<PlacementRow | null>(null);

  const { data: placements = [], isLoading, isError } = useQuery<PlacementRow[]>({ queryKey: ["/api/agency/placements"] });

  const companies = useMemo(
    () => Array.from(new Map(placements.map((row) => [clientKey(row), row.companyName])).entries()).sort((a, b) => a[1].localeCompare(b[1])),
    [placements],
  );
  const years = useMemo(
    () => Array.from(new Set(placements.map((row) => new Date(row.startDate).getFullYear()))).sort((a, b) => b - a),
    [placements],
  );

  // Period/client filters narrow the placements themselves; the candidate
  // filters below then apply to the resulting per-candidate groups.
  const scoped = useMemo(() => placements.filter((row) =>
    (company === "all" || clientKey(row) === company)
    && (year === "all" || new Date(row.startDate).getFullYear() === Number(year)),
  ), [placements, company, year]);

  const histories = useMemo<CandidateHistory[]>(() => {
    const groups = new Map<string, PlacementRow[]>();
    for (const row of scoped) groups.set(row.candidateId, [...(groups.get(row.candidateId) ?? []), row]);
    return Array.from(groups.values()).map((rows) => {
      const sorted = rows.slice().sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
      const rated = sorted.filter((row) => row.performanceRating !== null);
      return {
        candidateId: sorted[0].candidateId,
        candidateName: sorted[0].candidateName,
        avatarUrl: sorted[0].candidateAvatarUrl,
        placements: sorted,
        clients: Array.from(new Set(sorted.map((row) => row.companyName))),
        totalDays: sorted.reduce((sum, row) => sum + durationDays(row), 0),
        averageRating: rated.length ? rated.reduce((sum, row) => sum + row.performanceRating!, 0) / rated.length : null,
        pendingEvaluations: sorted.filter((row) => isEnded(row) && row.performanceRating === null).length,
        isActive: sorted.some((row) => ["active", "on_leave"].includes(displayStatus(row))),
        lastStart: new Date(sorted[0].startDate).getTime(),
      };
    });
  }, [scoped]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = histories.filter((history) => {
      const matchesSearch = !query
        || history.candidateName.toLowerCase().includes(query)
        || history.placements.some((row) => (row.position ?? "").toLowerCase().includes(query) || row.companyName.toLowerCase().includes(query));
      if (!matchesSearch) return false;
      switch (status) {
        case "running": return history.isActive;
        case "ended": return !history.isActive;
        case "to_evaluate": return history.pendingEvaluations > 0;
        case "recommended": return (history.averageRating ?? 0) >= RECOMMENDED_THRESHOLD;
        default: return true;
      }
    });
    return list.sort((a, b) => {
      switch (sort) {
        case "placements": return b.placements.length - a.placements.length;
        case "rating": return (b.averageRating ?? -1) - (a.averageRating ?? -1);
        case "name": return a.candidateName.localeCompare(b.candidateName);
        default: return b.lastStart - a.lastStart;
      }
    });
  }, [histories, search, status, sort]);

  const stats = useMemo(() => {
    const rated = scoped.filter((row) => row.performanceRating !== null);
    const ended = scoped.filter(isEnded);
    return {
      placements: scoped.length,
      candidates: histories.length,
      rehired: histories.filter((history) => history.placements.length > 1).length,
      averageDays: scoped.length ? Math.round(scoped.reduce((sum, row) => sum + durationDays(row), 0) / scoped.length) : 0,
      averageRating: rated.length ? rated.reduce((sum, row) => sum + row.performanceRating!, 0) / rated.length : null,
      rated: rated.length,
      toEvaluate: ended.filter((row) => row.performanceRating === null).length,
    };
  }, [scoped, histories]);

  const toggle = (candidateId: string) => setExpanded((current) => {
    const next = new Set(current);
    if (next.has(candidateId)) next.delete(candidateId); else next.add(candidateId);
    return next;
  });

  const rehireRate = stats.candidates ? Math.round((stats.rehired / stats.candidates) * 100) : 0;

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Historique des placements</h1>
          <p className="text-sm text-muted-foreground">Le parcours de chaque candidat placé : missions, clients, évaluations.</p>
        </div>
        <Button variant="outline" size="sm" disabled={scoped.length === 0} onClick={() => exportCsv(visible.flatMap((history) => history.placements))} data-testid="button-export-history">
          <Download /> Exporter (CSV)
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={Briefcase} value={String(stats.placements)} label="Placements" hint={`${stats.candidates} candidat${stats.candidates > 1 ? "s" : ""} placé${stats.candidates > 1 ? "s" : ""}`} tone="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300" />
        <StatCard icon={Repeat} value={`${rehireRate}%`} label="Réemploi" hint={`${stats.rehired} candidat${stats.rehired > 1 ? "s" : ""} replacé${stats.rehired > 1 ? "s" : ""}`} tone="bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300" />
        <StatCard icon={Clock} value={formatDuration(stats.averageDays)} label="Durée moyenne" hint="par placement" tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300" />
        <StatCard
          icon={Star}
          value={stats.averageRating === null ? "—" : `${stats.averageRating.toFixed(1).replace(".", ",")}/5`}
          label="Note moyenne"
          hint={stats.toEvaluate > 0 ? `${stats.toEvaluate} mission${stats.toEvaluate > 1 ? "s" : ""} à évaluer` : `${stats.rated} évaluation${stats.rated > 1 ? "s" : ""}`}
          tone="bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300"
        />
      </div>

      <div className={`${cardClass} overflow-hidden`}>
        <div className="grid grid-cols-2 gap-3 border-b border-border/60 p-4 md:grid-cols-[minmax(0,1fr)_repeat(4,minmax(0,170px))]">
          <div className="relative col-span-2 md:col-span-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Candidat, poste ou entreprise…" className="pl-10" data-testid="input-search-history" />
          </div>
          <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
            <SelectTrigger data-testid="select-history-status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="running">En mission</SelectItem>
              <SelectItem value="ended">Disponibles (mission terminée)</SelectItem>
              <SelectItem value="to_evaluate">À évaluer</SelectItem>
              <SelectItem value="recommended">Recommandés (≥ 4★)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={company} onValueChange={setCompany}>
            <SelectTrigger data-testid="select-history-company"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Entreprises</SelectItem>
              {companies.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger data-testid="select-history-year"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Années</SelectItem>
              {years.map((value) => <SelectItem key={value} value={String(value)}>{value}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
            <SelectTrigger data-testid="select-history-sort"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Plus récents</SelectItem>
              <SelectItem value="placements">Plus de placements</SelectItem>
              <SelectItem value="rating">Meilleure note</SelectItem>
              <SelectItem value="name">Nom (A→Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
        ) : isError ? (
          <p className="p-10 text-center text-sm text-muted-foreground" role="alert">Impossible de charger l'historique. Réessayez dans un instant.</p>
        ) : placements.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <History className="h-10 w-10 text-muted-foreground/60" />
            <div>
              <p className="font-medium text-foreground">Aucun placement pour l'instant</p>
              <p className="text-sm text-muted-foreground">Chaque contrat enregistré alimentera automatiquement cet historique.</p>
            </div>
            <Button size="sm" onClick={() => setLocation("/agency/contracts")}>Enregistrer un placement</Button>
          </div>
        ) : visible.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">Aucun candidat ne correspond à ces filtres.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {visible.map((history) => {
              const isOpen = expanded.has(history.candidateId);
              const recommended = (history.averageRating ?? 0) >= RECOMMENDED_THRESHOLD;
              return (
                <li key={history.candidateId} data-testid={`history-candidate-${history.candidateId}`}>
                  <button
                    type="button"
                    onClick={() => toggle(history.candidateId)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-muted/30 sm:px-6"
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={history.avatarUrl ?? undefined} />
                      <AvatarFallback className="text-xs">{initialsOf(history.candidateName)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">{history.candidateName}</p>
                        {recommended && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                            <Award className="h-3 w-3" /> Recommandé
                          </span>
                        )}
                        {history.isActive ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">En mission</span>
                        ) : (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">Disponible</span>
                        )}
                        {history.pendingEvaluations > 0 && (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            {history.pendingEvaluations} à évaluer
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3 shrink-0" /> {history.clients.join(", ")}
                      </p>
                    </div>
                    <div className="hidden text-right sm:block">
                      <p className="text-sm font-semibold tabular-nums text-foreground">{history.placements.length} placement{history.placements.length > 1 ? "s" : ""}</p>
                      <p className="text-xs text-muted-foreground">{formatDuration(history.totalDays)} cumulés</p>
                    </div>
                    <div className="hidden w-28 justify-end md:flex"><Stars value={history.averageRating} /></div>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="border-t border-border/60 bg-muted/20 px-4 pb-4 pt-3 sm:px-6">
                      <div className="mb-2 flex justify-end">
                        <Button variant="ghost" size="sm" onClick={() => setLocation(`/agency/candidates/${history.candidateId}`)}>
                          <UserRound /> Voir le profil
                        </Button>
                      </div>
                      <PlacementTimeline placements={history.placements} onEvaluate={setEvaluating} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <EvaluationDialog placement={evaluating} onClose={() => setEvaluating(null)} />
    </div>
  );
}
