import { Link } from "wouter";
import { Briefcase, Mail, Phone, MapPin } from "lucide-react";
import { SiFacebook, SiLinkedin, SiX } from "react-icons/si";

export function Footer() {
  return (
    <footer className="bg-card border-t mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-md gradient-gold">
                <Briefcase className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">
                Baara<span className="text-gradient-gold">Match</span>
              </span>
            </Link>
            <p className="text-muted-foreground text-sm">
              La plateforme de référence pour connecter les talents africains aux meilleures opportunités professionnelles.
            </p>
            <div className="flex gap-3">
              <a
                href="#"
                className="p-2 rounded-md bg-muted hover-elevate"
                data-testid="link-facebook"
              >
                <SiFacebook className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="p-2 rounded-md bg-muted hover-elevate"
                data-testid="link-linkedin"
              >
                <SiLinkedin className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="p-2 rounded-md bg-muted hover-elevate"
                data-testid="link-twitter"
              >
                <SiX className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Navigation</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/jobs" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-jobs">
                  Offres d'emploi
                </Link>
              </li>
              <li>
                <Link href="/candidates" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-candidates">
                  Candidats
                </Link>
              </li>
              <li>
                <Link href="/agencies" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-agencies">
                  Agences de placement
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-about">
                  À propos
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Services</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/register?type=candidate" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-candidate-register">
                  Espace Candidat
                </Link>
              </li>
              <li>
                <Link href="/register?type=agency" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-agency-register">
                  Espace Agence
                </Link>
              </li>
              <li>
                <Link href="/register?type=company" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-company-register">
                  Espace Entreprise
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Contact</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span>Dakar, Sénégal</span>
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <a href="mailto:contact@baaramatch.africa" className="hover:text-foreground transition-colors" data-testid="link-email">
                  contact@baaramatch.africa
                </a>
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <a href="tel:+221338888888" className="hover:text-foreground transition-colors" data-testid="link-phone">
                  +221 33 888 88 88
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p data-testid="text-copyright">
            2025 BaaraMatch Africa. Tous droits réservés.
          </p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-foreground transition-colors" data-testid="link-privacy">
              Politique de confidentialité
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors" data-testid="link-terms">
              Conditions d'utilisation
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
