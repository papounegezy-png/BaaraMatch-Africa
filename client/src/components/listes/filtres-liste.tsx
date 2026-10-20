import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { NB_SECTEURS_INITIAL } from "@shared/secteurs";

// Panneau de filtres des pages de liste (Offres, Employeurs) : enveloppe,
// groupes de cases à cocher, liste des secteurs, et gestion de l'ouverture
// sous 1000 px.

export type OptionFiltre = { valeur: string; libelle: string; nombre: number };
// Unité lue par les lecteurs d'écran après chaque compteur (« 3 offres »).
export type Unite = [singulier: string, pluriel: string];

export const lienTexte =
  "inline-flex min-h-11 items-center rounded-sm font-texte text-[15px] font-semibold text-baara-bleu underline underline-offset-4 hover:text-baara-marine " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu dark:text-baara-moyen dark:hover:text-white";

export const titreGroupe = "font-titre text-[17px] font-bold text-baara-marine dark:text-white";

function CaseFiltre({ option, coche, onBasculer, unite }: { option: OptionFiltre; coche: boolean; onBasculer: () => void; unite: Unite }) {
  return (
    <li>
      <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2.5 font-texte text-[15px] text-baara-marine dark:text-white">
        <input
          type="checkbox"
          checked={coche}
          onChange={onBasculer}
          className="mt-px h-[22px] w-[22px] flex-none cursor-pointer accent-baara-bleu focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2"
        />
        <span className="min-w-0 flex-1 break-words">{option.libelle}</span>
        <span aria-hidden="true" className="flex-none tabular-nums text-baara-texte dark:text-slate-400">{option.nombre}</span>
        <span className="sr-only"> ({option.nombre} {option.nombre > 1 ? unite[1] : unite[0]})</span>
      </label>
    </li>
  );
}

export function GroupeCases({ titre, options, valeurs, onBasculer, unite, testId }: {
  titre: string;
  options: OptionFiltre[];
  valeurs: string[];
  onBasculer: (v: string) => void;
  unite: Unite;
  testId?: string;
}) {
  return (
    <fieldset className="border-t-2 border-baara-marine pt-4 dark:border-white/50" data-testid={testId}>
      <legend className="sr-only">{titre}</legend>
      <h3 aria-hidden="true" className={titreGroupe}>{titre}</h3>
      <ul className="mt-2">
        {options.map((o) => <CaseFiltre key={o.valeur} option={o} coche={valeurs.includes(o.valeur)} onBasculer={() => onBasculer(o.valeur)} unite={unite} />)}
      </ul>
    </fieldset>
  );
}

/**
 * Secteurs : 32 secteurs dans un conteneur défilant ; les 10 premiers
 * d'abord, « Voir plus » affiche les 32. Un secteur coché au-delà des 10
 * premiers reste affiché après « Voir moins ».
 */
export function GroupeSecteurs({ options, valeurs, onBasculer, unite }: { options: OptionFiltre[]; valeurs: string[]; onBasculer: (v: string) => void; unite: Unite }) {
  const [tous, setTous] = useState(false);
  const idListe = useId();
  const visibles = tous ? options : options.filter((o, i) => i < NB_SECTEURS_INITIAL || valeurs.includes(o.valeur));
  return (
    <div className="border-t-2 border-baara-marine pt-4 dark:border-white/50">
      {/* Nom du groupe porté par la liste (role="group") : titre seulement visuel. */}
      <h3 aria-hidden="true" className={titreGroupe}>Secteur d'activité</h3>
      <ul
        id={idListe}
        role="group"
        aria-label="Secteur d'activité"
        className={`mt-2 overflow-y-auto overscroll-contain pr-2 [scrollbar-width:thin] ${tous ? "max-h-[60vh] min-[1000px]:max-h-[440px]" : "max-h-[264px] min-[1000px]:max-h-[300px]"}`}
        data-testid="liste-secteurs"
      >
        {visibles.map((o) => <CaseFiltre key={o.valeur} option={o} coche={valeurs.includes(o.valeur)} onBasculer={() => onBasculer(o.valeur)} unite={unite} />)}
      </ul>
      <button type="button" aria-expanded={tous} aria-controls={idListe} onClick={() => setTous((t) => !t)} className={`${lienTexte} mt-1`} data-testid="bouton-voir-secteurs">
        {tous ? "Voir moins" : "Voir plus"}
      </button>
    </div>
  );
}

/** Ajoute ou retire une valeur d'une liste de valeurs cochées. */
export const basculerValeur = (liste: string[], v: string) => (liste.includes(v) ? liste.filter((x) => x !== v) : [...liste, v]);

// Dès 1000 px, le panneau est une colonne toujours visible.
const COLONNE = "(min-width: 1000px)";
const abonner = (rappel: () => void) => {
  const m = window.matchMedia(COLONNE);
  m.addEventListener("change", rappel);
  return () => m.removeEventListener("change", rappel);
};
const enColonne = () => window.matchMedia(COLONNE).matches;

/**
 * Enveloppe du panneau : colonne de gauche dès 1000 px ; en dessous, carte
 * repliée qui s'ouvre sous la barre collante. Fermé, son contenu n'est pas
 * construit (premier affichage plus léger).
 */
export function PanneauFiltres({ id, ouvert, nbActifs, onReinitialiser, children }: {
  id: string;
  ouvert: boolean;
  nbActifs: number;
  onReinitialiser: () => void;
  children: ReactNode;
}) {
  const visible = useSyncExternalStore(abonner, enColonne, () => true) || ouvert;
  return (
    <aside
      id={id}
      aria-label="Filtres"
      className={`${ouvert ? "block" : "hidden"} rounded-[20px] border border-baara-trait bg-white p-5 dark:border-white/10 dark:bg-white/[0.04] min-[1000px]:block min-[1000px]:rounded-none min-[1000px]:border-0 min-[1000px]:bg-transparent min-[1000px]:p-0 min-[1000px]:dark:bg-transparent`}
      data-testid="panneau-filtres"
    >
      {visible && <>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-titre text-xl font-bold text-baara-marine dark:text-white">Filtres</h2>
          {nbActifs > 0 && <span className="font-texte text-sm font-semibold text-baara-texte dark:text-slate-300" data-testid="filtres-appliques">Appliqués ({nbActifs})</span>}
        </div>
        <button type="button" onClick={onReinitialiser} className={lienTexte} data-testid="bouton-reinitialiser-filtres">Réinitialiser</button>
        <div className="mt-4 space-y-6">{children}</div>
      </>}
    </aside>
  );
}

/**
 * Ouverture du panneau sous 1000 px : Échap le referme et rend le focus au
 * bouton « Filtres ». Les éléments ramenés dans la vue (focus clavier, case
 * cochée) s'arrêtent sous l'en-tête (77 px) et la barre collants.
 */
export function usePanneauFiltres() {
  const id = useId();
  const [ouvert, setOuvert] = useState(false);
  const refBouton = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const racine = document.documentElement;
    const avant = racine.style.scrollPaddingTop;
    racine.style.scrollPaddingTop = "calc(77px + 9rem)";
    return () => { racine.style.scrollPaddingTop = avant; };
  }, []);

  useEffect(() => {
    if (!ouvert) return;
    const surTouche = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || window.matchMedia(COLONNE).matches) return;
      setOuvert(false);
      refBouton.current?.focus();
    };
    document.addEventListener("keydown", surTouche);
    return () => document.removeEventListener("keydown", surTouche);
  }, [ouvert]);

  return {
    idPanneau: id,
    ouvert,
    refBouton,
    basculer: () => setOuvert((o) => !o),
  };
}
