import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlarmClock, ArrowRight, Bot, CalendarClock, CheckCircle2, Clock, Loader2, Mail, Phone, Plus, Settings2, Sun } from "lucide-react";
import {
  LogInteractionDialog,
  PageHeader,
  REMINDERS_KEY,
  ReminderDialog,
  StatCard,
  TYPE_META,
  cardClass,
  formatDateTime,
  refreshRelations,
  type LogPrefill,
  type Reminder,
} from "./shared";

type Rule = { enabled: boolean; days: number };
type Rules = Record<"invoice_overdue" | "agreement_expiring" | "client_dormant" | "need_untreated" | "placement_ending" | "detractor", Rule>;

const RULES: { key: keyof Rules; title: string; describe: (days: number) => string; unit?: string }[] = [
  { key: "invoice_overdue", title: "Factures impayées", describe: (days) => `Relancer une facture échue, puis ${days} jours après chaque rappel resté sans effet.` },
  { key: "agreement_expiring", title: "Accords qui expirent", describe: (days) => `Préparer le renouvellement d'un contrat-cadre ou d'une convention ${days} jours avant son échéance.` },
  { key: "client_dormant", title: "Clients sans nouvelles", describe: (days) => `Reprendre contact avec un client actif après ${days} jours sans échange tracé.` },
  { key: "need_untreated", title: "Besoins non traités", describe: (days) => `Qualifier un besoin de recrutement resté « Nouveau » plus de ${days} jours.` },
  { key: "placement_ending", title: "Fins de mission", describe: (days) => `Proposer un renouvellement au client ${days} jours avant la fin d'un placement.` },
  { key: "detractor", title: "Clients insatisfaits", describe: () => "Rappeler immédiatement un client qui répond 6/10 ou moins à l'enquête de satisfaction.", unit: "none" },
];

