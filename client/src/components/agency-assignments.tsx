import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowRight, Briefcase, Building2, CheckCircle2, ClipboardCheck, Loader2, UserCheck, Users } from "lucide-react";
import { ClientSelect, invalidateCrm } from "@/components/agency-crm/shared";
import { aideTauxCommission, useTauxCommissionPropose } from "@/hooks/use-taux-commission";

type AssignmentRow = {
  applicationId: string;
  hiredAt: string | null;
  candidate: { id: string; fullName: string; email: string; phone: string | null; city: string | null; avatarUrl: string | null; title: string | null };
  job: { id: string; title: string; location: string; positions: number; filled: number; clientId: string | null; clientName: string | null };
  defaults: { position: string; contractType: string; startDate: string | null; salary: number | null };
  placement: { id: string; contractType: string | null; startDate: string | null; endDate: string | null; salary: number | null; status: string | null } | null;
};

type Mission = { id: string; title: string; positions: number; filled: number; clientName: string | null };

const CONTRACT_TYPES = ["CDI", "CDD", "Intérim", "Mission", "Journalier", "Prestation", "Stage", "Freelance"];
const ASSIGNMENTS_KEY = ["/api/agency/assignments"];
const cardClass = "rounded-2xl border border-border/60 bg-card shadow-sm";

function initialsOf(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
}

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—";
const formatMoney = (amount: number | null) => (amount === null ? "—" : `${new Intl.NumberFormat("fr-FR").format(amount)} FCFA`);
const today = () => new Date().toISOString().slice(0, 10);

