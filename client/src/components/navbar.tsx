import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Menu, X, Briefcase, Users, Building2, LogIn, UserPlus } from "lucide-react";
import { useState } from "react";
import type { User } from "@shared/schema";

interface NavbarProps {
  user?: User | null;
  onLogout?: () => void;
}

export function Navbar({ user, onLogout }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [location] = useLocation();

  const navLinks = [
    { href: "/jobs", label: "Offres d'emploi", icon: Briefcase },
    { href: "/candidates", label: "Candidats", icon: Users },
    { href: "/agencies", label: "Agences", icon: Building2 },
  ];

  const isActive = (path: string) => location === path;

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md gradient-gold">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight" data-testid="text-logo">
              Baara<span className="text-gradient-gold">Match</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <Button
                  variant={isActive(link.href) ? "secondary" : "ghost"}
                  className="gap-2"
                  data-testid={`link-nav-${link.href.slice(1)}`}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Button>
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            
            {user ? (
              <div className="hidden md:flex items-center gap-2">
                <Link href="/dashboard">
                  <Button variant="ghost" data-testid="link-dashboard">
                    Tableau de bord
                  </Button>
                </Link>
                <Button variant="outline" onClick={onLogout} data-testid="button-logout">
                  Déconnexion
                </Button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" className="gap-2" data-testid="link-login">
                    <LogIn className="h-4 w-4" />
                    Connexion
                  </Button>
                </Link>
                <Link href="/register">
                  <Button className="gap-2" data-testid="link-register">
                    <UserPlus className="h-4 w-4" />
                    S'inscrire
                  </Button>
                </Link>
              </div>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              data-testid="button-menu-toggle"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden py-4 border-t">
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
              <div className="border-t pt-2 mt-2">
                {user ? (
                  <>
                    <Link href="/dashboard">
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => setIsMenuOpen(false)}
                        data-testid="link-mobile-dashboard"
                      >
                        Tableau de bord
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
                        <LogIn className="h-4 w-4" />
                        Connexion
                      </Button>
                    </Link>
                    <Link href="/register">
                      <Button
                        className="w-full mt-2 gap-2"
                        onClick={() => setIsMenuOpen(false)}
                        data-testid="link-mobile-register"
                      >
                        <UserPlus className="h-4 w-4" />
                        S'inscrire
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
