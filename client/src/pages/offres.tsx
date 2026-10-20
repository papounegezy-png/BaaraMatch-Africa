import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { EnteteAccueil } from "@/components/home/entete-accueil";
import { BandeauOffres } from "@/components/offres/bandeau-offres";
import { RechercheOffres } from "@/components/offres/recherche-offres";
import { BarreContrat } from "@/components/offres/barre-contrat";
import { CarteOffre } from "@/components/offres/carte-offre";
import { AucuneOffre, EnTeteResultats, ErreurOffres, PaginationOffres, SquelettesOffres } from "@/components/offres/resultats-offres";
import { useSavedJobs } from "@/hooks/use-saved-jobs";
import { FiltresOffres, nombreFiltresActifs, type SelectionFiltres } from "@/components/offres/filtres-offres";
import { usePanneauFiltres } from "@/components/listes/filtres-liste";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { useAuth } from "@/lib/auth";
import { adresseDepuisEtat, etatDepuisAdresse, type EtatOffres } from "@/lib/etat-offres";
import type { Secteur } from "@shared/secteurs";
import type { ReponseOffres } from "@shared/recherche-offres";

const AUCUN_COMPTE = { toutes: 0, CDI: 0, CDD: 0, Freelance: 0 };

declare global {
  // Recherche lancée par index.html ; donnees est renseigné à son arrivée.
  interface Window { __offresPrechargees?: { adresse: string; json: Promise<ReponseOffres>; donnees?: ReponseOffres } }
}

async function chargerOffres(adresse: string): Promise<ReponseOffres> {
  // Première recherche lancée par index.html, si elle porte sur la même
  // adresse ; utilisée une seule fois.
  const prechargee = window.__offresPrechargees;
  window.__offresPrechargees = undefined;
  if (prechargee?.adresse === adresse) {
    try {
      return await prechargee.json;
    } catch {
      // Nouvel essai ci-dessous.
    }
  }
  const reponse = await fetch(`/api/offres${adresse}`, { credentials: "include" });
  if (!reponse.ok) throw new Error(`${reponse.status}`);
  return reponse.json();
}

/**
 * Page Offres (/jobs), refonte d'après la maquette « Page Offres ».
 * Tout l'état (recherche, filtres, page) vit dans l'adresse : la frappe la
 * remplace (replaceState), les autres changements ajoutent une entrée
 * d'historique (pushState) que le bouton Retour restaure.
 */