function AssignDialog({ row, onClose }: { row: AssignmentRow | null; onClose: () => void }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({ clientId: "", contractType: "CDD", position: "", startDate: today(), endDate: "", salary: "", commissionRate: "" });

  useEffect(() => {
    if (!row) return;
    const start = row.defaults.startDate && new Date(row.defaults.startDate) > new Date() ? row.defaults.startDate.slice(0, 10) : today();
    setForm({
      clientId: "",
      contractType: CONTRACT_TYPES.includes(row.defaults.contractType) ? row.defaults.contractType : "CDD",
      position: row.defaults.position,
      startDate: start,
      endDate: "",
      salary: row.defaults.salary?.toString() ?? "",
      commissionRate: "",
    });
  }, [row?.applicationId]);

  // Taux proposé selon les réglages (client de la mission, ou client choisi).
  const tauxCommission = useTauxCommissionPropose(
    row?.job.clientId ?? (form.clientId || null),
    form.contractType,
    (valeur) => setForm((current) => ({ ...current, commissionRate: valeur })),
    row?.applicationId,
  );

  const assign = useMutation({
    mutationFn: async () => (await apiRequest("POST", `/api/agency/applications/${row!.applicationId}/assign`, {
      contractType: form.contractType,
      position: form.position.trim(),
      startDate: form.startDate,
      endDate: form.endDate || null,
      salary: Math.round(Number(form.salary.replace(/\s/g, ""))),
      commissionRate: form.commissionRate.trim() ? Number(form.commissionRate.replace(",", ".")) : null,
      ...(row!.job.clientId ? {} : { agencyClientId: form.clientId }),
    })).json(),
    onSuccess: () => {
      for (const queryKey of [ASSIGNMENTS_KEY, ["/api/agency/placements"], ["/api/dashboard/agency"], ["/api/agency/candidate-base"]]) {
        queryClient.invalidateQueries({ queryKey });
      }
      invalidateCrm();
      toast({ title: "Affectation confirmée", description: `${row!.candidate.fullName} est placé(e) — contrat créé dans « Placements & contrats ».` });
      onClose();
    },
    onError: (error: Error) => toast({ title: "Affectation impossible", description: error.message, variant: "destructive" }),
  });

  if (!row) return null;
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const salaryValid = Number(form.salary.replace(/\s/g, "")) > 0;
  const valid = form.position.trim() && form.startDate && salaryValid && (row.job.clientId || form.clientId);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Affecter {row.candidate.fullName}</DialogTitle>
          <DialogDescription>Crée le contrat de placement pour « {row.job.title} ».</DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (valid) assign.mutate(); }}>
          <div className="space-y-1.5">
            <Label>Client</Label>
            {row.job.clientId ? (
              <p className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm"><Building2 className="h-4 w-4 text-muted-foreground" />{row.job.clientName}</p>
            ) : (
              <>
                <ClientSelect value={form.clientId} onChange={(value) => set("clientId", value)} testId="select-assign-client" />
                <p className="text-xs text-muted-foreground">Cette mission n'est rattachée à aucun client : choisissez l'entreprise où le candidat est placé.</p>
              </>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="assign-position">Poste</Label>
              <Input id="assign-position" value={form.position} onChange={(e) => set("position", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Type de contrat</Label>
              <Select value={form.contractType} onValueChange={(value) => set("contractType", value)}>
                <SelectTrigger data-testid="select-assign-contract"><SelectValue /></SelectTrigger>
                <SelectContent>{CONTRACT_TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assign-salary">Salaire mensuel (FCFA)</Label>
              <Input id="assign-salary" inputMode="numeric" value={form.salary} onChange={(e) => set("salary", e.target.value)} data-testid="input-assign-salary" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assign-start">Début</Label>
              <Input id="assign-start" type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assign-end">Fin <span className="text-muted-foreground">(optionnel)</span></Label>
              <Input id="assign-end" type="date" min={form.startDate} value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="assign-commission">Commission agence (%) <span className="text-muted-foreground">(optionnel)</span></Label>
              <Input id="assign-commission" inputMode="decimal" value={form.commissionRate} onChange={(e) => { tauxCommission.marquerTouche(); set("commissionRate", e.target.value); }} placeholder="ex. 12" aria-describedby="assign-commission-aide" data-testid="input-assign-commission" />
              <p id="assign-commission-aide" className="text-xs text-muted-foreground" data-testid="text-assign-commission-aide">{aideTauxCommission(tauxCommission.propose, form.commissionRate)}</p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" className="mr-auto" onClick={() => setLocation(`/agency/candidates/${row.candidate.id}`)}>Voir le profil</Button>
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={!valid || assign.isPending} data-testid="button-confirm-assign">
              {assign.isPending ? <Loader2 className="animate-spin" /> : <ClipboardCheck />} Confirmer l'affectation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PersonCell({ row }: { row: AssignmentRow }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="h-10 w-10">
        <AvatarImage src={row.candidate.avatarUrl ?? undefined} />
        <AvatarFallback className="text-xs">{initialsOf(row.candidate.fullName)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{row.candidate.fullName}</p>
        <p className="truncate text-xs text-muted-foreground">{row.job.title}{row.job.clientName ? ` · ${row.job.clientName}` : ""}</p>
      </div>
    </div>
  );
}

export function AgencyAssignments() {
  const [, setLocation] = useLocation();
  const [assigning, setAssigning] = useState<AssignmentRow | null>(null);
  const { data, isLoading, isError } = useQuery<{ rows: AssignmentRow[]; missions: Mission[] }>({ queryKey: ASSIGNMENTS_KEY });
  const rows = data?.rows ?? [];
  const missions = (data?.missions ?? []).filter((mission) => mission.positions > 0);
  const pending = rows.filter((row) => !row.placement).sort((a, b) => new Date(a.hiredAt ?? 0).getTime() - new Date(b.hiredAt ?? 0).getTime());
  const done = rows.filter((row) => row.placement).sort((a, b) => new Date(b.placement!.startDate ?? 0).getTime() - new Date(a.placement!.startDate ?? 0).getTime());
  const totalPositions = missions.reduce((sum, mission) => sum + mission.positions, 0);
  const totalFilled = missions.reduce((sum, mission) => sum + Math.min(mission.filled, mission.positions), 0);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Affectations</h1>
          <p className="text-sm text-muted-foreground">Transformez les candidats retenus en placements chez vos clients.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setLocation("/agency/missions/shortlist")}>Voir la shortlist <ArrowRight /></Button>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[
          { icon: UserCheck, value: pending.length, label: "Retenus à affecter", tone: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300" },
          { icon: ClipboardCheck, value: done.length, label: "Affectés depuis la sélection", tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300" },
          { icon: Briefcase, value: `${totalFilled}/${totalPositions}`, label: "Postes pourvus", tone: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300" },
          { icon: Users, value: missions.filter((mission) => mission.filled < mission.positions).length, label: "Missions à compléter", tone: "bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300" },
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

      {isLoading ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : isError ? (
        <p className={`${cardClass} p-10 text-center text-sm text-muted-foreground`} role="alert">Impossible de charger les affectations. Réessayez dans un instant.</p>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <section className={`${cardClass} overflow-hidden`}>
              <div className="border-b border-border/60 px-5 py-3">
                <h2 className="text-base font-semibold text-foreground">À affecter</h2>
                <p className="text-xs text-muted-foreground">Candidats retenus sans contrat — du plus ancien au plus récent.</p>
              </div>
              {pending.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-sm text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  Aucun candidat retenu en attente d'affectation.
                </div>
              ) : (
                <ul className="divide-y divide-border/60">
                  {pending.map((row) => {
                    const waitingDays = row.hiredAt ? Math.floor((Date.now() - new Date(row.hiredAt).getTime()) / 86_400_000) : null;
                    return (
                      <li key={row.applicationId} className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center" data-testid={`assign-pending-${row.applicationId}`}>
                        <div className="min-w-0 flex-1"><PersonCell row={row} /></div>
                        <div className="text-xs text-muted-foreground">
                          Retenu le {formatDate(row.hiredAt)}
                          {waitingDays !== null && waitingDays >= 3 && <span className="ml-1 font-semibold text-amber-700 dark:text-amber-300">({waitingDays} j d'attente)</span>}
                          {!row.job.clientId && <span className="mt-0.5 block text-amber-700 dark:text-amber-300">Mission sans client</span>}
                        </div>
                        <Button size="sm" onClick={() => setAssigning(row)} data-testid={`button-assign-${row.applicationId}`}><ClipboardCheck /> Affecter</Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className={`${cardClass} overflow-hidden`}>
              <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Affectés</h2>
                  <p className="text-xs text-muted-foreground">Contrats créés depuis la sélection.</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setLocation("/agency/contracts")}>Tous les contrats <ArrowRight /></Button>
              </div>
              {done.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-muted-foreground">Aucune affectation pour l'instant.</p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {done.map((row) => (
                    <li key={row.applicationId} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1"><PersonCell row={row} /></div>
                      <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                        {row.placement!.contractType && <span className="rounded bg-blue-50 px-1.5 py-0.5 font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{row.placement!.contractType}</span>}
                        <span>{formatDate(row.placement!.startDate)}{row.placement!.endDate ? ` → ${formatDate(row.placement!.endDate)}` : ""}</span>
                        <span>{formatMoney(row.placement!.salary)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className={`${cardClass} h-fit overflow-hidden`}>
            <div className="border-b border-border/60 px-5 py-3">
              <h2 className="text-base font-semibold text-foreground">Couverture des missions</h2>
              <p className="text-xs text-muted-foreground">Postes pourvus par des placements actifs.</p>
            </div>
            {missions.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">Aucune mission active.</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {missions.map((mission) => {
                  const ratio = Math.min(100, Math.round((mission.filled / mission.positions) * 100));
                  return (
                    <li key={mission.id} className="px-5 py-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <button type="button" className="truncate text-left text-sm font-medium text-foreground hover:underline" onClick={() => setLocation(`/agency/missions/${mission.id}/edit`)}>{mission.title}</button>
                        <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">{mission.filled}/{mission.positions}</span>
                      </div>
                      {mission.clientName && <p className="truncate text-xs text-muted-foreground">{mission.clientName}</p>}
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className={`h-full rounded-full ${ratio >= 100 ? "bg-emerald-500" : "bg-blue-500"}`} style={{ width: `${ratio}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}

      <AssignDialog row={assigning} onClose={() => setAssigning(null)} />
    </div>
  );
}
