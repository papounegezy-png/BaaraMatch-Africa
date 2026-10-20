import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { EnteteAccueil } from "@/components/home/entete-accueil";
import { BandeauOffres } from "@/components/offres/bandeau-offres";
import { RechercheOffres } from "@/components/offres/recherche-offres";
import { BarreContrat } from "@/components/offres/barre-contrat";
import { CarteOffre } from "@/components/offres/carte-offre";
import { useSavedJobs } from "@/hooks/use-saved-jobs";
import { FiltresOffres, nombreFiltresActifs, type SelectionFiltres } from "@/components/offres/filtres-offres";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { useAuth } from "@/lib/auth";
import { compterParContrat, contratDepuisParametre, facettes, filtrerOffres, normaliserTexte, secteursDepuisParametres, type ContratBarre } from "@/lib/filtre-offres";
import type { Secteur } from "@shared/secteurs";
import { versOffre, type OffreApi } from "@/types/offre";

// Paramètres d'adresse lus à l'arrivée. Les anciens noms restent compris :
// l'accueil envoie ?q=&location=&type=, la page Employeurs ?agencyId= ou
// ?companyId= avec &employerName=. L'écriture dans l'adresse arrive au prompt 5.
function lireAdresse() {
  const p = new URLSearchParams(window.location.search);
  return {
    recherche: p.get("q") ?? "",
    lieu: p.get("lieu") ?? p.get("location") ?? "",
    contrat: contratDepuisParametre(p.get("contrat") ?? p.get("type")),
    employeurId: p.get("agencyId") ?? p.get("companyId"),
    employeurNom: p.get("employerName"),
    // Secteurs : ?secteur= (32 libellés) ou l'ancien ?category= de l'accueil.
    secteurs: secteursDepuisParametres([...p.getAll("secteur"), ...p.getAll("category")]),
    villes: p.getAll("ville").map(normaliserTexte).filter(Boolean),
    experiences: p.getAll("exp"),
    publieeDepuisJours: Number(p.get("publiee_depuis_jours")) || null,
  };
}

/** Page Offres (/jobs), refonte d'après la maquette « Page Offres ». */
export default function OffresPage() {
  const { user } = useAuth();
  const idPanneauFiltres = useId();
  const [depart] = useState(lireAdresse);
  const [recherche, setRecherche] = useState(depart.recherche);
  const [lieu, setLieu] = useState(depart.lieu);
  const [contrat, setContrat] = useState<ContratBarre | null>(depart.contrat);
  const [employeur, setEmployeur] = useState<{ id: string; nom: string | null } | null>(
    depart.employeurId ? { id: depart.employeurId, nom: depart.employeurNom } : null,
  );
  const [filtresOuverts, setFiltresOuverts] = useState(false);
  const [, setLocation] = useLocation();
  const { savedJobIds, toggleSave } = useSavedJobs();
  // Enregistrer : réservé aux candidats (/api/saved-jobs). Un visiteur est
  // envoyé à la connexion puis ramené ici ; une entreprise ou une agence ne
  // voit pas le bouton.
  const peutEnregistrer = !user || user.userType === "candidate";
  const enregistrer = (id: string) => {
    if (!user) {
      setLocation(`/login?retour=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    toggleSave(id);
  };
  const [selection, setSelection] = useState<SelectionFiltres>({
    secteurs: depart.secteurs, villes: depart.villes, experiences: depart.experiences, publieeDepuisJours: depart.publieeDepuisJours,
  });
  const reinitialiserFiltres = () => setSelection({ secteurs: [], villes: [], experiences: [], publieeDepuisJours: null });
  // Pagination (prompt 5) : tout changement de filtre reviendra à la page 1.

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

  const { data, isLoading, isError, refetch } = useQuery<OffreApi[]>({ queryKey: ["/api/jobs"] });
  const offres = useMemo(() => (data ?? []).map(versOffre), [data]);

  const criteres = useMemo(() => ({
    recherche, lieu, contrat, employeurId: employeur?.id ?? null,
    secteurs: selection.secteurs as Secteur[], villes: selection.villes, experiences: selection.experiences,
    publieeDepuisJours: selection.publieeDepuisJours,
  }), [recherche, lieu, contrat, employeur, selection]);
  const resultats = useMemo(() => filtrerOffres(offres, criteres), [offres, criteres]);
  const comptes = useMemo(() => compterParContrat(offres, criteres), [offres, criteres]);
  const compteurs = useMemo(() => facettes(offres, criteres), [offres, criteres]);

  return (
    <div className="min-h-screen bg-baara-papier pb-20 dark:bg-baara-profond lg:pb-0">
      <EnteteAccueil />
      <BandeauOffres>
        <RechercheOffres recherche={recherche} lieu={lieu} onRecherche={setRecherche} onLieu={setLieu} />
      </BandeauOffres>
      <BarreContrat
        contrat={contrat}
        comptes={comptes}
        onContrat={setContrat}
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
          onSelection={setSelection}
          onReinitialiser={reinitialiserFiltres}
        />
        <div className="min-w-0">
        {employeur && (
          <p className="mb-5 flex flex-wrap items-center gap-3 font-texte text-baara-marine dark:text-white" data-testid="filtre-employeur">
            Offres de <strong>{employeur.nom ?? "cet employeur"}</strong>
            <button type="button" onClick={() => setEmployeur(null)} className="min-h-11 rounded-sm font-semibold text-baara-bleu underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu dark:text-baara-moyen">
              Voir toutes les offres
            </button>
          </p>
        )}

        {/* Résultats, tri, pagination et états : prompt 5. */}
        {isError ? (
          <div role="alert" className="font-texte text-baara-marine dark:text-white">
            Impossible de charger les offres pour le moment.{" "}
            <button type="button" onClick={() => refetch()} className="min-h-11 font-semibold text-baara-bleu underline underline-offset-4">Réessayer</button>
          </div>
        ) : isLoading ? (
          <p role="status" className="font-texte text-baara-texte">Chargement des offres…</p>
        ) : (
          <>
            <p role="status" className="mb-4 font-texte text-baara-texte dark:text-slate-300" data-testid="nombre-resultats">
              {resultats.length} {resultats.length > 1 ? "offres" : "offre"}
            </p>
            <ul className="space-y-4" data-testid="liste-offres">
              {resultats.map((o) => (
                <li key={o.id}>
                  <CarteOffre offre={o} enregistree={savedJobIds.has(o.id)} onEnregistrer={() => enregistrer(o.id)} afficherEnregistrer={peutEnregistrer} />
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
