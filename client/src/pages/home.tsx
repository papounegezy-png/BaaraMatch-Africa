import { HeroSection } from "@/components/home/hero-section";
import { CategoryBrowseSection } from "@/components/home/category-browse-section";
import { FeaturesGrid } from "@/components/home/features-grid";
import { HowItWorksSection } from "@/components/home/how-it-works-section";
import { AudienceSplitSection } from "@/components/home/audience-split-section";
import { PilotProgramSection } from "@/components/home/pilot-program-section";

// PublicHeader (Navbar) and the footer are already rendered by PublicLayout
// around every public page — not repeated here.
export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <HeroSection />
      <CategoryBrowseSection />
      <FeaturesGrid />
      <HowItWorksSection />
      <AudienceSplitSection />
      <PilotProgramSection />
    </div>
  );
}
