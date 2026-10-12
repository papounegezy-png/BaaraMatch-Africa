import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, Building2, ChevronRight, Download, HardHat, History, Search, Star, UserCheck } from "lucide-react";
import {
  ClientSelect,
  EmptyState,
  MISSIONS_KEY,
  PageHeader,
  Pill,
  StatCard,
  cardClass,
  formatDate,
  type MissionRow,
} from "./shared";

const KIND: Record<MissionRow["kind"], { label: string; icon: React.ElementType; className: string }> = {
  mission: { label: "Offre", icon: Briefcase, className: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  placement: { label: "Placement", icon: UserCheck, className: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" },
  field_mission: { label: "Mission terrain", icon: HardHat, className: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
};

const STATUS: Record<string, { label: string; className: string }> = {
  open: { label: "Publiée", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  draft: { label: "Brouillon", className: "bg-muted text-muted-foreground" },
  active: { label: "En cours", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  in_progress: { label: "En cours", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  planned: { label: "Planifiée", className: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  on_leave: { label: "En pause", className: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  expired: { label: "À clôturer", className: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
  completed: { label: "Terminée", className: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  terminated: { label: "Résiliée", className: "bg-muted text-muted-foreground" },
  cancelled: { label: "Annulée", className: "bg-muted text-muted-foreground" },
  disputed: { label: "Litige", className: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
};

const RUNNING = ["open", "active", "in_progress", "planned", "on_leave"];

// Where a click on a history row leads, when there is a dedicated screen.
function detailHref(row: MissionRow) {
  if (row.kind === "mission") return `/agency/missions/${row.id}/edit`;
  if (row.kind === "field_mission") return `/agency/placements/${row.id}`;
  return "/agency/contracts";
}

function exportCsv(rows: MissionRow[]) {
  const header = ["Date", "Type", "Intitulé", "Entreprise", "Candidat", "Début", "Fin", "Statut", "Postes", "Candidatures", "Note"];
  const escape = (value: unknown) => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const date = (value: string | null) => (value ? new Date(value).toLocaleDateString("fr-FR") : "");
  const lines = rows.map((row) => [
    date(row.startDate), KIND[row.kind].label, row.title, row.clientName, row.candidateName ?? "",
    date(row.startDate), date(row.endDate), STATUS[row.status]?.label ?? row.status, row.positions ?? "", row.applications ?? "", row.rating ?? "",
  ].map(escape).join(";"));
  // BOM + ";" so Excel (FR locale) keeps accents and columns.
  const blob = new Blob(["﻿" + [header.join(";"), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `historique-missions-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function ClientMissionHistory({ clientId }: { clientId?: string }) {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [kind, setKind] = useState<"all" | MissionRow["kind"]>("all");
  const [period, setPeriod] = useState("all");
  const { data: rows = [], isLoading } = useQuery<MissionRow[]>({ queryKey: MISSIONS_KEY });

  const years = useMemo(
    () => Array.from(new Set(rows.filter((row) => row.startDate).map((row) => new Date(row.startDate!).getFullYear()))).sort((a, b) => b - a),
    [rows],
  );

  const scope = clientId ?? (clientFilter === "all" ? null : clientFilter);
  const scoped = rows.filter((row) => (!scope || row.clientId === scope)
    && (period === "all" || (row.startDate && new Date(row.startDate).getFullYear() === Number(period))));
  const query = search.trim().toLowerCase();
  const visible = scoped
    .filter((row) => kind === "all" || row.kind === kind)
    .filter((row) => !query || [row.title, row.clientName, row.candidateName].some((value) => value?.toLowerCase().includes(query)));

  const rated = scoped.filter((row) => row.rating !== null);
  const stats = {
    missions: scoped.filter((row) => row.kind === "mission").length,
    placements: scoped.filter((row) => row.kind === "placement").length,
    running: scoped.filter((row) => RUNNING.includes(row.status)).length,
    rating: rated.length ? (rated.reduce((sum, row) => sum + row.rating!, 0) / rated.length).toFixed(1).replace(".", ",") : "—",
  };

  // Group rows by month for a readable timeline.
  const groups = useMemo(() => {
    const map = new Map<string, MissionRow[]>();
    for (const row of visible) {
      const label = row.startDate ? new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date(row.startDate)) : "Sans date";
      map.set(label, [...(map.get(label) ?? []), row]);
    }
    return Array.from(map.entries());
  }, [visible]);

  const exportButton = (
    <Button variant="outline" size="sm" disabled={visible.length === 0} onClick={() => exportCsv(visible)} data-testid="button-export-missions">
      <Download /> Exporter (CSV)
    </Button>
  );

  return (
    <div className={clientId ? "space-y-3" : "mx-auto max-w-[1600px] space-y-6 pb-8"}>
      {!clientId && (
        <>
          <PageHeader title="Historique missions" description="Tout ce que vous avez réalisé pour chaque client : offres, placements, missions terrain." action={exportButton} />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard icon={Briefcase} value={stats.missions} label="Offres créées" tone="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300" />
            <StatCard icon={UserCheck} value={stats.placements} label="Placements" tone="bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300" />
            <StatCard icon={History} value={stats.running} label="En cours" tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300" />
            <StatCard icon={Star} value={stats.rating === "—" ? "—" : `${stats.rating}/5`} label="Note moyenne" tone="bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300" />
          </div>
        </>
      )}

      <div className={clientId ? "" : `${cardClass} overflow-hidden`}>
        <div className={`grid grid-cols-2 gap-3 ${clientId ? "pb-3" : "border-b border-border/60 p-4"} ${clientId ? "md:grid-cols-[minmax(0,1fr)_repeat(2,minmax(0,190px))]" : "md:grid-cols-[minmax(0,1fr)_repeat(3,minmax(0,190px))]"}`}>
          <div className="relative col-span-2 md:col-span-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Intitulé, entreprise, candidat…" className="pl-10" data-testid="input-search-missions" />
          </div>
          {!clientId && <ClientSelect value={clientFilter} onChange={setClientFilter} includeAll />}
          <Select value={kind} onValueChange={(value) => setKind(value as typeof kind)}>
            <SelectTrigger data-testid="select-missions-kind"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous types</SelectItem>
              {Object.entries(KIND).map(([value, { label }]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Années</SelectItem>
              {years.map((year) => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={History}
            title={rows.length ? "Aucune mission dans ce filtre" : "Pas encore d'historique"}
            description="Les offres créées depuis un besoin client, les placements et les missions terrain de vos clients s'afficheront ici."
          />
        ) : (
          <div>
            {groups.map(([label, items]) => (
              <section key={label}>
                <h3 className={`sticky top-0 z-[1] border-b border-border/60 bg-muted/60 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur sm:px-5 ${clientId ? "rounded-md" : ""}`}>{label}</h3>
                <ul className="divide-y divide-border/60">
                  {items.map((row) => {
                    const Kind = KIND[row.kind];
                    const status = STATUS[row.status] ?? { label: row.status, className: "bg-muted text-muted-foreground" };
                    return (
                      <li key={`${row.kind}-${row.id}`}>
                        <button
                          type="button"
                          onClick={() => setLocation(detailHref(row))}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30 sm:px-5"
                          data-testid={`mission-row-${row.id}`}
                        >
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${Kind.className}`}><Kind.icon className="h-4 w-4" /></span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-semibold text-foreground">{row.title}</p>
                              <Pill className={status.className}>{status.label}</Pill>
                            </div>
                            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                              <span>{Kind.label}</span>
                              {!clientId && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {row.clientName}</span>}
                              {row.candidateName && <span>· {row.candidateName}</span>}
                              {row.kind === "mission" && <span>· {row.positions ?? 1} poste{(row.positions ?? 1) > 1 ? "s" : ""} · {row.applications ?? 0} candidature{(row.applications ?? 0) > 1 ? "s" : ""}</span>}
                              <span>· {formatDate(row.startDate)}{row.endDate ? ` → ${formatDate(row.endDate)}` : ""}</span>
                            </p>
                          </div>
                          {row.rating !== null && (
                            <span className="hidden items-center gap-1 text-xs font-semibold text-amber-600 sm:flex"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {row.rating}/5</span>
                          )}
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
      {clientId && visible.length > 0 && <div className="flex justify-end">{exportButton}</div>}
    </div>
  );
}
