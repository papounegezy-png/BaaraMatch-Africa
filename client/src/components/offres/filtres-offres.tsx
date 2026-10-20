import { useId } from "react";
import { PERIODES_PUBLICATION, type OptionFiltre } from "@/lib/filtre-offres";
import { basculerValeur, GroupeCases, GroupeSecteurs, PanneauFiltres, titreGroupe, type Unite } from "@/components/listes/filtres-liste";

const OFFRES: Unite = ["offre", "offres"];

export type SelectionFiltres = { secteurs: string[]; villes: string[]; experiences: string[]; publieeDepuisJours: number | null };

export function nombreFiltresActifs(s: SelectionFiltres): number {
  return s.secteurs.length + s.villes.length + s.experiences.length + (s.publieeDepuisJours ? 1 : 0);
}

/** Panneau des filtres de la page Offres : secteur, ville, expérience, date. */
export function FiltresOffres({ id, ouvert, facettes, selection, onSelection, onReinitialiser }: {
  id: string;
  ouvert: boolean;
  facettes: { secteurs: OptionFiltre[]; villes: OptionFiltre[]; experiences: OptionFiltre[] };
  selection: SelectionFiltres;
  onSelection: (s: SelectionFiltres) => void;
  onReinitialiser: () => void;
}) {
  const idDate = useId();
  const basculer = (cle: "secteurs" | "villes" | "experiences") => (v: string) =>
    onSelection({ ...selection, [cle]: basculerValeur(selection[cle], v) });

  return (
    <PanneauFiltres id={id} ouvert={ouvert} nbActifs={nombreFiltresActifs(selection)} onReinitialiser={onReinitialiser}>
      <GroupeSecteurs options={facettes.secteurs} valeurs={selection.secteurs} onBasculer={basculer("secteurs")} unite={OFFRES} />
      {facettes.villes.length > 0 && <GroupeCases titre="Ville" options={facettes.villes} valeurs={selection.villes} onBasculer={basculer("villes")} unite={OFFRES} />}
      <GroupeCases titre="Expérience" options={facettes.experiences} valeurs={selection.experiences} onBasculer={basculer("experiences")} unite={OFFRES} />
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
    </PanneauFiltres>
  );
}
