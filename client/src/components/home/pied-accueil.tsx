import { useId, type ComponentType } from "react";
import { Link } from "wouter";
import { Facebook, Instagram, Linkedin } from "lucide-react";
import { FaGooglePlay } from "react-icons/fa";
import { SiWhatsapp } from "react-icons/si";
import { XIcon } from "@/components/share-icons";

// Réseaux sociaux : aucun compte BaaraMatch n'existe encore. Renseigner
// l'URL d'un réseau ici suffit à en faire un vrai lien ; sans URL, la
// pastille reste grisée et non cliquable.
const RESEAUX: { nom: string; icone: ComponentType<{ className?: string }>; url: string | null }[] = [
  { nom: "LinkedIn", icone: Linkedin, url: null },
  { nom: "Facebook", icone: Facebook, url: null },
  { nom: "Instagram", icone: Instagram, url: null },
  { nom: "X", icone: XIcon, url: null },
];

// WhatsApp : numéro lu dans VITE_WHATSAPP_NUMERO (chiffres, indicatif
// compris, ex. 223XXXXXXXX). Vide = bouton masqué. Ne la renseigner qu'une
// fois le numéro validé et le bot actif.
const NUMERO_WHATSAPP = (import.meta.env.VITE_WHATSAPP_NUMERO ?? "").replace(/\D/g, "");

const EMAIL_CONTACT = "contact@baaramatch.africa";

// Liens internes. Chaque cible est une route existante ; les ancres #demo et
// #faq sont sur la page Services, #comment-ca-marche sur l'accueil.
// « Offre agences et tarifs » (/services#agences) est absent : la page
// Services n'a pas encore de section agences.
const COLONNES = [
  {
    titre: "Candidats",
    liens: [
      { libelle: "Offres d'emploi", href: "/jobs" },
      { libelle: "Créer mon profil", href: "/register" },
      { libelle: "Se connecter", href: "/login" },
      { libelle: "Comment ça marche", href: "/#comment-ca-marche" },
    ],
  },
  {
    titre: "Recruteurs",
    liens: [
      { libelle: "Publier une offre", href: "/register/organisation" },
      { libelle: "Annuaire des employeurs", href: "/agencies" },
      { libelle: "Demander une démo", href: "/services#demo" },
    ],
  },
];

const LIENS_BAS = [
  { libelle: "Mentions légales", href: "/legal-notice" },
  { libelle: "Confidentialité", href: "/privacy" },
  { libelle: "Conditions d'utilisation", href: "/terms" },
  { libelle: "Questions fréquentes", href: "/services#faq" },
];

// Texte à 90 % de blanc sur marine (contraste > 4,5:1), anneau or au focus.
const lien =
  "inline-flex min-h-9 items-center rounded-sm text-white/90 transition-colors hover:text-white hover:underline hover:decoration-baara-or hover:decoration-2 hover:underline-offset-4 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-or min-[900px]:min-h-0";

/**
 * Pied de page public (maquette « Accueil animé v2 »). Il suit les deux
 * publics, candidats et recruteurs. Ce qui n'existe pas encore est grisé
 * (Google Play, réseaux) ou absent (WhatsApp sans numéro validé) : aucun lien
 * ne mène nulle part.
 */
