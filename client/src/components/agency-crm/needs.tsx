import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
import { ArrowRight, Calendar, ClipboardList, Flame, MapPin, MoreHorizontal, Plus, Rocket, Search, Users } from "lucide-react";
import type { AgencyClientNeedPriority, AgencyClientNeedStatus } from "@shared/schema";
import {
  CONTACTS_KEY,
  CONTRACT_TYPES,
  ClientSelect,
  EmptyState,
  NEEDS_KEY,
  NEED_PRIORITY,
  NEED_STATUS,
  PageHeader,
  Pill,
  StatCard,
  cardClass,
  formatDate,
  formatMoney,
  invalidateCrm,
  toDateInput,
  toIntOrNull,
  type ContactRow,
  type NeedRow,
} from "./shared";

type NeedForm = {
  clientId: string;
  contactId: string;
  title: string;
  positions: string;
  contractType: string;
  location: string;
  desiredStartDate: string;
  salaryMin: string;
  salaryMax: string;
  priority: AgencyClientNeedPriority;
  status: AgencyClientNeedStatus;
  description: string;
};

const NONE = "none";

function NeedDialog({ open, onClose, need, fixedClientId }: { open: boolean; onClose: () => void; need: NeedRow | null; fixedClientId?: string }) {
  const { toast } = useToast();
  const [form, setForm] = useState<NeedForm | null>(null);
  const [seededFor, setSeededFor] = useState<string | null>(null);
  const { data: contacts = [] } = useQuery<ContactRow[]>({ queryKey: CONTACTS_KEY, enabled: open });

  const seedKey = open ? need?.id ?? "new" : null;
  if (seedKey !== seededFor) {
    setSeededFor(seedKey);
    setForm(open ? {
      clientId: need?.clientId ?? fixedClientId ?? "",
      contactId: need?.contactId ?? NONE,
      title: need?.title ?? "",
      positions: String(need?.positions ?? 1),
      contractType: need?.contractType ?? "CDD",
      location: need?.location ?? "",
      desiredStartDate: toDateInput(need?.desiredStartDate),
      salaryMin: need?.salaryMin?.toString() ?? "",
      salaryMax: need?.salaryMax?.toString() ?? "",
      priority: need?.priority ?? "normal",
      status: need?.status ?? "new",
      description: need?.description ?? "",
    } : null);
  }

  const save = useMutation({
    mutationFn: async () => {
      const { clientId, contactId, positions, salaryMin, salaryMax, ...rest } = form!;
      const body = {
        ...rest,
        contactId: contactId === NONE ? null : contactId,
        positions: Math.max(1, toIntOrNull(positions) ?? 1),
        salaryMin: toIntOrNull(salaryMin),
        salaryMax: toIntOrNull(salaryMax),
      };
      return need
        ? apiRequest("PATCH", `/api/agency/client-needs/${need.id}`, body)
        : apiRequest("POST", `/api/agency/clients/${clientId}/needs`, body);
    },
    onSuccess: () => {
      invalidateCrm();
      toast({ title: need ? "Besoin mis à jour" : "Besoin enregistré" });
      onClose();
    },
    onError: (error: Error) => toast({ title: "Enregistrement impossible", description: error.message, variant: "destructive" }),
  });

  const set = <K extends keyof NeedForm>(key: K, value: NeedForm[K]) =>
    setForm((current) => current && { ...current, [key]: value, ...(key === "clientId" ? { contactId: NONE } : {}) });
  const clientContacts = contacts.filter((contact) => contact.clientId === form?.clientId);

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{need ? "Modifier le besoin" : "Nouveau besoin de recrutement"}</DialogTitle></DialogHeader>
        {form && (
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
            <div className="grid gap-3 sm:grid-cols-2">
              {!fixedClientId && !need && (
                <div className="space-y-1.5">
                  <Label>Entreprise *</Label>
                  <ClientSelect value={form.clientId} onChange={(value) => set("clientId", value)} testId="select-need-client" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Demandé par</Label>
                <Select value={form.contactId} onValueChange={(value) => set("contactId", value)} disabled={!form.clientId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Non précisé</SelectItem>
                    {clientContacts.map((contact) => <SelectItem key={contact.id} value={contact.id}>{contact.fullName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="need-title">Poste recherché *</Label>
                <Input id="need-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Chef de chantier, conducteur d'engins…" required data-testid="input-need-title" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="need-positions">Nombre de postes</Label>
                <Input id="need-positions" type="number" min={1} value={form.positions} onChange={(e) => set("positions", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Type de contrat</Label>
                <Select value={form.contractType} onValueChange={(value) => set("contractType", value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CONTRACT_TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="need-location">Lieu</Label>
                <Input id="need-location" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Bamako, site de Sadiola…" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="need-start">Démarrage souhaité</Label>
                <Input id="need-start" type="date" value={form.desiredStartDate} onChange={(e) => set("desiredStartDate", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="need-salary-min">Salaire min. (FCFA / mois)</Label>
                <Input id="need-salary-min" inputMode="numeric" value={form.salaryMin} onChange={(e) => set("salaryMin", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="need-salary-max">Salaire max. (FCFA / mois)</Label>
                <Input id="need-salary-max" inputMode="numeric" value={form.salaryMax} onChange={(e) => set("salaryMax", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Priorité</Label>
                <Select value={form.priority} onValueChange={(value) => set("priority", value as AgencyClientNeedPriority)}>
                  <SelectTrigger data-testid="select-need-priority"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(NEED_PRIORITY).map(([value, { label }]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {need && (
                <div className="space-y-1.5">
                  <Label>Statut</Label>
                  <Select value={form.status} onValueChange={(value) => set("status", value as AgencyClientNeedStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(NEED_STATUS).map(([value, { label }]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="need-description">Description / exigences</Label>
              <Textarea id="need-description" rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Missions, compétences, habilitations requises, conditions du site…" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
              <Button type="submit" disabled={save.isPending || !form.title.trim() || (!need && !form.clientId)} data-testid="button-save-need">Enregistrer</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

type StatusFilter = "open" | "all" | AgencyClientNeedStatus;
const OPEN_STATUSES: AgencyClientNeedStatus[] = ["new", "qualified", "in_progress"];
const PRIORITY_ORDER: Record<AgencyClientNeedPriority, number> = { urgent: 0, high: 1, normal: 2, low: 3 };

export function ClientNeeds({ clientId }: { clientId?: string }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [editing, setEditing] = useState<NeedRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<NeedRow | null>(null);
  const { data: needs = [], isLoading } = useQuery<NeedRow[]>({ queryKey: NEEDS_KEY });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AgencyClientNeedStatus }) => apiRequest("PATCH", `/api/agency/client-needs/${id}`, { status }),
    onSuccess: invalidateCrm,
    onError: (error: Error) => toast({ title: "Action impossible", description: error.message, variant: "destructive" }),
  });
  const convert = useMutation({
    mutationFn: async (id: string) => (await apiRequest("POST", `/api/agency/client-needs/${id}/convert`)).json() as Promise<{ jobId: string }>,
    onSuccess: ({ jobId }) => {
      invalidateCrm();
      toast({ title: "Mission créée en brouillon", description: "Complétez-la puis publiez-la." });
      setLocation(`/agency/missions/${jobId}/edit`);
    },
    onError: (error: Error) => toast({ title: "Création impossible", description: error.message, variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/agency/client-needs/${id}`),
    onSuccess: () => { invalidateCrm(); setConfirmDelete(null); toast({ title: "Besoin supprimé" }); },
    onError: (error: Error) => toast({ title: "Suppression impossible", description: error.message, variant: "destructive" }),
  });

  const scope = clientId ?? (clientFilter === "all" ? null : clientFilter);
  const scoped = needs.filter((need) => !scope || need.clientId === scope);
  const query = search.trim().toLowerCase();
  const visible = scoped
    .filter((need) => statusFilter === "all" || (statusFilter === "open" ? OPEN_STATUSES.includes(need.status) : need.status === statusFilter))
    .filter((need) => !query || [need.title, need.clientName, need.location].some((value) => value?.toLowerCase().includes(query)))
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      || new Date(a.desiredStartDate ?? "9999").getTime() - new Date(b.desiredStartDate ?? "9999").getTime());

  const open = scoped.filter((need) => OPEN_STATUSES.includes(need.status));
  const stats = {
    open: open.length,
    positions: open.reduce((sum, need) => sum + need.positions, 0),
    urgent: open.filter((need) => need.priority === "urgent").length,
    filled: scoped.filter((need) => need.status === "filled").length,
  };

  const addButton = <Button size="sm" onClick={() => setCreating(true)} data-testid="button-add-need"><Plus /> Nouveau besoin</Button>;

  return (
    <div className={clientId ? "space-y-3" : "mx-auto max-w-[1600px] space-y-6 pb-8"}>
      {clientId ? <div className="flex justify-end">{addButton}</div> : (
        <>
          <PageHeader title="Besoins recrutement" description="Les demandes de vos clients, de la prise de besoin à la mission publiée." action={addButton} />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard icon={ClipboardList} value={stats.open} label="Besoins ouverts" tone="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300" />
            <StatCard icon={Users} value={stats.positions} label="Postes à pourvoir" tone="bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300" />
            <StatCard icon={Flame} value={stats.urgent} label="Urgents" tone="bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300" />
            <StatCard icon={Rocket} value={stats.filled} label="Pourvus" tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300" />
          </div>
        </>
      )}

      <div className={clientId ? "" : `${cardClass} overflow-hidden`}>
        {!clientId && (
          <div className="grid grid-cols-2 gap-3 border-b border-border/60 p-4 md:grid-cols-[minmax(0,1fr)_220px_200px]">
            <div className="relative col-span-2 md:col-span-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Poste, entreprise, lieu…" className="pl-10" data-testid="input-search-needs" />
            </div>
            <ClientSelect value={clientFilter} onChange={setClientFilter} includeAll />
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger data-testid="select-needs-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">En cours</SelectItem>
                <SelectItem value="all">Tous</SelectItem>
                {Object.entries(NEED_STATUS).map(([value, { label }]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        {isLoading ? (
          <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
        ) : visible.length === 0 ? (
          <EmptyState icon={ClipboardList} title={scoped.length ? "Aucun besoin dans ce filtre" : "Aucun besoin enregistré"} description="Notez chaque demande client dès qu'elle arrive, puis transformez-la en mission." />
        ) : (
          <ul className="divide-y divide-border/60">
            {visible.map((need) => (
              <li key={need.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5" data-testid={`need-${need.id}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{need.title}</p>
                    <Pill className={NEED_STATUS[need.status].className}>{NEED_STATUS[need.status].label}</Pill>
                    {need.priority !== "normal" && <span className={`text-xs font-semibold ${NEED_PRIORITY[need.priority].className}`}>● {NEED_PRIORITY[need.priority].label}</span>}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {!clientId && <span className="font-medium text-foreground">{need.clientName}</span>}
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {need.positions} poste{need.positions > 1 ? "s" : ""}{need.contractType ? ` · ${need.contractType}` : ""}</span>
                    {need.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {need.location}</span>}
                    {need.desiredStartDate && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> dès le {formatDate(need.desiredStartDate)}</span>}
                    {(need.salaryMin || need.salaryMax) && <span>{need.salaryMin && need.salaryMax ? `${formatMoney(need.salaryMin)} – ${formatMoney(need.salaryMax)}` : formatMoney(need.salaryMin ?? need.salaryMax)}</span>}
                    {need.contactName && <span>· demandé par {need.contactName}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {need.jobId ? (
                    <Button variant="outline" size="sm" onClick={() => setLocation(`/agency/missions/${need.jobId}/edit`)}>
                      {need.jobIsActive ? "Mission publiée" : "Mission (brouillon)"} <ArrowRight />
                    </Button>
                  ) : OPEN_STATUSES.includes(need.status) ? (
                    <Button size="sm" disabled={convert.isPending} onClick={() => convert.mutate(need.id)} data-testid={`button-convert-${need.id}`}>
                      <Rocket /> Créer la mission
                    </Button>
                  ) : null}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Actions"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditing(need)}>Modifier</DropdownMenuItem>
                      {need.status === "new" && <DropdownMenuItem onClick={() => setStatus.mutate({ id: need.id, status: "qualified" })}>Marquer qualifié</DropdownMenuItem>}
                      {need.status !== "filled" && <DropdownMenuItem onClick={() => setStatus.mutate({ id: need.id, status: "filled" })}>Marquer pourvu</DropdownMenuItem>}
                      {need.status !== "cancelled" && <DropdownMenuItem onClick={() => setStatus.mutate({ id: need.id, status: "cancelled" })}>Annuler le besoin</DropdownMenuItem>}
                      {!OPEN_STATUSES.includes(need.status) && <DropdownMenuItem onClick={() => setStatus.mutate({ id: need.id, status: "qualified" })}>Rouvrir</DropdownMenuItem>}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => setConfirmDelete(need)}>Supprimer</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <NeedDialog open={creating || !!editing} need={editing} fixedClientId={clientId} onClose={() => { setCreating(false); setEditing(null); }} />
      <Dialog open={!!confirmDelete} onOpenChange={(value) => !value && setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Supprimer ce besoin ?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">« {confirmDelete?.title} » sera supprimé. Une mission déjà créée à partir de ce besoin est conservée.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Annuler</Button>
            <Button variant="destructive" disabled={remove.isPending} onClick={() => confirmDelete && remove.mutate(confirmDelete.id)}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
