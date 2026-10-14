import { EnteteAccueil } from "@/components/home/entete-accueil";
import { BandeauAccroche } from "@/components/home/bandeau-accroche";
import { FeaturesGrid } from "@/components/home/features-grid";
import { HowItWorksSection } from "@/components/home/how-it-works-section";
import { AudienceSplitSection } from "@/components/home/audience-split-section";
import { PilotProgramSection } from "@/components/home/pilot-program-section";

// Refonte « Accueil animé v2 » en cours : en-tête et bandeau d'accroche
// remplacent l'ancien hero et la rangée de catégories ; les sections
// suivantes seront remplacées une à une. PublicLayout ne rend pas sa Navbar
// sur « / » (voir App.tsx) ; le pied de page reste le pied commun.
export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <EnteteAccueil />
      <BandeauAccroche />
      <FeaturesGrid />
      <HowItWorksSection />
      <AudienceSplitSection />
      <PilotProgramSection />
    </div>
  );
}
