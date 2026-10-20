import { useId, useState, useSyncExternalStore } from "react";
import { NB_SECTEURS_INITIAL } from "@shared/secteurs";
import { PERIODES_PUBLICATION, type OptionFiltre } from "@/lib/filtre-offres";

const lienTexte =
  "inline-flex min-h-11 items-center rounded-sm font-texte text-[15px] font-semibold text-baara-bleu underline underline-offset-4 hover:text-baara-marine " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu dark:text-baara-moyen dark:hover:text-white";

const titreGroupe = "font-titre text-[17px] font-bold text-baara-marine dark:text-white";

function CaseFiltre({ option, coche, onBasculer }: { option: OptionFiltre; coche: boolean; onBasculer: () => void }) {
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
        <span className="sr-only"> ({option.nombre} {option.nombre > 1 ? "offres" : "offre"})</span>
      </label>
    </li>
  );
}

function GroupeCases({ titre, options, valeurs, onBasculer }: { titre: string; options: OptionFiltre[]; valeurs: string[]; onBasculer: (v: string) => void }) {
  return (
    <fieldset className="border-t-2 border-baara-marine pt-4 dark:border-white/50">
      <legend className="sr-only">{titre}</legend>
      <h3 aria-hidden="true" className={titreGroupe}>{titre}</h3>
      <ul className="mt-2">
        {options.map((o) => <CaseFiltre key={o.valeur} option={o} coche={valeurs.includes(o.valeur)} onBasculer={() => onBasculer(o.valeur)} />)}
      </ul>
    </fieldset>
  );
}

/**
 * Secteurs : 32 secteurs dans un conteneur défilant ; les 10 premiers
 * d'abord, « Voir plus » affiche les 32. Un secteur coché au-delà des 10
 * premiers reste affiché après « Voir moins ».
 */
function GroupeSecteurs({ options, valeurs, onBasculer }: { options: OptionFiltre[]; valeurs: string[]; onBasculer: (v: string) => void }) {
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
        {visibles.map((o) => <CaseFiltre key={o.valeur} option={o} coche={valeurs.includes(o.valeur)} onBasculer={() => onBasculer(o.valeur)} />)}
      </ul>
      <button type="button" aria-expanded={tous} aria-controls={idListe} onClick={() => setTous((t) => !t)} className={`${lienTexte} mt-1`} data-testid="bouton-voir-secteurs">
        {tous ? "Voir moins" : "Voir plus"}
      </button>
    </div>
  );
}

export type SelectionFiltres = { secteurs: string[]; villes: string[]; experiences: string[]; publieeDepuisJours: number | null };

export function nombreFiltresActifs(s: SelectionFiltres): number {
  return s.secteurs.length + s.villes.length + s.experiences.length + (s.publieeDepuisJours ? 1 : 0);
}

/**
 * Panneau des filtres de la page Offres. Colonne de gauche dès 1000 px ;
 * en dessous, carte repliée qui s'ouvre sous la barre de contrat (bouton
 * « Filtres », ou Échap pour fermer, géré par la page).
 */
// Dès 1000 px, le panneau est une colonne toujours visible.
const COLONNE = "(min-width: 1000px)";
const abonner = (rappel: () => void) => {
  const m = window.matchMedia(COLONNE);
  m.addEventListener("change", rappel);
  return () => m.removeEventListener("change", rappel);
};
const enColonne = () => window.matchMedia(COLONNE).matches;

export function FiltresOffres({ id, ouvert, facettes, selection, onSelection, onReinitialiser }: {
  id: string;
  ouvert: boolean;
  facettes: { secteurs: OptionFiltre[]; villes: OptionFiltre[]; experiences: OptionFiltre[] };
  selection: SelectionFiltres;
  onSelection: (s: SelectionFiltres) => void;
  onReinitialiser: () => void;
}) {
  const idDate = useId();
  const nb = nombreFiltresActifs(selection);
  // Panneau fermé sous 1000 px : son contenu (une soixantaine de cases)
  // n'est construit qu'à l'ouverture, pour alléger le premier affichage.
  const visible = useSyncExternalStore(abonner, enColonne, () => true) || ouvert;
  const basculer = (cle: "secteurs" | "villes" | "experiences") => (v: string) =>
    onSelection({ ...selection, [cle]: selection[cle].includes(v) ? selection[cle].filter((x) => x !== v) : [...selection[cle], v] });

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
        {nb > 0 && <span className="font-texte text-sm font-semibold text-baara-texte dark:text-slate-300" data-testid="filtres-appliques">Appliqués ({nb})</span>}
      </div>
      <button type="button" onClick={onReinitialiser} className={lienTexte} data-testid="bouton-reinitialiser-filtres">Réinitialiser</button>

      <div className="mt-4 space-y-6">
        <GroupeSecteurs options={facettes.secteurs} valeurs={selection.secteurs} onBasculer={basculer("secteurs")} />
        {facettes.villes.length > 0 && <GroupeCases titre="Ville" options={facettes.villes} valeurs={selection.villes} onBasculer={basculer("villes")} />}
        <GroupeCases titre="Expérience" options={facettes.experiences} valeurs={selection.experiences} onBasculer={basculer("experiences")} />
        <div className="border-t-2 border-baara-marine pt-4 dark:border-white/50">
          <label htmlFor={idDate} className={`${titreGroupe} block`}>Publiée</label>
          <select
            id={idDate}
            value={selection.publieeDepuisJours ?? ""}
            onChange={(e) => onSelection({ ...selection, publieeDepuisJours: e.target.value ? Number(e.target.value) : null })}
            className="mt-3 h-12 w-full rounded-xl border border-baara-marine/35 bg-white px-3 font-texte text-[15px] text-baara-marine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu dark:border-white/30 dark:bg-white/5 dark:text-white"
            data-testid="select-publication"
          >
            {PERIODES_PUBLICATION.map((p) => <option key={p.libelle} value={p.jours ?? ""}>{p.libelle}</option>)}
          </select>
        </div>
      </div>
      </>}
    </aside>
  );
}
