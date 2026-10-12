import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Banknote, FileSpreadsheet, Loader2, Mail, Receipt, Scale, Wallet } from "lucide-react";
import { PeriodPicker, formatPeriodLabel, periodQuery, usePeriod } from "@/components/billing-period";

type Statement = {
  period: { from: string; to: string };
  totals: { invoiced: number; collected: number; outstanding: number; overdue: number; salariesPaid: number; salariesDue: number; netCash: number };
  aging: { key: string; label: string; amount: number }[];
  byClient: { clientId: string | null; clientName: string; email: string | null; outstanding: number; overdue: number; invoices: number; oldestDue: string | null; lastReminderAt: string | null }[];
  openInvoices: { id: string; invoiceNumber: string; clientName: string; issueDate: string | null; dueDate: string | null; totalAmount: number; daysLate: number; reminderCount: number; lastReminderAt: string | null }[];
  salariesDue: { id: string; period: string; candidateName: string; netSalary: number; status: string }[];
  cashFlow: { month: string; label: string; inflow: number; outflow: number }[];
};

const cardClass = "rounded-2xl border border-border/60 bg-card shadow-sm";
const fcfa = (amount: number) => `${new Intl.NumberFormat("fr-FR").format(amount)} FCFA`;
const compact = (amount: number) => new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }).format(amount);
const formatDate = (value: string | null) => (value ? new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—");

const AGING_COLORS: Record<string, string> = {
  not_due: "bg-emerald-500", d0_30: "bg-amber-400", d31_60: "bg-orange-500", d61_90: "bg-red-500", d90_plus: "bg-red-800",
};

function formatSalaryPeriod(period: string) {
  const match = period.match(/^(\d{4})-(\d{2})$/);
  return match ? new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date(Number(match[1]), Number(match[2]) - 1, 1)) : period;
}

