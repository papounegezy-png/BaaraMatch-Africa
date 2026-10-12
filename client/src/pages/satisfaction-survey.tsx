import { useState } from "react";
import { useParams } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";

// Public page — the agency's client answers without a BaaraMatch account,
// through the one-time link received by email.
type SurveyInfo = { agencyName: string; clientName: string; answered: boolean; expired: boolean };

export default function SatisfactionSurveyPage() {
  const { token } = useParams<{ token: string }>();
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);

  const { data, isLoading, isError } = useQuery<SurveyInfo>({
    queryKey: ["/api/satisfaction", token],
    queryFn: async () => {
      const res = await fetch(`/api/satisfaction/${encodeURIComponent(token)}`);
      if (!res.ok) throw new Error("invalid");
      return res.json();
    },
    retry: false,
  });

  const submit = useMutation({
    mutationFn: () => apiRequest("POST", `/api/satisfaction/${encodeURIComponent(token)}`, { score, comment: comment.trim() || undefined }),
    onSuccess: () => setDone(true),
  });

  const shell = (children: React.ReactNode) => (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <div className="w-full max-w-xl rounded-2xl border border-border/60 bg-card p-6 shadow-sm sm:p-8">{children}</div>
    </div>
  );

  if (isLoading) return shell(<div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>);
  if (isError || !data) {
    return shell(<div className="space-y-2 text-center"><XCircle className="mx-auto h-10 w-10 text-red-500" /><h1 className="text-lg font-semibold">Lien invalide</h1><p className="text-sm text-muted-foreground">Ce lien d'enquête n'existe pas ou a été mal copié.</p></div>);
  }
  if (done || data.answered) {
    return shell(<div className="space-y-2 text-center" data-testid="survey-thanks"><CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" /><h1 className="text-lg font-semibold">Merci pour votre réponse !</h1><p className="text-sm text-muted-foreground">{data.agencyName} a bien reçu votre avis.</p></div>);
  }
  if (data.expired) {
    return shell(<div className="space-y-2 text-center"><Clock className="mx-auto h-10 w-10 text-muted-foreground" /><h1 className="text-lg font-semibold">Enquête expirée</h1><p className="text-sm text-muted-foreground">Ce lien n'est plus valable. Contactez {data.agencyName} si vous souhaitez donner votre avis.</p></div>);
  }

  return shell(
    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); if (score !== null) submit.mutate(); }}>
      <div>
        <p className="text-sm font-medium text-muted-foreground">{data.agencyName}</p>
        <h1 className="mt-1 text-xl font-bold text-foreground">Recommanderiez-vous {data.agencyName} à un partenaire ou collègue ?</h1>
        <p className="mt-1 text-sm text-muted-foreground">Pour {data.clientName} — 0 = pas du tout probable, 10 = très probable.</p>
      </div>
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-11">
        {Array.from({ length: 11 }, (_, value) => (
          <button
            key={value}
            type="button"
            onClick={() => setScore(value)}
            aria-pressed={score === value}
            data-testid={`score-${value}`}
            className={`h-11 rounded-lg border text-sm font-semibold tabular-nums transition ${score === value
              ? value >= 9 ? "border-emerald-600 bg-emerald-600 text-white" : value >= 7 ? "border-amber-500 bg-amber-500 text-white" : "border-red-600 bg-red-600 text-white"
              : "border-border bg-background hover:bg-muted"}`}
          >
            {value}
          </button>
        ))}
      </div>
      <div className="space-y-1.5">
        <label htmlFor="survey-comment" className="text-sm font-medium">Qu'est-ce qui explique votre note ? <span className="text-muted-foreground">(optionnel)</span></label>
        <Textarea id="survey-comment" rows={4} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Réactivité, qualité des profils, suivi administratif…" data-testid="input-survey-comment" />
      </div>
      {submit.isError && <p className="text-sm text-red-600" role="alert">{(submit.error as Error).message}</p>}
      <Button type="submit" className="w-full" disabled={score === null || submit.isPending} data-testid="button-submit-survey">
        {submit.isPending && <Loader2 className="animate-spin" />} Envoyer mon avis
      </Button>
      <p className="text-center text-xs text-muted-foreground">Réponse unique, transmise uniquement à {data.agencyName}.</p>
    </form>,
  );
}
