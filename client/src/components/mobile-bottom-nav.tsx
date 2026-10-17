import { useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Home, Briefcase, User, BarChart3, Users, Building2, Search, Heart, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UserType } from "@shared/schema";

// Publie la hauteur réelle de la barre (0 quand elle est masquée, dès lg)
// dans --hauteur-barre-bas : le pied de page réserve cet espace en bas pour
// que la barre fixe ne cache jamais sa dernière ligne.
function usePublierHauteur() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const racine = document.documentElement;
    const publier = () => racine.style.setProperty("--hauteur-barre-bas", `${el.offsetHeight}px`);
    publier();
    const observateur = new ResizeObserver(publier);
    observateur.observe(el);
    window.addEventListener("resize", publier);
    return () => {
      observateur.disconnect();
      window.removeEventListener("resize", publier);
      racine.style.removeProperty("--hauteur-barre-bas");
    };
  }, []);
  return ref;
}

interface BottomNavProps {
  userType: UserType;
}

export function MobileBottomNav({ userType }: BottomNavProps) {
  const [location] = useLocation();
  const barre = usePublierHauteur();

  const candidateNavItems = [
    { href: "/espace-personnel", icon: Home, label: "Accueil" },
    { href: "/candidate/jobs", icon: Search, label: "Recherche" },
    { href: "/candidate-applications", icon: Heart, label: "Mes candidatures" },
    { href: "/saved-jobs", icon: Bookmark, label: "Favoris" },
    { href: "/candidate/profile", icon: User, label: "Profil" },
  ];

  const agencyNavItems = [
    { href: "/agency/dashboard", icon: Home, label: "Accueil" },
    { href: "/agency/candidates", icon: Users, label: "Candidats" },
    { href: "/agency/analytics", icon: BarChart3, label: "Stats" },
    { href: "/agency/settings", icon: User, label: "Profil" },
  ];

  const companyNavItems = [
    { href: "/company/dashboard", icon: Home, label: "Accueil" },
    { href: "/company/jobs", icon: Briefcase, label: "Offres" },
    { href: "/company/applications", icon: Users, label: "Candidats" },
    { href: "/company/settings", icon: Building2, label: "Entreprise" },
  ];

  const navItems = userType === "candidate" 
    ? candidateNavItems 
    : userType === "agency" 
    ? agencyNavItems 
    : companyNavItems;

  if (userType === "candidate") {
    return (
      <nav
        ref={barre}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Equal grid columns, not justify-around + px-4: at 360px the five
            content-sized links summed to ~410px and "Profil" was pushed
            off-screen. */}
        <div className="grid grid-cols-5 px-1 py-2">
          {candidateNavItems.map((item) => {
            const isActive = location === item.href ||
              (item.href === "/candidate/jobs" && location.startsWith("/candidate/jobs"));

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className="flex min-h-[52px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-1.5 text-center"
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
                  className={`text-[11px] leading-tight break-words ${
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
    <nav ref={barre} className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="flex items-center justify-around py-2 px-1">
        {navItems.map((item) => {
          const isActive = location === item.href ||
            (!item.href.endsWith("/dashboard") && location.startsWith(item.href));
          
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
