import { Link, useLocation } from "wouter";
import { Bell, BellRing } from "lucide-react";
import { focusVisible } from "@/components/listes/etats-liste";

const pastille = `inline-flex min-h-12 flex-[1_1_200px] items-center justify-center gap-2 rounded-full px-5 font-texte text-[15px] font-semibold transition-colors min-[900px]:flex-none ${focusVisible}`;

/**
 * « Suivre » / « Suivi » (aria-pressed). Visiteur : envoyé à la connexion,
 * puis ramené sur cette page, onglet compris.
 */
export function BoutonSuivre({ connecte, suivi, enCours, onBasculer }: { connecte: boolean; suivi: boolean; enCours: boolean; onBasculer: () => void }) {
  const [, setLocation] = useLocation();
  const surClic = () => {
    if (!connecte) {
      setLocation(`/login?retour=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    onBasculer();
  };
  const Icone = suivi ? BellRing : Bell;
  return (
    <button
      type="button"
      aria-pressed={connecte ? suivi : false}
      disabled={enCours}
      onClick={surClic}
      className={`${pastille} border-[1.5px] border-baara-marine disabled:opacity-60 ${suivi ? "bg-baara-marine text-white hover:bg-baara-bleu dark:bg-white dark:text-baara-marine" : "bg-white text-baara-marine hover:bg-baara-clair dark:bg-transparent dark:text-white dark:hover:bg-white/10"}`}
      data-testid="bouton-suivre"
    >
      <Icone className="h-4 w-4" aria-hidden="true" />
      {suivi ? "Suivi" : "Suivre"}
    </button>
  );
}

/**
 * Offres actives : « Voir l'offre » / « Voir les N offres » ouvre l'onglet
 * Offres. Sans offre, une simple mention (pas présentée comme une action).
 */
export function BoutonOffres({ nombre, onVoir }: { nombre: number; onVoir: () => void }) {
  if (nombre <= 0) {
    return (
      <span className={`${pastille} cursor-default bg-baara-clair text-baara-texte dark:bg-white/10 dark:text-slate-300`} data-testid="aucune-offre-profil">
        Aucune offre pour le moment
      </span>
    );
  }
  return (
    <button type="button" onClick={onVoir} className={`${pastille} bg-baara-bleu text-white hover:bg-baara-marine`} data-testid="bouton-voir-offres">
      {nombre === 1 ? "Voir l'offre" : `Voir les ${nombre} offres`}
    </button>
  );
}

/** Ligne d'invitation, pour un visiteur seulement. */
export function InvitationCompte({ nom }: { nom: string }) {
  return (
    <p className="mx-5 mb-6 mt-0 font-texte text-[15px] text-baara-texte dark:text-slate-300 min-[900px]:mx-8" data-testid="invitation-compte">
      <Link href="/register?type=candidate" className="rounded-sm font-bold text-baara-bleu underline underline-offset-4 hover:text-baara-marine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu dark:text-baara-moyen">
        Créez votre compte
      </Link>{" "}
      pour suivre {nom} et postuler à ses offres.
    </p>
  );
}
