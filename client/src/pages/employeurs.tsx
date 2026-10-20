import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { EnteteAccueil } from "@/components/home/entete-accueil";
import { BandeauEmployeurs, BarreType, RechercheEmployeurs } from "@/components/employeurs/haut-employeurs";
import { FiltresEmployeurs, nombreFiltresActifs, type SelectionEmployeurs } from "@/components/employeurs/filtres-employeurs";
import { AfficherPlus, AucunEmployeur, EnTeteEmployeurs, ErreurEmployeurs, SquelettesEmployeurs } from "@/components/employeurs/resultats-employeurs";
import { usePanneauFiltres } from "@/components/listes/filtres-liste";
import { CarteEmployeur } from "@/components/employeurs/carte-employeur";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { useAuth } from "@/lib/auth";
import { compterParType, facettesEmployeurs, filtrerEmployeurs } from "@/lib/employeurs";
import { adresseDepuisEtat, ETAT_VIDE, etatDepuisAdresse, TAILLE_PAGE, trierEmployeurs, type EtatEmployeurs } from "@/lib/etat-employeurs";
import type { Secteur } from "@shared/secteurs";
import {
  agenceVersEmployeur, entrepriseVersEmployeur, offresParEmployeur,
  type AgenceApi, type EntrepriseApi, type OffreResumeApi,
} from "@/types/employeur";

/**
 * Page Employeurs (/agencies), refonte d'après la maquette « Page
 * Employeurs ». Tout l'état (recherche, type, filtres, tri) vit dans
 * l'adresse : la frappe la remplace (replaceState), les autres changements
 * ajoutent une entrée d'historique (pushState) que le bouton Retour restaure.
 * Filtrage, compteurs et pagination se font sur les employeurs chargés.
 */
export default function EmployeursPage() {
  const { user } = useAuth();
  const [etat, setEtat] = useState<EtatEmployeurs>(() => etatDepuisAdresse(window.location.search));
  const historique = useRef<"push" | "replace">("replace");
  const panneau = usePanneauFiltres();

  const modifier = useCallback((changement: Partial<EtatEmployeurs>, mode: "push" | "replace" = "push") => {
    historique.current = mode;
    setEtat((e) => ({ ...e, ...changement }));
  }, []);

  const adresse = adresseDepuisEtat(etat);
  useEffect(() => {
    if (adresse === window.location.search) return;
    const url = window.location.pathname + adresse;
    if (historique.current === "push") window.history.pushState(null, "", url);
    else window.history.replaceState(window.history.state, "", url);
  }, [adresse]);

  useEffect(() => {
    const surRetour = () => setEtat(etatDepuisAdresse(window.location.search));
    window.addEventListener("popstate", surRetour);
    return () => window.removeEventListener("popstate", surRetour);
  }, []);

  const agences = useQuery<AgenceApi[]>({ queryKey: ["/api/agencies"] });
  const entreprises = useQuery<EntrepriseApi[]>({ queryKey: ["/api/companies"] });
  const offres = useQuery<OffreResumeApi[]>({ queryKey: ["/api/jobs"] });
  const requetes = [agences, entreprises, offres];
  const chargement = requetes.some((q) => q.isLoading || (q.isFetching && !q.data));
  const erreur = requetes.some((q) => q.isError) && !requetes.some((q) => q.isFetching);
  const reessayer = () => requetes.forEach((q) => { if (q.isError) q.refetch(); });

  const employeurs = useMemo(() => {
    const parId = offresParEmployeur(offres.data ?? []);
    return [
      ...(entreprises.data ?? []).map((e) => entrepriseVersEmployeur(e, parId)),
      ...(agences.data ?? []).map((a) => agenceVersEmployeur(a, parId)),
    ];
  }, [agences.data, entreprises.data, offres.data]);

  const resultats = useMemo(() => trierEmployeurs(filtrerEmployeurs(employeurs, etat), etat.tri), [employeurs, etat]);
  const comptes = useMemo(() => compterParType(employeurs, etat), [employeurs, etat]);
  const compteurs = useMemo(() => facettesEmployeurs(employeurs, etat), [employeurs, etat]);

  const selection: SelectionEmployeurs = { secteurs: etat.secteurs, pays: etat.pays, avecOffres: etat.avecOffres };
  const choisirFiltres = (s: SelectionEmployeurs) => modifier({ ...s, secteurs: s.secteurs as Secteur[] });
  const reinitialiserFiltres = () => modifier({ secteurs: [], pays: [], avecOffres: false });
  const toutReinitialiser = () => modifier({ ...ETAT_VIDE, tri: etat.tri });

  // « Afficher plus » : 12 de plus à chaque fois ; tout changement de
  // recherche, de filtre ou de tri revient aux 12 premiers.
  const [affichage, setAffichage] = useState({ cle: adresse, nombre: TAILLE_PAGE });
  const nombreAffiches = affichage.cle === adresse ? affichage.nombre : TAILLE_PAGE;
  const visibles = resultats.slice(0, nombreAffiches);
  const liste = useRef<HTMLUListElement>(null);
  const afficherPlus = () => {
    const premierNouveau = nombreAffiches;
    setAffichage({ cle: adresse, nombre: nombreAffiches + TAILLE_PAGE });
    // Le focus passe à la première carte ajoutée (le bouton peut disparaître).
    requestAnimationFrame(() => liste.current?.children[premierNouveau]?.querySelector<HTMLElement>("a")?.focus());
  };

  return (
    <div className="min-h-screen bg-baara-papier pb-20 dark:bg-baara-profond lg:pb-0">
      <EnteteAccueil />
      <BandeauEmployeurs>
        <RechercheEmployeurs
          recherche={etat.recherche}
          lieu={etat.lieu}
          onRecherche={(recherche) => modifier({ recherche }, "replace")}
          onLieu={(lieu) => modifier({ lieu }, "replace")}
        />
      </BandeauEmployeurs>
      <BarreType
        type={etat.type}
        comptes={comptes}
        onType={(type) => modifier({ type })}
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
          onSelection={choisirFiltres}
          onReinitialiser={reinitialiserFiltres}
        />
        <div className="min-w-0">
          {erreur ? (
            <ErreurEmployeurs onReessayer={reessayer} />
          ) : chargement ? (
            <SquelettesEmployeurs />
          ) : (
            <>
              <EnTeteEmployeurs total={resultats.length} tri={etat.tri} onTri={(tri) => modifier({ tri })} />
              {resultats.length === 0 ? (
                <AucunEmployeur onReinitialiser={toutReinitialiser} />
              ) : (
                <>
                  {/* Deux colonnes égales dès 640 px ; cartes d'une ligne à la même
                      hauteur. La clé relance l'entrée douce quand la liste change. */}
                  <ul
                    ref={liste}
                    key={adresse}
                    className="grid gap-3 motion-safe:animate-entree-resultats min-[640px]:grid-cols-2 min-[900px]:gap-4"
                    data-testid="liste-employeurs"
                  >
                    {visibles.map((e) => (
                      <li key={`${e.type}-${e.id}`} className="min-w-0">
                        <CarteEmployeur employeur={e} />
                      </li>
                    ))}
                  </ul>
                  <AfficherPlus affiches={visibles.length} total={resultats.length} onPlus={afficherPlus} />
                </>
              )}
            </>
          )}
        </div>
      </div>
      {user && <MobileBottomNav userType={user.userType} />}
    </div>
  );
}
