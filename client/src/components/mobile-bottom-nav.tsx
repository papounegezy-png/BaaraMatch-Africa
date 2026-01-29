import { Link, useLocation } from "wouter";
import { Home, Briefcase, User, Bell, BarChart3, Users, Building2, Search, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UserType } from "@shared/schema";

interface BottomNavProps {
  userType: UserType;
}

export function MobileBottomNav({ userType }: BottomNavProps) {
  const [location] = useLocation();

  const candidateNavItems = [
    { href: "/candidate/jobs", icon: Search, label: "Recherche" },
    { href: "/candidate/applications", icon: Heart, label: "Mes candidatures" },
    { href: "/candidate/profile", icon: User, label: "Profil" },
  ];

  const agencyNavItems = [
    { href: "/dashboard", icon: Home, label: "Accueil" },
    { href: "/candidates", icon: Users, label: "Candidats" },
    { href: "/analytics", icon: BarChart3, label: "Stats" },
    { href: "/profile", icon: User, label: "Profil" },
  ];

  const companyNavItems = [
    { href: "/dashboard", icon: Home, label: "Accueil" },
    { href: "/jobs", icon: Briefcase, label: "Offres" },
    { href: "/applications", icon: Users, label: "Candidats" },
    { href: "/profile", icon: Building2, label: "Entreprise" },
  ];

  const navItems = userType === "candidate" 
    ? candidateNavItems 
    : userType === "agency" 
    ? agencyNavItems 
    : companyNavItems;

  if (userType === "candidate") {
    return (
      <nav 
        className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-around px-4 py-3">
          {candidateNavItems.map((item) => {
            const isActive = location === item.href || 
              (item.href === "/candidate/jobs" && (location === "/candidate/dashboard" || location.startsWith("/candidate/jobs")));
            
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className="flex flex-col items-center gap-1 py-2 px-4 rounded-xl"
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <item.icon 
                  className={`h-6 w-6 ${
                    isActive 
                      ? "text-purple-600 dark:text-purple-400" 
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                />
                <span 
                  className={`text-xs ${
                    isActive 
                      ? "font-bold text-purple-600 dark:text-purple-400" 
                      : "font-normal text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="flex items-center justify-around py-2 px-1">
        {navItems.map((item) => {
          const isActive = location === item.href || 
            (item.href !== "/dashboard" && location.startsWith(item.href));
          
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                size="lg"
                className={`flex flex-col items-center justify-center gap-0.5 ${
                  isActive ? "bg-primary/10" : ""
                }`}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? "text-accent" : "text-muted-foreground"}`} />
                <span className={`text-[10px] font-medium ${isActive ? "text-accent" : "text-muted-foreground"}`}>
                  {item.label}
                </span>
              </Button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
