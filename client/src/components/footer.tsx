import { Link } from "wouter";
import { Briefcase, Linkedin, Facebook, Instagram } from "lucide-react";
import { FaGooglePlay } from "react-icons/fa";
import { SiWhatsapp } from "react-icons/si";
import { XIcon } from "@/components/share-icons";

// Google Play: no native Android app exists in this project (it's a React
// web app) — shown disabled rather than as a dead link. WhatsApp: a real
// wa.me deep link to a real number, kept active. If a native app ships
// later, swap the disabled button below for a real store link.
//
// Social icons below (Suivez-nous): no real BaaraMatch social accounts are
// wired in yet — same "Bientôt disponible" disabled treatment rather than
// linking out to nothing. Swap `href: null` for the real profile URL per
// platform once they exist.
const socialLinks: { label: string; icon: React.ComponentType<{ className?: string }>; href: string | null }[] = [
  { label: "LinkedIn", icon: Linkedin, href: null },
  { label: "Facebook", icon: Facebook, href: null },
  { label: "Instagram", icon: Instagram, href: null },
  { label: "X", icon: XIcon, href: null },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-white/10 bg-[#0A1F44] text-zinc-200">
      <div className="container mx-auto px-4 py-12 md:py-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-5">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-md gradient-gold">
                <Briefcase className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                Baara<span className="text-gradient-gold">Match</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-zinc-400">
              Plateforme RH intelligente pour connecter talents, entreprises et agences avec précision.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-white">Liens</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/services" className="text-zinc-400 transition-colors hover:text-white" data-testid="link-footer-services">
                  Services
                </Link>
              </li>
              <li>
                <Link href="/agencies" className="text-zinc-400 transition-colors hover:text-white" data-testid="link-footer-companies">
                  Entreprises
                </Link>
              </li>
              <li>
                <a href="mailto:contact@baaramatch.africa" className="text-zinc-400 transition-colors hover:text-white" data-testid="link-footer-contact">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-white">Informations légales</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/privacy" className="text-zinc-400 transition-colors hover:text-white" data-testid="link-privacy">
                  Politique de confidentialité
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-zinc-400 transition-colors hover:text-white" data-testid="link-terms">
                  Conditions d'utilisation
                </Link>
              </li>
              <li>
                <Link href="/legal-notice" className="text-zinc-400 transition-colors hover:text-white" data-testid="link-legal-notice">
                  Mentions légales
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-white">Nous retrouver</h3>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                aria-disabled="true"
                title="Bientôt disponible"
                className="flex cursor-not-allowed items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 text-sm text-zinc-500"
                data-testid="link-footer-google-play"
              >
                <FaGooglePlay className="h-4 w-4" />
                <span>Google Play</span>
                <span className="ml-auto text-xs text-zinc-600">Bientôt disponible</span>
              </button>
              <a
                href="https://wa.me/223338888888?text=Bonjour%20BaaraMatch%2C%20je%20veux%20m%27inscrire."
                className="group flex items-center gap-3 rounded-xl border border-emerald-800/60 bg-emerald-950/40 px-3 py-2.5 text-sm text-emerald-200 transition-all hover:border-emerald-600 hover:bg-emerald-900/40 hover:text-emerald-100"
                data-testid="link-footer-whatsapp"
                aria-label="Inscription via WhatsApp"
              >
                <SiWhatsapp className="h-5 w-5" />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 border-t border-white/10 pt-8">
          <h3 className="text-sm font-semibold text-white">Suivez-nous</h3>
          <div className="flex items-center gap-3">
            {socialLinks.map((social) =>
              social.href ? (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                  aria-label={social.label}
                  data-testid={`link-social-${social.label.toLowerCase()}`}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ) : (
                <button
                  key={social.label}
                  type="button"
                  aria-disabled="true"
                  title="Bientôt disponible"
                  className="flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-full bg-white/5 text-zinc-500"
                  data-testid={`link-social-${social.label.toLowerCase()}`}
                >
                  <social.icon className="h-4 w-4" />
                </button>
              )
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-sm text-zinc-500 md:flex-row">
          <p data-testid="text-copyright">
            {new Date().getFullYear()} BaaraMatch Africa. Tous droits réservés.
          </p>
          <div className="flex gap-4">
            <span>Confiance • Sécurité • Performance</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
