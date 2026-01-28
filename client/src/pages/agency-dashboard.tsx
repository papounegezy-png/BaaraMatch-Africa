import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { AgencySidebar } from "@/components/agency-sidebar";
import { AgencyKPICards } from "@/components/agency-kpi-cards";
import { CandidateManagementTable } from "@/components/candidate-management-table";
import { CRMMessagingModule } from "@/components/crm-messaging-module";
import { HRPerformanceCharts } from "@/components/hr-performance-charts";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Bell, 
  Download,
  RefreshCw,
  ChevronDown
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AgencyDashboardPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const getInitials = (name: string) => {
    return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
  };

  const today = new Date().toLocaleDateString('fr-FR', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex min-h-screen w-full">
        <AgencySidebar />
        
        <SidebarInset className="flex flex-col min-h-screen overflow-hidden">
          <header className="sticky top-0 z-40 bg-background border-b border-border px-4 lg:px-6">
            <div className="flex items-center justify-between h-16 gap-4">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" data-testid="button-toggle-sidebar" />
                <div className="hidden sm:block">
                  <h1 className="text-lg font-semibold">Tableau de Bord</h1>
                  <p className="text-xs text-muted-foreground capitalize">{today}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="hidden md:flex">
                  <Download className="h-4 w-4 mr-2" />
                  Exporter
                </Button>
                <Button variant="outline" size="sm" className="hidden md:flex">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualiser
                </Button>
                <Button variant="ghost" size="icon" data-testid="button-notifications">
                  <Bell className="h-5 w-5" />
                </Button>
                <ThemeToggle />
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="gap-2 pl-2 pr-3" data-testid="button-user-menu">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(user.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden md:inline text-sm font-medium">{user.fullName}</span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Mon Compte</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Profil</DropdownMenuItem>
                    <DropdownMenuItem>Paramètres</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      Déconnexion
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto">
            <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
              <div>
                <h2 className="text-2xl font-bold">
                  Bonjour, {user.fullName.split(" ")[0]}
                </h2>
                <p className="text-muted-foreground mt-1">
                  Voici un aperçu de l'activité de votre agence aujourd'hui.
                </p>
              </div>

              <AgencyKPICards />

              <HRPerformanceCharts />

              <CandidateManagementTable />

              <CRMMessagingModule />
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
