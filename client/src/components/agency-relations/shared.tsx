import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarClock, Loader2, Mail, MapPin, MessageCircle, NotebookPen, Phone, Send, Users } from "lucide-react";
import { ClientSelect, CONTACTS_KEY, type ContactRow } from "@/components/agency-crm/shared";

export type InteractionType = "call" | "email" | "meeting" | "whatsapp" | "visit" | "note";
export type Outcome = "positive" | "neutral" | "negative";

export type Interaction = {
  id: string;
  clientId: string;
  clientName: string;
  contactId: string | null;
  contactName: string | null;
  type: InteractionType;
  direction: "inbound" | "outbound" | null;
  subject: string;
  body: string | null;
  outcome: Outcome | null;
  durationMinutes: number | null;
  occurredAt: string;
  source: "manual" | "platform";
  emailTo: string | null;
};

export type Reminder = {
  id: string;
  clientId: string | null;
  clientName: string | null;
  contactId: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  title: string;
  notes: string | null;
  channel: InteractionType | null;
  dueAt: string;
  status: "open" | "done" | "cancelled";
  source: "manual" | "rule";
  ruleKey: string | null;
  relatedUrl: string | null;
  completedAt: string | null;
};

export type Overview = {
  interactionsThisMonth: number;
  callsThisMonth: number;
  emailsThisMonth: number;
  clientsContacted30d: number;
  dormantClients: number;
  remindersOpen: number;
  remindersOverdue: number;
  remindersToday: number;
  nps: number | null;
  responses: number;
  dormantDays: number;
};

export const INTERACTIONS_KEY = ["/api/agency/interactions"];
export const REMINDERS_KEY = ["/api/agency/reminders"];
export const OVERVIEW_KEY = ["/api/agency/relations/overview"];
export const SATISFACTION_KEY = ["/api/agency/satisfaction"];

export const refreshRelations = () => {
  for (const queryKey of [INTERACTIONS_KEY, REMINDERS_KEY, OVERVIEW_KEY, SATISFACTION_KEY, CONTACTS_KEY, ["/api/agency/clients"]]) {
    queryClient.invalidateQueries({ queryKey });
  }
};

