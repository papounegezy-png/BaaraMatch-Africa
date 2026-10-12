import { useState } from "react";
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  ClipboardList,
  FileSignature,
  Globe,
  Link2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";
import type { AgencyClientStatus } from "@shared/schema";
import { ClientContacts } from "./contacts";
import { ClientNeeds } from "./needs";
import { ClientAgreements } from "./agreements";
import { ClientMissionHistory } from "./missions-history";
import {
  CLIENT_STATUS,
  EmptyState,
  PageHeader,
  Pill,
  StatCard,
  cardClass,
  formatDate,
  initialsOf,
  invalidateCrm,
  useClients,
  type ClientRow,
} from "./shared";

type PlatformCompany = { id: string; name: string; city: string | null; industry: string | null };

type ClientForm = {
  name: string;
  sector: string;
  city: string;
  country: string;
  address: string;
  website: string;
  registrationNumber: string;
  status: AgencyClientStatus;
  notes: string;
  companyUserId: string | null;
  companyLabel: string | null;
};

const SECTORS = ["BTP", "Mines", "Énergie", "Télécoms", "Banque & Finance", "Industrie", "Commerce & Distribution", "Transport & Logistique", "Santé", "Agro-industrie", "Tech", "ONG & Institutions", "Services", "Autre"];

