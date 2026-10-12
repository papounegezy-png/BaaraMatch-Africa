import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Gauge, Loader2, MessageSquareQuote, Percent, Send, Star, ThumbsUp } from "lucide-react";
import { ClientSelect } from "@/components/agency-crm/shared";
import { PageHeader, SATISFACTION_KEY, StatCard, cardClass, formatDate, refreshRelations, useContactsOf } from "./shared";

type Survey = {
  id: string;
  clientId: string;
  clientName: string;
  contactName: string | null;
  sentTo: string;
  sentAt: string;
  expiresAt: string;
  respondedAt: string | null;
  score: number | null;
  comment: string | null;
  expired: boolean;
};
type SatisfactionData = {
  surveys: Survey[];
  stats: { sent: number; responses: number; responseRate: number | null; nps: number | null; average: number | null; promoters: number; passives: number; detractors: number };
  byClient: { clientId: string; clientName: string; responses: number; average: number; nps: number | null; lastAt: string | null }[];
};

const scoreClass = (score: number) =>
  score >= 9 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
    : score >= 7 ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
      : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300";

function SurveyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ clientId: "", contactId: "none", to: "", message: "" });
  const contacts = useContactsOf(form.clientId);
  useEffect(() => { if (open) setForm({ clientId: "", contactId: "none", to: "", message: "" }); }, [open]);
  // Default to the primary contact that has an email.
  useEffect(() => {
    const preferred = contacts.find((contact) => contact.isPrimary && contact.email) ?? contacts.find((contact) => contact.email);
    setForm((current) => ({ ...current, contactId: preferred?.id ?? "none" }));
  }, [form.clientId, contacts.length]);
  const contact = contacts.find((item) => item.id === form.contactId);

  const send = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/agency/satisfaction/surveys", {
      clientId: form.clientId, contactId: form.contactId === "none" ? null : form.contactId,
      to: form.to.trim() || undefined, message: form.message.trim() || undefined,
    })).json() as Promise<Survey>,
    onSuccess: (survey) => { refreshRelations(); toast({ title: "Enquête envoyée", description: `À ${survey.sentTo} — lien valable 30 jours.` }); onClose(); },
    onError: (error: Error) => toast({ title: "Envoi impossible", description: error.message, variant: "destructive" }),
  });
  const hasRecipient = !!form.to.trim() || !!contact?.email;

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Envoyer une enquête de satisfaction</DialogTitle>
          <DialogDescription>Une question (0 à 10) et un commentaire, sans création de compte pour votre client.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Entreprise *</Label>
            <ClientSelect value={form.clientId} onChange={(value) => setForm({ ...form, clientId: value, contactId: "none" })} testId="select-survey-client" />
          </div>
          {form.clientId && (
            <div className="space-y-1.5">
              <Label>Contact</Label>
              <Select value={form.contactId} onValueChange={(value) => setForm({ ...form, contactId: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Saisir une adresse</SelectItem>
                  {contacts.map((item) => <SelectItem key={item.id} value={item.id} disabled={!item.email}>{item.fullName}{item.email ? ` · ${item.email}` : " (sans email)"}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {(form.contactId === "none" || !contact?.email) && (
            <div className="space-y-1.5">
              <Label htmlFor="survey-to">Email du destinataire</Label>
              <Input id="survey-to" type="email" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} data-testid="input-survey-to" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="survey-message">Mot d'accompagnement <span className="text-muted-foreground">(optionnel)</span></Label>
            <Textarea id="survey-message" rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Merci pour votre confiance sur la mission de Sadiola…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button disabled={!form.clientId || !hasRecipient || send.isPending} onClick={() => send.mutate()} data-testid="button-send-survey">
            {send.isPending ? <Loader2 className="animate-spin" /> : <Send />} Envoyer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RelationsSatisfaction() {
  const [sending, setSending] = useState(false);
  const { data, isLoading } = useQuery<SatisfactionData>({ queryKey: SATISFACTION_KEY });
  const stats = data?.stats;
  const answered = (data?.surveys ?? []).filter((survey) => survey.respondedAt);
  const total = (stats?.promoters ?? 0) + (stats?.passives ?? 0) + (stats?.detractors ?? 0);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-8">
      <PageHeader
        title="Satisfaction client"
        description="Mesurez la satisfaction de vos clients (NPS) et réagissez aux avis négatifs."
        action={<Button size="sm" onClick={() => setSending(true)} data-testid="button-new-survey"><Send /> Envoyer une enquête</Button>}
      />

      {isLoading || !stats ? (
        <div className="grid gap-4 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard icon={Gauge} value={stats.nps === null ? "—" : `${stats.nps > 0 ? "+" : ""}${stats.nps}`} label="Net Promoter Score" hint="de −100 à +100" tone={stats.nps === null || stats.nps >= 30 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300" : stats.nps >= 0 ? "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300" : "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300"} />
            <StatCard icon={Star} value={stats.average === null ? "—" : `${stats.average.toLocaleString("fr-FR")}/10`} label="Note moyenne" tone="bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300" />
            <StatCard icon={Percent} value={stats.responseRate === null ? "—" : `${stats.responseRate}%`} label="Taux de réponse" hint={`${stats.responses} / ${stats.sent} enquêtes`} tone="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300" />
            <StatCard icon={ThumbsUp} value={stats.promoters} label="Clients promoteurs (9–10)" tone="bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <section className={`${cardClass} overflow-hidden`}>
              <div className="border-b border-border/60 px-5 py-3">
                <h2 className="text-base font-semibold text-foreground">Réponses</h2>
                <p className="text-xs text-muted-foreground">Un avis de 6/10 ou moins crée automatiquement une relance dans « Relances auto ».</p>
              </div>
              {answered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 p-12 text-center">
                  <MessageSquareQuote className="h-10 w-10 text-muted-foreground/60" />
                  <p className="font-medium text-foreground">Aucune réponse pour l'instant</p>
                  <p className="text-sm text-muted-foreground">Envoyez une enquête après une mission ou chaque trimestre.</p>
                </div>
              ) : (
                <ul className="divide-y divide-border/60">
                  {answered.map((survey) => (
                    <li key={survey.id} className="flex gap-3 px-5 py-3" data-testid={`survey-${survey.id}`}>
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold tabular-nums ${scoreClass(survey.score!)}`}>{survey.score}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{survey.clientName}{survey.contactName ? ` · ${survey.contactName}` : ""}</p>
                        <p className="text-xs text-muted-foreground">Répondu le {formatDate(survey.respondedAt)}</p>
                        {survey.comment && <p className="mt-1 text-sm italic text-muted-foreground">« {survey.comment} »</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="space-y-6">
              <section className={`${cardClass} p-5`}>
                <h2 className="text-base font-semibold text-foreground">Répartition</h2>
                {total === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">Pas encore de réponse.</p>
                ) : (
                  <>
                    <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-muted">
                      <div className="bg-emerald-500" style={{ width: `${(stats.promoters / total) * 100}%` }} />
                      <div className="bg-amber-400" style={{ width: `${(stats.passives / total) * 100}%` }} />
                      <div className="bg-red-500" style={{ width: `${(stats.detractors / total) * 100}%` }} />
                    </div>
                    <ul className="mt-3 space-y-1.5 text-sm">
                      <li className="flex justify-between"><span className="flex items-center gap-2 text-muted-foreground"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Promoteurs (9–10)</span><strong>{stats.promoters}</strong></li>
                      <li className="flex justify-between"><span className="flex items-center gap-2 text-muted-foreground"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" />Passifs (7–8)</span><strong>{stats.passives}</strong></li>
                      <li className="flex justify-between"><span className="flex items-center gap-2 text-muted-foreground"><span className="h-2.5 w-2.5 rounded-full bg-red-500" />Détracteurs (0–6)</span><strong>{stats.detractors}</strong></li>
                    </ul>
                    <p className="mt-3 text-xs text-muted-foreground">NPS = % de promoteurs − % de détracteurs.</p>
                  </>
                )}
              </section>

              <section className={`${cardClass} overflow-hidden`}>
                <div className="border-b border-border/60 px-5 py-3"><h2 className="text-base font-semibold text-foreground">Par client</h2></div>
                {data!.byClient.length === 0 ? (
                  <p className="px-5 py-6 text-center text-sm text-muted-foreground">—</p>
                ) : (
                  <ul className="divide-y divide-border/60">
                    {data!.byClient.map((client) => (
                      <li key={client.clientId} className="flex items-center justify-between gap-2 px-5 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{client.clientName}</p>
                          <p className="text-xs text-muted-foreground">{client.responses} réponse{client.responses > 1 ? "s" : ""} · dernière le {formatDate(client.lastAt)}</p>
                        </div>
                        <span className={`rounded-lg px-2 py-1 text-sm font-bold tabular-nums ${scoreClass(client.average)}`}>{client.average.toLocaleString("fr-FR")}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className={`${cardClass} overflow-hidden`}>
                <div className="border-b border-border/60 px-5 py-3"><h2 className="text-base font-semibold text-foreground">Enquêtes envoyées</h2></div>
                {data!.surveys.length === 0 ? (
                  <p className="px-5 py-6 text-center text-sm text-muted-foreground">Aucune enquête envoyée.</p>
                ) : (
                  <ul className="max-h-72 divide-y divide-border/60 overflow-y-auto">
                    {data!.surveys.map((survey) => (
                      <li key={survey.id} className="flex items-center justify-between gap-2 px-5 py-2.5 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{survey.clientName}</p>
                          <p className="truncate text-xs text-muted-foreground">{survey.sentTo} · {formatDate(survey.sentAt)}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${survey.respondedAt ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : survey.expired ? "bg-muted text-muted-foreground" : "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"}`}>
                          {survey.respondedAt ? `${survey.score}/10` : survey.expired ? "Expirée" : "En attente"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        </>
      )}

      <SurveyDialog open={sending} onClose={() => setSending(false)} />
    </div>
  );
}
