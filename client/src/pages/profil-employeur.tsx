import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { EnteteAccueil } from "@/components/home/entete-accueil";
import { LienRetour } from "@/components/profil-employeur/lien-retour";
import { CarteProfilEmployeur } from "@/components/profil-employeur/carte-profil";
import { BoutonOffres, BoutonSuivre, InvitationCompte } from "@/components/profil-employeur/actions-profil";
import { useProfilEmployeur } from "@/hooks/use-profil-employeur";
import { useSuiviEmployeur } from "@/hooks/use-suivi-employeur";
import { useAuth } from "@/lib/auth";
import type { ReponseOffres } from "@shared/recherche-offres";

// Contenu provisoire : les anciennes pages, sans leur en-tête ni leur
// retour, en attendant la carte profil et les onglets (prompts 2 à 5).
import ProfilAgence from "@/pages/agency-profile";
import ProfilEntreprise from "@/pages/company-profile";

const ID_ONGLETS = "onglets-profil";

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
  const { profil } = useProfilEmployeur(agence ? "agence" : "entreprise", id);

  // Offres actives de l'employeur : seulement le total (GET /api/offres).
  const filtre = `${agence ? "agencyId" : "companyId"}=${encodeURIComponent(id)}`;
  const offres = useQuery<ReponseOffres>({
    queryKey: [`/api/offres?${filtre}&taille=1`],
    queryFn: async () => {
      const r = await fetch(`/api/offres?${filtre}&taille=1`, { credentials: "include" });
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    },
  });

  // Suivre : réservé aux candidats ; un visiteur est invité à se connecter.
  // Une entreprise, une agence ou un administrateur ne voit pas le bouton.
  const peutSuivre = !user || user.userType === "candidate";
  const suivi = useSuiviEmployeur(id, !!user && user.userType === "candidate");

  // Onglet Offres : il vit dans l'adresse (?onglet=offres, prompt 4).
  const voirOffres = () => {
    const parametres = new URLSearchParams(window.location.search);
    parametres.set("onglet", "offres");
    window.history.replaceState(window.history.state, "", `${window.location.pathname}?${parametres}`);
    document.getElementById(ID_ONGLETS)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-baara-papier dark:bg-baara-profond">
      <EnteteAccueil />
      <div className="mx-auto w-full max-w-[1180px] px-6 pb-16 max-[519px]:px-4">
        <div className="pb-3.5 pt-7">
          <LienRetour />
        </div>
        {profil && (
          <CarteProfilEmployeur
            profil={profil}
            actions={<>
              {peutSuivre && <BoutonSuivre connecte={!!user} suivi={suivi.suivi} enCours={suivi.enCours} onBasculer={suivi.basculer} />}
              {offres.data && <BoutonOffres nombre={offres.data.total} onVoir={voirOffres} />}
            </>}
          >
            {!user && <InvitationCompte nom={profil.nom} />}
          </CarteProfilEmployeur>
        )}
        <div id={ID_ONGLETS} className="mt-6 scroll-mt-28">{agence ? <ProfilAgence integre /> : <ProfilEntreprise integre />}</div>
      </div>
    </div>
  );
}
