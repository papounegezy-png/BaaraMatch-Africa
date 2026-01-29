import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { AgencySidebar } from "@/components/agency-sidebar";
import { AgencyKPICards } from "@/components/agency-kpi-cards";
import { ActiveContractsTable } from "@/components/active-contracts-table";
import { CandidateSearchDashboard } from "@/components/candidate-search-dashboard";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, Search } from "lucide-react";

export default function AgencyDashboardPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3.5rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex min-h-screen w-full bg-gray-50 dark:bg-gray-900">
        <AgencySidebar />
        
        <SidebarInset className="flex flex-col min-h-screen overflow-hidden">
          <header className="sticky top-0 z-40 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-6 lg:px-8">
            <div className="flex items-center justify-between h-[74px] gap-4">
              <div className="flex items-center gap-4 flex-1">
                <SidebarTrigger className="-ml-2 lg:hidden" data-testid="button-toggle-sidebar" />
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Rechercher un candidat, une mission..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10 bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700 rounded-xl text-base"
                    data-testid="input-search"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative h-9 w-9 rounded-xl"
                  data-testid="button-notifications"
                >
                  <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                </Button>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto">
            <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
              <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
                Tableau de bord
              </h1>

              <AgencyKPICards />

              <ActiveContractsTable />

              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Recherche de Candidats IA</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Filtrage intelligent par compétences, expérience et disponibilité
                    </p>
                  </div>
                </div>
                <CandidateSearchDashboard />
              </div>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
