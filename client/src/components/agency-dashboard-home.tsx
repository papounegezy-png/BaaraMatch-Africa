import { useLocation } from "wouter";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AlertCircle,
  ArrowRight,
  ArrowDownRight,
  ArrowUpRight,
  Briefcase,
  CalendarCheck2,
  CheckCircle2,
  FileText,
  Plus,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export type AgencyOverview = {
  candidates: { active: number; newThisMonth: number; placed: number };
  missions: { open: number; urgent: number; openPositions: number; filledPositions: number };
  contracts: { active: number; expiringSoon: number };
  revenue: { thisMonth: number; previousMonth: number; trend: number | null; currency: string };
  activity: Array<{ month: string; placements: number; interviews: number }>;
  priorityMissions: Array<{
    id: string;
    title: string;
    company: string;
    location: string;
    category: string | null;
    candidates: number;
    isUrgent: boolean;
    daysLeft: number | null;
  }>;
  priorityMissionsTotal: number;
  expiringContracts: Array<{
    id: string;
    candidateName: string;
    position: string;
    company: string;
    contractType: string | null;
    endDate: string;
    daysLeft: number;
  }>;
};

const PLACEMENTS_COLOR = "#2563eb";
const INTERVIEWS_COLOR = "#10b981";

const pct = (value: number, total: number) => (total <= 0 ? 0 : Math.min(100, Math.round((value / total) * 100)));

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

function initialsOf(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
}

function hashIndex(value: string, modulo: number) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return hash % modulo;
}

const AVATAR_GRADIENTS = [
  "from-blue-500 to-indigo-600",
  "from-teal-500 to-cyan-600",
  "from-orange-500 to-red-500",
  "from-fuchsia-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-sky-500 to-blue-600",
];

const CATEGORY_STYLES = [
  "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
];

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  cdd: "CDD",
  cdi: "CDI",
  interim: "Intérim",
  intérim: "Intérim",
  mission: "Mission",
  stage: "Stage",
  freelance: "Freelance",
  consultant: "Consultant",
};

function daysLeftClass(days: number) {
  if (days <= 15) return "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300";
  if (days <= 30) return "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  return "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
}

const cardClass = "rounded-2xl border border-border/60 bg-card shadow-sm";

type KpiTone = "blue" | "amber" | "violet" | "emerald";

