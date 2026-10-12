import { useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertTriangle, Download, Eye, FileCheck, FileSignature, FileText, MoreHorizontal, Paperclip, Plus, Search } from "lucide-react";
import type { AgencyClientAgreementStatus, AgencyClientAgreementType } from "@shared/schema";
import {
  AGREEMENTS_KEY,
  AGREEMENT_STATUS,
  AGREEMENT_TYPE,
  ClientSelect,
  EmptyState,
  PageHeader,
  Pill,
  StatCard,
  agreementDisplayStatus,
  cardClass,
  formatDate,
  invalidateCrm,
  readFileAsBase64,
  toDateInput,
  type AgreementDisplayStatus,
  type AgreementRow,
} from "./shared";

const ACCEPTED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;
const fileUrl = (id: string, download = false) => `/api/agency/client-agreements/${id}/file${download ? "?download=1" : ""}`;

type AgreementForm = {
  clientId: string;
  type: AgencyClientAgreementType;
  title: string;
  reference: string;
  status: AgencyClientAgreementStatus;
  startDate: string;
  endDate: string;
  commissionRate: string;
  paymentTermsDays: string;
  notes: string;
};

function AgreementDialog({ open, onClose, agreement, fixedClientId }: { open: boolean; onClose: () => void; agreement: AgreementRow | null; fixedClientId?: string }) {
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<AgreementForm | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [seededFor, setSeededFor] = useState<string | null>(null);

  const seedKey = open ? agreement?.id ?? "new" : null;
  if (seedKey !== seededFor) {
    setSeededFor(seedKey);
    setFile(null);
    setForm(open ? {
      clientId: agreement?.clientId ?? fixedClientId ?? "",
      type: agreement?.type ?? "framework",
      title: agreement?.title ?? "",
      reference: agreement?.reference ?? "",
      status: agreement?.status ?? "draft",
      startDate: toDateInput(agreement?.startDate),
      endDate: toDateInput(agreement?.endDate),
      commissionRate: agreement?.commissionRate?.toString() ?? "",
      paymentTermsDays: agreement?.paymentTermsDays?.toString() ?? "",
      notes: agreement?.notes ?? "",
    } : null);
  }

  const pickFile = (picked: File | undefined) => {
    if (!picked) return;
    if (!ACCEPTED_MIME.includes(picked.type)) return toast({ title: "Format non pris en charge", description: "PDF, JPG, PNG ou WebP uniquement.", variant: "destructive" });
    if (picked.size > MAX_BYTES) return toast({ title: "Fichier trop volumineux", description: "10 Mo maximum.", variant: "destructive" });
    setFile(picked);
  };

  const save = useMutation({
    mutationFn: async () => {
      const { clientId, commissionRate, paymentTermsDays, ...rest } = form!;
      const body = {
        ...rest,
        commissionRate: commissionRate.trim() === "" ? null : Number(commissionRate.replace(",", ".")),
        paymentTermsDays: paymentTermsDays.trim() === "" ? null : Math.round(Number(paymentTermsDays)),
        ...(file ? { file: { name: file.name, mimeType: file.type, dataBase64: await readFileAsBase64(file) } } : {}),
      };
      return agreement
        ? apiRequest("PATCH", `/api/agency/client-agreements/${agreement.id}`, body)
        : apiRequest("POST", `/api/agency/clients/${clientId}/agreements`, body);
    },
    onSuccess: () => {
      invalidateCrm();
      toast({ title: agreement ? "Accord mis à jour" : "Accord enregistré" });
      onClose();
    },
    onError: (error: Error) => toast({ title: "Enregistrement impossible", description: error.message, variant: "destructive" }),
  });

  const set = <K extends keyof AgreementForm>(key: K, value: AgreementForm[K]) => setForm((current) => current && { ...current, [key]: value });

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{agreement ? "Modifier l'accord" : "Nouvel accord client"}</DialogTitle></DialogHeader>
        {form && (
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
            <div className="grid gap-3 sm:grid-cols-2">
              {!fixedClientId && !agreement && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Entreprise *</Label>
                  <ClientSelect value={form.clientId} onChange={(value) => set("clientId", value)} testId="select-agreement-client" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Type d'accord</Label>
                <Select value={form.type} onValueChange={(value) => set("type", value as AgencyClientAgreementType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(AGREEMENT_TYPE).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <Select value={form.status} onValueChange={(value) => set("status", value as AgencyClientAgreementStatus)}>
                  <SelectTrigger data-testid="select-agreement-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["draft", "sent", "signed", "terminated"] as const).map((value) => <SelectItem key={value} value={value}>{AGREEMENT_STATUS[value].label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="agreement-title">Intitulé *</Label>
                <Input id="agreement-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Contrat-cadre intérim 2026" required data-testid="input-agreement-title" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="agreement-ref">Référence</Label>
                <Input id="agreement-ref" value={form.reference} onChange={(e) => set("reference", e.target.value)} placeholder="CC-2026-004" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="agreement-start">Date d'effet</Label>
                <Input id="agreement-start" type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="agreement-end">Date de fin</Label>
                <Input id="agreement-end" type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} data-testid="input-agreement-end" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="agreement-rate">Taux de commission (%)</Label>
                <Input id="agreement-rate" inputMode="decimal" value={form.commissionRate} onChange={(e) => set("commissionRate", e.target.value)} placeholder="15" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="agreement-terms">Délai de paiement (jours)</Label>
                <Input id="agreement-terms" inputMode="numeric" value={form.paymentTermsDays} onChange={(e) => set("paymentTermsDays", e.target.value)} placeholder="30" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="agreement-notes">Conditions particulières</Label>
              <Textarea id="agreement-notes" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Document</Label>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="flex w-full items-center gap-3 rounded-lg border-2 border-dashed px-4 py-3 text-left text-sm transition-colors hover:border-primary/50"
                data-testid="button-pick-agreement-file"
              >
                <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">
                  {file ? file.name : agreement?.fileName ? `${agreement.fileName} — cliquer pour remplacer` : "Joindre le document signé (PDF, JPG, PNG · 10 Mo max)"}
                </span>
              </button>
              <input ref={fileInput} type="file" accept={ACCEPTED_MIME.join(",")} className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} data-testid="input-agreement-file" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
              <Button type="submit" disabled={save.isPending || !form.title.trim() || (!agreement && !form.clientId)} data-testid="button-save-agreement">Enregistrer</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

type StatusFilter = "all" | AgreementDisplayStatus;

export function ClientAgreements({ clientId }: { clientId?: string }) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [editing, setEditing] = useState<AgreementRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<AgreementRow | null>(null);
  const { data: agreements = [], isLoading } = useQuery<AgreementRow[]>({ queryKey: AGREEMENTS_KEY });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AgencyClientAgreementStatus }) => apiRequest("PATCH", `/api/agency/client-agreements/${id}`, { status }),
    onSuccess: invalidateCrm,
    onError: (error: Error) => toast({ title: "Action impossible", description: error.message, variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/agency/client-agreements/${id}`),
    onSuccess: () => { invalidateCrm(); setConfirmDelete(null); toast({ title: "Accord supprimé" }); },
    onError: (error: Error) => toast({ title: "Suppression impossible", description: error.message, variant: "destructive" }),
  });

  const scope = clientId ?? (clientFilter === "all" ? null : clientFilter);
  const scoped = agreements.filter((agreement) => !scope || agreement.clientId === scope);
  const query = search.trim().toLowerCase();
  const visible = scoped
    .filter((agreement) => statusFilter === "all" || agreementDisplayStatus(agreement) === statusFilter)
    .filter((agreement) => !query || [agreement.title, agreement.reference, agreement.clientName].some((value) => value?.toLowerCase().includes(query)));

  const displayStatuses = scoped.map(agreementDisplayStatus);
  const stats = {
    active: displayStatuses.filter((status) => status === "signed" || status === "expiring").length,
    expiring: displayStatuses.filter((status) => status === "expiring").length,
    expired: displayStatuses.filter((status) => status === "expired").length,
    pending: displayStatuses.filter((status) => status === "draft" || status === "sent").length,
  };

  const addButton = <Button size="sm" onClick={() => setCreating(true)} data-testid="button-add-agreement"><Plus /> Nouvel accord</Button>;

  return (
    <div className={clientId ? "space-y-3" : "mx-auto max-w-[1600px] space-y-6 pb-8"}>
      {clientId ? <div className="flex justify-end">{addButton}</div> : (
        <>
          <PageHeader title="Contrats & accords" description="Contrats-cadres, conventions et conditions commerciales avec vos clients." action={addButton} />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard icon={FileCheck} value={stats.active} label="Accords en vigueur" tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300" />
            <StatCard icon={AlertTriangle} value={stats.expiring} label="Expirent sous 30 jours" tone="bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300" />
            <StatCard icon={FileText} value={stats.expired} label="Expirés à renouveler" tone="bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300" />
            <StatCard icon={FileSignature} value={stats.pending} label="En attente de signature" tone="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300" />
          </div>
        </>
      )}

      <div className={clientId ? "" : `${cardClass} overflow-hidden`}>
        {!clientId && (
          <div className="grid grid-cols-2 gap-3 border-b border-border/60 p-4 md:grid-cols-[minmax(0,1fr)_220px_200px]">
            <div className="relative col-span-2 md:col-span-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Intitulé, référence, entreprise…" className="pl-10" data-testid="input-search-agreements" />
            </div>
            <ClientSelect value={clientFilter} onChange={setClientFilter} includeAll />
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                {Object.entries(AGREEMENT_STATUS).map(([value, { label }]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        {isLoading ? (
          <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
        ) : visible.length === 0 ? (
          <EmptyState icon={FileSignature} title={scoped.length ? "Aucun accord dans ce filtre" : "Aucun accord enregistré"} description="Centralisez vos contrats-cadres et conditions commerciales pour ne rater aucune échéance." />
        ) : (
          <ul className="divide-y divide-border/60">
            {visible.map((agreement) => {
              const status = agreementDisplayStatus(agreement);
              return (
                <li key={agreement.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5" data-testid={`agreement-${agreement.id}`}>
                  <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300 sm:flex"><FileSignature className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{agreement.title}</p>
                      <Pill className={AGREEMENT_STATUS[status].className}>{AGREEMENT_STATUS[status].label}</Pill>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {!clientId && <span className="font-medium text-foreground">{agreement.clientName}</span>}
                      <span>{AGREEMENT_TYPE[agreement.type]}</span>
                      {agreement.reference && <span>· {agreement.reference}</span>}
                      {(agreement.startDate || agreement.endDate) && (
                        <span>· {agreement.startDate ? `du ${formatDate(agreement.startDate)}` : ""}{agreement.endDate ? ` au ${formatDate(agreement.endDate)}` : " · durée indéterminée"}</span>
                      )}
                      {agreement.commissionRate !== null && <span>· {agreement.commissionRate.toLocaleString("fr-FR")} % de commission</span>}
                      {agreement.paymentTermsDays !== null && <span>· paiement à {agreement.paymentTermsDays} j</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {agreement.fileName && (
                      <>
                        <Button variant="ghost" size="icon" asChild title={`Voir ${agreement.fileName}`}><a href={fileUrl(agreement.id)} target="_blank" rel="noopener noreferrer"><Eye className="h-4 w-4" /></a></Button>
                        <Button variant="ghost" size="icon" asChild title="Télécharger"><a href={fileUrl(agreement.id, true)}><Download className="h-4 w-4" /></a></Button>
                      </>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Actions"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditing(agreement)}>Modifier / joindre un document</DropdownMenuItem>
                        {agreement.status === "draft" && <DropdownMenuItem onClick={() => setStatus.mutate({ id: agreement.id, status: "sent" })}>Marquer envoyé</DropdownMenuItem>}
                        {agreement.status !== "signed" && agreement.status !== "terminated" && <DropdownMenuItem onClick={() => setStatus.mutate({ id: agreement.id, status: "signed" })}>Marquer signé</DropdownMenuItem>}
                        {agreement.status === "signed" && <DropdownMenuItem onClick={() => setStatus.mutate({ id: agreement.id, status: "terminated" })}>Résilier</DropdownMenuItem>}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => setConfirmDelete(agreement)}>Supprimer</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <AgreementDialog open={creating || !!editing} agreement={editing} fixedClientId={clientId} onClose={() => { setCreating(false); setEditing(null); }} />
      <Dialog open={!!confirmDelete} onOpenChange={(value) => !value && setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Supprimer cet accord ?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">« {confirmDelete?.title} » et son document joint seront définitivement supprimés.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Annuler</Button>
            <Button variant="destructive" disabled={remove.isPending} onClick={() => confirmDelete && remove.mutate(confirmDelete.id)}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
