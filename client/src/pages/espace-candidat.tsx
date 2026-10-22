import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { EnteteAccueil } from "@/components/home/entete-accueil";
import { AFaireMaintenant } from "@/components/espace/a-faire-maintenant";
import { ChiffresCandidat } from "@/components/espace/chiffres-candidat";
import { CandidaturesRecentes } from "@/components/espace/candidatures-recentes";
import { OffresRecommandees } from "@/components/espace/offres-recommandees";
import { ColonneProfil } from "@/components/espace/colonne-profil";
import { useSavedJobs } from "@/hooks/use-saved-jobs";
import { recommander } from "@/lib/recommandations";
import { TAILLE_MAX } from "@shared/recherche-offres";
import type { Offre } from "@/types/offre";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { useAuth } from "@/lib/auth";
import { phraseResume, prenom } from "@/lib/espace-candidat";
import type { Application, CandidateProfile, User } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

declare global {
  interface Window { __espacePrecharge?: Record<string, Promise<unknown>> }
}

// Requêtes lancées dès index.html : elles alimentent le cache avant le
// premier rendu (une seule fois ; un échec, une session expirée par
// exemple, laisse la page refaire sa requête normalement).
function reprendrePrechargement() {
  const prechargees = window.__espacePrecharge;
  window.__espacePrecharge = undefined;
  if (!prechargees) return;
  // prefetchQuery : la requête est « en cours » pour React Query, la page
  // l'attend au lieu d'en relancer une.
  for (const [url, promesse] of Object.entries(prechargees)) {
    if (queryClient.getQueryState([url])) continue;
    void queryClient.prefetchQuery({ queryKey: [url], queryFn: () => promesse });
  }
}

type Candidature = Application & { jobTitle?: string; location?: string; organizationName?: string | null };

// Statuts comptés comme « entretien » et « en attente de réponse ».
const ENTRETIEN = ["interview", "interview_proposed"];
const EN_ATTENTE = ["pending", "reviewing"];
// Offres reçues : proposition faite, ou acceptée (même liste que l'onglet
// « Offres reçues » de Mes candidatures).
const OFFRE_RECUE = ["offered", "hired"];

/**
 * Espace candidat (/espace-personnel), refonte d'après la maquette « Espace
 * candidat ». Les autres types de compte ont leur propre tableau de bord.
 */
export default function EspaceCandidatPage() {
  useState(reprendrePrechargement);
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
  const offresRecues = liste.filter((a) => OFFRE_RECUE.includes(a.status ?? "")).length;
  // Offres visibles (même total que la page Offres, /jobs), avec leurs
  // compétences requises.
  const estCandidat = user?.userType === "candidate";
  const offres = useQuery<{ total: number; offres: Offre[] }>({ queryKey: [`/api/offres?taille=${TAILLE_MAX}`], enabled: estCandidat });
  const profil = useQuery<{ user: User; profile: CandidateProfile | null }>({ queryKey: ["/api/profile"], enabled: estCandidat });
  const { savedJobIds, toggleSave } = useSavedJobs();
  const recommandees = useMemo(() => {
    if (!offres.data || !profil.data) return [];
    return recommander(
      {
        ville: profil.data.user.city,
        metier: profil.data.profile?.title,
        competences: profil.data.profile?.skills,
        experienceAnnees: profil.data.profile?.experienceYears,
      },
      offres.data.offres.map((o) => ({ ...o, competencesRequises: o.competences })),
      new Set(liste.map((a) => a.jobId)),
    );
  }, [offres.data, profil.data, liste]);

  const attente = candidatures.isLoading || profil.isLoading;

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
          {/* Tant que candidatures et profil n'ont pas répondu, une seule
              réserve de la hauteur de l'écran : les sections arrivent ensuite
              d'un bloc, sans décaler ce qui est déjà affiché (CLS). */}
          {attente ? (
            <div className="mt-10 min-h-[100vh] animate-pulse rounded-[20px] bg-baara-clair/60 motion-reduce:animate-none dark:bg-white/5" aria-hidden="true" data-testid="espace-chargement" />
          ) : (
          <>
          <AFaireMaintenant candidatures={liste} />
          <ChiffresCandidat
            candidatures={{ nombre: liste.length, chargement: candidatures.isLoading, erreur: candidatures.isError }}
            entretiens={{ nombre: entretiens, chargement: candidatures.isLoading, erreur: candidatures.isError }}
            offresDisponibles={{ nombre: offres.data?.total, chargement: offres.isLoading, erreur: offres.isError }}
            offresRecues={{ nombre: offresRecues, chargement: candidatures.isLoading, erreur: candidatures.isError }}
            enAttente={enAttente}
          />
          {/* Contenu principal et colonne profil : la colonne passe dessous
              quand la place manque (flex-wrap). */}
          <div className="flex flex-wrap gap-x-8">
            <div className="min-w-0 [flex:999_1_600px]">
              <CandidaturesRecentes
                candidatures={liste}
                chargement={candidatures.isLoading}
                erreur={candidatures.isError}
                onReessayer={() => candidatures.refetch()}
              />
              <OffresRecommandees
                offres={recommandees}
                chargement={offres.isLoading || profil.isLoading}
                erreur={offres.isError || profil.isError}
                onReessayer={() => { offres.refetch(); profil.refetch(); }}
                enregistrees={savedJobIds}
                onEnregistrer={toggleSave}
              />
            </div>
            <ColonneProfil
              utilisateur={profil.data?.user}
              profil={profil.data?.profile}
              chargement={profil.isLoading}
              nbSauvegardees={savedJobIds.size}
            />
          </div>
          </>
          )}
        </div>
      </main>
      <MobileBottomNav userType={user.userType} />
    </div>
  );
}
