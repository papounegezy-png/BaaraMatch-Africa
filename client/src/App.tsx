import { Switch, Route, useLocation } from "wouter";
import { lazy, Suspense, useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/lib/auth";
import { useVisitTracker } from "@/hooks/use-visit-tracker";
import { useRouteTitle } from "@/lib/page-title";
import type { UserType } from "@shared/schema";
import { Navbar } from "@/components/navbar";
import { PiedAccueil } from "@/components/home/pied-accueil";
import { useDefilementAncre } from "@/hooks/use-defilement-ancre";
import { LoadingState } from "@/components/loading-state";
import HomePage from "@/pages/home";

// Découpage par route : chaque page est un fichier JavaScript à part, chargé
// à la première visite. L'accueil reste dans le paquet principal (page
// d'arrivée). Les <Suspense> sont dans les mises en page : en-tête, menu et
// pied de page restent affichés pendant le chargement d'une page.
// Mises en page des espaces agence et entreprise (menus latéraux) : chargées
// avec leur espace, pas sur les pages publiques.
const AgencyLayout = lazy(() => import("@/components/agency-layout").then((m) => ({ default: m.AgencyLayout })));
const CompanyLayout = lazy(() => import("@/components/company-layout").then((m) => ({ default: m.CompanyLayout })));
const LoginPage = lazy(() => import("@/pages/login"));
const RegisterPage = lazy(() => import("@/pages/register"));
const RegisterOrganizationPage = lazy(() => import("@/pages/register-organization"));
const OrganizationClaimPage = lazy(() => import("@/pages/organization-claim"));
const SatisfactionSurveyPage = lazy(() => import("@/pages/satisfaction-survey"));
const DashboardPage = lazy(() => import("@/pages/dashboard"));
const ProfilePage = lazy(() => import("@/pages/profile"));
// Page Offres refondue (pages/offres.tsx) ; l'ancienne pages/jobs.tsx sera
// supprimée à la passe finale.
const JobsPage = lazy(() => import("@/pages/offres"));
const AgenciesPage = lazy(() => import("@/pages/agencies"));
const ServicesPage = lazy(() => import("@/pages/services"));
const AgencyDashboardPage = lazy(() => import("@/pages/agency-dashboard"));
const AgencyProfilePage = lazy(() => import("@/pages/agency-profile"));
const AgencyJobsPage = lazy(() => import("@/pages/agency-jobs"));
const CompanyProfilePage = lazy(() => import("@/pages/company-profile"));
const CompanyJobsPage = lazy(() => import("@/pages/company-jobs"));
const CompanyDashboardPage = lazy(() => import("./pages/company-dashboard"));
const AdminDashboardPage = lazy(() => import("@/pages/admin-dashboard"));
const CandidateApplicationsPage = lazy(() => import("./pages/candidate-applications"));
const SavedJobsPage = lazy(() => import("./pages/saved-jobs"));
const JobDetailPage = lazy(() => import("@/pages/job-detail"));
const NotificationsPage = lazy(() => import("@/pages/notifications"));
const StatisticsPage = lazy(() => import("@/pages/statistics"));
const NotFound = lazy(() => import("@/pages/not-found"));
const LegalPlaceholderPage = lazy(() => import("@/pages/legal-placeholder"));

// Centralized route guard: redirects to /login (no session) or / (wrong role)
// before the wrapped router's pages ever mount. Each dashboard page still
// keeps its own internal check as a redundant safety net — this wrapper adds
// protection for any route added later that might forget one, rather than
// replacing what already works.
function RequireRole({ role, children }: { role: UserType; children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      setLocation("/login");
    } else if (user.userType !== role) {
      setLocation("/");
    }
  }, [user, isLoading, role, setLocation]);

  if (isLoading || !user || user.userType !== role) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return <>{children}</>;
}

// Attente pendant le chargement d'une page (fichier JavaScript de la route).
// Hauteur d'un écran : le pied de page reste hors de vue au lieu d'apparaître
// en haut puis d'être repoussé (décalage de mise en page).
function ChargementPage() {
  return <LoadingState label="Chargement de la page" variant="block" rows={3} className="container mx-auto min-h-screen px-4 py-10" />;
}

function PublicLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  useDefilementAncre();

  return (
    <div className="min-h-screen flex flex-col">
      {/* L'accueil, Services et Offres affichent leur propre en-tête (EnteteAccueil). */}
      {!["/", "/services", "/jobs", "/candidate/jobs"].includes(location) && <Navbar user={user} onLogout={logout} />}
      <main className="flex-1"><Suspense fallback={<ChargementPage />}>{children}</Suspense></main>
      <PiedAccueil />
    </div>
  );
}

