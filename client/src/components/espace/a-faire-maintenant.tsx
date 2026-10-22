import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ToastAction } from "@/components/ui/toast";
import { PickInterviewSlotDialog } from "@/components/pick-interview-slot-dialog";
import { useToast } from "@/hooks/use-toast";
import { DELAI_ANNULATION_RETRAIT_MS, REPORT_RAPPEL_JOURS } from "@/constantes/espace";
import { calculerTaches, type CandidatureTache, type Tache } from "@/lib/taches-espace";

const boutonPrincipal =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-baara-bleu px-5 font-texte text-[15px] font-semibold text-white hover:bg-baara-marine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2 disabled:opacity-60";
const boutonSecondaire =
  "inline-flex min-h-11 items-center justify-center rounded-full border-[1.5px] border-baara-marine bg-white px-5 font-texte text-[15px] font-semibold text-baara-marine hover:bg-baara-clair focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2 disabled:opacity-60 dark:border-white dark:bg-transparent dark:text-white dark:hover:bg-white/10";

// Relancer et Attendre encore : routes ajoutées avec le backend de l'espace.
// Tant qu'elles n'existent pas, le serveur renvoie la page HTML : on ne
// l'interprète pas comme un succès.
async function envoyer(url: string, corps?: unknown): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: corps ? JSON.stringify(corps) : undefined,
    credentials: "include",
  });
  const json = res.headers.get("content-type")?.includes("application/json");
  if (!json) throw new Error("Cette action n'est pas encore disponible. Réessayez plus tard.");
  if (!res.ok) {
    const { message } = await res.json().catch(() => ({ message: "" }));
    throw new Error(message || "L'action n'a pas abouti. Réessayez dans un instant.");
  }
}

function envoyerRetrait(id: string, auDepart = false) {
  return fetch(`/api/applications/${id}/withdraw`, { method: "PATCH", credentials: "include", keepalive: auDepart });
}

/**
 * « À faire maintenant » : jusqu'à trois tâches tirées des candidatures.
 * Masquée quand il n'y a rien à faire.
 */
