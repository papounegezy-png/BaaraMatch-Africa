import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Briefcase,
  Users,
  Building2,
  FileText,
  Bell,
  Edit,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  ArrowRight,
  MapPin,
  Search,
  Mic,
  Bookmark,
  Calendar,
  CalendarCheck,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { RecommendedJobsList, type RecommendedJob } from "@/components/recommended-jobs-list";
import { AgencyAnalytics } from "@/components/agency-analytics";
import { MobileProfileEditor } from "@/components/mobile-profile-editor";
import type { User, UserType, JobPosting, Application, CandidateProfile } from "@shared/schema";
import { useSavedJobs } from "@/hooks/use-saved-jobs";
import { PickInterviewSlotDialog } from "@/components/pick-interview-slot-dialog";
import { calculateMatchScore, explainMatchScore } from "@shared/matching";
import { formatJobTitle } from "@/lib/format-job-title";

// Text/background pairs measured at 4.5:1 or more (WCAG AA, small bold
// text). The theme tints (accent/secondary/destructive text on their own
// 10–15 % background) were 2.8–3.8:1, so those badges use darker shades.
const statusConfig = {
  pending: { label: "En attente", icon: Clock, className: "bg-primary/10 text-primary border border-primary/20" },
  reviewing: { label: "En revue", icon: Eye, className: "bg-primary/10 text-primary border border-primary/20" },
  shortlisted: { label: "Présélection", icon: CheckCircle2, className: "bg-orange-100 text-orange-800 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-200 dark:border-orange-800" },
  interview_proposed: { label: "Créneaux à choisir", icon: Calendar, className: "bg-amber-100 text-amber-700 border border-amber-200" },
  interview: { label: "Entretien", icon: Users, className: "bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800" },
  offered: { label: "Offre", icon: CheckCircle2, className: "bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800" },
  hired: { label: "Accepté", icon: CheckCircle2, className: "bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800" },
  rejected: { label: "Refusé", icon: XCircle, className: "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800" },
  withdrawn: { label: "Retiré", icon: XCircle, className: "bg-muted text-foreground border border-border/60" },
};

function getPrimaryInsight(applications: Application[]): string {
  const interviews = applications.filter((a) => a.status === "interview").length;
  const pending = applications.filter((a) => a.status === "pending" || a.status === "reviewing").length;
  const offers = applications.filter((a) => a.status === "offered" || a.status === "hired").length;

  if (interviews > 0) return `${interviews} entretien${interviews > 1 ? "s" : ""} en cours`;
  if (offers > 0) return `${offers} offre${offers > 1 ? "s" : ""} reçue${offers > 1 ? "s" : ""}`;
  if (pending > 0) return `${pending} candidature${pending > 1 ? "s" : ""} en attente`;
  return "Complétez votre profil pour booster vos opportunités";
}


// Utilitaire pour normaliser les champs potentiellement string/object/array
function parseArrayField<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") {
    const objectValues = Object.values(value as Record<string, unknown>);
    return Array.isArray(objectValues) ? (objectValues as T[]) : [];
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed as T[];
      if (parsed && typeof parsed === "object") {
        return Object.values(parsed as Record<string, unknown>) as T[];
      }
    } catch {
      return [];
    }
  }
  return [];
}

function calculateProfileCompletion(user: User, profile?: CandidateProfile): number {
  const educationEntries = parseArrayField<any>(profile?.educationEntries);
  const certificationEntries = parseArrayField<any>(profile?.certifications);
  const completionChecks = [
    !!user.fullName,
    !!user.phone,
    !!user.city,
    !!profile?.title,
    !!profile?.bio,
    !!profile?.experience,
    educationEntries.length > 0 || !!profile?.education,
    certificationEntries.length > 0,
    !!profile?.resumeUrl,
    !!profile?.skills?.length,
  ];
  return Math.round((completionChecks.filter(Boolean).length / completionChecks.length) * 100);
}

// The single most useful missing item, from the same 10 criteria as
// calculateProfileCompletion (so the link and the % always agree), ordered
// by what recruiters look at first; `section` opens the matching block of
// the profile editor (/profile?section=…).
function nextProfileStep(user: User, profile?: CandidateProfile): { label: string; section: string } | null {
  const hasEducation = parseArrayField<any>(profile?.educationEntries).length > 0 || !!profile?.education;
  const hasCertification = parseArrayField<any>(profile?.certifications).length > 0;
  const steps: [boolean, string, string][] = [
    [!!profile?.resumeUrl, "Importer votre CV", "cv"],
    [!!profile?.skills?.length, "Ajouter vos compétences", "professional"],
    [!!profile?.title, "Indiquer le poste recherché", "professional"],
    [!!user.city, "Indiquer votre ville", "personal"],
    [!!profile?.experience, "Décrire votre expérience", "experiences"],
    [!!user.fullName && !!user.phone, "Compléter vos coordonnées", "personal"],
    [hasEducation, "Ajouter une formation", "education"],
    [!!profile?.bio, "Ajouter une courte présentation", "professional"],
    [hasCertification, "Ajouter une certification", "certifications"],
  ];
  const missing = steps.find(([done]) => !done);
  return missing ? { label: missing[1], section: missing[2] } : null;
}

