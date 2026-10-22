import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Mic, Trash2 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { LecteurVocal } from "@/components/cv-vocal/lecteur-vocal";
import { EnregistreurVocal, type EnregistrementVocal } from "@/components/cv-vocal/enregistreur-vocal";
import { libelleDureeAudio } from "@shared/cv-vocal";

export type CvVocal = { url: string; dureeSecondes: number | null } | null | undefined;

const boutonContour =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border-[1.5px] border-baara-marine bg-white px-5 font-texte text-[15px] font-semibold text-baara-marine hover:bg-baara-clair focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2 dark:border-white dark:bg-transparent dark:text-white dark:hover:bg-white/10";
const lienSupprimer =
  "inline-flex min-h-11 items-center gap-1.5 font-texte text-[15px] font-bold text-baara-marine underline underline-offset-4 hover:text-baara-bleu focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2 dark:text-white";

function enBase64(fichier: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const lecteur = new FileReader();
    lecteur.onload = () => resolve(String(lecteur.result).split(",")[1] ?? "");
    lecteur.onerror = () => reject(new Error("Lecture de l'enregistrement impossible."));
    lecteur.readAsDataURL(fichier);
  });
}

/**
 * CV vocal du candidat connecté : écouter, réenregistrer, supprimer ; sans
 * CV vocal, l'enregistreur. Enregistré tout de suite (POST
 * /api/profile/cv-vocal), sans attendre le reste du profil.
 */
export function GestionCvVocal({ cvVocal }: { cvVocal: CvVocal }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [reenregistrer, setReenregistrer] = useState(false);
  const [confirmer, setConfirmer] = useState(false);
  const boutonSupprimer = useRef<HTMLButtonElement>(null);

  const rafraichir = () => queryClient.invalidateQueries({ queryKey: ["/api/profile"] });

  const envoyer = async ({ fichier, typeMime, dureeSecondes }: EnregistrementVocal) => {
    const res = await fetch("/api/profile/cv-vocal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ audioBase64: await enBase64(fichier), mimeType: typeMime, dureeSecondes }),
    });
    if (!res.ok) {
      const { message } = await res.json().catch(() => ({ message: "" }));
      throw new Error(message || "Le CV vocal n'a pas pu être enregistré. Réessayez.");
    }
    await rafraichir();
    setReenregistrer(false);
    toast({ title: "CV vocal enregistré", description: "Les recruteurs à qui vous postulez pourront l'écouter." });
  };

  const suppression = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/profile/cv-vocal", { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("La suppression n'a pas abouti. Réessayez.");
    },
    onSuccess: async () => {
      await rafraichir();
      toast({ title: "CV vocal supprimé" });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: "Suppression impossible", description: e.message }),
  });

  if (!cvVocal || reenregistrer) {
    return <EnregistreurVocal onEnvoyer={envoyer} onAnnuler={cvVocal ? () => setReenregistrer(false) : undefined} />;
  }

  const duree = libelleDureeAudio(cvVocal.dureeSecondes);
  return (
    <div className="space-y-3" data-testid="gestion-cv-vocal">
      <LecteurVocal url={cvVocal.url} dureeSecondes={cvVocal.dureeSecondes} libelle="votre CV vocal" />
      <p className="font-texte text-[14.5px] text-baara-texte dark:text-slate-300">
        {duree ? `${duree} · ` : ""}Joint à vos candidatures : les recruteurs peuvent l'écouter.
      </p>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <button type="button" onClick={() => setReenregistrer(true)} className={boutonContour} data-testid="bouton-reenregistrer-vocal">
          <Mic className="h-4 w-4" aria-hidden="true" />
          Réenregistrer
        </button>
        <button ref={boutonSupprimer} type="button" onClick={() => setConfirmer(true)} className={lienSupprimer} data-testid="bouton-supprimer-vocal">
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Supprimer
        </button>
      </div>
      <AlertDialog open={confirmer} onOpenChange={setConfirmer}>
        <AlertDialogContent onCloseAutoFocus={(e) => { e.preventDefault(); boutonSupprimer.current?.focus(); }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer votre CV vocal ?</AlertDialogTitle>
            <AlertDialogDescription>Les recruteurs ne pourront plus l'écouter avec vos candidatures.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">Annuler</AlertDialogCancel>
            <AlertDialogAction className="min-h-11" onClick={() => suppression.mutate()} data-testid="confirmer-suppression-vocal">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
