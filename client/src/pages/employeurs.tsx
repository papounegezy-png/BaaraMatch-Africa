import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { EnteteAccueil } from "@/components/home/entete-accueil";
import { BandeauEmployeurs, BarreType, RechercheEmployeurs } from "@/components/employeurs/haut-employeurs";
import { FiltresEmployeurs, nombreFiltresActifs, type SelectionEmployeurs } from "@/components/employeurs/filtres-employeurs";
import { AfficherPlus, AucunEmployeur, EnTeteEmployeurs, ErreurEmployeurs, SquelettesEmployeurs } from "@/components/employeurs/resultats-employeurs";
import { usePanneauFiltres } from "@/components/listes/filtres-liste";
import { CarteEmployeur } from "@/components/employeurs/carte-employeur";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { useAuth } from "@/lib/auth";
import { adresseDepuisEtat, ETAT_VIDE, etatDepuisAdresse, TAILLE_PAGE, type EtatEmployeurs } from "@/lib/etat-employeurs";
import type { Secteur } from "@shared/secteurs";
import type { ReponseEmployeurs } from "@shared/recherche-employeurs";

declare global {
  // Recherche lancée par index.html ; donnees est renseigné à son arrivée.
  interface Window { __employeursPrecharges?: { adresse: string; json: Promise<ReponseEmployeurs>; donnees?: ReponseEmployeurs } }
}

const prechargee = (adresse: string, taille: number) => {
  const p = window.__employeursPrecharges;
  return p && p.adresse === adresse && taille === TAILLE_PAGE ? p : undefined;
};

async function chargerEmployeurs(adresse: string, taille: number): Promise<ReponseEmployeurs> {
  // Première recherche lancée par index.html, si elle porte sur la même
  // adresse ; utilisée une seule fois.
  const p = prechargee(adresse, taille);
  window.__employeursPrecharges = undefined;
  if (p) {
    try {
      return await p.json;
    } catch {
      // Nouvel essai ci-dessous.
    }
  }
  const parametres = new URLSearchParams(adresse);
  parametres.set("taille", String(taille));
  const reponse = await fetch(`/api/employeurs?${parametres}`, { credentials: "include" });
  if (!reponse.ok) throw new Error(`${reponse.status}`);
  return reponse.json();
}

const AUCUN_TYPE = { tous: 0, entreprise: 0, agence: 0 };

/**
 * Page Employeurs (/agencies), refonte d'après la maquette « Page
 * Employeurs ». Tout l'état (recherche, type, filtres, tri) vit dans
 * l'adresse : la frappe la remplace (replaceState), les autres changements
 * ajoutent une entrée d'historique (pushState) que le bouton Retour restaure.
 * Recherche, compteurs, tri et pagination : GET /api/employeurs.
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


  const selection: SelectionEmployeurs = { secteurs: etat.secteurs, pays: etat.pays, avecOffres: etat.avecOffres };
  const choisirFiltres = (s: SelectionEmployeurs) => modifier({ ...s, secteurs: s.secteurs as Secteur[] });
  const reinitialiserFiltres = () => modifier({ secteurs: [], pays: [], avecOffres: false });
  const toutReinitialiser = () => modifier({ ...ETAT_VIDE, tri: etat.tri });

  // « Afficher plus » : 12 de plus à chaque fois ; tout changement de
  // recherche, de filtre ou de tri revient aux 12 premiers.
  const [affichage, setAffichage] = useState({ cle: adresse, nombre: TAILLE_PAGE });
  const nombreAffiches = affichage.cle === adresse ? affichage.nombre : TAILLE_PAGE;

  // La liste précédente reste affichée pendant le chargement de la suivante.
  const { data, isLoading, isError, isFetching, isPlaceholderData, refetch } = useQuery({
    queryKey: ["/api/employeurs", adresse, nombreAffiches],
    queryFn: () => chargerEmployeurs(adresse, nombreAffiches),
    // Déjà arrivée (préchargement d'index.html) : affichée dès le premier
    // rendu, sans passer par les cartes fantômes.
    initialData: () => prechargee(adresse, nombreAffiches)?.donnees,
    placeholderData: keepPreviousData,
  });
  const visibles = data?.employeurs ?? [];
  const total = data?.total ?? 0;
  const comptes = data?.facettes.types ?? AUCUN_TYPE;
  const compteurs = useMemo(
    () => ({ secteurs: data?.facettes.secteurs ?? [], pays: data?.facettes.pays ?? [], avecOffres: data?.facettes.avecOffres ?? 0 }),
    [data],
  );

  // Après « Afficher plus », le focus passe à la première carte ajoutée,
  // une fois arrivée (le bouton peut disparaître).
  const liste = useRef<HTMLUListElement>(null);
  const aFocaliser = useRef<number | null>(null);
  useEffect(() => {
    const i = aFocaliser.current;
    if (i == null || isPlaceholderData || visibles.length <= i) return;
    aFocaliser.current = null;
    liste.current?.children[i]?.querySelector<HTMLElement>("a")?.focus();
  }, [visibles, isPlaceholderData]);
  const afficherPlus = () => {
    aFocaliser.current = nombreAffiches;
    setAffichage({ cle: adresse, nombre: nombreAffiches + TAILLE_PAGE });
  };

  return (
    <div className="min-h-screen bg-baara-papier pb-20 dark:bg-baara-profond lg:pb-0">
      <EnteteAccueil />
      <main id="contenu" tabIndex={-1} className="focus:outline-none">
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
          {isError && !isFetching ? (
            <ErreurEmployeurs onReessayer={() => refetch()} />
          ) : isLoading || !data ? (
            <SquelettesEmployeurs />
          ) : (
            <div aria-busy={isPlaceholderData}>
              <EnTeteEmployeurs total={total} tri={etat.tri} onTri={(tri) => modifier({ tri })} />
              {total === 0 ? (
                <AucunEmployeur onReinitialiser={toutReinitialiser} />
              ) : (
                <>
                  {/* Deux colonnes égales dès 640 px ; cartes d'une ligne à la même
                      hauteur. La clé (12 premières cartes) relance l'entrée douce quand la liste reçue change. */}
                  <ul
                    ref={liste}
                    key={visibles.slice(0, TAILLE_PAGE).map((e) => e.id).join(",")}
                    className="grid gap-3 motion-safe:animate-entree-resultats min-[640px]:grid-cols-2 min-[900px]:gap-4"
                    data-testid="liste-employeurs"
                  >
                    {visibles.map((e) => (
                      <li key={`${e.type}-${e.id}`} className="min-w-0">
                        <CarteEmployeur employeur={e} />
                      </li>
                    ))}
                  </ul>
                  <AfficherPlus affiches={visibles.length} total={total} onPlus={afficherPlus} />
                </>
              )}
            </div>
          )}
        </div>
      </div>
      </main>
      {user && <MobileBottomNav userType={user.userType} />}
    </div>
  );
}
