import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlarmClock, Bot, CalendarClock, History, Moon, Plus, Search, Trash2, Users } from "lucide-react";
import { ClientSelect, useClients } from "@/components/agency-crm/shared";
import {
  INTERACTIONS_KEY,
  LogInteractionDialog,
  OUTCOME_META,
  PageHeader,
  ReminderDialog,
  StatCard,
  TYPE_META,
  cardClass,
  formatDate,
  refreshRelations,
  useOverview,
  type Interaction,
  type InteractionType,
  type LogPrefill,
} from "./shared";

export function RelationsExchanges() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<"all" | InteractionType>("all");
  const [logging, setLogging] = useState<LogPrefill | null>(null);
  const [reminderFor, setReminderFor] = useState<string | null>(null);
  // Deleting an exchange is permanent (hard DELETE) — confirm first.
  const [pendingDelete, setPendingDelete] = useState<Interaction | null>(null);
  // The dialog is state-driven (no AlertDialogTrigger), so Radix can't
  // restore focus on its own — hand it back to the trash button.
  const deleteTriggerRef = useRef<HTMLElement | null>(null);
  const { data: interactions = [], isLoading } = useQuery<Interaction[]>({ queryKey: INTERACTIONS_KEY });
  const { data: overview } = useOverview();
  const { data: clients = [] } = useClients();

  const remove = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/agency/interactions/${id}`),
    onSuccess: () => { refreshRelations(); toast({ title: "Échange supprimé" }); },
    onError: (error: Error) => toast({ title: "Suppression impossible", description: error.message, variant: "destructive" }),
  });

  const query = search.trim().toLowerCase();
  const visible = interactions.filter((row) =>
    (clientFilter === "all" || row.clientId === clientFilter)
    && (typeFilter === "all" || row.type === typeFilter)
    && (!query || [row.subject, row.body ?? "", row.clientName, row.contactName ?? ""].some((value) => value.toLowerCase().includes(query))));

  const groups = useMemo(() => {
    const map = new Map<string, Interaction[]>();
    for (const row of visible) {
      const label = new Date(row.occurredAt).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
      map.set(label, [...(map.get(label) ?? []), row]);
    }
    return Array.from(map.entries());
  }, [visible]);

  // Active clients ranked by silence: the ones to call first.
  const dormant = useMemo(() => {
    const last = new Map<string, number>();
    for (const row of interactions) last.set(row.clientId, Math.max(last.get(row.clientId) ?? 0, new Date(row.occurredAt).getTime()));
    const threshold = (overview?.dormantDays ?? 45) * 86_400_000;
    return clients
      .filter((client) => client.status === "active")
      .map((client) => ({ client, last: last.get(client.id) ?? null }))
      .filter((entry) => !entry.last || Date.now() - entry.last > threshold)
      .sort((a, b) => (a.last ?? 0) - (b.last ?? 0));
  }, [clients, interactions, overview?.dormantDays]);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-8">
      <PageHeader
        title="Suivi des échanges"
        description="L'historique de chaque relation client : appels, rendez-vous, emails, messages."
        action={<Button size="sm" onClick={() => setLogging({})} data-testid="button-log-interaction"><Plus /> Tracer un échange</Button>}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={History} value={overview?.interactionsThisMonth ?? "—"} label="Échanges ce mois-ci" tone="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300" />
        <StatCard icon={Users} value={overview?.clientsContacted30d ?? "—"} label="Clients contactés (30 j)" tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300" />
        <StatCard icon={Moon} value={overview?.dormantClients ?? "—"} label={`Clients sans échange depuis ${overview?.dormantDays ?? 45} j`} tone="bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300" />
        <StatCard icon={AlarmClock} value={overview?.remindersOverdue ?? "—"} label="Relances en retard" tone="bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className={`${cardClass} overflow-hidden`}>
          <div className="grid grid-cols-2 gap-3 border-b border-border/60 p-4 md:grid-cols-[minmax(0,1fr)_220px_170px]">
            <div className="relative col-span-2 md:col-span-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Objet, compte rendu, client, contact…" className="pl-10" data-testid="input-search-exchanges" />
            </div>
            <ClientSelect value={clientFilter} onChange={setClientFilter} includeAll />
            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as typeof typeFilter)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous types</SelectItem>
                {(Object.keys(TYPE_META) as InteractionType[]).map((type) => <SelectItem key={type} value={type}>{TYPE_META[type].label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {isLoading ? (
            <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-12 text-center">
              <History className="h-10 w-10 text-muted-foreground/60" />
              <div>
                <p className="font-medium text-foreground">{interactions.length ? "Aucun échange dans ce filtre" : "Aucun échange tracé"}</p>
                <p className="text-sm text-muted-foreground">Chaque appel, rendez-vous ou message noté ici construit la mémoire de la relation client.</p>
              </div>
              <Button size="sm" onClick={() => setLogging({})}><Plus /> Tracer un échange</Button>
            </div>
          ) : (
            groups.map(([label, rows]) => (
              <section key={label}>
                <h3 className="border-b border-border/60 bg-muted/40 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground first-letter:uppercase">{label}</h3>
                <ul className="divide-y divide-border/60">
                  {rows.map((row) => {
                    const meta = TYPE_META[row.type];
                    return (
                      <li key={row.id} className="flex gap-3 px-5 py-3" data-testid={`interaction-${row.id}`}>
                        <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.className}`}><meta.icon className="h-4 w-4" /></span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">{row.subject}</p>
                            {row.outcome && <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${OUTCOME_META[row.outcome].className}`}>{OUTCOME_META[row.outcome].label}</span>}
                            {row.source === "platform" && <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"><Bot className="h-3 w-3" /> Envoyé par BaaraMatch</span>}
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {new Date(row.occurredAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} · {meta.label}
                            {row.direction === "inbound" ? " reçu" : ""} · <span className="font-medium text-foreground">{row.clientName}</span>
                            {row.contactName && ` · ${row.contactName}`}
                            {row.emailTo && ` · ${row.emailTo}`}
                            {row.durationMinutes ? ` · ${row.durationMinutes} min` : ""}
                          </p>
                          {row.body && <p className="mt-1.5 whitespace-pre-line text-sm text-muted-foreground">{row.body}</p>}
                        </div>
                        <div className="flex shrink-0 items-start gap-1">
                          <Button variant="ghost" size="icon" title="Planifier une relance pour ce client" onClick={() => setReminderFor(row.clientId)}><CalendarClock className="h-4 w-4" /></Button>
                          {row.source === "manual" && (
                            <Button variant="ghost" size="icon" title="Supprimer" aria-label={`Supprimer l'échange « ${row.subject} »`} onClick={(e) => { deleteTriggerRef.current = e.currentTarget; setPendingDelete(row); }} data-testid={`button-delete-interaction-${row.id}`}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>

        <aside className={`${cardClass} h-fit overflow-hidden`}>
          <div className="border-b border-border/60 px-5 py-3">
            <h2 className="text-base font-semibold text-foreground">À recontacter</h2>
            <p className="text-xs text-muted-foreground">Clients actifs sans échange depuis {overview?.dormantDays ?? 45} jours</p>
          </div>
          {dormant.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">Tous vos clients actifs ont été contactés récemment.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {dormant.slice(0, 12).map(({ client, last }) => (
                <li key={client.id} className="flex items-center justify-between gap-2 px-5 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{client.name}</p>
                    <p className="text-xs text-muted-foreground">{last ? `Dernier échange ${formatDate(new Date(last).toISOString())}` : "Aucun échange tracé"}</p>
                  </div>
                  <Button variant="outline" size="sm" className="h-8" onClick={() => setLogging({ clientId: client.id, contactId: client.primaryContact?.id ?? null })}>Tracer</Button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      <LogInteractionDialog prefill={logging} onClose={() => setLogging(null)} />
      <ReminderDialog open={!!reminderFor} clientId={reminderFor ?? undefined} onClose={() => setReminderFor(null)} />
      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}>
        <AlertDialogContent
          onCloseAutoFocus={(e) => {
            // After a confirmed delete the button is gone: let Radix fall back.
            if (deleteTriggerRef.current?.isConnected) { e.preventDefault(); deleteTriggerRef.current.focus(); }
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet échange ?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete && <>« {pendingDelete.subject} » avec <strong>{pendingDelete.clientName}</strong> sera retiré de l'historique de la relation. Cette action est définitive.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-interaction">Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (pendingDelete) remove.mutate(pendingDelete.id); setPendingDelete(null); }}
              data-testid="button-confirm-delete-interaction"
            >
              Supprimer l'échange
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
