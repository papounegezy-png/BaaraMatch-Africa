import { correspondTexte, normaliserTexte } from "./filtre-offres";
import { formatJobTitle } from "./format-job-title";
import { SECTEURS } from "./secteurs";

// Filtrage de la page Employeurs, partagé par GET /api/employeurs (serveur)
// et les tests. Même normalisation que la page Offres : « BAMAKO »,
// « Bamako » et « bamako » sont une seule valeur.

/** Minuscules, sans accents ni espaces superflus : pour chercher et comparer. */
export const normaliser = normaliserTexte;

/** Ville ou pays à afficher : « BAMAKO » → « Bamako », espaces retirées. */
export function libelleLieuSimple(valeur: string | null | undefined): string {
  return formatJobTitle((valeur ?? "").trim().replace(/\s+/g, " "));
}

export type ValeurRegroupee = { valeur: string; libelle: string; nombre: number };

/**
 * Valeurs distinctes d'une liste (villes, pays), regroupées par forme
 * normalisée ; libellé : la graphie la plus fréquente, remise en forme.
 * Triées par nombre décroissant puis par libellé. Les vides sont ignorés.
 */
export function regrouperValeurs(valeurs: (string | null | undefined)[]): ValeurRegroupee[] {
  const groupes = new Map<string, { graphies: Map<string, number>; nombre: number }>();
  for (const brute of valeurs) {
    const cle = normaliser(brute);
    if (!cle) continue;
    const g = groupes.get(cle) ?? { graphies: new Map<string, number>(), nombre: 0 };
    const graphie = (brute ?? "").trim().replace(/\s+/g, " ");
    g.graphies.set(graphie, (g.graphies.get(graphie) ?? 0) + 1);
    g.nombre++;
    groupes.set(cle, g);
  }
  return Array.from(groupes.entries())
    .map(([valeur, g]) => ({
      valeur,
      libelle: libelleLieuSimple(Array.from(g.graphies.entries()).sort((a, b) => b[1] - a[1])[0][0]),
      nombre: g.nombre,
    }))
    .sort((a, b) => b.nombre - a.nombre || a.libelle.localeCompare(b.libelle, "fr"));
}

export type TypeChoisi = "entreprise" | "agence" | null;

export type CriteresEmployeurs = {
  recherche?: string;
  lieu?: string;
  type?: TypeChoisi;
  // Un secteur coché suffit (sélection multiple).
  secteurs?: string[];
  // Clés normalisées (normaliser) des pays cochés.
  pays?: string[];
  avecOffres?: boolean;
};

type EmployeurFiltrable = { nom: string; type: "entreprise" | "agence"; ville?: string; pays?: string; secteur?: string; offresPubliees: number };

/**
 * Recherche sur le nom, lieu sur la ville ou le pays (chaque mot doit
 * apparaître), puis type, secteurs, pays et offres en cours.
 */
export function filtrerEmployeurs<E extends EmployeurFiltrable>(liste: E[], c: CriteresEmployeurs): E[] {
  return liste.filter((e) =>
    (!c.type || e.type === c.type)
    && (!c.recherche || correspondTexte(c.recherche, [e.nom]))
    && (!c.lieu || correspondTexte(c.lieu, [e.ville, e.pays]))
    && (!c.secteurs?.length || (!!e.secteur && c.secteurs.includes(e.secteur)))
    && (!c.pays?.length || c.pays.includes(normaliser(e.pays)))
    && (!c.avecOffres || e.offresPubliees > 0));
}

/**
 * Compteurs du panneau. Chaque groupe
 * est compté avec tous les autres critères, mais sans le sien.
 */
export function facettesEmployeurs(liste: EmployeurFiltrable[], c: CriteresEmployeurs) {
  const sansSecteurs = filtrerEmployeurs(liste, { ...c, secteurs: [] });
  const sansPays = filtrerEmployeurs(liste, { ...c, pays: [] });
  const sansOffres = filtrerEmployeurs(liste, { ...c, avecOffres: false });
  const parPays = new Map<string, number>();
  for (const e of sansPays) parPays.set(normaliser(e.pays), (parPays.get(normaliser(e.pays)) ?? 0) + 1);
  return {
    secteurs: SECTEURS.map((s) => ({ valeur: s, libelle: s, nombre: sansSecteurs.filter((e) => e.secteur === s).length })),
    // Pays présents dans les données (tous, même à 0 avec les filtres actifs).
    pays: regrouperValeurs(liste.map((e) => e.pays))
      .map((p) => ({ ...p, nombre: parPays.get(p.valeur) ?? 0 }))
      .sort((a, b) => b.nombre - a.nombre || a.libelle.localeCompare(b.libelle, "fr")),
    avecOffres: sansOffres.filter((e) => e.offresPubliees > 0).length,
  };
}

/** Nombre d'employeurs par type, tous les autres critères appliqués. */
export function compterParType(liste: EmployeurFiltrable[], c: CriteresEmployeurs): Record<"tous" | "entreprise" | "agence", number> {
  const base = filtrerEmployeurs(liste, { ...c, type: null });
  return {
    tous: base.length,
    entreprise: base.filter((e) => e.type === "entreprise").length,
    agence: base.filter((e) => e.type === "agence").length,
  };
}
