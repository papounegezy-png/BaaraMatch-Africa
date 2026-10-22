import { lazy, Suspense, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Eye, Pencil } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { EnteteAccueil } from "@/components/home/entete-accueil";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { ProfileView } from "@/components/profile-view";
import { Skeleton } from "@/components/ui/skeleton";
import { reprendrePrechargement } from "@/lib/prechargement-api";

// L'éditeur (formulaire complet, CV vocal) n'est chargé qu'à l'ouverture du
// mode modification : la consultation du profil n'en a pas besoin.
const MobileProfileEditor = lazy(() => import("@/components/mobile-profile-editor").then((m) => ({ default: m.MobileProfileEditor })));
import type { User, CandidateProfile } from "@shared/schema";

const EDITOR_SECTIONS = [
  "personal",
  "professional",
  "cv",
  "education",
  "certifications",
  "experiences",
  "preferences",
] as const;

type EditorSection = (typeof EDITOR_SECTIONS)[number];

const isEditorSection = (value: string | null): value is EditorSection =>
  Boolean(value && EDITOR_SECTIONS.includes(value as EditorSection));

const boutonRond =
  "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[1.5px] border-baara-trait bg-white text-baara-marine hover:border-baara-marine hover:bg-baara-clair focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2 dark:border-white/20 dark:bg-white/5 dark:text-white";
const boutonPlein =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-baara-bleu px-6 font-texte font-semibold text-white hover:bg-baara-marine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2";
const boutonContour =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-[1.5px] border-baara-marine bg-white px-6 font-texte font-semibold text-baara-marine hover:bg-baara-clair focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2 dark:border-white dark:bg-transparent dark:text-white dark:hover:bg-white/10";

/**
 * « Mon profil » (/profile/view) et sa modification (/profile?section=…),
 * même page : la vue et l'éditeur se remplacent sur place.
 */
export default function ProfilePage() {
  useState(reprendrePrechargement);
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [targetSection, setTargetSection] = useState<EditorSection | undefined>(undefined);

  const { data: profileData } = useQuery<{ user: User; profile: CandidateProfile | null }>({
    queryKey: ["/api/profile"],
    enabled: !!user,
  });

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation(`/login?retour=${encodeURIComponent("/profile/view")}`);
    }
  }, [user, isLoading, setLocation]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const section = searchParams.get("section");

    if (isEditorSection(section)) {
      setTargetSection(section);
      setIsEditing(true);
      return;
    }

    setTargetSection(undefined);
    if (location.includes("/profile/view")) {
      setIsEditing(false);
    }
  }, [location]);

  const voirProfil = () => {
    setIsEditing(false);
    setLocation("/profile/view");
  };

  return (
    <div className="min-h-screen bg-baara-papier pb-20 dark:bg-baara-profond lg:pb-0">
      <EnteteAccueil />
      <main id="contenu" tabIndex={-1} className="focus:outline-none">
        <div className="mx-auto w-full max-w-[1240px] px-6 pb-16 pt-10 max-[639px]:px-4">
          {isLoading || !user ? (
            <div className="space-y-4" aria-hidden="true">
              <Skeleton className="h-12 w-64 rounded-xl" />
              <Skeleton className="h-48 w-full rounded-3xl" />
              <Skeleton className="h-64 w-full rounded-3xl" />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-5">
                <div className="flex min-w-0 items-center gap-4">
                  {isEditing ? (
                    <button type="button" onClick={voirProfil} className={boutonRond} aria-label="Retour à mon profil" data-testid="button-back">
                      <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                    </button>
                  ) : (
                    <button type="button" onClick={() => setLocation("/espace-personnel")} className={boutonRond} aria-label="Retour au tableau de bord" data-testid="button-back">
                      <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                    </button>
                  )}
                  <div className="min-w-0">
                    <h1 className="font-titre text-[clamp(30px,3.4vw,40px)] font-extrabold leading-tight tracking-[-0.02em] text-baara-marine [overflow-wrap:anywhere] dark:text-white" data-testid="text-profile-title">
                      {isEditing ? "Modifier mon profil" : "Mon profil"}
                    </h1>
                    <p className="mt-1 font-texte text-[17px] text-baara-texte dark:text-slate-300">
                      {isEditing ? "Modifiez vos informations" : "Consultez vos informations"}
                    </p>
                  </div>
                </div>
                {isEditing ? (
                  <button type="button" onClick={voirProfil} className={boutonContour} data-testid="button-toggle-mode-desktop">
                    <Eye className="h-5 w-5" aria-hidden="true" />
                    Voir mon profil
                  </button>
                ) : (
                  // Sous 900 px, ce bouton est en bas de la page (ProfileView).
                  <button type="button" onClick={() => setIsEditing(true)} className={`${boutonPlein} max-[899px]:hidden`} data-testid="button-toggle-mode-desktop">
                    <Pencil className="h-5 w-5" aria-hidden="true" />
                    Modifier mon profil
                  </button>
                )}
              </div>

              <div className="mt-8">
                {isEditing ? (
                  <Suspense fallback={<Skeleton className="h-96 w-full rounded-3xl" aria-label="Chargement du formulaire" />}>
                    <MobileProfileEditor
                      user={profileData?.user || user}
                      profile={profileData?.profile || undefined}
                      initialSection={targetSection}
                      onSave={() => setIsEditing(false)}
                    />
                  </Suspense>
                ) : (
                  <ProfileView user={profileData?.user || user} onEdit={() => setIsEditing(true)} />
                )}
              </div>
            </>
          )}
        </div>
      </main>
      {user && <MobileBottomNav userType={user.userType} />}
    </div>
  );
}
