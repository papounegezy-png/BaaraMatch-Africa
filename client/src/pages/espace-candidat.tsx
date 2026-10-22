import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { EnteteAccueil } from "@/components/home/entete-accueil";
import { AFaireMaintenant } from "@/components/espace/a-faire-maintenant";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { useAuth } from "@/lib/auth";
import { phraseResume, prenom } from "@/lib/espace-candidat";
import type { Application } from "@shared/schema";

// Contenu provisoire : l'ancien tableau de bord, en attendant les sections
// de la refonte (prompts 2 à 6).
import AncienTableauDeBord from "@/pages/dashboard";

type Candidature = Application & { jobTitle?: string; location?: string; organizationName?: string | null };

// Statuts comptés comme « entretien » et « en attente de réponse ».
const ENTRETIEN = ["interview", "interview_proposed"];
const EN_ATTENTE = ["pending", "reviewing"];

/**
 * Espace candidat (/espace-personnel), refonte d'après la maquette « Espace
 * candidat ». Les autres types de compte ont leur propre tableau de bord.
 */
export default function EspaceCandidatPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (!user) setLocation(`/login?retour=${encodeURIComponent("/espace-personnel")}`);
    else if (user.userType === "agency") setLocation("/agency/dashboard");
    else if (user.userType === "company") setLocation("/company/dashboard");
    else if (user.userType === "admin") setLocation("/admin/dashboard");
  }, [user, isLoading, setLocation]);

  const candidatures = useQuery<Candidature[]>({ queryKey: ["/api/applications"], enabled: user?.userType === "candidate" });
  const liste = candidatures.data ?? [];
  const entretiens = liste.filter((a) => ENTRETIEN.includes(a.status ?? "")).length;
  const enAttente = liste.filter((a) => EN_ATTENTE.includes(a.status ?? "pending")).length;

  if (!user || user.userType !== "candidate") return null;

  return (
    <div className="min-h-screen bg-baara-papier pb-20 dark:bg-baara-profond lg:pb-0">
      <EnteteAccueil />
      <main id="contenu" tabIndex={-1} className="focus:outline-none">
        <div className="mx-auto w-full max-w-[1240px] px-6 pb-16 pt-10 max-[639px]:px-4">
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
            <div className="min-w-0">
              <h1 className="font-titre text-[clamp(32px,3.6vw,44px)] font-extrabold leading-tight tracking-[-0.02em] text-baara-marine [overflow-wrap:anywhere] dark:text-white" data-testid="titre-espace">
                Bonjour, {prenom(user.fullName)}
              </h1>
              <p className="mt-2 max-w-[34em] font-texte text-lg text-baara-texte dark:text-slate-300" data-testid="resume-espace">
                {candidatures.isLoading ? " " : phraseResume(entretiens, enAttente)}
              </p>
            </div>
            <Link
              href="/jobs"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-baara-bleu px-6 font-texte font-semibold text-white hover:bg-baara-marine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2 max-[639px]:w-full"
              data-testid="bouton-rechercher-offres"
            >
              <Search className="h-5 w-5" aria-hidden="true" />
              Rechercher des offres
            </Link>
          </div>
          <AFaireMaintenant candidatures={liste} />
          <AncienTableauDeBord integre />
        </div>
      </main>
      <MobileBottomNav userType={user.userType} />
    </div>
  );
}
