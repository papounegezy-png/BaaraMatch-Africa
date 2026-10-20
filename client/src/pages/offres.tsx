import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { EnteteAccueil } from "@/components/home/entete-accueil";
import { BandeauOffres } from "@/components/offres/bandeau-offres";
import { RechercheOffres } from "@/components/offres/recherche-offres";
import { BarreContrat } from "@/components/offres/barre-contrat";
import { CarteOffre } from "@/components/offres/carte-offre";
import { AucuneOffre, EnTeteResultats, ErreurOffres, PaginationOffres, SquelettesOffres } from "@/components/offres/resultats-offres";
import { useSavedJobs } from "@/hooks/use-saved-jobs";
import { FiltresOffres, nombreFiltresActifs, type SelectionFiltres } from "@/components/offres/filtres-offres";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { useAuth } from "@/lib/auth";
import { compterParContrat, facettes, filtrerOffres } from "@/lib/filtre-offres";
import { adresseDepuisEtat, etatDepuisAdresse, TAILLE_PAGE, type EtatOffres } from "@/lib/etat-offres";
import type { Secteur } from "@shared/secteurs";
import { versOffre, type OffreApi } from "@/types/offre";

/**
 * Page Offres (/jobs), refonte d'après la maquette « Page Offres ».
 * Tout l'état (recherche, filtres, page) vit dans l'adresse : la frappe la
 * remplace (replaceState), les autres changements ajoutent une entrée
 * d'historique (pushState) que le bouton Retour restaure.
 */
export default function OffresPage() {
  const { user } = useAuth();
  const idPanneauFiltres = useId();
  const [etat, setEtat] = useState<EtatOffres>(() => etatDepuisAdresse(window.location.search));
  const historique = useRef<"push" | "replace">("replace");
  const [filtresOuverts, setFiltresOuverts] = useState(false);
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
  const selection: SelectionFiltres = {
    secteurs: etat.secteurs, villes: etat.villes, experiences: etat.experiences, publieeDepuisJours: etat.publieeDepuisJours,
  };
  const choisirFiltres = (s: SelectionFiltres) => modifier({ ...s, secteurs: s.secteurs as Secteur[] });
  const reinitialiserFiltres = () => modifier({ secteurs: [], villes: [], experiences: [], publieeDepuisJours: null });
  const toutReinitialiser = () => modifier({ recherche: "", lieu: "", contrat: null, employeur: null, secteurs: [], villes: [], experiences: [], publieeDepuisJours: null });

  // En-tête (77 px) et barre de contrat collants : un élément ramené dans la
  // vue (focus clavier, case de filtre) s'arrête sous eux au lieu d'être
  // masqué. La barre est plus haute sous 900 px (bouton Filtres sur sa ligne).
  useEffect(() => {
    const racine = document.documentElement;
    const avant = racine.style.scrollPaddingTop;
    racine.style.scrollPaddingTop = "calc(77px + 9rem)";
    return () => { racine.style.scrollPaddingTop = avant; };
  }, []);

  // Petit écran : Échap referme le panneau et rend le focus au bouton Filtres.
  const boutonFiltres = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!filtresOuverts) return;
    const surTouche = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || window.matchMedia("(min-width: 1000px)").matches) return;
      setFiltresOuverts(false);
      boutonFiltres.current?.focus();
    };
    document.addEventListener("keydown", surTouche);
    return () => document.removeEventListener("keydown", surTouche);
  }, [filtresOuverts]);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery<OffreApi[]>({ queryKey: ["/api/jobs"] });
  const offres = useMemo(() => (data ?? []).map(versOffre), [data]);

  const criteres = useMemo(() => ({
    recherche: etat.recherche, lieu: etat.lieu, contrat: etat.contrat, employeurId: etat.employeur?.id ?? null,
    secteurs: etat.secteurs, villes: etat.villes, experiences: etat.experiences, publieeDepuisJours: etat.publieeDepuisJours,
  }), [etat]);
  // Tri unique « plus récentes d'abord ».
  const resultats = useMemo(
    () => filtrerOffres(offres, criteres).sort((a, b) => b.publieLe.localeCompare(a.publieLe)),
    [offres, criteres],
  );
  const comptes = useMemo(() => compterParContrat(offres, criteres), [offres, criteres]);
  const compteurs = useMemo(() => facettes(offres, criteres), [offres, criteres]);

  const nbPages = Math.max(1, Math.ceil(resultats.length / TAILLE_PAGE));
  // Page au-delà de la dernière (adresse ancienne ou partagée) : la dernière.
  const page = Math.min(etat.page, nbPages);
  const offresDeLaPage = resultats.slice((page - 1) * TAILLE_PAGE, page * TAILLE_PAGE);

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
        refBoutonFiltres={boutonFiltres}
        filtresOuverts={filtresOuverts}
        onBasculerFiltres={() => setFiltresOuverts((o) => !o)}
        idPanneauFiltres={idPanneauFiltres}
      />
      {/* Dès 1000 px : filtres en colonne de 250 px à gauche, résultats à droite. */}
      <div className="container mx-auto grid gap-6 px-4 py-8 min-[1000px]:grid-cols-[250px_minmax(0,1fr)] min-[1000px]:gap-10">
        <FiltresOffres
          id={idPanneauFiltres}
          ouvert={filtresOuverts}
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

          {isError && !isRefetching ? (
            <ErreurOffres onReessayer={() => refetch()} />
          ) : isLoading || isRefetching ? (
            <SquelettesOffres />
          ) : (
            <>
              <EnTeteResultats ref={titreResultats} page={page} total={resultats.length} />
              {resultats.length === 0 ? (
                <AucuneOffre onReinitialiser={toutReinitialiser} />
              ) : (
                <>
                  {/* La clé relance l'entrée douce à chaque nouvelle liste. */}
                  <ul key={adresseDepuisEtat({ ...etat, page })} className="space-y-4 motion-safe:animate-entree-resultats" data-testid="liste-offres">
                    {offresDeLaPage.map((o) => (
                      <li key={o.id}>
                        <CarteOffre offre={o} enregistree={savedJobIds.has(o.id)} onEnregistrer={() => enregistrer(o.id)} afficherEnregistrer={peutEnregistrer} />
                      </li>
                    ))}
                  </ul>
                  <PaginationOffres page={page} nbPages={nbPages} onPage={changerDePage} />
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
