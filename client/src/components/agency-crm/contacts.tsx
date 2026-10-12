import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarCheck, Mail, MessageCircle, Pencil, Phone, Plus, Search, Star, Trash2, Users } from "lucide-react";
import {
  CONTACTS_KEY,
  invalidateCrm,
  ClientSelect,
  EmptyState,
  PageHeader,
  cardClass,
  formatDate,
  initialsOf,
  type ContactRow,
} from "./shared";

// wa.me wants digits only, international format without "+".
const whatsappLink = (number: string) => `https://wa.me/${number.replace(/[^\d]/g, "")}`;

type ContactForm = { clientId: string; fullName: string; jobTitle: string; email: string; phone: string; whatsapp: string; isPrimary: boolean; notes: string };

function ContactDialog({ open, onClose, contact, fixedClientId }: { open: boolean; onClose: () => void; contact: ContactRow | null; fixedClientId?: string }) {
  const { toast } = useToast();
  const [form, setForm] = useState<ContactForm | null>(null);
  const [seededFor, setSeededFor] = useState<string | null>(null);

  const seedKey = open ? contact?.id ?? "new" : null;
  if (seedKey !== seededFor) {
    setSeededFor(seedKey);
    setForm(open ? {
      clientId: contact?.clientId ?? fixedClientId ?? "",
      fullName: contact?.fullName ?? "",
      jobTitle: contact?.jobTitle ?? "",
      email: contact?.email ?? "",
      phone: contact?.phone ?? "",
      whatsapp: contact?.whatsapp ?? "",
      isPrimary: contact?.isPrimary ?? false,
      notes: contact?.notes ?? "",
    } : null);
  }

  const save = useMutation({
    mutationFn: async () => {
      const { clientId, ...body } = form!;
      return contact
        ? apiRequest("PATCH", `/api/agency/client-contacts/${contact.id}`, body)
        : apiRequest("POST", `/api/agency/clients/${clientId}/contacts`, body);
    },
    onSuccess: () => {
      invalidateCrm();
      toast({ title: contact ? "Contact mis à jour" : "Contact ajouté" });
      onClose();
    },
    onError: (error: Error) => toast({ title: "Enregistrement impossible", description: error.message, variant: "destructive" }),
  });

  const set = <K extends keyof ContactForm>(key: K, value: ContactForm[K]) => setForm((current) => current && { ...current, [key]: value });

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{contact ? "Modifier le contact" : "Nouveau contact RH"}</DialogTitle></DialogHeader>
        {form && (
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
            {!fixedClientId && !contact && (
              <div className="space-y-1.5">
                <Label>Entreprise *</Label>
                <ClientSelect value={form.clientId} onChange={(value) => set("clientId", value)} testId="select-contact-client" />
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="contact-name">Nom complet *</Label>
                <Input id="contact-name" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} required data-testid="input-contact-name" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-title">Fonction</Label>
                <Input id="contact-title" value={form.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} placeholder="DRH, chargée de recrutement…" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-email">Email</Label>
                <Input id="contact-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-phone">Téléphone</Label>
                <Input id="contact-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+223 …" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="contact-whatsapp">WhatsApp</Label>
                <Input id="contact-whatsapp" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="Si différent du téléphone" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-notes">Notes</Label>
              <Textarea id="contact-notes" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </div>
            <label className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <span>
                <span className="block text-sm font-medium">Contact principal</span>
                <span className="block text-xs text-muted-foreground">L'interlocuteur affiché sur la fiche entreprise.</span>
              </span>
              <Switch checked={form.isPrimary} onCheckedChange={(value) => set("isPrimary", value)} />
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
              <Button type="submit" disabled={save.isPending || !form.fullName.trim() || (!contact && !form.clientId)} data-testid="button-save-contact">Enregistrer</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ClientContacts({ clientId }: { clientId?: string }) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [editing, setEditing] = useState<ContactRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const { data: contacts = [], isLoading } = useQuery<ContactRow[]>({ queryKey: CONTACTS_KEY });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => apiRequest("PATCH", `/api/agency/client-contacts/${id}`, body),
    onSuccess: invalidateCrm,
    onError: (error: Error) => toast({ title: "Action impossible", description: error.message, variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/agency/client-contacts/${id}`),
    onSuccess: () => { invalidateCrm(); setConfirmDelete(null); toast({ title: "Contact supprimé" }); },
    onError: (error: Error) => toast({ title: "Suppression impossible", description: error.message, variant: "destructive" }),
  });

  const scope = clientId ?? (clientFilter === "all" ? null : clientFilter);
  const query = search.trim().toLowerCase();
  const visible = contacts.filter((contact) =>
    (!scope || contact.clientId === scope)
    && (!query || [contact.fullName, contact.jobTitle, contact.email, contact.clientName].some((value) => value?.toLowerCase().includes(query))),
  );

  const list = (
    <div className={clientId ? "" : `${cardClass} overflow-hidden`}>
      {!clientId && (
        <div className="grid gap-3 border-b border-border/60 p-4 sm:grid-cols-[minmax(0,1fr)_240px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nom, fonction, email, entreprise…" className="pl-10" data-testid="input-search-contacts" />
          </div>
          <ClientSelect value={clientFilter} onChange={setClientFilter} includeAll />
        </div>
      )}
      {isLoading ? (
        <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : visible.length === 0 ? (
        <EmptyState icon={Users} title={contacts.length ? "Aucun contact ne correspond" : "Aucun contact RH"} description="Ajoutez les interlocuteurs RH de vos entreprises clientes." />
      ) : (
        <ul className="divide-y divide-border/60">
          {visible.map((contact) => (
            <li key={contact.id} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:px-5" data-testid={`contact-${contact.id}`}>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{initialsOf(contact.fullName)}</span>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-foreground">
                    {contact.fullName}
                    {contact.isPrimary && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" aria-label="Contact principal" />}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{[contact.jobTitle, !clientId && contact.clientName].filter(Boolean).join(" · ") || "—"}</p>
                  <p className="text-[11px] text-muted-foreground">Dernier échange : {contact.lastContactAt ? formatDate(contact.lastContactAt) : "jamais"}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {contact.email && <Button variant="ghost" size="icon" asChild title={contact.email}><a href={`mailto:${contact.email}`}><Mail className="h-4 w-4" /></a></Button>}
                {contact.phone && <Button variant="ghost" size="icon" asChild title={contact.phone}><a href={`tel:${contact.phone.replace(/\s/g, "")}`}><Phone className="h-4 w-4" /></a></Button>}
                {(contact.whatsapp || contact.phone) && (
                  <Button variant="ghost" size="icon" asChild title="WhatsApp">
                    <a href={whatsappLink(contact.whatsapp || contact.phone!)} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4 text-emerald-600" /></a>
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="h-8" title="Enregistrer un échange aujourd'hui" onClick={() => update.mutate({ id: contact.id, body: { lastContactAt: new Date().toISOString() } })} data-testid={`button-contacted-${contact.id}`}>
                  <CalendarCheck className="h-4 w-4" /> Contacté
                </Button>
                {!contact.isPrimary && (
                  <Button variant="ghost" size="icon" title="Définir comme contact principal" onClick={() => update.mutate({ id: contact.id, body: { isPrimary: true } })}><Star className="h-4 w-4" /></Button>
                )}
                <Button variant="ghost" size="icon" title="Modifier" onClick={() => setEditing(contact)}><Pencil className="h-4 w-4" /></Button>
                {confirmDelete === contact.id ? (
                  <>
                    <Button size="sm" variant="destructive" className="h-8" disabled={remove.isPending} onClick={() => remove.mutate(contact.id)}>Supprimer</Button>
                    <Button size="sm" variant="ghost" className="h-8" onClick={() => setConfirmDelete(null)}>Annuler</Button>
                  </>
                ) : (
                  <Button variant="ghost" size="icon" title="Supprimer" onClick={() => setConfirmDelete(contact.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const addButton = <Button size="sm" onClick={() => setCreating(true)} data-testid="button-add-contact"><Plus /> Ajouter un contact</Button>;

  return (
    <div className={clientId ? "space-y-3" : "mx-auto max-w-[1600px] space-y-6 pb-8"}>
      {clientId ? <div className="flex justify-end">{addButton}</div> : (
        <PageHeader title="Contacts RH" description="Vos interlocuteurs chez chaque entreprise cliente." action={addButton} />
      )}
      {list}
      <ContactDialog open={creating || !!editing} contact={editing} fixedClientId={clientId} onClose={() => { setCreating(false); setEditing(null); }} />
    </div>
  );
}

