import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, BookOpen, CheckCircle2, Download, FileSpreadsheet, Info } from "lucide-react";
import { PeriodPicker, formatPeriodLabel, periodQuery, usePeriod } from "@/components/billing-period";

type Preview = {
  accounts: Record<string, { number: string; label: string }>;
  journals: { code: string; label: string; lines: number; debit: number; credit: number }[];
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
  lineCount: number;
  balance: { account: string; label: string; debit: number; credit: number }[];
  sample: { journal: string; date: string; reference: string; account: string; accountLabel: string; thirdParty: string; label: string; debit: number; credit: number }[];
};

const cardClass = "rounded-2xl border border-border/60 bg-card shadow-sm";
const num = (amount: number) => (amount ? new Intl.NumberFormat("fr-FR").format(amount) : "");
const fcfa = (amount: number) => `${new Intl.NumberFormat("fr-FR").format(amount)} FCFA`;

export function AgencyAccountingExport() {
  const periodState = usePeriod("last_month");
  const { period, valid } = periodState;
  const [format, setFormat] = useState<"xlsx" | "csv">("xlsx");

  const { data, isLoading, isError } = useQuery<Preview>({
    queryKey: ["/api/agency/accounting-export/preview", period.from, period.to],
    queryFn: async () => {
      const res = await fetch(`/api/agency/accounting-export/preview?${periodQuery(period)}`, { credentials: "include" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? "Chargement impossible");
      return res.json();
    },
    enabled: valid,
  });

  const downloadHref = `/api/agency/accounting-export?${periodQuery(period)}&format=${format}`;

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-8">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Export comptable</h1>
          <p className="text-sm text-muted-foreground">Écritures au plan comptable SYSCOHADA, prêtes pour votre expert-comptable — {formatPeriodLabel(period)}.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodPicker state={periodState} />
          <Select value={format} onValueChange={(value) => setFormat(value as "xlsx" | "csv")}>
            <SelectTrigger className="w-[150px]" data-testid="select-export-format"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
              <SelectItem value="csv">CSV (import logiciel)</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" asChild disabled={!valid || !data?.lineCount}>
            <a href={downloadHref} data-testid="button-download-accounting" aria-disabled={!data?.lineCount}>
              {format === "xlsx" ? <FileSpreadsheet /> : <Download />} Télécharger
            </a>
          </Button>
        </div>
      </header>

      {!valid ? (
        <p className={`${cardClass} p-8 text-center text-sm text-muted-foreground`}>La date de fin doit suivre la date de début.</p>
      ) : isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      ) : isError || !data ? (
        <p className={`${cardClass} p-8 text-center text-sm text-muted-foreground`}>Impossible de préparer l'export comptable.</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
            <div className={`${cardClass} p-5`}>
              <p className="text-xs text-muted-foreground">Écritures sur la période</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-foreground">{data.lineCount}</p>
              <p className="text-xs text-muted-foreground">lignes</p>
            </div>
            <div className={`${cardClass} p-5`}>
              <p className="text-xs text-muted-foreground">Contrôle d'équilibre</p>
              {data.balanced ? (
                <p className="mt-2 flex items-center gap-2 text-lg font-bold text-emerald-600" data-testid="balance-ok"><CheckCircle2 className="h-5 w-5" /> Équilibré</p>
              ) : (
                <p className="mt-2 flex items-center gap-2 text-lg font-bold text-red-600"><AlertTriangle className="h-5 w-5" /> Déséquilibré</p>
              )}
              <p className="mt-1 text-xs tabular-nums text-muted-foreground">Débit {fcfa(data.totalDebit)} · Crédit {fcfa(data.totalCredit)}</p>
            </div>
            <div className={`${cardClass} overflow-hidden`}>
              <table className="w-full text-sm">
                <thead><tr className="bg-muted/40 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"><th className="px-4 py-2">Journal</th><th className="px-2 py-2 text-right">Lignes</th><th className="px-4 py-2 text-right">Mouvements</th></tr></thead>
                <tbody className="divide-y divide-border/60">
                  {data.journals.map((journal) => (
                    <tr key={journal.code}>
                      <td className="px-4 py-2"><span className="mr-2 font-mono text-xs font-bold">{journal.code}</span>{journal.label}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{journal.lines}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{fcfa(journal.debit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {data.lineCount === 0 ? (
            <div className={`${cardClass} flex flex-col items-center gap-2 p-10 text-center`}>
              <BookOpen className="h-10 w-10 text-muted-foreground/60" />
              <p className="font-medium text-foreground">Aucune écriture sur cette période</p>
              <p className="text-sm text-muted-foreground">Les factures émises, les règlements et les salaires de la période apparaîtront ici.</p>
            </div>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
              <section className={`${cardClass} overflow-hidden`}>
                <div className="border-b border-border/60 px-5 py-3">
                  <h2 className="text-base font-semibold text-foreground">Aperçu des écritures</h2>
                  <p className="text-xs text-muted-foreground">{data.sample.length < data.lineCount ? `${data.sample.length} premières lignes sur ${data.lineCount} — le fichier les contient toutes.` : "Toutes les lignes de la période."}</p>
                </div>
                <div className="max-h-[520px] overflow-auto">
                  <table className="w-full min-w-[860px] text-sm" data-testid="accounting-preview">
                    <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                      <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <th className="px-4 py-2">Jnl</th><th className="px-2 py-2">Date</th><th className="px-2 py-2">Pièce</th><th className="px-2 py-2">Compte</th>
                        <th className="px-2 py-2">Libellé</th><th className="px-2 py-2 text-right">Débit</th><th className="px-4 py-2 text-right">Crédit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {data.sample.map((entry, index) => (
                        <tr key={index}>
                          <td className="px-4 py-1.5 font-mono text-xs font-bold">{entry.journal}</td>
                          <td className="px-2 py-1.5 tabular-nums">{new Date(entry.date).toLocaleDateString("fr-FR")}</td>
                          <td className="px-2 py-1.5 font-mono text-xs">{entry.reference}</td>
                          <td className="px-2 py-1.5 font-mono text-xs" title={entry.accountLabel}>{entry.account}</td>
                          <td className="max-w-[320px] truncate px-2 py-1.5" title={entry.label}>{entry.label}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{num(entry.debit)}</td>
                          <td className="px-4 py-1.5 text-right tabular-nums">{num(entry.credit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <div className="space-y-6">
                <section className={`${cardClass} overflow-hidden`}>
                  <div className="border-b border-border/60 px-5 py-3"><h2 className="text-base font-semibold text-foreground">Balance par compte</h2></div>
                  <table className="w-full text-sm">
                    <thead><tr className="bg-muted/40 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"><th className="px-4 py-2">Compte</th><th className="px-2 py-2 text-right">Débit</th><th className="px-2 py-2 text-right">Crédit</th><th className="px-4 py-2 text-right">Solde</th></tr></thead>
                    <tbody className="divide-y divide-border/60">
                      {data.balance.map((row) => (
                        <tr key={row.account}>
                          <td className="px-4 py-2"><span className="font-mono text-xs font-bold">{row.account}</span><span className="block truncate text-xs text-muted-foreground">{row.label}</span></td>
                          <td className="px-2 py-2 text-right tabular-nums">{num(row.debit)}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{num(row.credit)}</td>
                          <td className={`px-4 py-2 text-right font-semibold tabular-nums ${row.debit - row.credit < 0 ? "text-red-600" : ""}`}>{new Intl.NumberFormat("fr-FR").format(row.debit - row.credit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>

                <section className={`${cardClass} p-5 text-sm`}>
                  <h2 className="flex items-center gap-2 text-base font-semibold text-foreground"><Info className="h-4 w-4" /> Règles de comptabilisation</h2>
                  <ul className="mt-3 space-y-1.5 text-muted-foreground">
                    <li><strong className="text-foreground">VE</strong> — facture émise : débit {data.accounts.clients.number}, crédit {data.accounts.services.number} (HT) et {data.accounts.vatCollected.number} (TVA).</li>
                    <li><strong className="text-foreground">BQ</strong> — règlement client : débit {data.accounts.bank.number} (ou {data.accounts.cash.number} si espèces), crédit {data.accounts.clients.number}.</li>
                    <li><strong className="text-foreground">SA</strong> — salaire du mois : débit {data.accounts.salaries.number}, crédit {data.accounts.staffPayable.number} ; paiement : débit {data.accounts.staffPayable.number}, crédit trésorerie.</li>
                    <li>Factures en brouillon et annulées exclues.</li>
                    <li className="text-amber-700 dark:text-amber-300">Salaires comptabilisés en net : les cotisations sociales et l'impôt sur salaire ne sont pas encore suivis dans BaaraMatch.</li>
                  </ul>
                </section>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