const KPI_TONES: Record<KpiTone, { icon: string; bar: string }> = {
  blue: { icon: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300", bar: "bg-blue-500" },
  amber: { icon: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300", bar: "bg-amber-500" },
  violet: { icon: "bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300", bar: "bg-violet-500" },
  emerald: { icon: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300", bar: "bg-emerald-500" },
};

type KpiBadge = { label: string; tone: "positive" | "negative" | "warning" } | null;

const BADGE_STYLES = {
  positive: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  negative: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

function KpiCard({
  icon: Icon,
  tone,
  value,
  label,
  hint,
  badge,
  progress,
  progressLabel,
  href,
  testId,
}: {
  icon: React.ElementType;
  tone: KpiTone;
  value: string;
  label: string;
  hint: string;
  badge: KpiBadge;
  progress: number;
  progressLabel: string;
  href: string;
  testId: string;
}) {
  const [, setLocation] = useLocation();
  const BadgeIcon = badge?.tone === "positive" ? ArrowUpRight : badge?.tone === "negative" ? ArrowDownRight : AlertCircle;

  return (
    <button
      type="button"
      onClick={() => setLocation(href)}
      data-testid={testId}
      className={`${cardClass} group flex min-w-0 flex-col p-4 text-left sm:p-5 transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${KPI_TONES[tone].icon}`}>
          <Icon className="h-5 w-5" />
        </span>
        {badge && (
          <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold sm:text-xs ${BADGE_STYLES[badge.tone]}`}>
            <BadgeIcon className="h-3 w-3" />
            {badge.label}
          </span>
        )}
      </div>
      <p className="mt-4 truncate text-xl font-bold tracking-tight text-foreground tabular-nums sm:text-2xl">{value}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{label}</p>
      <p className="line-clamp-2 text-xs text-muted-foreground">{hint}</p>
      <div className="mt-4 border-t border-border/60 pt-3" title={progressLabel}>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className={`h-full rounded-full ${KPI_TONES[tone].bar} transition-all`} style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-1.5 truncate text-[11px] text-muted-foreground">{progressLabel}</p>
      </div>
    </button>
  );
}

function KpiGrid({ overview }: { overview: AgencyOverview }) {
  const { candidates, missions, contracts, revenue } = overview;
  const maxMonthlyRevenue = Math.max(revenue.thisMonth, revenue.previousMonth);
  const fillRate = pct(missions.filledPositions, missions.openPositions);
  const placedRate = pct(candidates.placed, candidates.active);
  const healthyContracts = pct(contracts.active - contracts.expiringSoon, contracts.active);

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <KpiCard
        testId="kpi-candidates"
        icon={Users}
        tone="blue"
        value={candidates.active.toLocaleString("fr-FR")}
        label="Candidats actifs"
        hint={`${candidates.newThisMonth} ajouté${candidates.newThisMonth > 1 ? "s" : ""} ce mois`}
        badge={candidates.newThisMonth > 0 ? { label: `+${candidates.newThisMonth}`, tone: "positive" } : null}
        progress={placedRate}
        progressLabel={`${placedRate}% actuellement placés`}
        href="/agency/candidates"
      />
      <KpiCard
        testId="kpi-missions"
        icon={Briefcase}
        tone="amber"
        value={missions.open.toLocaleString("fr-FR")}
        label="Missions ouvertes"
        hint={`${missions.openPositions} poste${missions.openPositions > 1 ? "s" : ""} à pourvoir`}
        badge={missions.urgent > 0 ? { label: `${missions.urgent} urgente${missions.urgent > 1 ? "s" : ""}`, tone: "warning" } : null}
        progress={fillRate}
        progressLabel={`${fillRate}% des postes pourvus`}
        href="/agency/missions"
      />
      <KpiCard
        testId="kpi-contracts"
        icon={FileText}
        tone="violet"
        value={contracts.active.toLocaleString("fr-FR")}
        label="Contrats actifs"
        hint={contracts.expiringSoon > 0 ? "à renouveler sous 30 jours" : "aucune échéance sous 30 jours"}
        badge={contracts.expiringSoon > 0 ? { label: `${contracts.expiringSoon} expire${contracts.expiringSoon > 1 ? "nt" : ""}`, tone: "warning" } : null}
        progress={healthyContracts}
        progressLabel={`${healthyContracts}% sans échéance proche`}
        href="/agency/contracts"
      />
      <KpiCard
        testId="kpi-revenue"
        icon={TrendingUp}
        tone="emerald"
        value={formatMoney(revenue.thisMonth, revenue.currency)}
        label="CA mensuel"
        hint={revenue.trend === null ? "commissions du mois" : "vs mois précédent"}
        badge={revenue.trend === null ? null : {
          label: `${revenue.trend > 0 ? "+" : ""}${revenue.trend.toLocaleString("fr-FR")}%`,
          tone: revenue.trend >= 0 ? "positive" : "negative",
        }}
        progress={pct(revenue.thisMonth, maxMonthlyRevenue)}
        progressLabel={`Mois précédent : ${formatMoney(revenue.previousMonth, revenue.currency)}`}
        href="/agency/billing/commissions"
      />
    </div>
  );
}

function ActivityChart({ activity }: { activity: AgencyOverview["activity"] }) {
  const hasData = activity.some((point) => point.placements > 0 || point.interviews > 0);
  const totals = activity.reduce(
    (acc, point) => ({ placements: acc.placements + point.placements, interviews: acc.interviews + point.interviews }),
    { placements: 0, interviews: 0 },
  );

  return (
    <section className={`${cardClass} flex min-h-[420px] flex-col p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Activité de recrutement</h2>
          <p className="text-sm text-muted-foreground">Placements & entretiens — 6 derniers mois</p>
        </div>
        <div className="flex gap-6">
          <div>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: PLACEMENTS_COLOR }} /> Placements
            </span>
            <p className="mt-0.5 text-xl font-bold tabular-nums text-foreground">{totals.placements}</p>
          </div>
          <div>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: INTERVIEWS_COLOR }} /> Entretiens
            </span>
            <p className="mt-0.5 text-xl font-bold tabular-nums text-foreground">{totals.interviews}</p>
          </div>
        </div>
      </div>
      <div className="mt-6 min-h-[260px] flex-1">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={activity} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="agencyPlacementsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PLACEMENTS_COLOR} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={PLACEMENTS_COLOR} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="agencyInterviewsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={INTERVIEWS_COLOR} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={INTERVIEWS_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tickFormatter={(month: string) => month.charAt(0).toUpperCase() + month.slice(1)}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }}
                labelStyle={{ fontWeight: 600, textTransform: "capitalize" }}
              />
              <Area type="monotone" name="Entretiens" dataKey="interviews" stroke={INTERVIEWS_COLOR} strokeWidth={2.5} fill="url(#agencyInterviewsFill)" />
              <Area type="monotone" name="Placements" dataKey="placements" stroke={PLACEMENTS_COLOR} strokeWidth={2.5} fill="url(#agencyPlacementsFill)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-center text-sm text-muted-foreground">
            <CalendarCheck2 className="h-8 w-8 text-muted-foreground/60" />
            Vos entretiens et placements apparaîtront ici.
          </div>
        )}
      </div>
    </section>
  );
}

