import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { EnteteAccueil } from "@/components/home/entete-accueil";
import { LienRetour } from "@/components/profil-employeur/lien-retour";
import { CarteProfilEmployeur } from "@/components/profil-employeur/carte-profil";
import { BoutonOffres, BoutonSuivre, InvitationCompte } from "@/components/profil-employeur/actions-profil";
import { BarreOnglets, idOnglet, useOngletProfil, type Onglet } from "@/components/profil-employeur/onglets-profil";
import { PanneauAPropos, PanneauApercu, PanneauAvis, PanneauOffres } from "@/components/profil-employeur/panneaux-profil";
import { EmployeurIntrouvable, ErreurProfil, SqueletteProfil } from "@/components/profil-employeur/etats-profil";
import { useProfilEmployeur } from "@/hooks/use-profil-employeur";
import { useSuiviEmployeur } from "@/hooks/use-suivi-employeur";
import { useEnregistrerOffre } from "@/hooks/use-enregistrer-offre";
import { useAuth } from "@/lib/auth";
import type { ReponseOffres } from "@shared/recherche-offres";

// Offres de l'employeur : 3 dans l'aperçu (et le total), 10 par page dans
// l'onglet Offres (GET /api/offres filtré par employeur).
const TAILLE_APERCU = 3;
const TAILLE_ONGLET = 10;

async function chargerOffres(adresse: string): Promise<ReponseOffres> {
  const r = await fetch(adresse, { credentials: "include" });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

/**
 * Profil public d'un employeur, aux adresses /agencies/:id (agence) et
 * /companies/:id (entreprise). En-tête et pied de page partagés avec
 * l'accueil, Services, Employeurs et Offres.
 */
export default function ProfilEmployeurPage() {
  const [location] = useLocation();
  const agence = location.startsWith("/agencies/");
  const { id = "" } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { profil, chargement, erreur, introuvable, reessayer } = useProfilEmployeur(agence ? "agence" : "entreprise", id);
  const [onglet, choisirOnglet] = useOngletProfil();
  const [page, setPage] = useState(1);

  const filtre = `${agence ? "agencyId" : "companyId"}=${encodeURIComponent(id)}`;
  const apercu = useQuery<ReponseOffres>({
    queryKey: [`/api/offres?${filtre}&taille=${TAILLE_APERCU}`],
    queryFn: () => chargerOffres(`/api/offres?${filtre}&taille=${TAILLE_APERCU}`),
  });
  const total = apercu.data?.total;
  const liste = useQuery<ReponseOffres>({
    queryKey: [`/api/offres?${filtre}&taille=${TAILLE_ONGLET}&page=${page}`],
    queryFn: () => chargerOffres(`/api/offres?${filtre}&taille=${TAILLE_ONGLET}&page=${page}`),
    enabled: onglet === "offres",
    placeholderData: keepPreviousData,
  });

  // Suivre : réservé aux candidats ; un visiteur est invité à se connecter.
  // Une entreprise, une agence ou un administrateur ne voit pas le bouton.
  const peutSuivre = !user || user.userType === "candidate";
  const suivi = useSuiviEmployeur(id, profil?.suiviParMoi ?? false);

  // Consultation comptée pour la statistique admin « Top organisations
  // visitées » (le propriétaire qui regarde sa page n'est pas compté).
  useEffect(() => {
    if (!profil) return;
    fetch(`/api/${profil.type === "agence" ? "agencies" : "companies"}/${encodeURIComponent(profil.id)}/view`, { method: "POST", credentials: "include" }).catch(() => {});
  }, [profil?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const { savedJobIds, peutEnregistrer, surEnregistrer } = useEnregistrerOffre();

  // Ouvre un onglet et y amène la vue (bouton d'offres, « Lire la suite »).
  const ouvrir = (o: Onglet) => {
    choisirOnglet(o);
    requestAnimationFrame(() => {
      const bouton = document.getElementById(idOnglet(o));
      bouton?.focus({ preventScroll: true });
      bouton?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    });
  };
  const changerDePage = (p: number) => {
    setPage(p);
    ouvrir("offres");
  };

  return (
    <div className="min-h-screen bg-baara-papier dark:bg-baara-profond">
      <EnteteAccueil />
      <main id="contenu" tabIndex={-1} className="focus:outline-none">
      <div className="mx-auto w-full max-w-[1180px] px-6 pb-16 max-[519px]:px-4">
        <div className="pb-3.5 pt-7">
          <LienRetour />
        </div>
        {chargement && <SqueletteProfil />}
        {erreur && <ErreurProfil onReessayer={reessayer} />}
        {introuvable && <EmployeurIntrouvable />}
        {profil && (
          <CarteProfilEmployeur
            profil={profil}
            actions={<>
              {peutSuivre && <BoutonSuivre connecte={!!user} suivi={suivi.suivi} enCours={suivi.enCours} onBasculer={suivi.basculer} />}
              {total !== undefined && <BoutonOffres nombre={total} onVoir={() => ouvrir("offres")} />}
            </>}
          >
            {!user && <InvitationCompte nom={profil.nom} />}
            <div className="scroll-mt-28">
              <BarreOnglets actif={onglet} onChoisir={choisirOnglet} nombreOffres={total ?? 0} />
            </div>
            {onglet === "apercu" && (
              <PanneauApercu profil={profil} offres={apercu.data?.offres} erreur={apercu.isError && !apercu.isFetching} onReessayer={() => apercu.refetch()} total={total} suivi={suivi.suivi} onVoirOffres={() => ouvrir("offres")} onLirePlus={() => ouvrir("a-propos")} />
            )}
            {onglet === "offres" && (
              <PanneauOffres
                offres={liste.data?.offres}
                erreur={liste.isError && !liste.isFetching}
                onReessayer={() => liste.refetch()}
                page={liste.data?.page ?? page}
                nbPages={liste.data?.nbPages ?? 1}
                onPage={changerDePage}
                suivi={suivi.suivi}
                enregistrees={savedJobIds}
                peutEnregistrer={peutEnregistrer}
                onEnregistrer={surEnregistrer}
              />
            )}
            {onglet === "a-propos" && <PanneauAPropos profil={profil} />}
            {onglet === "avis" && (
              <PanneauAvis employeurId={profil.id} connecte={!!user} candidat={user?.userType === "candidate"} peutDonnerAvis={profil.peutDonnerAvis} />
            )}
          </CarteProfilEmployeur>
        )}
      </div>
      </main>
    </div>
  );
}