function RulesPanel() {
  const { toast } = useToast();
  const { data } = useQuery<{ rules: Rules }>({ queryKey: ["/api/agency/crm-settings"] });
  const [rules, setRules] = useState<Rules | null>(null);
  useEffect(() => { if (data) setRules(data.rules); }, [data]);

  const save = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/agency/crm-settings", { rules }),
    onSuccess: () => { refreshRelations(); toast({ title: "Règles enregistrées", description: "Les relances ont été recalculées." }); },
    onError: (error: Error) => toast({ title: "Enregistrement impossible", description: error.message, variant: "destructive" }),
  });

  if (!rules) return <Skeleton className="h-96 rounded-2xl" />;
  const dirty = JSON.stringify(rules) !== JSON.stringify(data?.rules);

  return (
    <section className={`${cardClass} h-fit overflow-hidden`}>
      <div className="border-b border-border/60 px-5 py-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground"><Settings2 className="h-4 w-4" /> Relances automatiques</h2>
        <p className="text-xs text-muted-foreground">BaaraMatch crée ces relances pour vous, et les clôt quand la situation est réglée.</p>
      </div>
      <ul className="divide-y divide-border/60">
        {RULES.map((rule) => {
          const value = rules[rule.key];
          return (
            <li key={rule.key} className="space-y-2 px-5 py-3" data-testid={`rule-${rule.key}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">{rule.title}</p>
                <Switch checked={value.enabled} onCheckedChange={(checked) => setRules({ ...rules, [rule.key]: { ...value, enabled: checked } })} data-testid={`switch-${rule.key}`} />
              </div>
              <p className="text-xs text-muted-foreground">{rule.describe(value.days)}</p>
              {rule.unit !== "none" && value.enabled && (
                <div className="flex items-center gap-2">
                  <Input type="number" min={0} max={365} className="h-8 w-20" value={value.days}
                    onChange={(e) => setRules({ ...rules, [rule.key]: { ...value, days: Math.max(0, Math.min(365, Math.round(Number(e.target.value) || 0))) } })}
                    data-testid={`days-${rule.key}`} />
                  <span className="text-xs text-muted-foreground">jours</span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <div className="border-t border-border/60 p-4">
        <Button className="w-full" disabled={!dirty || save.isPending} onClick={() => save.mutate()} data-testid="button-save-rules">
          {save.isPending && <Loader2 className="animate-spin" />} Enregistrer les règles
        </Button>
      </div>
    </section>
  );
}

type Bucket = "overdue" | "today" | "upcoming" | "done";

export function RelationsReminders() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [bucket, setBucket] = useState<Bucket>("overdue");
  const [creating, setCreating] = useState(false);
  const [logging, setLogging] = useState<LogPrefill | null>(null);
  const { data: reminders = [], isLoading } = useQuery<Reminder[]>({ queryKey: REMINDERS_KEY });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => apiRequest("PATCH", `/api/agency/reminders/${id}`, body),
    onSuccess: (_, { body }) => {
      refreshRelations();
      toast({ title: body.dueAt ? "Relance reportée" : body.status === "done" ? "Relance faite" : body.status === "cancelled" ? "Relance annulée" : "Relance rouverte" });
    },
    onError: (error: Error) => toast({ title: "Action impossible", description: error.message, variant: "destructive" }),
  });

  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
  const open = reminders.filter((reminder) => reminder.status === "open");
  const buckets: Record<Bucket, Reminder[]> = {
    overdue: open.filter((reminder) => new Date(reminder.dueAt) < startOfToday),
    today: open.filter((reminder) => new Date(reminder.dueAt) >= startOfToday && new Date(reminder.dueAt) <= endOfToday),
    upcoming: open.filter((reminder) => new Date(reminder.dueAt) > endOfToday),
    done: reminders.filter((reminder) => reminder.status !== "open").sort((a, b) => new Date(b.completedAt ?? 0).getTime() - new Date(a.completedAt ?? 0).getTime()).slice(0, 50),
  };
  // Open on the most urgent non-empty list.
  useEffect(() => {
    if (!isLoading && buckets[bucket].length === 0) {
      const first = (["overdue", "today", "upcoming"] as Bucket[]).find((key) => buckets[key].length);
      if (first) setBucket(first);
    }
  }, [isLoading, reminders.length]);

  const snooze = (reminder: Reminder, days: number) => {
    const next = new Date(Date.now() + days * 86_400_000); next.setHours(9, 0, 0, 0);
    update.mutate({ id: reminder.id, body: { dueAt: next.toISOString() } });
  };

  const TABS: { key: Bucket; label: string }[] = [
    { key: "overdue", label: "En retard" }, { key: "today", label: "Aujourd'hui" }, { key: "upcoming", label: "À venir" }, { key: "done", label: "Terminées" },
  ];

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-8">
      <PageHeader
        title="Relances"
        description="Vos prochaines actions clients — planifiées par vous ou générées automatiquement."
        action={<Button size="sm" onClick={() => setCreating(true)} data-testid="button-new-reminder"><Plus /> Nouvelle relance</Button>}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={AlarmClock} value={buckets.overdue.length} label="En retard" tone="bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300" />
        <StatCard icon={Sun} value={buckets.today.length} label="Pour aujourd'hui" tone="bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300" />
        <StatCard icon={CalendarClock} value={buckets.upcoming.length} label="À venir" tone="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300" />
        <StatCard icon={Bot} value={open.filter((reminder) => reminder.source === "rule").length} label="Créées automatiquement" tone="bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className={`${cardClass} overflow-hidden`}>
          <div className="flex flex-wrap gap-1 border-b border-border/60 p-3">
            {TABS.map((tab) => (
              <button key={tab.key} type="button" onClick={() => setBucket(tab.key)} data-testid={`tab-${tab.key}`}
                className={`rounded-lg px-3 py-1.5 text-sm ${bucket === tab.key ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                {tab.label} <span className="ml-1 tabular-nums opacity-80">{buckets[tab.key].length}</span>
              </button>
            ))}
          </div>
          {isLoading ? (
            <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
          ) : buckets[bucket].length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-12 text-center text-sm text-muted-foreground">
              <CheckCircle2 className="h-9 w-9 text-emerald-500" />
              {bucket === "done" ? "Aucune relance terminée." : "Rien à faire ici."}
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {buckets[bucket].map((reminder) => {
                const Channel = reminder.channel ? TYPE_META[reminder.channel].icon : Clock;
                const isOpen = reminder.status === "open";
                return (
                  <li key={reminder.id} className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center" data-testid={`reminder-${reminder.id}`}>
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${reminder.channel ? TYPE_META[reminder.channel].className : "bg-muted text-muted-foreground"}`}><Channel className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`text-sm font-semibold ${isOpen ? "text-foreground" : "text-muted-foreground line-through"}`}>{reminder.title}</p>
                        {reminder.source === "rule" && <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"><Bot className="h-3 w-3" /> Auto</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {isOpen ? `Échéance ${formatDateTime(reminder.dueAt)}` : `${reminder.status === "done" ? "Faite" : "Annulée"} le ${formatDateTime(reminder.completedAt ?? reminder.dueAt)}`}
                        {reminder.clientName && ` · ${reminder.clientName}`}{reminder.contactName && ` · ${reminder.contactName}`}
                      </p>
                      {reminder.notes && <p className="mt-1 text-xs text-muted-foreground">{reminder.notes}</p>}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-1">
                      {isOpen && reminder.contactPhone && <Button variant="ghost" size="icon" asChild title={reminder.contactPhone}><a href={`tel:${reminder.contactPhone.replace(/\s/g, "")}`}><Phone className="h-4 w-4" /></a></Button>}
                      {isOpen && reminder.contactEmail && <Button variant="ghost" size="icon" asChild title={reminder.contactEmail}><a href={`mailto:${reminder.contactEmail}`}><Mail className="h-4 w-4" /></a></Button>}
                      {reminder.relatedUrl && <Button variant="ghost" size="sm" className="h-8" onClick={() => setLocation(reminder.relatedUrl!)}>Ouvrir <ArrowRight /></Button>}
                      {isOpen ? (
                        <>
                          <Button size="sm" className="h-8" disabled={!reminder.clientId}
                            title={reminder.clientId ? "Tracer l'échange et clore la relance" : undefined}
                            onClick={() => setLogging({ clientId: reminder.clientId ?? undefined, contactId: reminder.contactId, type: reminder.channel ?? "call", subject: reminder.title, reminderId: reminder.id })}
                            data-testid={`button-done-${reminder.id}`}>
                            <CheckCircle2 /> Fait
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-8" data-testid={`button-snooze-${reminder.id}`}>Reporter</Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => snooze(reminder, 1)}>Demain</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => snooze(reminder, 3)}>Dans 3 jours</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => snooze(reminder, 7)}>Dans une semaine</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => update.mutate({ id: reminder.id, body: { status: "done" } })}>Marquer faite sans tracer</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => update.mutate({ id: reminder.id, body: { status: "cancelled" } })}>Annuler la relance</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-8" onClick={() => update.mutate({ id: reminder.id, body: { status: "open" } })}>Rouvrir</Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <RulesPanel />
      </div>

      <ReminderDialog open={creating} onClose={() => setCreating(false)} />
      <LogInteractionDialog prefill={logging} onClose={() => setLogging(null)} />
    </div>
  );
}
