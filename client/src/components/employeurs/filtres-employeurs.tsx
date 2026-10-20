import { basculerValeur, GroupeCases, GroupeSecteurs, PanneauFiltres, type OptionFiltre, type Unite } from "@/components/listes/filtres-liste";

const EMPLOYEURS: Unite = ["employeur", "employeurs"];

export type SelectionEmployeurs = { secteurs: string[]; pays: string[]; avecOffres: boolean };

export function nombreFiltresActifs(s: SelectionEmployeurs): number {
  return s.secteurs.length + s.pays.length + (s.avecOffres ? 1 : 0);
}

/**
 * Panneau des filtres de la page Employeurs : secteur d'activité, pays,
 * offres en cours. Pas de filtre « vérifié » : le badge est une information
 * de la carte.
 */
export function FiltresEmployeurs({ id, ouvert, facettes, selection, onSelection, onReinitialiser }: {
  id: string;
  ouvert: boolean;
  facettes: { secteurs: OptionFiltre[]; pays: OptionFiltre[]; avecOffres: number };
  selection: SelectionEmployeurs;
  onSelection: (s: SelectionEmployeurs) => void;
  onReinitialiser: () => void;
}) {
  return (
    <PanneauFiltres id={id} ouvert={ouvert} nbActifs={nombreFiltresActifs(selection)} onReinitialiser={onReinitialiser}>
      <GroupeSecteurs options={facettes.secteurs} valeurs={selection.secteurs} onBasculer={(v) => onSelection({ ...selection, secteurs: basculerValeur(selection.secteurs, v) })} unite={EMPLOYEURS} />
      {facettes.pays.length > 0 && (
        <GroupeCases titre="Pays" options={facettes.pays} valeurs={selection.pays} onBasculer={(v) => onSelection({ ...selection, pays: basculerValeur(selection.pays, v) })} unite={EMPLOYEURS} testId="groupe-pays" />
      )}
      <GroupeCases
        titre="Offres"
        options={[{ valeur: "en-cours", libelle: "Avec des offres en cours", nombre: facettes.avecOffres }]}
        valeurs={selection.avecOffres ? ["en-cours"] : []}
        onBasculer={() => onSelection({ ...selection, avecOffres: !selection.avecOffres })}
        unite={EMPLOYEURS}
        testId="groupe-offres"
      />
    </PanneauFiltres>
  );
}
