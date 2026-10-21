import { EnteteAccueil } from "@/components/home/entete-accueil";
import { BandeauAccroche } from "@/components/home/bandeau-accroche";
import { OffresRecentes } from "@/components/home/offres-recentes";
import { SectionEmployeurs } from "@/components/home/section-employeurs";
import { EntreprisesQuiRecrutent } from "@/components/home/entreprises-qui-recrutent";

// Accueil « Accueil animé v2 ». PublicLayout ne rend pas sa Navbar sur « / »
// (voir App.tsx) et ajoute le pied de page commun (PiedAccueil).
export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <EnteteAccueil />
      <main id="contenu" tabIndex={-1} className="focus:outline-none">
      <BandeauAccroche />
      <OffresRecentes />
      <SectionEmployeurs />
      <EntreprisesQuiRecrutent />
      </main>
    </div>
  );
}
