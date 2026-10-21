import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";

// Onglets du profil employeur (motif tablist WAI-ARIA, activation
// automatique). L'onglet actif vit dans l'adresse (?onglet=offres) :
// lien partageable, et la connexion ramène sur le même onglet.

export const ONGLETS = [
  { cle: "apercu", libelle: "Aperçu" },
  { cle: "offres", libelle: "Offres" },
  { cle: "a-propos", libelle: "À propos" },
  { cle: "avis", libelle: "Avis" },
] as const;
export type Onglet = (typeof ONGLETS)[number]["cle"];

const lireOnglet = (): Onglet => {
  const v = new URLSearchParams(window.location.search).get("onglet");
  return ONGLETS.some((o) => o.cle === v) ? (v as Onglet) : "apercu";
};

/** Onglet actif, lu et écrit dans l'adresse (replaceState). */
export function useOngletProfil() {
  const [onglet, setOnglet] = useState<Onglet>(lireOnglet);
  useEffect(() => {
    const surRetour = () => setOnglet(lireOnglet());
    window.addEventListener("popstate", surRetour);
    return () => window.removeEventListener("popstate", surRetour);
  }, []);
  const choisir = useCallback((o: Onglet) => {
    setOnglet(o);
    const p = new URLSearchParams(window.location.search);
    if (o === "apercu") p.delete("onglet");
    else p.set("onglet", o);
    const recherche = p.toString();
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${recherche ? `?${recherche}` : ""}`);
  }, []);
  return [onglet, choisir] as const;
}

export const idOnglet = (o: Onglet) => `onglet-${o}`;
export const idPanneau = (o: Onglet) => `panneau-${o}`;

/**
 * Barre d'onglets : flèches gauche / droite, Début / Fin. La pastille de
 * l'onglet Offres n'apparaît que s'il y a des offres (jamais « 0 »).
 */
export function BarreOnglets({ actif, onChoisir, nombreOffres }: { actif: Onglet; onChoisir: (o: Onglet) => void; nombreOffres: number }) {
  const onglets = ONGLETS;
  const refs = useRef<Partial<Record<Onglet, HTMLButtonElement | null>>>({});
  const surTouche = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = onglets.findIndex((o) => o.cle === actif);
    const cible =
      e.key === "ArrowRight" ? onglets[(i + 1) % onglets.length]
      : e.key === "ArrowLeft" ? onglets[(i - 1 + onglets.length) % onglets.length]
      : e.key === "Home" ? onglets[0]
      : e.key === "End" ? onglets[onglets.length - 1]
      : null;
    if (!cible) return;
    e.preventDefault();
    onChoisir(cible.cle);
    refs.current[cible.cle]?.focus();
  };
  return (
    <div
      role="tablist"
      aria-label="Sections du profil"
      className="flex overflow-x-auto border-t-[1.5px] border-baara-trait px-3 [scrollbar-width:none] dark:border-white/10 min-[900px]:px-5 [&::-webkit-scrollbar]:hidden"
      data-testid="onglets-profil"
    >
      {onglets.map(({ cle, libelle }) => {
        const selectionne = cle === actif;
        return (
          <button
            key={cle}
            ref={(el) => { refs.current[cle] = el; }}
            type="button"
            role="tab"
            id={idOnglet(cle)}
            aria-selected={selectionne}
            aria-controls={idPanneau(cle)}
            tabIndex={selectionne ? 0 : -1}
            onClick={() => onChoisir(cle)}
            onKeyDown={surTouche}
            className={`relative inline-flex min-h-14 flex-none items-center gap-2 whitespace-nowrap px-3 font-titre text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-baara-bleu min-[900px]:px-4 min-[900px]:text-[17px] ${selectionne ? "font-bold text-baara-marine after:absolute after:inset-x-3 after:bottom-0 after:h-1 after:rounded-t after:bg-baara-or dark:text-white" : "font-semibold text-baara-texte hover:text-baara-marine dark:text-slate-300 dark:hover:text-white"}`}
            data-testid={`onglet-${cle}`}
          >
            {libelle}
            {cle === "offres" && nombreOffres > 0 && (
              <span className="rounded-full bg-baara-moyen px-2 py-px font-texte text-[13px] font-bold tabular-nums text-baara-marine">
                {nombreOffres}
                <span className="sr-only"> {nombreOffres > 1 ? "offres" : "offre"}</span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