export function AgencyPaymentStatement() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const periodState = usePeriod("this_year");
  const { period, valid } = periodState;
  const [reminding, setReminding] = useState<Statement["openInvoices"][number] | null>(null);
  const [reminderTo, setReminderTo] = useState("");

  const { data, isLoading, isError } = useQuery<Statement>({
    queryKey: ["/api/agency/payment-statement", period.from, period.to],
    queryFn: async () => {
      const res = await fetch(`/api/agency/payment-statement?${periodQuery(period)}`, { credentials: "include" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? "Chargement impossible");
      return res.json();
    },
    enabled: valid,
  });

  const remind = useMutation({
    mutationFn: async () => (await apiRequest("POST", `/api/agency/invoices/${reminding!.id}/send`, { kind: "reminder", to: reminderTo.trim() || undefined })).json() as Promise<{ sentTo: string }>,
    onSuccess: ({ sentTo }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/agency/payment-statement"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agency/invoices"] });
      toast({ title: "Rappel envoyé", description: `Facture ${reminding!.invoiceNumber} — rappel envoyé à ${sentTo}.` });
      setReminding(null);
    },
    onError: (error: Error) => toast({ title: "Rappel impossible", description: error.message, variant: "destructive" }),
  });

  const openReminder = (invoice: Statement["openInvoices"][number]) => {
    setReminding(invoice);
    setReminderTo(data?.byClient.find((client) => client.clientName === invoice.clientName)?.email ?? "");
  };

  const totals = data?.totals;
  const agingTotal = (data?.aging ?? []).reduce((sum, bucket) => sum + bucket.amount, 0);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-8">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">États de paiement</h1>
          <p className="text-sm text-muted-foreground">Ce que vos clients vous doivent, ce que vous avez encaissé et versé — {formatPeriodLabel(period)}.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodPicker state={periodState} />
          <Button variant="outline" size="sm" asChild disabled={!valid}>
            <a href={`/api/agency/payment-statement/export?${periodQuery(period)}`} data-testid="button-export-statement"><FileSpreadsheet /> Exporter Excel</a>
          </Button>
        </div>
      </header>

      {!valid ? (
        <p className={`${cardClass} p-8 text-center text-sm text-muted-foreground`}>La date de fin doit suivre la date de début.</p>
      ) : isLoading || !totals ? (
        isError ? <p className={`${cardClass} p-8 text-center text-sm text-muted-foreground`} role="alert">Impossible de charger les états de paiement.</p>
          : <div className="grid gap-4 md:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
            {[
              { icon: Receipt, label: "Facturé", value: totals.invoiced, tone: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300" },
              { icon: ArrowDownLeft, label: "Encaissé", value: totals.collected, tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300" },
              { icon: Banknote, label: "Reste à encaisser", value: totals.outstanding, tone: "bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300" },
              { icon: AlertTriangle, label: "Dont en retard", value: totals.overdue, tone: "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300" },
              { icon: ArrowUpRight, label: "Salaires versés", value: totals.salariesPaid, tone: "bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300" },
              { icon: Scale, label: "Trésorerie nette", value: totals.netCash, tone: totals.netCash >= 0 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300" },
            ].map((stat) => (
              <div key={stat.label} className={`${cardClass} p-4`} data-testid={`stat-${stat.label}`}>
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${stat.tone}`}><stat.icon className="h-4 w-4" /></span>
                <p className="mt-3 text-xl font-bold tabular-nums text-foreground" title={fcfa(stat.value)}>{fcfa(stat.value)}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <section className={`${cardClass} p-5`}>
              <h2 className="text-base font-semibold text-foreground">Encaissements et salaires versés</h2>
              <p className="text-xs text-muted-foreground">Par mois, sur la période</p>
              <div className="mt-4 h-64">
                {data!.cashFlow.some((month) => month.inflow || month.outflow) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data!.cashFlow} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis axisLine={false} tickLine={false} tickFormatter={compact} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} width={50} />
                      <Tooltip formatter={(value: number) => fcfa(value)} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="inflow" name="Encaissements" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="outflow" name="Salaires versés" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">Aucun mouvement sur la période.</div>
                )}
              </div>
            </section>

            <section className={`${cardClass} p-5`}>
              <h2 className="text-base font-semibold text-foreground">Ancienneté des créances</h2>
              <p className="text-xs text-muted-foreground">Reste à encaisser : {fcfa(agingTotal)}</p>
              {agingTotal > 0 && (
                <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-muted">
                  {data!.aging.filter((bucket) => bucket.amount > 0).map((bucket) => (
                    <div key={bucket.key} className={AGING_COLORS[bucket.key]} style={{ width: `${(bucket.amount / agingTotal) * 100}%` }} title={`${bucket.label} : ${fcfa(bucket.amount)}`} />
                  ))}
                </div>
              )}
              <ul className="mt-4 space-y-2">
                {data!.aging.map((bucket) => (
                  <li key={bucket.key} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground"><span className={`h-2.5 w-2.5 rounded-full ${AGING_COLORS[bucket.key]}`} />{bucket.label}</span>
                    <span className="font-semibold tabular-nums text-foreground">{fcfa(bucket.amount)}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className={`${cardClass} overflow-hidden`}>
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">Factures à encaisser</h2>
                <p className="text-xs text-muted-foreground">Les plus en retard d'abord</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/agency/billing")}>Facturation clients</Button>
            </div>
            {data!.openInvoices.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">Aucune facture en attente de paiement.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead>
                    <tr className="bg-muted/40 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="px-5 py-2.5">Facture</th><th className="px-3 py-2.5">Client</th><th className="px-3 py-2.5">Échéance</th>
                      <th className="px-3 py-2.5 text-right">Montant TTC</th><th className="px-3 py-2.5">Retard</th><th className="px-3 py-2.5">Relances</th><th className="px-5 py-2.5 text-right" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {data!.openInvoices.map((invoice) => (
                      <tr key={invoice.id} data-testid={`open-invoice-${invoice.id}`}>
                        <td className="px-5 py-2.5 font-mono text-sm font-medium">{invoice.invoiceNumber}</td>
                        <td className="px-3 py-2.5 text-sm">{invoice.clientName}</td>
                        <td className="px-3 py-2.5 text-sm">{formatDate(invoice.dueDate)}</td>
                        <td className="px-3 py-2.5 text-right text-sm font-semibold tabular-nums">{fcfa(invoice.totalAmount)}</td>
                        <td className="px-3 py-2.5 text-sm">{invoice.daysLate > 0 ? <span className="font-semibold text-red-600">{invoice.daysLate} j</span> : <span className="text-muted-foreground">à échoir</span>}</td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{invoice.reminderCount ? `${invoice.reminderCount} · ${formatDate(invoice.lastReminderAt)}` : "—"}</td>
                        <td className="px-5 py-2.5 text-right">
                          <Button size="sm" variant={invoice.daysLate > 0 ? "default" : "outline"} onClick={() => openReminder(invoice)} data-testid={`button-remind-${invoice.id}`}><Mail /> Relancer</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className={`${cardClass} overflow-hidden`}>
              <div className="border-b border-border/60 px-5 py-3">
                <h2 className="text-base font-semibold text-foreground">Créances par client</h2>
              </div>
              {data!.byClient.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">Aucune créance ouverte.</p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {data!.byClient.map((client) => (
                    <li key={client.clientId ?? client.clientName} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{client.clientName}</p>
                        <p className="text-xs text-muted-foreground">{client.invoices} facture{client.invoices > 1 ? "s" : ""} · plus ancienne échéance {formatDate(client.oldestDue)}{client.email ? "" : " · pas d'email de contact"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold tabular-nums">{fcfa(client.outstanding)}</p>
                        {client.overdue > 0 && <p className="text-xs font-semibold text-red-600">{fcfa(client.overdue)} en retard</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={`${cardClass} overflow-hidden`}>
              <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Salaires à payer</h2>
                  <p className="text-xs text-muted-foreground">Total : {fcfa(totals.salariesDue)}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setLocation("/agency/billing/salaries")}><Wallet /> Rémunérations</Button>
              </div>
              {data!.salariesDue.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">Aucun salaire en attente.</p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {data!.salariesDue.map((salary) => (
                    <li key={salary.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{salary.candidateName}</p>
                        <p className="text-xs capitalize text-muted-foreground">{formatSalaryPeriod(salary.period)}</p>
                      </div>
                      <p className="text-sm font-bold tabular-nums">{fcfa(salary.netSalary)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}

      <Dialog open={!!reminding} onOpenChange={(open) => !open && setReminding(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Relancer le client</DialogTitle>
            <DialogDescription>{reminding ? `${reminding.invoiceNumber} · ${reminding.clientName} · ${fcfa(reminding.totalAmount)}` : ""}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="reminder-to">Destinataire</Label>
            <Input id="reminder-to" type="email" value={reminderTo} onChange={(e) => setReminderTo(e.target.value)} placeholder="email du client" data-testid="input-reminder-to" />
            <p className="text-xs text-muted-foreground">Email de rappel avec montant et échéance. Pour joindre le PDF, relancez depuis « Facturation clients ».</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReminding(null)}>Annuler</Button>
            <Button onClick={() => remind.mutate()} disabled={!reminderTo.trim() || remind.isPending} data-testid="button-confirm-reminder">
              {remind.isPending ? <Loader2 className="animate-spin" /> : <Mail />} Envoyer le rappel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