export const TYPE_META: Record<InteractionType, { label: string; icon: React.ElementType; className: string }> = {
  call: { label: "Appel", icon: Phone, className: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300" },
  email: { label: "Email", icon: Mail, className: "bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300" },
  meeting: { label: "Rendez-vous", icon: Users, className: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300" },
  whatsapp: { label: "WhatsApp", icon: MessageCircle, className: "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-300" },
  visit: { label: "Visite", icon: MapPin, className: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300" },
  note: { label: "Note", icon: NotebookPen, className: "bg-muted text-muted-foreground" },
};

export const OUTCOME_META: Record<Outcome, { label: string; className: string }> = {
  positive: { label: "Positif", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  neutral: { label: "Neutre", className: "bg-muted text-muted-foreground" },
  negative: { label: "À surveiller", className: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
};

export const cardClass = "rounded-2xl border border-border/60 bg-card shadow-sm";

export const useOverview = () => useQuery<Overview>({ queryKey: OVERVIEW_KEY });

export function StatCard({ icon: Icon, value, label, tone, hint }: { icon: React.ElementType; value: string | number; label: string; tone: string; hint?: string }) {
  return (
    <div className={`${cardClass} flex items-center gap-3 p-4`}>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span>
      <span className="min-w-0">
        <span className="block text-2xl font-bold tabular-nums text-foreground">{value}</span>
        <span className="block text-xs leading-tight text-muted-foreground">{label}</span>
        {hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
      </span>
    </div>
  );
}

export function PageHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </header>
  );
}

export const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
export const formatDate = (value: string | null) =>
  (value ? new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—");

/** Local "YYYY-MM-DDTHH:mm" for datetime-local inputs. */
export function toLocalInput(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function useContactsOf(clientId: string) {
  const { data: contacts = [] } = useQuery<ContactRow[]>({ queryKey: CONTACTS_KEY });
  return contacts.filter((contact) => contact.clientId === clientId);
}

function ContactSelect({ clientId, value, onChange, requireEmail }: { clientId: string; value: string; onChange: (value: string) => void; requireEmail?: boolean }) {
  const contacts = useContactsOf(clientId);
  return (
    <Select value={value} onValueChange={onChange} disabled={!clientId}>
      <SelectTrigger data-testid="select-contact"><SelectValue placeholder={clientId ? "Choisir un contact" : "Choisissez d'abord l'entreprise"} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Aucun contact précis</SelectItem>
        {contacts.map((contact) => (
          <SelectItem key={contact.id} value={contact.id} disabled={requireEmail && !contact.email}>
            {contact.fullName}{contact.jobTitle ? ` · ${contact.jobTitle}` : ""}{requireEmail && !contact.email ? " (sans email)" : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ---- Log an exchange ----------------------------------------------------------
export type LogPrefill = { clientId?: string; contactId?: string | null; type?: InteractionType; subject?: string; reminderId?: string };

export function LogInteractionDialog({ prefill, onClose }: { prefill: LogPrefill | null; onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ clientId: "", contactId: "none", type: "call" as InteractionType, direction: "outbound", subject: "", body: "", outcome: "neutral", duration: "", occurredAt: toLocalInput(new Date()), followUp: false, followUpTitle: "", followUpAt: "" });

  useEffect(() => {
    if (!prefill) return;
    const inThreeDays = new Date(Date.now() + 3 * 86_400_000); inThreeDays.setHours(9, 0, 0, 0);
    setForm({
      clientId: prefill.clientId ?? "", contactId: prefill.contactId ?? "none", type: prefill.type ?? "call", direction: "outbound",
      subject: prefill.subject ?? "", body: "", outcome: "neutral", duration: "", occurredAt: toLocalInput(new Date()),
      followUp: false, followUpTitle: "", followUpAt: toLocalInput(inThreeDays),
    });
  }, [prefill]);

  const save = useMutation({
    mutationFn: () => apiRequest("POST", "/api/agency/interactions", {
      clientId: form.clientId,
      contactId: form.contactId === "none" ? null : form.contactId,
      type: form.type,
      direction: form.type === "note" ? null : form.direction,
      subject: form.subject.trim(),
      body: form.body.trim() || null,
      outcome: form.outcome,
      durationMinutes: form.duration.trim() ? Math.round(Number(form.duration)) : null,
      occurredAt: new Date(form.occurredAt).toISOString(),
      followUp: form.followUp && form.followUpTitle.trim() ? { title: form.followUpTitle.trim(), dueAt: new Date(form.followUpAt).toISOString() } : null,
      reminderId: prefill?.reminderId,
    }),
    onSuccess: () => {
      refreshRelations();
      toast({ title: "Échange enregistré", description: form.followUp ? "La relance suivante est planifiée." : undefined });
      onClose();
    },
    onError: (error: Error) => toast({ title: "Enregistrement impossible", description: error.message, variant: "destructive" }),
  });

  const set = (key: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  const valid = form.clientId && form.subject.trim() && (!form.followUp || (form.followUpTitle.trim() && form.followUpAt));

  return (
    <Dialog open={!!prefill} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tracer un échange</DialogTitle>
          <DialogDescription>{prefill?.reminderId ? "La relance sera marquée comme faite." : "Appel, rendez-vous, message ou note avec un client."}</DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (valid) save.mutate(); }}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Entreprise *</Label>
              <ClientSelect value={form.clientId} onChange={(value) => { set("clientId", value); set("contactId", "none"); }} testId="select-interaction-client" />
            </div>
            <div className="space-y-1.5">
              <Label>Contact</Label>
              <ContactSelect clientId={form.clientId} value={form.contactId} onChange={(value) => set("contactId", value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(value) => set("type", value)}>
                <SelectTrigger data-testid="select-interaction-type"><SelectValue /></SelectTrigger>
                <SelectContent>{(Object.keys(TYPE_META) as InteractionType[]).map((type) => <SelectItem key={type} value={type}>{TYPE_META[type].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="interaction-subject">Objet *</Label>
              <Input id="interaction-subject" value={form.subject} onChange={(e) => set("subject", e.target.value)} placeholder="Point sur les besoins du chantier…" data-testid="input-interaction-subject" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="interaction-body">Compte rendu</Label>
              <Textarea id="interaction-body" rows={3} value={form.body} onChange={(e) => set("body", e.target.value)} placeholder="Ce qui a été dit, décidé, promis…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="interaction-date">Date et heure</Label>
              <Input id="interaction-date" type="datetime-local" max={toLocalInput(new Date())} value={form.occurredAt} onChange={(e) => set("occurredAt", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Ressenti</Label>
              <Select value={form.outcome} onValueChange={(value) => set("outcome", value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(Object.keys(OUTCOME_META) as Outcome[]).map((outcome) => <SelectItem key={outcome} value={outcome}>{OUTCOME_META[outcome].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.type !== "note" && (
              <div className="space-y-1.5">
                <Label>Sens</Label>
                <Select value={form.direction} onValueChange={(value) => set("direction", value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="outbound">À l'initiative de l'agence</SelectItem>
                    <SelectItem value="inbound">À l'initiative du client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {(form.type === "call" || form.type === "meeting" || form.type === "visit") && (
              <div className="space-y-1.5">
                <Label htmlFor="interaction-duration">Durée (min)</Label>
                <Input id="interaction-duration" inputMode="numeric" value={form.duration} onChange={(e) => set("duration", e.target.value)} />
              </div>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.followUp} onChange={(e) => set("followUp", e.target.checked)} className="h-4 w-4 accent-primary" data-testid="checkbox-follow-up" />
            Planifier une relance
          </label>
          {form.followUp && (
            <div className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="follow-title">Prochaine action</Label>
                <Input id="follow-title" value={form.followUpTitle} onChange={(e) => set("followUpTitle", e.target.value)} placeholder="Envoyer la proposition commerciale" data-testid="input-follow-title" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="follow-at">Échéance</Label>
                <Input id="follow-at" type="datetime-local" value={form.followUpAt} onChange={(e) => set("followUpAt", e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={!valid || save.isPending} data-testid="button-save-interaction">{save.isPending && <Loader2 className="animate-spin" />} Enregistrer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---- New follow-up ---------------------------------------------------------------
export function ReminderDialog({ open, clientId, onClose }: { open: boolean; clientId?: string; onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ clientId: "", contactId: "none", title: "", notes: "", channel: "call", dueAt: "" });
  useEffect(() => {
    if (!open) return;
    const tomorrow = new Date(Date.now() + 86_400_000); tomorrow.setHours(9, 0, 0, 0);
    setForm({ clientId: clientId ?? "", contactId: "none", title: "", notes: "", channel: "call", dueAt: toLocalInput(tomorrow) });
  }, [open, clientId]);

  const save = useMutation({
    mutationFn: () => apiRequest("POST", "/api/agency/reminders", {
      clientId: form.clientId || null, contactId: form.contactId === "none" ? null : form.contactId,
      title: form.title.trim(), notes: form.notes.trim() || null, channel: form.channel, dueAt: new Date(form.dueAt).toISOString(),
    }),
    onSuccess: () => { refreshRelations(); toast({ title: "Relance planifiée" }); onClose(); },
    onError: (error: Error) => toast({ title: "Création impossible", description: error.message, variant: "destructive" }),
  });
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Nouvelle relance</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (form.title.trim() && form.dueAt) save.mutate(); }}>
          <div className="space-y-1.5">
            <Label htmlFor="reminder-title">À faire *</Label>
            <Input id="reminder-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Rappeler la DRH pour le planning de janvier" data-testid="input-reminder-title" />
          </div>
          <div className="space-y-1.5">
            <Label>Entreprise</Label>
            <ClientSelect value={form.clientId} onChange={(value) => { set("clientId", value); set("contactId", "none"); }} />
          </div>
          {form.clientId && (
            <div className="space-y-1.5">
              <Label>Contact</Label>
              <ContactSelect clientId={form.clientId} value={form.contactId} onChange={(value) => set("contactId", value)} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Canal</Label>
              <Select value={form.channel} onValueChange={(value) => set("channel", value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(Object.keys(TYPE_META) as InteractionType[]).filter((type) => type !== "note").map((type) => <SelectItem key={type} value={type}>{TYPE_META[type].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reminder-due">Échéance *</Label>
              <Input id="reminder-due" type="datetime-local" value={form.dueAt} onChange={(e) => set("dueAt", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reminder-notes">Notes</Label>
            <Textarea id="reminder-notes" rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={!form.title.trim() || !form.dueAt || save.isPending} data-testid="button-save-reminder"><CalendarClock /> Planifier</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---- Email composer --------------------------------------------------------------
export function EmailDialog({ prefill, onClose }: { prefill: { clientId?: string; contactId?: string | null; subject?: string } | null; onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ clientId: "", contactId: "none", to: "", subject: "", message: "" });
  const contacts = useContactsOf(form.clientId);
  useEffect(() => {
    if (prefill) setForm({ clientId: prefill.clientId ?? "", contactId: prefill.contactId ?? "none", to: "", subject: prefill.subject ?? "", message: "" });
  }, [prefill]);
  const contact = contacts.find((item) => item.id === form.contactId);

  const send = useMutation({
    mutationFn: async () => (await apiRequest("POST", `/api/agency/clients/${form.clientId}/email`, {
      contactId: form.contactId === "none" ? null : form.contactId,
      to: form.to.trim() || undefined,
      subject: form.subject.trim(),
      message: form.message.trim(),
    })).json() as Promise<Interaction>,
    onSuccess: (interaction) => {
      refreshRelations();
      toast({ title: "Email envoyé", description: `À ${interaction.emailTo} — enregistré dans les échanges.` });
      onClose();
    },
    onError: (error: Error) => toast({ title: "Envoi impossible", description: error.message, variant: "destructive" }),
  });
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const hasRecipient = !!form.to.trim() || !!contact?.email;

  return (
    <Dialog open={!!prefill} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Écrire à un client</DialogTitle>
          <DialogDescription>Envoyé depuis BaaraMatch ; les réponses arrivent sur l'email de votre agence.</DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (form.clientId && hasRecipient && form.subject.trim() && form.message.trim()) send.mutate(); }}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Entreprise *</Label>
              <ClientSelect value={form.clientId} onChange={(value) => { set("clientId", value); set("contactId", "none"); }} testId="select-email-client" />
            </div>
            <div className="space-y-1.5">
              <Label>Contact</Label>
              <ContactSelect clientId={form.clientId} value={form.contactId} onChange={(value) => set("contactId", value)} requireEmail />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="email-to">Destinataire</Label>
              <Input id="email-to" type="email" value={form.to} onChange={(e) => set("to", e.target.value)} placeholder={contact?.email ?? "adresse email"} data-testid="input-email-to" />
              {contact?.email && !form.to && <p className="text-xs text-muted-foreground">Envoyé à {contact.email}.</p>}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="email-subject">Objet *</Label>
              <Input id="email-subject" value={form.subject} onChange={(e) => set("subject", e.target.value)} data-testid="input-email-subject" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="email-message">Message *</Label>
              <Textarea id="email-message" rows={7} value={form.message} onChange={(e) => set("message", e.target.value)} data-testid="input-email-message" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={!form.clientId || !hasRecipient || !form.subject.trim() || !form.message.trim() || send.isPending} data-testid="button-send-email">
              {send.isPending ? <Loader2 className="animate-spin" /> : <Send />} Envoyer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

