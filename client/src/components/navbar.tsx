import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Menu, X, Briefcase, Building2, Layers, ChevronDown, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { User } from "@shared/schema";
import { ClocheNotifications } from "@/components/cloche-notifications";

interface NavbarProps {
  user?: User | null;
  onLogout?: () => void;
}

export function Navbar({ user, onLogout }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [location] = useLocation();
  const menuToggleRef = useRef<HTMLButtonElement>(null);

  // Escape closes the mobile menu and hands focus back to its toggle.
  useEffect(() => {
    if (!isMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMenuOpen(false);
        menuToggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isMenuOpen]);

  const userSpacePath =
    user?.userType === "agency"
      ? "/agency/dashboard"
      : user?.userType === "company"
        ? "/company/dashboard"
        : user?.userType === "candidate"
          ? "/espace-personnel"
          : "/dashboard";

  // "Employeurs" and "Services" are aimed at visitors and recruiters; a
  // logged-in candidate only gets what they use (Offres, Mon espace).
  const navLinks = [
    { href: "/jobs", label: "Offres", icon: Briefcase, chevron: true },
    ...(user?.userType === "candidate" ? [] : [
      { href: "/agencies", label: "Employeurs", icon: Building2 },
      { href: "/services", label: "Services", icon: Layers },
    ]),
  ];

  const isActive = (path: string) => location === path;
  const isUserSpaceActive = !!user && isActive(userSpacePath);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-primary-dark/40 bg-primary-dark text-primary-foreground shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gold flex-shrink-0">
              <span className="text-sm font-bold text-white">B</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-white" data-testid="text-logo">
              BaaraMatch
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <Button
                  variant="ghost"
                  className={`gap-1 rounded-full px-4 text-white/85 hover:text-white ${isActive(link.href) ? "bg-white/10 text-white" : ""}`}
                  data-testid={`link-nav-${link.href.slice(1)}`}
                >
                  {link.label}
                  {link.chevron && <ChevronDown className="h-3.5 w-3.5" />}
                </Button>
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Visible at every width: on mobile this was hidden, which left
                only the dashboard's own bell — a dead button. */}
            {user && <ClocheNotifications buttonClassName="text-white/85 hover:text-white" />}

            <ThemeToggle />

            {user ? (
              <div className="hidden lg:flex items-center gap-2">
                {/* One tab stop (the button), not link + button. */}
                <Link href={userSpacePath} tabIndex={-1}>
                  <Button
                    variant="ghost"
                    className={`text-white/85 hover:text-white ${isUserSpaceActive ? "bg-white/10 text-white underline decoration-gold decoration-2 underline-offset-8" : ""}`}
                    aria-current={isUserSpaceActive ? "page" : undefined}
                    data-testid="link-dashboard"
                  >
                    Mon espace
                  </Button>
                </Link>
                <Button variant="outline" onClick={onLogout} data-testid="button-logout">
                  Déconnexion
                </Button>
              </div>
            ) : (
              <div className="hidden lg:flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" className="gap-1.5 text-white/85 hover:text-white" data-testid="link-login">
                    <UserRound className="h-4 w-4" />
                    Connexion / Inscription
                  </Button>
                </Link>
                <Link href="/register?type=company">
                  <Button className="bg-primary hover:bg-primary/90 rounded-md" data-testid="link-employer-space">
                    Espace Employeur
                  </Button>
                </Link>
              </div>
            )}

            <Button
              ref={menuToggleRef}
              variant="ghost"
              size="icon"
              className="h-11 w-11 lg:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={isMenuOpen}
              aria-controls="navbar-mobile-menu"
              data-testid="button-menu-toggle"
            >
              {isMenuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            </Button>
          </div>
        </div>

        {isMenuOpen && (
          <div id="navbar-mobile-menu" className="lg:hidden py-4 border-t border-white/10">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <Button
                    variant={isActive(link.href) ? "secondary" : "ghost"}
                    className="w-full justify-start gap-2"
                    onClick={() => setIsMenuOpen(false)}
                    data-testid={`link-mobile-nav-${link.href.slice(1)}`}
                  >
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </Button>
                </Link>
              ))}
              <div className="border-t border-white/10 pt-2 mt-2">
                {user ? (
                  <>
                    <Link href={userSpacePath} tabIndex={-1}>
                      <Button
                        variant={isUserSpaceActive ? "secondary" : "ghost"}
                        aria-current={isUserSpaceActive ? "page" : undefined}
                        className="w-full justify-start"
                        onClick={() => setIsMenuOpen(false)}
                        data-testid="link-mobile-dashboard"
                      >
                        Mon espace
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onLogout?.();
                      }}
                      data-testid="button-mobile-logout"
                    >
                      Déconnexion
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href="/login">
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-2"
                        onClick={() => setIsMenuOpen(false)}
                        data-testid="link-mobile-login"
                      >
                        <UserRound className="h-4 w-4" />
                        Connexion / Inscription
                      </Button>
                    </Link>
                    <Link href="/register?type=company">
                      <Button
                        className="w-full mt-2 bg-primary hover:bg-primary/90"
                        onClick={() => setIsMenuOpen(false)}
                        data-testid="link-mobile-employer-space"
                      >
                        Espace Employeur
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
