import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { CompanySidebar } from "@/components/company-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Search, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import { NotificationBell } from "@/components/notification-bell";

interface CompanyLayoutProps {
  children: React.ReactNode;
}

export function CompanyLayout({ children }: CompanyLayoutProps) {
  const { logout } = useAuth();

  const sidebarStyle = {
    "--sidebar-width": "280px",
    "--sidebar-width-icon": "60px",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full bg-background">
        <CompanySidebar />
        <SidebarInset className="flex-1 flex flex-col overflow-hidden">
          <header className="flex items-center justify-between h-14 px-4 border-b bg-background shrink-0">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Rechercher candidats, offres..."
                  className="w-72 pl-9"
                  data-testid="input-search"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <ThemeToggle />
              <Link href="/">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => logout()}
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