function PublicRouter() {
  return (
    <PublicLayout>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/register" component={RegisterPage} />
        <Route path="/register/organisation" component={RegisterOrganizationPage} />
        <Route path="/claim/:token" component={OrganizationClaimPage} />
        <Route path="/satisfaction/:token" component={SatisfactionSurveyPage} />
        <Route path="/espace-personnel" component={DashboardPage} />
        <Route path="/statistics" component={StatisticsPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/profile/view" component={ProfilePage} />
        <Route path="/jobs" component={JobsPage} />
        <Route path="/jobs/:id" component={JobDetailPage} />
        <Route path="/saved-jobs" component={SavedJobsPage} />
        <Route path="/agencies" component={AgenciesPage} />
        <Route path="/services" component={ServicesPage} />
        <Route path="/agencies/:id" component={AgencyProfilePage} />
        <Route path="/agencies/:id/jobs" component={AgencyJobsPage} />
        <Route path="/companies/:id" component={CompanyProfilePage} />
        <Route path="/companies/:id/jobs" component={CompanyJobsPage} />
        <Route path="/notifications" component={NotificationsPage} />
        <Route path="/privacy" component={LegalPlaceholderPage} />
        <Route path="/terms" component={LegalPlaceholderPage} />
        <Route path="/legal-notice" component={LegalPlaceholderPage} />
        <Route component={NotFound} />
      </Switch>
    </PublicLayout>
  );
}

function AgencyRouter() {
  return (
    <RequireRole role="agency">
    <AgencyLayout>
      <Suspense fallback={<ChargementPage />}>
      <Switch>
        <Route path="/agency/dashboard" component={AgencyDashboardPage} />
        <Route path="/agency/dashboard/:subsection" component={AgencyDashboardPage} />
        <Route path="/agency/candidates" component={AgencyDashboardPage} />
        <Route path="/agency/candidates/:subsection" component={AgencyDashboardPage} />
        <Route path="/agency/companies" component={AgencyDashboardPage} />
        <Route path="/agency/companies/:subsection" component={AgencyDashboardPage} />
        <Route path="/agency/calendar" component={AgencyDashboardPage} />
        <Route path="/agency/pipeline" component={AgencyDashboardPage} />
        <Route path="/agency/placements" component={AgencyDashboardPage} />
        <Route path="/agency/placements/clients" component={AgencyDashboardPage} />
        <Route path="/agency/placements/:id" component={AgencyDashboardPage} />
        <Route path="/agency/missions" component={AgencyDashboardPage} />
        <Route path="/agency/missions/:subsection" component={AgencyDashboardPage} />
        <Route path="/agency/missions/:id/edit" component={AgencyDashboardPage} />
        <Route path="/agency/contracts" component={AgencyDashboardPage} />
        <Route path="/agency/contracts/:subsection" component={AgencyDashboardPage} />
        <Route path="/agency/billing" component={AgencyDashboardPage} />
        <Route path="/agency/billing/:subsection" component={AgencyDashboardPage} />
        <Route path="/agency/hr" component={AgencyDashboardPage} />
        <Route path="/agency/hr/:subsection" component={AgencyDashboardPage} />
        <Route path="/agency/crm" component={AgencyDashboardPage} />
        <Route path="/agency/crm/:subsection" component={AgencyDashboardPage} />
        <Route path="/agency/analytics" component={AgencyDashboardPage} />
        <Route path="/agency/analytics/:subsection" component={AgencyDashboardPage} />
        <Route path="/agency/settings" component={AgencyDashboardPage} />
        <Route path="/agency/settings/:subsection" component={AgencyDashboardPage} />
        <Route path="/agency/security" component={AgencyDashboardPage} />
        <Route path="/agency/security/:subsection" component={AgencyDashboardPage} />
        <Route path="/agency/support" component={AgencyDashboardPage} />
        <Route path="/agency/support/:subsection" component={AgencyDashboardPage} />
        <Route path="/agency/:section" component={AgencyDashboardPage} />
        {/* Deeper unknown paths (/agency/x/y) used to match nothing: blank page. */}
        <Route component={NotFound} />
      </Switch>
      </Suspense>
    </AgencyLayout>
    </RequireRole>
  );
}

function CandidateRouter() {
  return (
    <RequireRole role="candidate">
    <PublicLayout>
      <Switch>
        <Route path="/candidate/jobs" component={JobsPage} />
        <Route path="/candidate-applications" component={CandidateApplicationsPage} />
        <Route path="/candidate/profile" component={ProfilePage} />
        <Route path="/candidate/profile/view" component={ProfilePage} />
        <Route component={NotFound} />
      </Switch>
    </PublicLayout>
    </RequireRole>
  );
}

function CompanyRouter() {
  return (
    <RequireRole role="company">
    <CompanyLayout>
      <Suspense fallback={<ChargementPage />}>
      <Switch>
        <Route path="/company/dashboard" component={CompanyDashboardPage} />
        <Route path="/company/dashboard/:subsection" component={CompanyDashboardPage} />
        <Route path="/company/jobs" component={CompanyDashboardPage} />
        <Route path="/company/jobs/:subsection" component={CompanyDashboardPage} />
        <Route path="/company/jobs/:id/edit" component={CompanyDashboardPage} />
        <Route path="/company/applications" component={CompanyDashboardPage} />
        <Route path="/company/applications/:subsection" component={CompanyDashboardPage} />
        <Route path="/company/candidates/:id" component={CompanyDashboardPage} />
        <Route path="/company/calendar" component={CompanyDashboardPage} />
        <Route path="/company/pipeline" component={CompanyDashboardPage} />
        <Route path="/company/pipeline/:subsection" component={CompanyDashboardPage} />
        <Route path="/company/statistics" component={CompanyDashboardPage} />
        <Route path="/company/statistics/:subsection" component={CompanyDashboardPage} />
        <Route path="/company/employees" component={CompanyDashboardPage} />
        <Route path="/company/employees/:subsection" component={CompanyDashboardPage} />
        <Route path="/company/leaves" component={CompanyDashboardPage} />
        <Route path="/company/leaves/:subsection" component={CompanyDashboardPage} />
        <Route path="/company/payroll" component={CompanyDashboardPage} />
        <Route path="/company/payroll/:subsection" component={CompanyDashboardPage} />
        <Route path="/company/orgchart" component={CompanyDashboardPage} />
        <Route path="/company/departments" component={CompanyDashboardPage} />
        <Route path="/company/departments/:subsection" component={CompanyDashboardPage} />
        <Route path="/company/positions" component={CompanyDashboardPage} />
        <Route path="/company/positions/:subsection" component={CompanyDashboardPage} />
        <Route path="/company/security" component={CompanyDashboardPage} />
        <Route path="/company/security/:subsection" component={CompanyDashboardPage} />
        <Route path="/company/sites" component={CompanyDashboardPage} />
        <Route path="/company/sites/:subsection" component={CompanyDashboardPage} />
        <Route path="/company/certifications" component={CompanyDashboardPage} />
        <Route path="/company/certifications/:subsection" component={CompanyDashboardPage} />
        <Route path="/company/epi" component={CompanyDashboardPage} />
        <Route path="/company/epi/:subsection" component={CompanyDashboardPage} />
        <Route path="/company/hse" component={CompanyDashboardPage} />
        <Route path="/company/hse/:subsection" component={CompanyDashboardPage} />
        <Route path="/company/settings" component={CompanyDashboardPage} />
        <Route path="/company/settings/:subsection" component={CompanyDashboardPage} />
        <Route path="/company/support" component={CompanyDashboardPage} />
        <Route path="/company" component={CompanyDashboardPage} />
        <Route component={NotFound} />
      </Switch>
      </Suspense>
    </CompanyLayout>
    </RequireRole>
  );
}

function AppRouter() {
  const [location] = useLocation();
  useVisitTracker();
  useRouteTitle(location);

  if (location.startsWith("/admin")) {
    return (
      <RequireRole role="admin">
        <Suspense fallback={<ChargementPage />}>
          <AdminDashboardPage />
        </Suspense>
      </RequireRole>
    );
  }
  
  if (location.startsWith("/agency")) {
    return <Suspense fallback={<ChargementPage />}><AgencyRouter /></Suspense>;
  }
  
  if (location.startsWith("/company")) {
    return <Suspense fallback={<ChargementPage />}><CompanyRouter /></Suspense>;
  }
  
  // Exact prefixes, not startsWith("/candidate"): that also captured
  // unrelated paths such as "/candidates" and sent visitors to /login.
  if (location === "/candidate-applications" || location.startsWith("/candidate/")) {
    return <CandidateRouter />;
  }
  
  return <PublicRouter />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="baaramatch-theme">
        <TooltipProvider>
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
