import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import HomePage from "@/pages/home";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import DashboardPage from "@/pages/dashboard";
import ProfilePage from "@/pages/profile";
import JobsPage from "@/pages/jobs";
import CandidatesPage from "@/pages/candidates";
import AgenciesPage from "@/pages/agencies";
import AgencyDashboardPage from "@/pages/agency-dashboard";
import AgencyProfilePage from "@/pages/agency-profile";
import AgencyJobsPage from "@/pages/agency-jobs";
import CandidateJobsPage from "@/pages/candidate-jobs";
import JobDetailPage from "@/pages/job-detail";
import NotificationsPage from "@/pages/notifications";
import StatisticsPage from "@/pages/statistics";
import NotFound from "@/pages/not-found";

function PublicLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} onLogout={logout} />
      <main className="flex-1">{children}</main>
      <Footer />
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
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/statistics" component={StatisticsPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/jobs" component={JobsPage} />
        <Route path="/jobs/:id" component={JobDetailPage} />
        <Route path="/candidates" component={CandidatesPage} />
        <Route path="/agencies" component={AgenciesPage} />
        <Route path="/agencies/:id" component={AgencyProfilePage} />
        <Route path="/agencies/:id/jobs" component={AgencyJobsPage} />
        <Route path="/notifications" component={NotificationsPage} />
        <Route component={NotFound} />
      </Switch>
    </PublicLayout>
  );
}

function AgencyRouter() {
  return (
    <Switch>
      <Route path="/agency/dashboard" component={AgencyDashboardPage} />
      <Route path="/agency/:section" component={AgencyDashboardPage} />
    </Switch>
  );
}

function CandidateRouter() {
  return (
    <Switch>
      <Route path="/candidate/jobs" component={CandidateJobsPage} />
      <Route path="/candidate/dashboard" component={CandidateJobsPage} />
      <Route path="/candidate/applications" component={CandidateJobsPage} />
      <Route path="/candidate/profile" component={CandidateJobsPage} />
    </Switch>
  );
}

function AppRouter() {
  const [location] = useLocation();
  
  if (location.startsWith("/agency")) {
    return <AgencyRouter />;
  }
  
  if (location.startsWith("/candidate")) {
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
