import { useEffect, useId, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cleProfil } from "@/hooks/use-profil-employeur";
import { boutonPlein, focusVisible } from "@/components/listes/etats-liste";
import { LONGUEUR_MAX_COMMENTAIRE, SEUIL_MOYENNE, type AvisPublic, type ResumeAvis } from "@shared/avis";
import { ErreurBloc, SquelettesLignes } from "./etats-profil";

type ReponseAvis = { resume: ResumeAvis; avis: AvisPublic[] };

const carte = "rounded-[20px] border-[1.5px] border-baara-trait bg-white px-[26px] py-6 dark:border-white/10 dark:bg-white/[0.04]";
const texte = "font-texte text-[15px] text-baara-texte dark:text-slate-300";

/** Étoiles pleines / vides, décoratives : la note est dite en texte. */
function Etoiles({ note, taille = 18 }: { note: number; taille?: number }) {
  return (
    <span aria-hidden="true" className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} width={taille} height={taille} className={n <= Math.round(note) ? "fill-baara-or text-baara-or" : "text-baara-trait dark:text-white/30"} />
      ))}
    </span>
  );
}

const noteEnTexte = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} sur 5`;

/** Formulaire : une note (boutons radio) et un commentaire facultatif. */
function FormulaireAvis({ employeurId, monAvis }: { employeurId: string; monAvis?: AvisPublic }) {
  const client = useQueryClient();
  const { toast } = useToast();
  const id = useId();
  const [note, setNote] = useState(monAvis?.note ?? 0);
  const [commentaire, setCommentaire] = useState(monAvis?.commentaire ?? "");
  useEffect(() => { setNote(monAvis?.note ?? 0); setCommentaire(monAvis?.commentaire ?? ""); }, [monAvis?.id, monAvis?.note, monAvis?.commentaire]);
  const rafraichir = () => {
    client.invalidateQueries({ queryKey: ["/api/employeurs", employeurId, "avis"] });
    client.invalidateQueries({ queryKey: cleProfil(employeurId) });
  };
  const publier = useMutation({
    mutationFn: async () => apiRequest("PUT", `/api/employeurs/${employeurId}/avis`, { note, commentaire: commentaire.trim() || null }),
    onSuccess: () => { rafraichir(); toast({ title: monAvis ? "Votre avis est mis à jour" : "Merci, votre avis est publié" }); },
    onError: (e: Error) => toast({ title: "L'avis n'a pas pu être enregistré", description: e.message, variant: "destructive" }),
  });
  const retirer = useMutation({
    mutationFn: async () => apiRequest("DELETE", `/api/employeurs/${employeurId}/avis`),
    onSuccess: () => { rafraichir(); toast({ title: "Votre avis est retiré" }); },
    onError: (e: Error) => toast({ title: "L'avis n'a pas pu être retiré", description: e.message, variant: "destructive" }),
  });
  return (
    <form
      className={carte}
      onSubmit={(e) => { e.preventDefault(); if (note) publier.mutate(); }}
      data-testid="formulaire-avis"
    >
      <h3 className="font-titre text-lg font-bold text-baara-marine dark:text-white">{monAvis ? "Votre avis" : "Donner votre avis"}</h3>
      <fieldset className="mt-3">
        <legend className={texte}>Votre note</legend>
        <div className="mt-1 flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="relative grid h-11 w-11 cursor-pointer place-items-center rounded-full has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-baara-bleu">
              <input type="radio" name={`${id}-note`} value={n} checked={note === n} onChange={() => setNote(n)} className="peer sr-only" data-testid={`note-${n}`} />
              <Star aria-hidden="true" className={`h-7 w-7 ${n <= note ? "fill-baara-or text-baara-or" : "text-baara-texte/50 dark:text-white/40"}`} />
              <span className="sr-only">{n} {n > 1 ? "étoiles" : "étoile"}</span>
            </label>
          ))}
          <span className="ml-2 self-center font-texte text-[15px] font-semibold tabular-nums text-baara-marine dark:text-white" aria-hidden="true">{note ? `${note}/5` : ""}</span>
        </div>
      </fieldset>
      <label htmlFor={`${id}-commentaire`} className={`mt-4 block ${texte}`}>Votre commentaire (facultatif)</label>
      <textarea
        id={`${id}-commentaire`}
        value={commentaire}
        onChange={(e) => setCommentaire(e.target.value.slice(0, LONGUEUR_MAX_COMMENTAIRE))}
        rows={4}
        aria-describedby={`${id}-compte`}
        className={`mt-1.5 w-full rounded-xl border border-baara-marine/35 bg-white px-3 py-2.5 font-texte text-base text-baara-marine dark:border-white/30 dark:bg-white/5 dark:text-white ${focusVisible}`}
        data-testid="commentaire-avis"
      />
      <p id={`${id}-compte`} className="mt-1 text-right font-texte text-sm tabular-nums text-baara-texte dark:text-slate-300">
        {commentaire.length} / {LONGUEUR_MAX_COMMENTAIRE}
      </p>
      <p className={`mt-1 ${texte}`}>Votre avis est publié sans votre nom.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="submit" disabled={!note || publier.isPending} className={`${boutonPlein} disabled:cursor-not-allowed disabled:opacity-50`} data-testid="publier-avis">
          {monAvis ? "Mettre à jour mon avis" : "Publier mon avis"}
        </button>
        {monAvis && (
          <button type="button" onClick={() => retirer.mutate()} disabled={retirer.isPending} className={`inline-flex min-h-11 items-center rounded-full border-[1.5px] border-baara-marine px-6 font-texte font-semibold text-baara-marine hover:bg-baara-clair dark:border-white dark:text-white ${focusVisible}`} data-testid="retirer-avis">
            Retirer mon avis
          </button>
        )}
      </div>
    </form>
  );
}

/**
 * Onglet Avis : résumé (moyenne à partir de SEUIL_MOYENNE avis), avis
 * publiés sans nom, et formulaire pour un candidat ayant postulé.
 */
export function ContenuAvis({ employeurId, connecte, candidat, peutDonnerAvis }: { employeurId: string; connecte: boolean; candidat: boolean; peutDonnerAvis: boolean }) {
  const requete = useQuery<ReponseAvis>({
    queryKey: ["/api/employeurs", employeurId, "avis"],
    queryFn: async () => {
      const r = await fetch(`/api/employeurs/${encodeURIComponent(employeurId)}/avis`, { credentials: "include" });
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    },
  });
  if (requete.isError && !requete.isFetching) return <div className={carte}><ErreurBloc texte="Les avis n'ont pas pu être chargés." onReessayer={() => requete.refetch()} /></div>;
  if (!requete.data) return <div className={carte}><SquelettesLignes /></div>;
  const { resume, avis } = requete.data;
  const monAvis = avis.find((a) => a.estLeMien);
  return (
    <div className="flex flex-col gap-5">
      <section className={carte} aria-labelledby="titre-avis" data-testid="resume-avis">
        <h2 id="titre-avis" className="border-t-2 border-baara-marine pt-3 font-titre text-xl font-bold text-baara-marine dark:border-white/60 dark:text-white">Avis de candidats</h2>
        {resume.nombre === 0 ? (
          <div className="mt-4" data-testid="avis-vide">
            <p className="font-texte text-[15px] font-bold text-baara-marine dark:text-white">Pas encore d'avis</p>
            <p className={`mt-1 ${texte}`}>Les avis de candidats apparaîtront ici.</p>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            {resume.moyenne !== null && (
              <p className="flex items-center gap-2">
                <span className="font-titre text-[32px] font-extrabold tabular-nums text-baara-marine dark:text-white">{resume.moyenne.toLocaleString("fr-FR", { minimumFractionDigits: 1 })}</span>
                <Etoiles note={resume.moyenne} taille={22} />
                <span className="sr-only">Note moyenne : {noteEnTexte(resume.moyenne)}</span>
              </p>
            )}
            <p className={texte}>
              {resume.nombre} {resume.nombre > 1 ? "avis" : "avis"}
              {resume.moyenne === null && ` · note moyenne affichée à partir de ${SEUIL_MOYENNE} avis`}
            </p>
          </div>
        )}
      </section>
      {avis.length > 0 && (
        <ul className="flex flex-col gap-4" data-testid="liste-avis">
          {avis.map((a) => (
            <li key={a.id} className={carte}>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Etoiles note={a.note} />
                {/* Les étoiles or seules manquent de contraste : la note est aussi écrite. */}
                <span className="font-texte text-[15px] font-bold tabular-nums text-baara-marine dark:text-white"><span aria-hidden="true">{a.note}/5</span><span className="sr-only">{noteEnTexte(a.note)}</span></span>
                <span className={texte}>
                  {a.estLeMien ? "Votre avis" : "Avis d'un candidat"} · {new Date(a.publieLe).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                </span>
              </p>
              {a.commentaire && <p className="mt-3 whitespace-pre-line font-texte text-base leading-relaxed text-baara-marine dark:text-slate-100">{a.commentaire}</p>}
            </li>
          ))}
        </ul>
      )}
      {peutDonnerAvis ? (
        <FormulaireAvis employeurId={employeurId} monAvis={monAvis} />
      ) : (
        <p className={texte} data-testid="conditions-avis">
          {!connecte ? (
            <><Link href={`/login?retour=${encodeURIComponent(window.location.pathname + window.location.search)}`} className="rounded-sm font-bold text-baara-bleu underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu dark:text-baara-moyen">Connectez-vous</Link> pour donner votre avis, si vous avez postulé à l'une de ses offres.</>
          ) : candidat ? "Vous pourrez donner votre avis après avoir postulé à l'une de ses offres." : "Les avis sont réservés aux candidats ayant postulé à l'une de ses offres."}
        </p>
      )}
    </div>
  );
}
