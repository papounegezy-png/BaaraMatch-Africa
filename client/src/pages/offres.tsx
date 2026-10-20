import { useId, useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { EnteteAccueil } from "@/components/home/entete-accueil";
import { BandeauOffres } from "@/components/offres/bandeau-offres";
import { RechercheOffres } from "@/components/offres/recherche-offres";
import { BarreContrat } from "@/components/offres/barre-contrat";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { useAuth } from "@/lib/auth";
import { compterParContrat, contratDepuisParametre, filtrerOffres, type ContratBarre } from "@/lib/filtre-offres";
import { libelleLieu } from "@/lib/offres";
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

  const { data, isLoading, isError, refetch } = useQuery<OffreApi[]>({ queryKey: ["/api/jobs"] });
  const offres = useMemo(() => (data ?? []).map(versOffre), [data]);

  const criteres = { recherche, lieu, contrat, employeurId: employeur?.id ?? null };
  const resultats = useMemo(() => filtrerOffres(offres, criteres), [offres, recherche, lieu, contrat, employeur]); // eslint-disable-line react-hooks/exhaustive-deps
  const comptes = useMemo(() => compterParContrat(offres, criteres), [offres, recherche, lieu, employeur]); // eslint-disable-line react-hooks/exhaustive-deps

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
        nbFiltresActifs={0}
        filtresOuverts={filtresOuverts}
        onBasculerFiltres={() => setFiltresOuverts((o) => !o)}
        idPanneauFiltres={idPanneauFiltres}
      />
      {/* Panneau des filtres : contenu au prompt 3. */}
      <div id={idPanneauFiltres} hidden={!filtresOuverts} />

      <div className="container mx-auto px-4 py-8">
        {employeur && (
          <p className="mb-5 flex flex-wrap items-center gap-3 font-texte text-baara-marine dark:text-white" data-testid="filtre-employeur">
            Offres de <strong>{employeur.nom ?? "cet employeur"}</strong>
            <button type="button" onClick={() => setEmployeur(null)} className="min-h-11 rounded-sm font-semibold text-baara-bleu underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu dark:text-baara-moyen">
              Voir toutes les offres
            </button>
          </p>
        )}

        {/* Liste provisoire : cartes au prompt 4, résultats et états au prompt 5. */}
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
            <ul className="space-y-3" data-testid="liste-offres">
              {resultats.map((o) => (
                <li key={o.id} className="rounded-2xl border border-baara-trait bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
                  <Link href={`/jobs/${o.id}`} className="font-titre text-lg font-bold text-baara-marine hover:underline dark:text-white">{o.titre}</Link>
                  <p className="font-texte text-sm text-baara-texte dark:text-slate-300">
                    {[o.employeurNom, libelleLieu(o.ville, o.pays), o.contrat].filter(Boolean).join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      {user && <MobileBottomNav userType={user.userType} />}
    </div>
  );
}