// Scores each job against the candidate's own profile (V0 rule-based
// scoring, shared/matching.ts) and sorts best-match first — replaces what
// used to be a random placeholder percentage on the "Offres recommandées"
// swipe cards.
// Same calculation and order as before; the score is only *shown* (with its
// one-line reason, shared explainMatchScore) once the candidate has a
// profile — without one every criterion is neutral and the % means nothing.
function scoreAndSortJobs(
  jobs: (JobPosting & { organizationName: string | null })[],
  user: User,
  profile?: CandidateProfile,
): RecommendedJob[] {
  return jobs
    .map((job) => {
      const result = calculateMatchScore(
        { skills: profile?.skills, city: user.city, experienceYears: profile?.experienceYears },
        { requiredSkills: job.requiredSkills, location: job.location, experienceMin: job.experienceMin },
      );
      return { job, result };
    })
    .sort((a, b) => b.result.score - a.result.score)
    .map(({ job, result }) => ({
      ...job,
      ...(profile ? { matchScore: result.score, matchExplanation: explainMatchScore(result.details) } : {}),
    }));
}

const RECOMMENDED_COUNT = 3;

function formatRelativeDate(date: Date | string | null): string {
  if (!date) return "";
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaine${Math.floor(diffDays / 7) > 1 ? 's' : ''}`;
  return `Il y a ${Math.floor(diffDays / 30)} mois`;
}

// integre : affichée dans EspaceCandidatPage, qui fournit l'en-tête, le
// titre et la barre mobile (refonte de l'espace candidat, prompts 1 à 6).
export default function DashboardPage({ integre = false }: { integre?: boolean } = {}) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: jobs = [] } = useQuery<(JobPosting & { organizationName: string | null })[]>({
    queryKey: ["/api/jobs"],
  });

  // Candidates get these enriched with the offer's own title/location
  // straight from GET /api/applications — no need to separately join
  // against the /api/jobs list like the code below used to.
  const { data: applications = [] } = useQuery<(Application & { jobTitle?: string; location?: string; organizationName?: string | null })[]>({
    queryKey: ["/api/applications"],
    enabled: !!user,
  });

  // GET /api/profile answers { user, profile } (same as profile-view.tsx
  // reads it) — typing it as a bare CandidateProfile left every profile
  // field undefined, so completion and match scores ignored the profile.
  const { data: profileData } = useQuery<{ user: User; profile: CandidateProfile | null }>({
    queryKey: ["/api/profile"],
    enabled: !!user && user.userType === "candidate",
  });
  const profile = profileData?.profile ?? undefined;

  const [slotPickerTarget, setSlotPickerTarget] = useState<{ applicationId: string; jobTitle?: string } | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
    // Redirect agency users to their dedicated dashboard
    if (!isLoading && user && user.userType === "agency") {
      setLocation("/agency/dashboard");
    }
    // Redirect company users to their dedicated dashboard
    if (!isLoading && user && user.userType === "company") {
      setLocation("/company/dashboard");
    }
  }, [user, isLoading, setLocation]);

  // Every figure counts exactly what the "Candidatures récentes" badges show
  // (same statuses), and each sub-line describes that figure — no trend
  // arrows, since no variation over time is computed anywhere.
  const nowMs = Date.now();
  const awaitingAnswer = applications.filter((a) => a.status === "pending" || a.status === "reviewing").length;
  const interviews = applications.filter((a) => a.status === "interview");
  const upcomingInterviews = interviews.filter((a) => a.interviewDate && new Date(a.interviewDate).getTime() > nowMs).length;
  const slotsToPick = applications.filter((a) => a.status === "interview_proposed").length;
  const hired = applications.filter((a) => a.status === "hired").length;
  const candidateStats: StatItem[] = [
    {
      label: "Candidatures",
      value: applications.length,
      icon: FileText,
      trend: awaitingAnswer > 0 ? `${awaitingAnswer} en attente de réponse` : null,
    },
    {
      // jobs = every active offer on the platform, not offers this candidate
      // viewed (it used to be labelled "Offres vues").
      label: "Offres disponibles",
      value: jobs.length,
      icon: Eye,
      trend: null,
    },
    {
      label: "Entretiens",
      value: interviews.length,
      icon: Users,
      trend: upcomingInterviews > 0
        ? `${upcomingInterviews} à venir`
        : slotsToPick > 0
        ? `${slotsToPick} créneau${slotsToPick > 1 ? "x" : ""} à choisir`
        : null,
    },
    {
      // Counts "offered" too (badge « Offre »), so not just « Acceptés ».
      label: "Offres reçues",
      value: applications.filter((a) => a.status === "hired" || a.status === "offered").length,
      icon: CheckCircle2,
      trend: hired > 0 ? `dont ${hired} acceptée${hired > 1 ? "s" : ""}` : null,
    },
  ];

  const companyStats = [
    { label: "Offres", value: jobs.filter(j => j.isActive).length, icon: Briefcase, trend: "Actives" },
    { label: "Candidatures", value: applications.length, icon: FileText, trend: "Reçues" },
    { label: "Entretiens", value: applications.filter(a => a.status === "interview").length, icon: Users, trend: "Planifiés" },
    { label: "Pourvus", value: applications.filter(a => a.status === "hired").length, icon: CheckCircle2, trend: "Ce mois" },
  ];

  const agencyStats = [
    { label: "Candidats", value: 0, icon: Users, trend: "Actifs" },
    { label: "Placements", value: 0, icon: CheckCircle2, trend: "Ce mois" },
    { label: "Partenaires", value: 0, icon: Building2, trend: "Actifs" },
    { label: "Offres", value: jobs.length, icon: Briefcase, trend: "Disponibles" },
  ];

  const getStats = () => {
    switch (user?.userType) {
      case "candidate": return candidateStats;
      case "company": return companyStats;
      case "agency": return agencyStats;
      default: return candidateStats;
    }
  };

  const profileCompletion = user && profile ? calculateProfileCompletion(user, profile) : 
    (user ? calculateProfileCompletion(user) : 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="p-4 space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const stats = getStats();

  const handlePickSlot = (applicationId: string, jobTitle?: string) => {
    setSlotPickerTarget({ applicationId, jobTitle });
  };

  if (integre) {
    return (
      <>
        <DesktopDashboard
          user={user}
          stats={stats}
          jobs={jobs}
          applications={applications}
          profile={profile}
          profileCompletion={profileCompletion}
          onPickSlot={handlePickSlot}
          integre
        />
        {user.userType === "candidate" && (
          <PickInterviewSlotDialog
            applicationId={slotPickerTarget?.applicationId ?? null}
            jobTitle={slotPickerTarget?.jobTitle}
            open={!!slotPickerTarget}
            onOpenChange={(open) => { if (!open) setSlotPickerTarget(null); }}
          />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100">
      <div className="lg:hidden">
        <MobileDashboard
          user={user}
          stats={stats}
          jobs={jobs}
          applications={applications}
          profile={profile}
          profileCompletion={profileCompletion}
          onPickSlot={handlePickSlot}
        />
        <MobileBottomNav userType={user.userType} />
      </div>

      <div className="hidden lg:block">
        <DesktopDashboard
          user={user}
          stats={stats}
          jobs={jobs}
          applications={applications}
          profile={profile}
          profileCompletion={profileCompletion}
          onPickSlot={handlePickSlot}
        />
      </div>

      {user.userType === "candidate" && (
        <PickInterviewSlotDialog
          applicationId={slotPickerTarget?.applicationId ?? null}
          jobTitle={slotPickerTarget?.jobTitle}
          open={!!slotPickerTarget}
          onOpenChange={(open) => { if (!open) setSlotPickerTarget(null); }}
        />
      )}
    </div>
  );
}

interface StatItem {
  label: string;
  value: number;
  icon: typeof FileText;
  // Short description of the figure; null = nothing to add.
  trend: string | null;
}

type NextAction = {
  key: string;
  label: string;
  detail?: string;
  href?: string;
  pickSlot?: { applicationId: string; jobTitle?: string };
};

const PENDING_STALE_DAYS = 30;

function formatInterviewDate(value: Date | string): string {
  return new Date(value).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

// 1 to 3 things the candidate can actually do now, most urgent first, from
// their own applications. Nothing promises a feature the app lacks: there
// is no "relancer" (follow-up), so a stale application only offers
// withdraw-or-wait, on the applications screen.
function getNextActions(
  applications: (Application & { jobTitle?: string; organizationName?: string | null })[],
  profileCompletion: number,
): NextAction[] {
  const now = Date.now();
  const where = (app: { jobTitle?: string; organizationName?: string | null }) => {
    const title = formatJobTitle(app.jobTitle) || "Offre d'emploi";
    return app.organizationName ? `${title} chez ${app.organizationName}` : title;
  };
  const actions: NextAction[] = [];

  for (const app of applications.filter((a) => a.status === "interview_proposed")) {
    actions.push({ key: `slot-${app.id}`, label: "Choisir un créneau d'entretien", detail: where(app), pickSlot: { applicationId: app.id, jobTitle: app.jobTitle } });
  }

  const interviews = applications
    .filter((a) => a.status === "interview" && (!a.interviewDate || new Date(a.interviewDate).getTime() > now))
    .sort((a, b) => (a.interviewDate ? new Date(a.interviewDate).getTime() : Infinity) - (b.interviewDate ? new Date(b.interviewDate).getTime() : Infinity));
  for (const app of interviews) {
    actions.push({
      key: `interview-${app.id}`,
      label: `Préparer l'entretien chez ${app.organizationName ?? "l'employeur"}`,
      detail: app.interviewDate ? `${formatJobTitle(app.jobTitle) || "Offre"} — ${formatInterviewDate(app.interviewDate)}` : formatJobTitle(app.jobTitle),
      href: "/candidate-applications",
    });
  }

  for (const app of applications.filter((a) => a.status === "pending" && a.createdAt)) {
    const days = Math.floor((now - new Date(app.createdAt!).getTime()) / 86_400_000);
    if (days > PENDING_STALE_DAYS) {
      actions.push({ key: `stale-${app.id}`, label: `Sans réponse depuis ${days} jours`, detail: `${where(app)} : retirer ou attendre une réponse`, href: "/candidate-applications" });
    }
  }

  if (profileCompletion < 100) {
    actions.push({ key: "profile", label: "Compléter votre profil", detail: `Profil complété à ${profileCompletion} %`, href: "/profile" });
  }

  return actions.slice(0, 3);
}

