import { useLocation } from "wouter";
import { EnteteAccueil } from "@/components/home/entete-accueil";
import { LienRetour } from "@/components/profil-employeur/lien-retour";

// Contenu provisoire : les anciennes pages, sans leur en-tête ni leur
// retour, en attendant la carte profil et les onglets (prompts 2 à 5).
import ProfilAgence from "@/pages/agency-profile";
import ProfilEntreprise from "@/pages/company-profile";

/**
 * Profil public d'un employeur, aux adresses /agencies/:id (agence) et
 * /companies/:id (entreprise). En-tête et pied de page partagés avec
 * l'accueil, Services, Employeurs et Offres.
 */
export default function ProfilEmployeurPage() {
  const [location] = useLocation();
  const agence = location.startsWith("/agencies/");
  return (
    <div className="min-h-screen bg-baara-papier dark:bg-baara-profond">
      <EnteteAccueil />
      <div className="mx-auto w-full max-w-[1180px] px-6 pb-16 max-[519px]:px-4">
        <div className="pb-3.5 pt-7">
          <LienRetour />
        </div>
        {agence ? <ProfilAgence integre /> : <ProfilEntreprise integre />}
      </div>
    </div>
  );
}