export default function OffresPage() {
  const { user } = useAuth();
  const [etat, setEtat] = useState<EtatOffres>(() => etatDepuisAdresse(window.location.search));
  const historique = useRef<"push" | "replace">("replace");
  const [, setLocation] = useLocation();
  const { savedJobIds, toggleSave } = useSavedJobs();

  /** Change l'état ; tout changement autre que la page revient à la page 1. */
  const modifier = useCallback((changement: Partial<EtatOffres>, mode: "push" | "replace" = "push") => {
    historique.current = mode;
    setEtat((e) => ({ ...e, page: 1, ...changement }));
  }, []);

  useEffect(() => {
    const adresse = adresseDepuisEtat(etat);
    if (adresse === window.location.search) return;
    const url = window.location.pathname + adresse;
    if (historique.current === "push") window.history.pushState(null, "", url);
    else window.history.replaceState(window.history.state, "", url);
  }, [etat]);

  useEffect(() => {
    const surRetour = () => setEtat(etatDepuisAdresse(window.location.search));
    window.addEventListener("popstate", surRetour);
    return () => window.removeEventListener("popstate", surRetour);
  }, []);

  // Enregistrer : réservé aux candidats (/api/saved-jobs). Un visiteur est
  // envoyé à la connexion puis ramené ici, filtres compris ; une entreprise
  // ou une agence ne voit pas le bouton.
  const peutEnregistrer = !user || user.userType === "candidate";
  const enregistrer = (id: string) => {
    if (!user) {
      setLocation(`/login?retour=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    toggleSave(id);
  };
  // Même fonction d'un rendu à l'autre : les cartes (memo) ne se
  // redessinent que si leur offre ou leur état « enregistrée » change.
  const refEnregistrer = useRef(enregistrer);
  refEnregistrer.current = enregistrer;
  const surEnregistrer = useCallback((id: string) => refEnregistrer.current(id), []);
  const selection: SelectionFiltres = {
    secteurs: etat.secteurs, villes: etat.villes, experiences: etat.experiences, publieeDepuisJours: etat.publieeDepuisJours,
  };
  const choisirFiltres = (s: SelectionFiltres) => modifier({ ...s, secteurs: s.secteurs as Secteur[] });
  const reinitialiserFiltres = () => modifier({ secteurs: [], villes: [], experiences: [], publieeDepuisJours: null });
  const toutReinitialiser = () => modifier({ recherche: "", lieu: "", contrat: null, employeur: null, secteurs: [], villes: [], experiences: [], publieeDepuisJours: null });

  // Panneau de filtres sous 1000 px (Échap, focus, défilement sous les barres).
  const panneau = usePanneauFiltres();

  // Recherche, facettes et pagination côté serveur (GET /api/offres), avec
  // les paramètres de l'adresse. La liste précédente reste affichée pendant
  // le chargement de la suivante.
  const adresse = adresseDepuisEtat(etat);
  const { data, isLoading, isError, refetch, isFetching, isPlaceholderData } = useQuery({
    queryKey: ["/api/offres", adresse],
    queryFn: () => chargerOffres(adresse),
    // Déjà arrivée (préchargement d'index.html) : affichée dès le premier
    // rendu, sans passer par les cartes fantômes.
    initialData: () => (window.__offresPrechargees?.adresse === adresse ? window.__offresPrechargees.donnees : undefined),
    placeholderData: keepPreviousData,
  });
  const comptes = data?.facettes.contrats ?? AUCUN_COMPTE;
  const compteurs = useMemo(
    () => ({ secteurs: data?.facettes.secteurs ?? [], villes: data?.facettes.villes ?? [], experiences: data?.facettes.experiences ?? [] }),
    [data],
  );
  const offresDeLaPage = data?.offres ?? [];
  const total = data?.total ?? 0;
  // Page au-delà de la dernière (adresse ancienne ou partagée) : le serveur
  // renvoie la dernière.
  const page = data?.page ?? etat.page;
  const nbPages = data?.nbPages ?? 1;

  const titreResultats = useRef<HTMLHeadingElement>(null);
  const changerDePage = (p: number) => {
    historique.current = "push";
    setEtat((e) => ({ ...e, page: p }));
    // Haut de la liste sous les barres collantes, focus sur son titre.
    requestAnimationFrame(() => {
      const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      titreResultats.current?.scrollIntoView({ behavior: reduit ? "auto" : "smooth", block: "start" });
      titreResultats.current?.focus({ preventScroll: true });
    });
  };

  return (
    <div className="min-h-screen bg-baara-papier pb-20 dark:bg-baara-profond lg:pb-0">
      <EnteteAccueil />
      <BandeauOffres>
        <RechercheOffres
          recherche={etat.recherche}
          lieu={etat.lieu}
          onRecherche={(recherche) => modifier({ recherche }, "replace")}
          onLieu={(lieu) => modifier({ lieu }, "replace")}
        />
      </BandeauOffres>
      <BarreContrat
        contrat={etat.contrat}
        comptes={comptes}
        onContrat={(contrat) => modifier({ contrat })}
        nbFiltresActifs={nombreFiltresActifs(selection)}
        refBoutonFiltres={panneau.refBouton}
        filtresOuverts={panneau.ouvert}
        onBasculerFiltres={panneau.basculer}
        idPanneauFiltres={panneau.idPanneau}
      />
      {/* Dès 1000 px : filtres en colonne de 250 px à gauche, résultats à droite. */}
      <div className="container mx-auto grid gap-6 px-4 py-8 min-[1000px]:grid-cols-[250px_minmax(0,1fr)] min-[1000px]:gap-10">
        <FiltresOffres
          id={panneau.idPanneau}
          ouvert={panneau.ouvert}
          facettes={compteurs}
          selection={selection}
          onSelection={choisirFiltres}
          onReinitialiser={reinitialiserFiltres}
        />
        <div className="min-w-0">
          {etat.employeur && (
            <p className="mb-5 flex flex-wrap items-center gap-3 font-texte text-baara-marine dark:text-white" data-testid="filtre-employeur">
              Offres de <strong>{etat.employeur.nom ?? "cet employeur"}</strong>
              <button type="button" onClick={() => modifier({ employeur: null })} className="min-h-11 rounded-sm font-semibold text-baara-bleu underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu dark:text-baara-moyen">
                Voir toutes les offres
              </button>
            </p>
          )}

          {isError && !isFetching ? (
            <ErreurOffres onReessayer={() => refetch()} />
          ) : isLoading || !data ? (
            <SquelettesOffres />
          ) : (
            <div aria-busy={isPlaceholderData}>
              <EnTeteResultats ref={titreResultats} page={page} total={total} />
              {total === 0 ? (
                <AucuneOffre onReinitialiser={toutReinitialiser} />
              ) : (
                <>
                  {/* La clé relance l'entrée douce quand la liste reçue change. */}
                  <ul key={`${page}:${offresDeLaPage.map((o) => o.id).join(",")}`} className={`space-y-4 transition-opacity motion-safe:animate-entree-resultats ${isPlaceholderData ? "opacity-60" : ""}`} data-testid="liste-offres">
                    {/* Cartes hors du premier écran : mises en page seulement à l'approche. */}
                    {offresDeLaPage.map((o, i) => (
                      <li key={o.id} className={i >= 3 ? "[contain-intrinsic-size:auto_230px] [content-visibility:auto]" : undefined}>
                        <CarteOffre offre={o} enregistree={savedJobIds.has(o.id)} onEnregistrer={surEnregistrer} afficherEnregistrer={peutEnregistrer} />
                      </li>
                    ))}
                  </ul>
                  <PaginationOffres page={page} nbPages={nbPages} onPage={changerDePage} />
                </>
              )}
            </div>
          )}
        </div>
      </div>
      {user && <MobileBottomNav userType={user.userType} />}
    </div>
  );
}