export function AFaireMaintenant({ candidatures }: { candidatures: CandidatureTache[] }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const titreRef = useRef<HTMLHeadingElement>(null);
  // Retraits confirmés, envoyés au bout du délai d'annulation.
  const [retraits, setRetraits] = useState<Record<string, true>>({});
  const minuteries = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const [aRetirer, setARetirer] = useState<Tache | null>(null);
  const retraitConfirme = useRef(false);
  const declencheur = useRef<HTMLElement | null>(null);
  const demanderRetrait = (tache: Tache, bouton: HTMLElement) => {
    declencheur.current = bouton;
    setARetirer(tache);
  };
  const [creneau, setCreneau] = useState<Tache | null>(null);
  const [enCours, setEnCours] = useState<string | null>(null);

  const taches = useMemo(
    () => calculerTaches(candidatures.filter((c) => !retraits[c.id])),
    [candidatures, retraits],
  );

  // En quittant la page, les retraits confirmés partent sans attendre.
  useEffect(() => {
    const enAttente = minuteries.current;
    return () => {
      enAttente.forEach((minuterie, id) => {
        clearTimeout(minuterie);
        void envoyerRetrait(id, true);
      });
      enAttente.clear();
    };
  }, []);

  const rafraichir = () => queryClient.invalidateQueries({ queryKey: ["/api/applications"] });

  const retirer = (tache: Tache) => {
    setRetraits((r) => ({ ...r, [tache.candidatureId]: true }));
    const annuler = () => {
      clearTimeout(minuteries.current.get(tache.candidatureId));
      minuteries.current.delete(tache.candidatureId);
      setRetraits(({ [tache.candidatureId]: _, ...reste }) => reste);
      toast({ title: "Retrait annulé", description: `Votre candidature « ${tache.poste} » est conservée.` });
    };
    minuteries.current.set(
      tache.candidatureId,
      setTimeout(async () => {
        minuteries.current.delete(tache.candidatureId);
        const res = await envoyerRetrait(tache.candidatureId).catch(() => null);
        if (!res?.ok) {
          setRetraits(({ [tache.candidatureId]: _, ...reste }) => reste);
          toast({ variant: "destructive", title: "Retrait impossible", description: "La candidature n'a pas pu être retirée. Réessayez dans un instant." });
        }
        rafraichir();
      }, DELAI_ANNULATION_RETRAIT_MS),
    );
    toast({
      title: "Candidature retirée",
      description: `« ${tache.poste} » sera retirée dans ${DELAI_ANNULATION_RETRAIT_MS / 1000} secondes.`,
      duration: DELAI_ANNULATION_RETRAIT_MS,
      action: (
        <ToastAction altText="Annuler le retrait de la candidature" onClick={annuler} data-testid="annuler-retrait">
          Annuler
        </ToastAction>
      ),
    });
  };

  const agir = async (tache: Tache, url: string, corps: unknown, succes: string) => {
    setEnCours(tache.cle);
    try {
      await envoyer(url, corps);
      toast({ title: succes });
      rafraichir();
    } catch (e) {
      toast({ variant: "destructive", title: "Action impossible", description: (e as Error).message });
    } finally {
      setEnCours(null);
    }
  };

  if (taches.length === 0) return null;

  return (
    <section aria-labelledby="titre-a-faire" className="mt-10 border-t-2 border-baara-marine pt-5 dark:border-white" data-testid="a-faire-maintenant">
      <h2 id="titre-a-faire" ref={titreRef} tabIndex={-1} className="font-titre text-[22px] font-bold text-baara-marine focus:outline-none dark:text-white">
        À faire maintenant
      </h2>
      <ul className="mt-4 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(340px,1fr))] max-[639px]:grid-cols-1">
        {taches.map((tache, i) => (
          <li
            key={tache.cle}
            className={`flex flex-col rounded-[20px] bg-white px-[22px] py-5 dark:bg-white/5 ${i === 0 ? "border-2 border-baara-bleu" : "border-[1.5px] border-baara-trait dark:border-white/20"}`}
            data-testid={`tache-${tache.cle}`}
          >
            <h3 className="font-titre text-lg font-bold leading-snug text-baara-marine [overflow-wrap:anywhere] dark:text-white">{tache.titre}</h3>
            <p className="mt-1.5 font-texte text-[15.5px] text-baara-texte [overflow-wrap:anywhere] dark:text-slate-300">{tache.detail}</p>
            <div className="mt-auto flex flex-wrap gap-3 pt-4">
              {tache.type === "creneau" && (
                <button type="button" className={boutonPrincipal} onClick={() => setCreneau(tache)}>
                  Choisir un créneau
                </button>
              )}
              {tache.type === "entretien" && (
                <Link href={`/candidate-applications?filtre=entretiens#candidature-${tache.candidatureId}`} className={boutonPrincipal}>
                  Préparer l'entretien
                </Link>
              )}
              {tache.type === "relance" && (
                <>
                  <button
                    type="button"
                    className={boutonPrincipal}
                    disabled={enCours === tache.cle}
                    onClick={() => agir(tache, `/api/applications/${tache.candidatureId}/relance`, undefined, "Relance envoyée à l'employeur")}
                  >
                    Relancer
                  </button>
                  <button type="button" className={boutonSecondaire} onClick={(e) => demanderRetrait(tache, e.currentTarget)}>
                    Retirer
                  </button>
                </>
              )}
              {tache.type === "attente-longue" && (
                <>
                  <button type="button" className={boutonPrincipal} onClick={(e) => demanderRetrait(tache, e.currentTarget)}>
                    Retirer
                  </button>
                  <button
                    type="button"
                    className={boutonSecondaire}
                    disabled={enCours === tache.cle}
                    onClick={() => agir(tache, `/api/applications/${tache.candidatureId}/rappel`, { jours: REPORT_RAPPEL_JOURS }, `Rappel repoussé de ${REPORT_RAPPEL_JOURS} jours`)}
                  >
                    Attendre encore
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      <AlertDialog open={!!aRetirer} onOpenChange={(ouvert) => { if (!ouvert) setARetirer(null); }}>
        <AlertDialogContent
          onCloseAutoFocus={(e) => {
            // Focus rendu au bouton « Retirer » ; après un retrait, la carte
            // a disparu : il va au titre de la section.
            e.preventDefault();
            const cible = retraitConfirme.current || !declencheur.current?.isConnected ? titreRef.current : declencheur.current;
            retraitConfirme.current = false;
            cible?.focus();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer cette candidature ?</AlertDialogTitle>
            <AlertDialogDescription>
              {aRetirer ? `${aRetirer.poste}. ` : ""}L'employeur sera prévenu. Vous pourrez annuler pendant {DELAI_ANNULATION_RETRAIT_MS / 1000} secondes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="min-h-11"
              data-testid="confirmer-retrait"
              onClick={() => {
                if (!aRetirer) return;
                retraitConfirme.current = true;
                retirer(aRetirer);
              }}
            >
              Retirer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PickInterviewSlotDialog
        applicationId={creneau?.candidatureId ?? null}
        jobTitle={creneau?.poste}
        open={!!creneau}
        onOpenChange={(ouvert) => { if (!ouvert) setCreneau(null); }}
      />
    </section>
  );
}
