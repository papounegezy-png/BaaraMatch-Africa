import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { EnteteAccueil } from "@/components/home/entete-accueil";
import { BandeauEmployeurs, BarreType, RechercheEmployeurs } from "@/components/employeurs/haut-employeurs";
import { FiltresEmployeurs, nombreFiltresActifs, SELECTION_VIDE, type SelectionEmployeurs } from "@/components/employeurs/filtres-employeurs";
import { usePanneauFiltres } from "@/components/listes/filtres-liste";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { useAuth } from "@/lib/auth";
import { compterParType, facettesEmployeurs, filtrerEmployeurs, libelleLieu, type TypeChoisi } from "@/lib/employeurs";
import {
  agenceVersEmployeur, entrepriseVersEmployeur, lienProfil, offresParEmployeur,
  type AgenceApi, type EntrepriseApi, type OffreResumeApi,
} from "@/types/employeur";

/** Page Employeurs (/agencies), refonte d'après la maquette « Page Employeurs ». */
export default function EmployeursPage() {
  const { user } = useAuth();
  const [recherche, setRecherche] = useState("");
  const [lieu, setLieu] = useState("");
  const [type, setType] = useState<TypeChoisi>(null);
  const [selection, setSelection] = useState<SelectionEmployeurs>(SELECTION_VIDE);
  const panneau = usePanneauFiltres();

  const agences = useQuery<AgenceApi[]>({ queryKey: ["/api/agencies"] });
  const entreprises = useQuery<EntrepriseApi[]>({ queryKey: ["/api/companies"] });
  const offres = useQuery<OffreResumeApi[]>({ queryKey: ["/api/jobs"] });

  const employeurs = useMemo(() => {
    const parId = offresParEmployeur(offres.data ?? []);
    return [
      ...(entreprises.data ?? []).map((e) => entrepriseVersEmployeur(e, parId)),
      ...(agences.data ?? []).map((a) => agenceVersEmployeur(a, parId)),
    ];
  }, [agences.data, entreprises.data, offres.data]);

  const criteres = useMemo(() => ({ recherche, lieu, type, ...selection }), [recherche, lieu, type, selection]);
  const resultats = useMemo(() => filtrerEmployeurs(employeurs, criteres), [employeurs, criteres]);
  const comptes = useMemo(() => compterParType(employeurs, criteres), [employeurs, criteres]);
  const compteurs = useMemo(() => facettesEmployeurs(employeurs, criteres), [employeurs, criteres]);
  const chargement = agences.isLoading || entreprises.isLoading || offres.isLoading;

  return (
    <div className="min-h-screen bg-baara-papier pb-20 dark:bg-baara-profond lg:pb-0">
      <EnteteAccueil />
      <BandeauEmployeurs>
        <RechercheEmployeurs recherche={recherche} lieu={lieu} onRecherche={setRecherche} onLieu={setLieu} />
      </BandeauEmployeurs>
      <BarreType
        type={type}
        comptes={comptes}
        onType={setType}
        nbFiltresActifs={nombreFiltresActifs(selection)}
        filtresOuverts={panneau.ouvert}
        onBasculerFiltres={panneau.basculer}
        idPanneauFiltres={panneau.idPanneau}
        refBoutonFiltres={panneau.refBouton}
      />
      {/* Dès 1000 px : filtres en colonne de 230 px à gauche, résultats à droite. */}
      <div className="container mx-auto grid gap-6 px-4 py-8 min-[1000px]:grid-cols-[230px_minmax(0,1fr)] min-[1000px]:gap-10">
        <FiltresEmployeurs
          id={panneau.idPanneau}
          ouvert={panneau.ouvert}
          facettes={compteurs}
          selection={selection}
          onSelection={setSelection}
          onReinitialiser={() => setSelection(SELECTION_VIDE)}
        />
        <div className="min-w-0">
        {/* Liste provisoire : grille de cartes, filtres et pagination arrivent aux prompts 3 à 5. */}
        {chargement ? (
          <p role="status" className="font-texte text-baara-texte">Chargement des employeurs…</p>
        ) : (
          <>
            <p role="status" className="mb-4 font-texte text-baara-texte dark:text-slate-300" data-testid="nombre-employeurs">
              {resultats.length} {resultats.length > 1 ? "employeurs" : "employeur"}
            </p>
            <ul className="divide-y divide-baara-trait dark:divide-white/10" data-testid="liste-employeurs">
              {resultats.map((e) => (
                <li key={`${e.type}-${e.id}`}>
                  <Link href={lienProfil(e)} className="flex min-h-11 flex-wrap items-baseline gap-x-3 py-2 font-texte text-baara-marine hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu dark:text-white">
                    <span className="font-semibold">{e.nom}</span>
                    <span className="text-sm text-baara-texte dark:text-slate-300">
                      {[e.type === "agence" ? "Agence" : "Entreprise", libelleLieu(e.ville, e.pays)].filter(Boolean).join(" · ")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
        </div>
      </div>
      {user && <MobileBottomNav userType={user.userType} />}
    </div>
  );
}