export function PiedAccueil() {
  const id = useId();
  const annee = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-baara-marine font-texte text-white" data-testid="pied-accueil">
      <div className="container mx-auto px-4 pb-8 pt-14 min-[900px]:pt-16">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 min-[900px]:grid-cols-[1.4fr_1fr_1fr_1.1fr]">
          {/* 1. BaaraMatch */}
          <div className="col-span-2 space-y-4 min-[900px]:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-or" data-testid="link-pied-logo">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-baara-or font-titre text-base font-extrabold text-baara-marine" aria-hidden="true">B</span>
              <span className="font-titre text-xl font-bold tracking-tight">BaaraMatch</span>
            </Link>
            <p className="max-w-[36ch] text-sm leading-relaxed text-white/90">
              Le recrutement terrain en Afrique de l'Ouest : BTP, mines et métiers techniques.
            </p>
            {/* À remplacer par la liste exacte des pays quand elle sera décidée. */}
            <p className="text-sm text-white/90">Mali et zone UEMOA</p>
            <p className="text-sm">
              <a href={`mailto:${EMAIL_CONTACT}`} className={lien} data-testid="link-pied-email">{EMAIL_CONTACT}</a>
            </p>
          </div>

          {/* 2 et 3. Candidats, Recruteurs */}
          {COLONNES.map((colonne) => (
            <nav key={colonne.titre} aria-labelledby={`${id}-${colonne.titre}`} className="space-y-3">
              <h2 id={`${id}-${colonne.titre}`} className="font-titre text-base font-bold text-white">{colonne.titre}</h2>
              <ul className="space-y-1 text-sm min-[900px]:space-y-2.5">
                {colonne.liens.map((l) => (
                  <li key={l.href}>
                    {/* Les liens à ancre (#…) défilent via useDefilementAncre. */}
                    <Link href={l.href} className={lien}>{l.libelle}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* 4. Nous retrouver */}
          <div className="col-span-2 space-y-3 min-[900px]:col-span-1">
            <h2 className="font-titre text-base font-bold text-white">Nous retrouver</h2>
            <div className="flex flex-col gap-2.5 sm:max-w-xs">
              <span
                role="link"
                aria-disabled="true"
                className="flex min-h-11 cursor-not-allowed items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white/55"
                data-testid="pied-google-play"
              >
                <FaGooglePlay className="h-4 w-4" aria-hidden="true" />
                <span>Google Play</span>
                <span className="ml-auto text-xs">Bientôt disponible</span>
              </span>
              {NUMERO_WHATSAPP && (
                <a
                  href={`https://wa.me/${NUMERO_WHATSAPP}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-11 items-center gap-3 rounded-xl border border-emerald-400/60 bg-emerald-400/10 px-3 text-sm font-semibold text-emerald-200 transition-colors hover:bg-emerald-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-or"
                  data-testid="link-pied-whatsapp"
                >
                  <SiWhatsapp className="h-5 w-5" aria-hidden="true" />
                  <span>WhatsApp</span>
                  <span className="sr-only"> (nouvel onglet)</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Suivez-nous, entre deux filets. */}
        <div className="mt-12 flex flex-col items-center gap-4">
          <h2 className="font-titre text-sm font-bold text-white">Suivez-nous</h2>
          <div className="flex w-full items-center gap-4">
            <span className="h-px flex-1 bg-white/15" aria-hidden="true" />
            <ul className="flex items-center gap-3">
              {RESEAUX.map(({ nom, icone: Icone, url }) => (
                <li key={nom}>
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`BaaraMatch sur ${nom} (nouvel onglet)`}
                      className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-or"
                      data-testid={`link-pied-reseau-${nom.toLowerCase()}`}
                    >
                      <Icone className="h-5 w-5" />
                    </a>
                  ) : (
                    <span
                      role="img"
                      aria-label={`${nom}, bientôt disponible`}
                      title="Bientôt disponible"
                      className="flex h-14 w-14 cursor-not-allowed items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/40"
                      data-testid={`pied-reseau-${nom.toLowerCase()}`}
                    >
                      <Icone className="h-5 w-5" />
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <span className="h-px flex-1 bg-white/15" aria-hidden="true" />
          </div>
        </div>

        {/* Barre du bas. */}
        <div className="mt-10 flex flex-col gap-4 border-t border-white/15 pt-6 text-sm min-[900px]:flex-row min-[900px]:items-center min-[900px]:justify-between">
          <p className="text-white/90" data-testid="text-copyright">© {annee} BaaraMatch Africa</p>
          <nav aria-label="Informations légales">
            <ul className="flex flex-wrap gap-x-5 gap-y-1">
              {LIENS_BAS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={lien}>{l.libelle}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