function PlatformCompanyPicker({ onPick }: { onPick: (company: PlatformCompany) => void }) {
  const [search, setSearch] = useState("");
  const { data: companies = [], isFetching } = useQuery<PlatformCompany[]>({
    queryKey: ["/api/agency/platform-companies", search],
    queryFn: async () => (await fetch(`/api/agency/platform-companies?search=${encodeURIComponent(search)}`, { credentials: "include" })).json(),
    enabled: search.trim().length >= 2,
  });
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une entreprise inscrite (2 lettres min.)" data-testid="input-platform-company-search" />
      {search.trim().length >= 2 && (
        <ul className="max-h-40 overflow-y-auto text-sm">
          {isFetching && <li className="px-2 py-1.5 text-muted-foreground">Recherche…</li>}
          {!isFetching && companies.length === 0 && <li className="px-2 py-1.5 text-muted-foreground">Aucune entreprise inscrite trouvée.</li>}
          {companies.map((company) => (
            <li key={company.id}>
              <button type="button" onClick={() => onPick(company)} className="w-full rounded-md px-2 py-1.5 text-left hover:bg-muted">
                <span className="font-medium">{company.name}</span>
                <span className="text-muted-foreground">{[company.industry, company.city].filter(Boolean).length ? ` · ${[company.industry, company.city].filter(Boolean).join(", ")}` : ""}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ClientDialog({ open, onClose, client, onCreated }: { open: boolean; onClose: () => void; client: ClientRow | null; onCreated?: (id: string) => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState<ClientForm | null>(null);
  const [linking, setLinking] = useState(false);
  const [seededFor, setSeededFor] = useState<string | null>(null);

  const seedKey = open ? client?.id ?? "new" : null;
  if (seedKey !== seededFor) {
    setSeededFor(seedKey);
    setLinking(false);
    setForm(open ? {
      name: client?.name ?? "",
      sector: client?.sector ?? "",
      city: client?.city ?? "",
      country: client?.country ?? "",
      address: client?.address ?? "",
      website: client?.website ?? "",
      registrationNumber: client?.registrationNumber ?? "",
      status: client?.status ?? "active",
      notes: client?.notes ?? "",
      companyUserId: client?.companyUserId ?? null,
      companyLabel: client?.companyUserId ? "Entreprise BaaraMatch liée" : null,
    } : null);
  }

  const save = useMutation({
    mutationFn: async () => {
      const { companyLabel: _label, ...body } = form!;
      const res = client
        ? await apiRequest("PATCH", `/api/agency/clients/${client.id}`, body)
        : await apiRequest("POST", "/api/agency/clients", body);
      return res.json() as Promise<{ id: string }>;
    },
    onSuccess: (saved) => {
      invalidateCrm();
      toast({ title: client ? "Fiche mise à jour" : "Entreprise ajoutée" });
      onClose();
      if (!client) onCreated?.(saved.id);
    },
    onError: (error: Error) => toast({ title: "Enregistrement impossible", description: error.message, variant: "destructive" }),
  });

  const set = <K extends keyof ClientForm>(key: K, value: ClientForm[K]) => setForm((current) => current && { ...current, [key]: value });

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{client ? "Modifier la fiche" : "Nouvelle entreprise cliente"}</DialogTitle></DialogHeader>
        {form && (
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="client-name">Raison sociale *</Label>
                <Input id="client-name" value={form.name} onChange={(e) => set("name", e.target.value)} required data-testid="input-client-name" />
              </div>
              <div className="space-y-1.5">
                <Label>Secteur</Label>
                <Select value={form.sector || undefined} onValueChange={(value) => set("sector", value)}>
                  <SelectTrigger data-testid="select-client-sector"><SelectValue placeholder="Choisir un secteur" /></SelectTrigger>
                  <SelectContent>{SECTORS.map((sector) => <SelectItem key={sector} value={sector}>{sector}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <Select value={form.status} onValueChange={(value) => set("status", value as AgencyClientStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(CLIENT_STATUS).map(([value, { label }]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="client-city">Ville</Label>
                <Input id="client-city" value={form.city} onChange={(e) => set("city", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="client-country">Pays</Label>
                <Input id="client-country" value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="Mali" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="client-address">Adresse</Label>
                <Input id="client-address" value={form.address} onChange={(e) => set("address", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="client-rccm">RCCM / NIF</Label>
                <Input id="client-rccm" value={form.registrationNumber} onChange={(e) => set("registrationNumber", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="client-website">Site web</Label>
                <Input id="client-website" value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="client-notes">Notes internes</Label>
              <Textarea id="client-notes" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Historique de la relation, particularités, conditions négociées…" />
            </div>
            <div className="space-y-2">
              <Label>Compte BaaraMatch</Label>
              {form.companyUserId ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
                  <span className="flex items-center gap-2"><Link2 className="h-4 w-4 text-primary" /> {form.companyLabel}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => { set("companyUserId", null); set("companyLabel", null); }}>Délier</Button>
                </div>
              ) : linking ? (
                <PlatformCompanyPicker onPick={(company) => { set("companyUserId", company.id); set("companyLabel", company.name); setLinking(false); if (!form.name) set("name", company.name); }} />
              ) : (
                <Button type="button" variant="outline" size="sm" onClick={() => setLinking(true)}><Link2 /> Lier à une entreprise inscrite</Button>
              )}
              <p className="text-xs text-muted-foreground">Facultatif. Si le client a un compte BaaraMatch, le lien rattache automatiquement ses placements à cette fiche.</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
              <Button type="submit" disabled={save.isPending || !form.name.trim()} data-testid="button-save-client">Enregistrer</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ClientDetail({ client, onClose, onEdit }: { client: ClientRow | null; onClose: () => void; onEdit: (client: ClientRow) => void }) {
  const { toast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const remove = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/agency/clients/${id}`),
    onSuccess: () => { invalidateCrm(); setConfirmDelete(false); onClose(); toast({ title: "Fiche supprimée" }); },
    onError: (error: Error) => toast({ title: "Suppression impossible", description: error.message, variant: "destructive" }),
  });

  return (
    <Sheet open={!!client} onOpenChange={(open) => { if (!open) { setConfirmDelete(false); onClose(); } }}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
        {client && (
          <div className="space-y-5">
            <SheetHeader className="text-left">
              <div className="flex items-start gap-3 pr-6">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{initialsOf(client.name)}</span>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="flex flex-wrap items-center gap-2">
                    {client.name}
                    <Pill className={CLIENT_STATUS[client.status].className}>{CLIENT_STATUS[client.status].label}</Pill>
                    {client.companyUserId && <span title="Compte BaaraMatch lié"><BadgeCheck className="h-4 w-4 text-primary" /></span>}
                  </SheetTitle>
                  <SheetDescription>{[client.sector, [client.city, client.country].filter(Boolean).join(", ")].filter(Boolean).join(" · ") || "Informations à compléter"}</SheetDescription>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => onEdit(client)} data-testid="button-edit-client"><Pencil /> Modifier</Button>
                {confirmDelete ? (
                  <>
                    <Button size="sm" variant="destructive" disabled={remove.isPending} onClick={() => remove.mutate(client.id)}>Confirmer la suppression</Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>Annuler</Button>
                  </>
                ) : (
                  <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => setConfirmDelete(true)}><Trash2 /> Supprimer</Button>
                )}
              </div>
              {confirmDelete && (
                <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300">
                  Les contacts, besoins et accords de cette fiche seront supprimés. Les offres et placements existants sont conservés. Pour arrêter de travailler avec ce client sans perdre son historique, passez plutôt son statut à « Inactif ».
                </p>
              )}
            </SheetHeader>

            <Tabs defaultValue="overview">
              <TabsList className="flex h-auto w-full flex-wrap justify-start">
                <TabsTrigger value="overview">Aperçu</TabsTrigger>
                <TabsTrigger value="contacts">Contacts ({client.contactsCount})</TabsTrigger>
                <TabsTrigger value="needs">Besoins ({client.openNeeds})</TabsTrigger>
                <TabsTrigger value="agreements">Accords</TabsTrigger>
                <TabsTrigger value="history">Historique</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: "Besoins ouverts", value: client.openNeeds },
                    { label: "Placements actifs", value: client.activePlacements },
                    { label: "Placements au total", value: client.totalPlacements },
                    { label: "Accords en vigueur", value: client.activeAgreements },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border p-3">
                      <p className="text-xl font-bold tabular-nums">{item.value}</p>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                    </div>
                  ))}
                </div>
                {client.expiringAgreements > 0 && (
                  <p className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4 shrink-0" /> {client.expiringAgreements} accord{client.expiringAgreements > 1 ? "s" : ""} expire{client.expiringAgreements > 1 ? "nt" : ""} dans les 30 jours.
                  </p>
                )}
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs text-muted-foreground">Contact principal</dt><dd className="font-medium">{client.primaryContact ? `${client.primaryContact.fullName}${client.primaryContact.jobTitle ? ` · ${client.primaryContact.jobTitle}` : ""}` : "—"}</dd>
                    {client.primaryContact && (
                      <dd className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {client.primaryContact.email && <a className="flex items-center gap-1 hover:text-primary" href={`mailto:${client.primaryContact.email}`}><Mail className="h-3 w-3" /> {client.primaryContact.email}</a>}
                        {client.primaryContact.phone && <a className="flex items-center gap-1 hover:text-primary" href={`tel:${client.primaryContact.phone.replace(/\s/g, "")}`}><Phone className="h-3 w-3" /> {client.primaryContact.phone}</a>}
                      </dd>
                    )}
                  </div>
                  <div><dt className="text-xs text-muted-foreground">Adresse</dt><dd className="font-medium">{client.address || "—"}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">RCCM / NIF</dt><dd className="font-medium">{client.registrationNumber || "—"}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Site web</dt><dd className="font-medium">{client.website ? <a className="flex items-center gap-1 text-primary hover:underline" href={/^https?:\/\//.test(client.website) ? client.website : `https://${client.website}`} target="_blank" rel="noopener noreferrer"><Globe className="h-3 w-3" /> {client.website}</a> : "—"}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Client depuis</dt><dd className="font-medium">{formatDate(client.createdAt)}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Dernière activité</dt><dd className="font-medium">{formatDate(client.lastActivityAt)}</dd></div>
                </dl>
                {client.notes && <p className="whitespace-pre-line rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">{client.notes}</p>}
              </TabsContent>
              <TabsContent value="contacts" className="pt-2"><ClientContacts clientId={client.id} /></TabsContent>
              <TabsContent value="needs" className="pt-2"><ClientNeeds clientId={client.id} /></TabsContent>
              <TabsContent value="agreements" className="pt-2"><ClientAgreements clientId={client.id} /></TabsContent>
              <TabsContent value="history" className="pt-2"><ClientMissionHistory clientId={client.id} /></TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function ClientCompanies() {
  const { data: clients = [], isLoading, isError } = useClients();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | AgencyClientStatus>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ClientRow | null>(null);
  const [creating, setCreating] = useState(false);

  const query = search.trim().toLowerCase();
  const visible = clients.filter((client) => (status === "all" || client.status === status)
    && (!query || [client.name, client.sector, client.city, client.primaryContact?.fullName].some((value) => value?.toLowerCase().includes(query))));
  const selected = clients.find((client) => client.id === selectedId) ?? null;

  const stats = {
    active: clients.filter((client) => client.status === "active").length,
    prospects: clients.filter((client) => client.status === "prospect").length,
    openNeeds: clients.reduce((sum, client) => sum + client.openNeeds, 0),
    placements: clients.reduce((sum, client) => sum + client.activePlacements, 0),
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-8">
      <PageHeader
        title="Fiches entreprises"
        description="Votre portefeuille clients : coordonnées, interlocuteurs, besoins, accords et historique."
        action={<Button size="sm" onClick={() => setCreating(true)} data-testid="button-add-client"><Plus /> Nouvelle entreprise</Button>}
      />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={Building2} value={stats.active} label="Clients actifs" tone="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300" />
        <StatCard icon={Users} value={stats.prospects} label="Prospects" tone="bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300" />
        <StatCard icon={ClipboardList} value={stats.openNeeds} label="Besoins ouverts" tone="bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300" />
        <StatCard icon={UserCheck} value={stats.placements} label="Placements en cours" tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300" />
      </div>

      <div className={`${cardClass} overflow-hidden`}>
        <div className="grid gap-3 border-b border-border/60 p-4 sm:grid-cols-[minmax(0,1fr)_200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Entreprise, secteur, ville, contact…" className="pl-10" data-testid="input-search-clients" />
          </div>
          <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
            <SelectTrigger data-testid="select-clients-status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              {Object.entries(CLIENT_STATUS).map(([value, { label }]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
        ) : isError ? (
          <p className="p-10 text-center text-sm text-muted-foreground" role="alert">Impossible de charger les entreprises. Réessayez dans un instant.</p>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={clients.length ? "Aucune entreprise ne correspond" : "Aucune entreprise cliente"}
            description={clients.length ? "Modifiez la recherche ou le filtre." : "Créez la fiche de votre premier client pour suivre ses contacts, besoins et accords."}
            action={clients.length ? undefined : <Button size="sm" onClick={() => setCreating(true)}><Plus /> Nouvelle entreprise</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead>
                <tr className="bg-muted/40 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3">Entreprise</th>
                  <th className="px-4 py-3">Contact principal</th>
                  <th className="px-4 py-3">Besoins</th>
                  <th className="px-4 py-3">Placements</th>
                  <th className="px-4 py-3">Accords</th>
                  <th className="px-4 py-3">Dernière activité</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {visible.map((client) => (
                  <tr key={client.id} className="cursor-pointer transition-colors hover:bg-muted/30" onClick={() => setSelectedId(client.id)} data-testid={`client-row-${client.id}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{initialsOf(client.name)}</span>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-foreground">
                            {client.name}
                            {client.companyUserId && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="Compte BaaraMatch lié" />}
                          </p>
                          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                            <Pill className={`${CLIENT_STATUS[client.status].className} !px-1.5 !py-0 !text-[10px]`}>{CLIENT_STATUS[client.status].label}</Pill>
                            {client.sector && <span>{client.sector}</span>}
                            {client.city && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{client.city}</span>}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {client.primaryContact ? (
                        <>
                          <p className="font-medium text-foreground">{client.primaryContact.fullName}</p>
                          <p className="text-xs text-muted-foreground">{client.primaryContact.jobTitle ?? client.primaryContact.phone ?? client.primaryContact.email ?? ""}</p>
                        </>
                      ) : <span className="text-xs text-muted-foreground">À renseigner</span>}
                    </td>
                    <td className="px-4 py-3 text-sm tabular-nums">{client.openNeeds > 0 ? <span className="font-semibold text-amber-700 dark:text-amber-300">{client.openNeeds} ouvert{client.openNeeds > 1 ? "s" : ""}</span> : <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-3 text-sm tabular-nums">{client.activePlacements} <span className="text-xs text-muted-foreground">/ {client.totalPlacements}</span></td>
                    <td className="px-4 py-3 text-sm">
                      {client.expiringAgreements > 0 ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300"><AlertTriangle className="h-3.5 w-3.5" /> {client.expiringAgreements} expire{client.expiringAgreements > 1 ? "nt" : ""}</span>
                      ) : client.activeAgreements > 0 ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300"><FileSignature className="h-3.5 w-3.5" /> {client.activeAgreements} en vigueur</span>
                      ) : <span className="text-xs text-muted-foreground">Aucun</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(client.lastActivityAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ClientDetail client={selected} onClose={() => setSelectedId(null)} onEdit={setEditing} />
      <ClientDialog open={creating || !!editing} client={editing} onClose={() => { setCreating(false); setEditing(null); }} onCreated={setSelectedId} />
    </div>
  );
}
