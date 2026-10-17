import { EnteteAccueil } from "@/components/home/entete-accueil";
import { BandeauAccroche } from "@/components/home/bandeau-accroche";
import { OffresRecentes } from "@/components/home/offres-recentes";
import { SectionEmployeurs } from "@/components/home/section-employeurs";
import { FeaturesGrid } from "@/components/home/features-grid";
import { PilotProgramSection } from "@/components/home/pilot-program-section";
import { EntreprisesQuiRecrutent } from "@/components/home/entreprises-qui-recrutent";

// Accueil « Accueil animé v2 ». PublicLayout ne rend pas sa Navbar sur « / »
// (voir App.tsx) et ajoute le pied de page commun (PiedAccueil).
// FeaturesGrid et PilotProgramSection sont les deux dernières sections de
// l'ancien accueil encore affichées.
export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <EnteteAccueil />
      <BandeauAccroche />
      <OffresRecentes />
      <SectionEmployeurs />
      <FeaturesGrid />
      <PilotProgramSection />
      <EntreprisesQuiRecrutent />
    </div>
  );
}