function PriorityMissions({ missions, total }: { missions: AgencyOverview["priorityMissions"]; total: number }) {
  const [, setLocation] = useLocation();

  return (
    <section className={`${cardClass} flex min-h-[420px] flex-col overflow-hidden`}>
      <div className="flex items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Missions urgentes</h2>
          <p className="text-xs text-muted-foreground">Urgentes ou clôturant sous 14 jours</p>
        </div>
        {total > 0 && (
          <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:border-red-900 dark:bg-red-900/30 dark:text-red-300">
            {total} active{total > 1 ? "s" : ""}
          </span>
        )}
      </div>
      {missions.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          Aucune mission urgente. Tout est sous contrôle.
        </div>
      ) : (
        <ul className="flex-1 divide-y divide-border/60">
          {missions.map((mission) => (
            <li key={mission.id}>
              <button
                type="button"
                onClick={() => setLocation(`/agency/missions/${mission.id}/edit`)}
                className="w-full px-5 py-3.5 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-foreground">{mission.title}</p>
                  {mission.daysLeft !== null ? (
                    <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums ${daysLeftClass(mission.daysLeft)}`}>
                      J-{mission.daysLeft}
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-md bg-red-50 px-1.5 py-0.5 text-xs font-bold text-red-700 dark:bg-red-900/30 dark:text-red-300">Urgent</span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{mission.company} · {mission.location}</p>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  {mission.category && (
                    <span className={`rounded-md px-1.5 py-0.5 font-semibold ${CATEGORY_STYLES[hashIndex(mission.category, CATEGORY_STYLES.length)]}`}>
                      {mission.category}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {mission.candidates} candidat{mission.candidates > 1 ? "s" : ""}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => setLocation("/agency/missions")}
        className="flex items-center justify-center gap-1.5 border-t border-border/60 py-3 text-sm font-semibold text-primary hover:bg-muted/50"
      >
        Voir toutes les missions <ArrowRight className="h-4 w-4" />
      </button>
    </section>
  );
}

function ExpiringContracts({ contracts }: { contracts: AgencyOverview["expiringContracts"] }) {
  const [, setLocation] = useLocation();

  return (
    <section className={`${cardClass} overflow-hidden`}>
      <div className="flex items-start justify-between gap-3 px-6 py-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Contrats arrivant à expiration</h2>
          <p className="text-sm text-muted-foreground">Employés à renouveler en priorité</p>
        </div>
        <Button variant="ghost" size="sm" className="text-primary" onClick={() => setLocation("/agency/contracts/dates")}>
          Voir tout <ArrowRight />
        </Button>
      </div>
      {contracts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 border-t border-border/60 px-6 py-12 text-center text-sm text-muted-foreground">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          Aucun contrat à échéance. Vos placements sont sécurisés.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]" data-testid="expiring-contracts-table">
            <thead>
              <tr className="border-y border-border/60 bg-muted/40 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-3">Employé</th>
                <th className="px-4 py-3">Poste</th>
                <th className="px-4 py-3">Entreprise</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Fin de contrat</th>
                <th className="px-4 py-3">Restants</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {contracts.map((contract) => {
                const typeKey = contract.contractType?.toLowerCase() ?? "";
                return (
                  <tr key={contract.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white ${AVATAR_GRADIENTS[hashIndex(contract.candidateName, AVATAR_GRADIENTS.length)]}`}>
                          {initialsOf(contract.candidateName)}
                        </span>
                        <span className="text-sm font-semibold text-foreground">{contract.candidateName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground">{contract.position}</td>
                    <td className="px-4 py-3.5 text-sm text-foreground">{contract.company}</td>
                    <td className="px-4 py-3.5">
                      {contract.contractType ? (
                        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          {CONTRACT_TYPE_LABELS[typeKey] ?? contract.contractType}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-foreground">
                      {new Date(contract.endDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${daysLeftClass(contract.daysLeft)}`}>
                        {contract.daysLeft}j
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <Button variant="ghost" size="sm" className="h-8 text-primary" onClick={() => setLocation("/agency/contracts/renewals")}>
                        Renouveler
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[196px] rounded-2xl" />)}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Skeleton className="h-[420px] rounded-2xl" />
        <Skeleton className="h-[420px] rounded-2xl" />
      </div>
      <Skeleton className="h-[320px] rounded-2xl" />
    </div>
  );
}

export function AgencyDashboardHome({ firstName, overview, isLoading }: { firstName: string; overview?: AgencyOverview; isLoading: boolean }) {
  const [, setLocation] = useLocation();
  const today = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground first-letter:uppercase">{today}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Bonjour {firstName}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setLocation("/agency/candidates/create")}>
            <Plus /> Nouveau candidat
          </Button>
          <Button size="sm" onClick={() => setLocation("/agency/missions/new")}>
            <Briefcase /> Créer une mission
          </Button>
        </div>
      </header>

      {isLoading || !overview ? (
        <DashboardSkeleton />
      ) : (
        <>
          <KpiGrid overview={overview} />
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
            <ActivityChart activity={overview.activity} />
            <PriorityMissions missions={overview.priorityMissions} total={overview.priorityMissionsTotal} />
          </div>
          <ExpiringContracts contracts={overview.expiringContracts} />
        </>
      )}
    </div>
  );
}