function NextActionsList({ actions, onPickSlot }: { actions: NextAction[]; onPickSlot?: (applicationId: string, jobTitle?: string) => void }) {
  if (actions.length === 0) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm" data-testid="next-actions-empty">
        <p className="text-muted-foreground">Rien d'urgent pour le moment.</p>
        <Link href="/jobs" className="font-medium text-primary hover:underline">Voir les offres</Link>
      </div>
    );
  }
  const row = "flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-border/70 bg-background px-3 py-2 text-left text-sm hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const content = (action: NextAction) => (
    <>
      <span className="min-w-0">
        <span className="block font-medium">{action.label}</span>
        {action.detail && <span className="block truncate text-xs text-muted-foreground">{action.detail}</span>}
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </>
  );
  return (
    <ul className="space-y-2" data-testid="next-actions">
      {actions.map((action) => (
        <li key={action.key}>
          {action.pickSlot ? (
            <button type="button" className={row} onClick={() => onPickSlot?.(action.pickSlot!.applicationId, action.pickSlot!.jobTitle)} data-testid={`next-action-${action.key}`}>
              {content(action)}
            </button>
          ) : (
            <Link href={action.href!} className={row} data-testid={`next-action-${action.key}`}>
              {content(action)}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

interface DashboardProps {
  user: User;
  stats: StatItem[];
  jobs: (JobPosting & { organizationName: string | null })[];
  applications: (Application & { jobTitle?: string; location?: string; organizationName?: string | null })[];
  profile?: CandidateProfile;
  profileCompletion: number;
  onPickSlot?: (applicationId: string, jobTitle?: string) => void;
  integre?: boolean;
}

function MobileDashboard({ user, stats, jobs, applications, profile, profileCompletion, onPickSlot }: DashboardProps) {
  const { savedJobIds, toggleSave, isPending: isSavePending } = useSavedJobs();
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (user.userType === "agency") {
    return (
      <div className="p-4 pb-24">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold" data-testid="text-dashboard-title">Tableau de bord</h1>
            <p className="text-sm text-muted-foreground">Bienvenue, {user.fullName.split(" ")[0]}</p>
          </div>
          <Button variant="outline" size="icon" data-testid="button-notifications">
            <Bell className="h-4 w-4" />
          </Button>
        </div>
        <AgencyAnalytics />
      </div>
    );
  }

  return (
    <div className="pb-24 bg-gradient-to-br from-blue-50 via-white to-indigo-100 min-h-screen">
      <div className="bg-gradient-to-r from-indigo-500 to-blue-400 p-4 pb-7 rounded-b-3xl shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 ring-2 ring-white/20">
              <AvatarImage src={user.avatarUrl || undefined} />
              <AvatarFallback className="bg-primary-light text-primary-dark font-semibold">
                {getInitials(user.fullName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-white/80 text-sm">Bienvenue</p>
              <h1 className="text-white font-semibold" data-testid="text-user-name">
                {user.fullName.split(" ")[0]}
              </h1>
              {user.userType === "candidate" && (
                <p className="text-white/80 text-xs mt-0.5">{getPrimaryInsight(applications)}</p>
              )}
            </div>
          </div>
          {/* No bell here: the header's NotificationBell (real unread data)
              is the only one; this was a second, dead button. */}
        </div>

        {user.userType === "candidate" ? (
          <div className="flex flex-wrap gap-2">
            <Link href="/profile">
              {/* Navy, not the terracotta "secondary" variant: white on
                  terracotta measured 3.53:1, white on navy is 14:1. */}
              <Button size="sm" className="h-11 gap-2 px-4 bg-primary-dark text-white hover:bg-primary-dark/90" data-testid="button-mobile-complete-profile">
                <Edit className="h-3.5 w-3.5" />
                Compléter mon profil
              </Button>
            </Link>
            <Link href="/jobs">
              <Button size="sm" className="h-11 gap-2 px-4 bg-white text-primary hover:bg-white/90" data-testid="button-mobile-view-jobs">
                <Briefcase className="h-3.5 w-3.5" />
                Voir les offres
              </Button>
            </Link>
          </div>
        ) : (
          <Link href="/jobs">
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3 cursor-pointer hover:bg-white/20 transition-colors">
              <Search className="h-5 w-5 text-white/70" />
              <span className="text-white/70 text-sm">Rechercher un emploi...</span>
            </div>
          </Link>
        )}
      </div>

      <div className="px-4 -mt-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((stat, index) => {
            const tabKeys = ["candidatures", "offres", "entretiens", "acceptes"];
            return (
              <Link key={stat.label} href={`/statistics?tab=${tabKeys[index]}`}>
                <Card className="overflow-hidden hover-elevate cursor-pointer rounded-2xl border-border/70" data-testid={`stat-card-${tabKeys[index]}`}>
                  <CardContent className="p-3 min-h-[92px]">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <stat.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xl font-bold" data-testid={`stat-${stat.label.toLowerCase()}`}>
                          {stat.value}
                        </p>
                        <p className="text-[10px] text-muted-foreground leading-tight">{stat.label}</p>
                      </div>
                    </div>
                    {stat.trend && <p className="text-[10px] text-muted-foreground mt-1">{stat.trend}</p>}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {user.userType === "candidate" && (
          <>
            {/* Same order as desktop: what to act on (actions, applications)
                before recommendations. */}
            <Card className="rounded-2xl border-border/70">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Prochaines actions</CardTitle>
              </CardHeader>
              <CardContent>
                <NextActionsList actions={getNextActions(applications, profileCompletion)} onPickSlot={onPickSlot} />
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/70">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Candidatures récentes</CardTitle>
                  <Badge variant="secondary" className="text-xs">{applications.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {applications.length === 0 ? (
                  <div className="text-center py-4 space-y-3">
                    <p className="text-sm text-muted-foreground">Aucune candidature pour le moment</p>
                    <Link href="/jobs">
                      <Button size="sm" variant="outline" className="gap-2" data-testid="button-empty-apply-mobile">
                        <Briefcase className="h-4 w-4" />
                        Commencer a postuler
                      </Button>
                    </Link>
                  </div>
                ) : (
                  applications.slice(0, 3).map((app) => {
                    const status = statusConfig[app.status as keyof typeof statusConfig] || statusConfig.pending;
                    return (
                      <div
                        key={app.id}
                        className="flex flex-col gap-2 p-3 rounded-lg border border-border/70 bg-card"
                        data-testid={`application-${app.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{formatJobTitle(app.jobTitle) || "Offre d'emploi"}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatJobTitle(app.location) || "Localisation inconnue"} • {formatRelativeDate(app.createdAt)}
                            </p>
                          </div>
                          <Badge className={`${status.className} shrink-0 ml-2`}>
                            <status.icon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                        </div>
                        {app.status === "interview_proposed" && (
                          <Button
                            size="sm"
                            className="gap-1 bg-amber-600 hover:bg-amber-700 text-white w-fit"
                            onClick={() => onPickSlot?.(app.id, app.jobTitle)}
                            data-testid={`button-pick-interview-slot-${app.id}`}
                          >
                            <CalendarCheck className="h-4 w-4" />
                            Choisir un créneau
                          </Button>
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <div className="flex items-center justify-between">
              <h2 className="font-semibold" data-testid="text-offers-for-you">Offres pour vous</h2>
              <Link href="/jobs">
                <Button variant="ghost" size="sm" className="h-11 gap-1 text-xs">
                  Voir tout <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Button>
              </Link>
            </div>

            {jobs.length > 0 ? (
              <Card className="rounded-2xl border-border/70">
                <CardContent className="p-3">
                  <RecommendedJobsList
                    jobs={scoreAndSortJobs(jobs, user, profile).slice(0, RECOMMENDED_COUNT)}
                    savedJobIds={savedJobIds}
                    onToggleSave={toggleSave}
                    savePending={isSavePending}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card className="rounded-2xl border-border/70">
                <CardContent className="p-5 text-center space-y-3">
                  <p className="text-sm text-muted-foreground">Aucune offre recommandée pour le moment.</p>
                  <Link href="/jobs">
                    <Button className="h-11 gap-2" data-testid="button-empty-recommended-jobs-mobile">
                      <Briefcase className="h-4 w-4" />
                      Explorer les offres
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            <Card className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl border-border/70">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-primary/20">
                    <Mic className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">CV Vocal</h3>
                    <p className="text-xs text-muted-foreground">
                      Enregistrez votre présentation audio
                    </p>
                  </div>
                  <Link href="/profile">
                    <Button size="sm" className="h-11 px-4" data-testid="button-record-cv">
                      Créer
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {user.userType === "company" && (
          <>
            <Card className="rounded-2xl border-border/70">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Prochaines actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/applications" className="block">
                  <Button variant="outline" className="w-full justify-between" size="sm" data-testid="button-next-review-company-mobile">
                    Examiner les candidatures
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
                <Link href="/jobs/create" className="block">
                  <Button className="w-full justify-between" size="sm" data-testid="button-next-publish-company-mobile">
                    Publier une nouvelle offre
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/70">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Candidatures récentes</CardTitle>
                  <Link href="/applications">
                    <Button variant="ghost" size="sm" className="gap-1 text-xs">
                      Voir tout <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {applications.length === 0 ? (
                  <div className="text-center py-4 space-y-3">
                    <p className="text-sm text-muted-foreground">Aucune candidature reçue</p>
                    <Link href="/jobs/create">
                      <Button size="sm" variant="outline" className="gap-2" data-testid="button-empty-create-job-company-mobile">
                        <Plus className="h-4 w-4" />
                        Publier une offre
                      </Button>
                    </Link>
                  </div>
                ) : (
                  applications.slice(0, 4).map((app) => {
                    const status = statusConfig[app.status as keyof typeof statusConfig] || statusConfig.pending;
                    const job = jobs.find(j => j.id === app.jobId);
                    return (
                      <div
                        key={app.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        data-testid={`application-${app.id}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{job?.title || "Offre d'emploi"}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatRelativeDate(app.createdAt)}
                          </p>
                        </div>
                        <Badge className={`${status.className} shrink-0 ml-2`}>
                          <status.icon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Link href="/jobs/create">
              <Button className="w-full gap-2" data-testid="button-create-job">
                <Plus className="h-4 w-4" />
                Publier une nouvelle offre
              </Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function DesktopDashboard({ user, stats, jobs, applications, profile, profileCompletion, onPickSlot, integre = false }: DashboardProps) {
  const { savedJobIds, toggleSave, isPending: isSavePending } = useSavedJobs();
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (user.userType === "agency") {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">Tableau de bord</h1>
            <p className="text-muted-foreground">Bienvenue, {user.fullName}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" data-testid="button-notifications">
              <Bell className="h-4 w-4" />
            </Button>
            <Link href="/jobs/create">
              <Button className="gap-2" data-testid="button-create-job">
                <Plus className="h-4 w-4" />
                Nouvelle offre
              </Button>
            </Link>
          </div>
        </div>
        <div className="max-w-4xl mx-auto">
          <AgencyAnalytics />
        </div>
      </div>
    );
  }

  return (
    <div className={integre ? "" : "min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100"}>
      <div className={integre ? "py-8" : "container mx-auto px-4 py-8"}>
      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-80 space-y-6">
          <Card className="rounded-2xl border-border/70">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <Avatar className="h-20 w-20 mx-auto">
                  <AvatarImage src={user.avatarUrl || undefined} />
                  {/* Navy on light blue: white on gold was 2.4:1. */}
                  <AvatarFallback className="text-xl bg-primary-light text-primary-dark font-semibold">
                    {getInitials(user.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-semibold" data-testid="text-user-name">
                    {user.fullName}
                  </h2>
                  {/* Only what the candidate actually filled in — never a
                      dangling comma or an assumed country. */}
                  {[user.city, user.country].some(Boolean) && (
                    <p className="text-sm text-muted-foreground flex items-center justify-center gap-1" data-testid="text-user-location">
                      <MapPin className="h-3 w-3" aria-hidden="true" />
                      {[user.city, user.country].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {user.isVerified && (
                    <Badge variant="secondary" className="mt-2">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Profil vérifié
                    </Badge>
                  )}
                </div>

                {user.userType === "candidate" && (
                  <div className="space-y-2 pt-2 text-left" data-testid="profile-completion">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Profil complété à {profileCompletion} %</span>
                    </div>
                    <Progress value={profileCompletion} className="h-2" aria-label={`Profil complété à ${profileCompletion} %`} />
                    {(() => {
                      const step = nextProfileStep(user, profile);
                      return step ? (
                        <Link href={`/profile?section=${step.section}`} className="inline-flex text-sm font-medium text-primary hover:underline" data-testid="link-next-profile-step">
                          {step.label}
                        </Link>
                      ) : (
                        <p className="text-sm text-muted-foreground">Votre profil est complet.</p>
                      );
                    })()}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Link href="/profile?section=personal" className="flex-1">
                    <Button variant="outline" className="w-full gap-2" size="sm" data-testid="button-edit-profile">
                      <Edit className="h-4 w-4" />
                      Modifier
                    </Button>
                  </Link>
                  <Link href="/profile/view" className="flex-1">
                    {/* /profile/view is the candidate's own read-only view
                        (not the recruiter-side page), hence "Aperçu". */}
                    <Button variant="outline" className="w-full gap-2" size="sm" data-testid="button-view-profile">
                      <Eye className="h-4 w-4" />
                      Aperçu du profil
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Actions rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {user.userType === "candidate" && (
                <>
                  <Link href="/jobs" className="block">
                    <Button variant="ghost" className="w-full justify-start gap-2" data-testid="button-quick-jobs">
                      <Briefcase className="h-4 w-4" />
                      Rechercher des offres
                    </Button>
                  </Link>
                  <Link href="/saved-jobs" className="block">
                    <Button variant="ghost" className="w-full justify-start gap-2" data-testid="button-quick-saved-jobs">
                      <Bookmark className="h-4 w-4" />
                      Offres sauvegardées
                    </Button>
                  </Link>
                </>
              )}
              {user.userType === "company" && (
                <>
                  <Link href="/jobs/create" className="block">
                    <Button variant="ghost" className="w-full justify-start gap-2" data-testid="button-quick-post-job">
                      <Plus className="h-4 w-4" />
                      Publier une offre
                    </Button>
                  </Link>
                  <Link href="/applications" className="block">
                    <Button variant="ghost" className="w-full justify-start gap-2" data-testid="button-quick-received">
                      <FileText className="h-4 w-4" />
                      Candidatures reçues
                    </Button>
                  </Link>
                </>
              )}
              {/* "Paramètres" linked to /settings, a route that doesn't exist
                  (404); the profile card's « Modifier » covers account edits. */}
            </CardContent>
          </Card>
        </aside>

        <main className="flex-1 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">
                Tableau de bord
              </h1>
              {/* On the page's blue tint muted-foreground is ~4.1:1; slate-600 is 7:1. */}
              <p className="text-slate-600 dark:text-slate-300">Bienvenue, {user.fullName.split(" ")[0]} !</p>
            </div>
            <div className="flex gap-2">
              {user.userType === "company" && (
                <Link href="/jobs/create">
                  <Button className="gap-2" data-testid="button-create-job">
                    <Plus className="h-4 w-4" />
                    Nouvelle offre
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Dans l'espace candidat, remplacés par ChiffresCandidat. */}
          {!integre && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <Card key={stat.label} className="rounded-2xl border-border/70">
                <CardContent className="p-4 min-h-[108px]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <stat.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                  {stat.trend && <p className="text-xs text-muted-foreground mt-2" data-testid={`stat-trend-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}>{stat.trend}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
          )}

          {user.userType === "candidate" && (
            // "Candidatures récentes" first (left, and first in reading
            // order): it's what the candidate acts on; recommendations second.
            <div className={integre ? "" : "grid lg:grid-cols-2 gap-6 items-start"}>
              {/* Dans l'espace candidat, remplacée par CandidaturesRecentes. */}
              {!integre && (
              <Card className="rounded-2xl border-border/70" data-testid="card-recent-applications">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">Candidatures récentes</CardTitle>
                    {/* Was "/applications", a route that doesn't exist (404). */}
                    <Link href="/candidate-applications">
                      <Button variant="ghost" size="sm" className="gap-1">
                        Voir tout <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Dans l'espace candidat, remplacé par « À faire maintenant ». */}
                  {!integre && (
                    <div className="mb-4 p-3 rounded-xl border border-border/70 bg-card">
                      <h3 className="text-sm font-medium mb-2">Prochaines actions</h3>
                      <NextActionsList actions={getNextActions(applications, profileCompletion)} onPickSlot={onPickSlot} />
                    </div>
                  )}
                  <div className="space-y-3">
                    {applications.length === 0 ? (
                      <div className="text-center py-4 space-y-3">
                        <p className="text-sm text-muted-foreground">Aucune candidature pour le moment</p>
                        <Link href="/jobs">
                          <Button size="sm" variant="outline" className="gap-2" data-testid="button-empty-apply-desktop">
                            <Briefcase className="h-4 w-4" />
                            Commencer a postuler
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      applications.map((app) => {
                        const status = statusConfig[app.status as keyof typeof statusConfig] || statusConfig.pending;
                        return (
                          <div
                            key={app.id}
                            className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/70 bg-card"
                            data-testid={`application-${app.id}`}
                          >
                            <div className="min-w-0">
                              <p className="font-medium truncate">{formatJobTitle(app.jobTitle) || "Offre d'emploi"}</p>
                              <p className="text-sm text-muted-foreground">
                                {[formatJobTitle(app.location), formatRelativeDate(app.createdAt)].filter(Boolean).join(" • ")}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {app.status === "interview_proposed" && (
                                <Button
                                  size="sm"
                                  className="gap-1 bg-amber-600 hover:bg-amber-700 text-white"
                                  onClick={() => onPickSlot?.(app.id, app.jobTitle)}
                                  data-testid={`button-pick-interview-slot-${app.id}`}
                                >
                                  <CalendarCheck className="h-4 w-4" />
                                  Choisir un créneau
                                </Button>
                              )}
                              <Badge className={status.className}>
                                <status.icon className="h-3 w-3 mr-1" />
                                {status.label}
                              </Badge>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
              )}

              <Card className="rounded-2xl border-border/70" data-testid="card-recommended-jobs">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">Offres recommandées</CardTitle>
                    <Link href="/jobs">
                      <Button variant="ghost" size="sm" className="gap-1">
                        Voir tout <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {jobs.length > 0 ? (
                    <RecommendedJobsList
                      jobs={scoreAndSortJobs(jobs, user, profile).slice(0, RECOMMENDED_COUNT)}
                      savedJobIds={savedJobIds}
                      onToggleSave={toggleSave}
                      savePending={isSavePending}
                    />
                  ) : (
                    <div className="text-center py-6 space-y-3">
                      <p className="text-sm text-muted-foreground">Aucune offre recommandée pour le moment.</p>
                      <Link href="/jobs">
                        <Button size="sm" variant="outline" className="gap-2" data-testid="button-empty-recommended-jobs-desktop">
                          <Briefcase className="h-4 w-4" />
                          Explorer les offres
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {user.userType === "company" && (
            <Card className="rounded-2xl border-border/70">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Candidatures récentes</CardTitle>
                  <Link href="/applications">
                    <Button variant="ghost" size="sm" className="gap-1">
                      Voir tout <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-3 rounded-xl border border-border/70 bg-muted/20">
                  <p className="text-sm font-medium mb-2">Prochaines actions</p>
                  <div className="flex flex-wrap gap-2">
                    <Link href="/applications">
                      <Button size="sm" variant="outline" className="gap-2" data-testid="button-next-review-company-desktop">
                        <FileText className="h-3.5 w-3.5" />
                        Examiner les candidatures
                      </Button>
                    </Link>
                    <Link href="/jobs/create">
                      <Button size="sm" className="gap-2" data-testid="button-next-publish-company-desktop">
                        <Plus className="h-3.5 w-3.5" />
                        Publier une offre
                      </Button>
                    </Link>
                  </div>
                </div>
                <div className="space-y-3">
                  {applications.length === 0 ? (
                    <div className="text-center py-4 space-y-3">
                      <p className="text-sm text-muted-foreground">Aucune candidature reçue</p>
                      <Link href="/jobs/create">
                        <Button size="sm" variant="outline" className="gap-2" data-testid="button-empty-create-job-company-desktop">
                          <Plus className="h-4 w-4" />
                          Publier une offre
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    applications.map((app) => {
                      const status = statusConfig[app.status as keyof typeof statusConfig] || statusConfig.pending;
                      const job = jobs.find(j => j.id === app.jobId);
                      return (
                        <div
                        key={app.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div>
                            <p className="font-medium">{job?.title || "Offre d'emploi"}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatRelativeDate(app.createdAt)}
                            </p>
                          </div>
                          <Badge className={status.className}>
                            <status.icon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
      </div>
    </div>
  );
}
