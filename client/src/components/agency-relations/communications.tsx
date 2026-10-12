import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, MessageCircle, PenSquare, Phone, PhoneCall, Search, Send, Timer } from "lucide-react";
import { CONTACTS_KEY, type ContactRow } from "@/components/agency-crm/shared";
import {
  EmailDialog,
  INTERACTIONS_KEY,
  LogInteractionDialog,
  OUTCOME_META,
  PageHeader,
  StatCard,
  TYPE_META,
  cardClass,
  formatDate,
  formatDateTime,
  useOverview,
  type Interaction,
  type LogPrefill,
} from "./shared";

const whatsappLink = (number: string) => `https://wa.me/${number.replace(/[^\d]/g, "")}`;

export function RelationsCommunications() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "call" | "email">("all");
  const [logging, setLogging] = useState<LogPrefill | null>(null);
  const [emailing, setEmailing] = useState<{ clientId?: string; contactId?: string | null } | null>(null);
  const { data: contacts = [], isLoading: loadingContacts } = useQuery<ContactRow[]>({ queryKey: CONTACTS_KEY });
  const { data: interactions = [], isLoading } = useQuery<Interaction[]>({ queryKey: INTERACTIONS_KEY });
  const { data: overview } = useOverview();

  const query = search.trim().toLowerCase();
  const directory = contacts.filter((contact) => (contact.phone || contact.whatsapp || contact.email)
    && (!query || [contact.fullName, contact.clientName, contact.jobTitle ?? ""].some((value) => value.toLowerCase().includes(query))));
  const history = interactions.filter((row) => (tab === "all" ? row.type === "call" || row.type === "email" : row.type === tab));
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const talkMinutes = interactions
    .filter((row) => row.type === "call" && new Date(row.occurredAt).getTime() >= monthStart)
    .reduce((sum, row) => sum + (row.durationMinutes ?? 0), 0);

  // Calling opens the phone (tel:) AND the log form, so the call is traced.
  const call = (contact: ContactRow, number: string) => {
    window.location.href = `tel:${number.replace(/\s/g, "")}`;
    setLogging({ clientId: contact.clientId, contactId: contact.id, type: "call", subject: `Appel ${contact.fullName}` });
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-8">
      <PageHeader
        title="Appels & emails"
        description="Appelez et écrivez à vos contacts clients ; chaque appel et chaque email est tracé."
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setLogging({ type: "call" })}><PhoneCall /> Noter un appel</Button>
            <Button size="sm" onClick={() => setEmailing({})} data-testid="button-compose-email"><PenSquare /> Écrire un email</Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={Phone} value={overview?.callsThisMonth ?? "—"} label="Appels ce mois-ci" tone="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300" />
        <StatCard icon={Timer} value={`${talkMinutes} min`} label="Temps d'appel ce mois-ci" tone="bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300" />
        <StatCard icon={Mail} value={overview?.emailsThisMonth ?? "—"} label="Emails ce mois-ci" tone="bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300" />
        <StatCard icon={Send} value={interactions.filter((row) => row.source === "platform" && row.type === "email").length} label="Envoyés depuis BaaraMatch" tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className={`${cardClass} h-fit overflow-hidden`}>
          <div className="space-y-2 border-b border-border/60 p-4">
            <h2 className="text-base font-semibold text-foreground">Annuaire des contacts</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nom, entreprise, fonction…" className="pl-10" data-testid="input-search-directory" />
            </div>
          </div>
          {loadingContacts ? (
            <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
          ) : directory.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">Aucun contact joignable. Ajoutez téléphones et emails dans « Contacts RH ».</p>
          ) : (
            <ul className="max-h-[640px] divide-y divide-border/60 overflow-y-auto">
              {directory.map((contact) => (
                <li key={contact.id} className="flex items-center gap-2 px-4 py-2.5" data-testid={`directory-${contact.id}`}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{contact.fullName}</p>
                    <p className="truncate text-xs text-muted-foreground">{[contact.jobTitle, contact.clientName].filter(Boolean).join(" · ")}</p>
                    <p className="text-[11px] text-muted-foreground">Dernier échange : {contact.lastContactAt ? formatDate(contact.lastContactAt) : "jamais"}</p>
                  </div>
                  {contact.phone && <Button variant="ghost" size="icon" title={`Appeler ${contact.phone}`} onClick={() => call(contact, contact.phone!)} data-testid={`button-call-${contact.id}`}><Phone className="h-4 w-4 text-blue-600" /></Button>}
                  {(contact.whatsapp || contact.phone) && (
                    <Button variant="ghost" size="icon" asChild title="WhatsApp">
                      <a href={whatsappLink(contact.whatsapp || contact.phone!)} target="_blank" rel="noopener noreferrer" onClick={() => setLogging({ clientId: contact.clientId, contactId: contact.id, type: "whatsapp", subject: `WhatsApp ${contact.fullName}` })}>
                        <MessageCircle className="h-4 w-4 text-green-600" />
                      </a>
                    </Button>
                  )}
                  {contact.email && <Button variant="ghost" size="icon" title={`Écrire à ${contact.email}`} onClick={() => setEmailing({ clientId: contact.clientId, contactId: contact.id })} data-testid={`button-email-${contact.id}`}><Mail className="h-4 w-4 text-violet-600" /></Button>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${cardClass} overflow-hidden`}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-5 py-3">
            <h2 className="text-base font-semibold text-foreground">Historique</h2>
            <div className="flex gap-1 rounded-lg bg-muted p-1">
              {([["all", "Tout"], ["call", "Appels"], ["email", "Emails"]] as const).map(([value, label]) => (
                <button key={value} type="button" onClick={() => setTab(value)} className={`rounded-md px-3 py-1 text-sm ${tab === value ? "bg-background font-semibold text-foreground shadow-sm" : "text-muted-foreground"}`}>{label}</button>
              ))}
            </div>
          </div>
          {isLoading ? (
            <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
          ) : history.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">Aucun appel ni email pour l'instant.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {history.map((row) => {
                const meta = TYPE_META[row.type];
                return (
                  <li key={row.id} className="flex gap-3 px-5 py-3">
                    <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.className}`}><meta.icon className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{row.subject}</p>
                        {row.outcome && <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${OUTCOME_META[row.outcome].className}`}>{OUTCOME_META[row.outcome].label}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(row.occurredAt)} · {row.clientName}{row.contactName ? ` · ${row.contactName}` : ""}
                        {row.emailTo ? ` · ${row.emailTo}` : ""}{row.durationMinutes ? ` · ${row.durationMinutes} min` : ""}
                        {row.source === "platform" ? " · envoyé par BaaraMatch" : ""}
                      </p>
                      {row.body && <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">{row.body}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <LogInteractionDialog prefill={logging} onClose={() => setLogging(null)} />
      <EmailDialog prefill={emailing} onClose={() => setEmailing(null)} />
    </div>
  );
}
