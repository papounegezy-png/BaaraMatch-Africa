import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { ClocheNotifications } from "@/components/cloche-notifications";

// Soulignement or qui se déploie au survol ET au focus clavier. L'or n'est
// qu'un trait ici (jamais du texte sur fond clair : 2,4:1).
const lienNav =
  "relative inline-flex h-11 items-center px-3 font-texte text-[0.95rem] font-medium text-baara-marine dark:text-white rounded-md " +
  "after:absolute after:inset-x-3 after:bottom-1.5 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-baara-or after:transition-transform after:duration-300 " +
  "hover:after:scale-x-100 focus-visible:after:scale-x-100 aria-[current=page]:after:scale-x-100 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu";

const lienMenuMobile =
  "flex h-12 items-center rounded-lg px-3 font-texte font-medium text-baara-marine dark:text-white hover:bg-baara-clair dark:hover:bg-white/10 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu";

/**
 * En-tête de la page d'accueil (maquette « Accueil animé v2 »). Les autres
 * pages publiques gardent la Navbar habituelle ; celui-ci en reprend les
 * règles : liens selon le profil, cloche et « Mon espace » une fois connecté.
 */
export function EnteteAccueil() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [menuOuvert, setMenuOuvert] = useState(false);
  const boutonMenuRef = useRef<HTMLButtonElement>(null);
  const idMenu = useId();

  // Échap ferme le menu et rend le focus au bouton.
  useEffect(() => {
    if (!menuOuvert) return;
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOuvert(false);
        boutonMenuRef.current?.focus();
      }
    };
    document.addEventListener("keydown", surTouche);
    return () => document.removeEventListener("keydown", surTouche);
  }, [menuOuvert]);

  const espacePersonnel =
    user?.userType === "agency" ? "/agency/dashboard"
      : user?.userType === "company" ? "/company/dashboard"
        : user?.userType === "candidate" ? "/espace-personnel"
          : user?.userType === "admin" ? "/admin/dashboard"
            : "/";

  // « Mon espace » actif : l'espace lui-même et, pour un candidat, son profil.
  const espaceActif =
    location === espacePersonnel ||
    (user?.userType === "candidate" && ["/profile", "/candidate/profile"].some((p) => location === p || location.startsWith(`${p}/`)));

  // Même règle que la Navbar : un candidat connecté voit Offres et
  // Employeurs (suivre un employeur, lire ou laisser un avis) ; Services,
  // l'offre BaaraMatch pour les recruteurs, lui est masqué. Le menu
  // « Offres » n'a pas de sous-menu dans le produit : c'est un lien simple.
  // `actif` : la page de la rubrique et ses sous-pages (une offre, un
  // profil d'employeur, agence ou entreprise).
  const liens = [
    { href: "/jobs", libelle: "Offres", rubriques: ["/jobs", "/candidate/jobs"] },
    { href: "/agencies", libelle: "Employeurs", rubriques: ["/agencies", "/companies"] },
    ...(user?.userType === "candidate" ? [] : [
      { href: "/services", libelle: "Services", rubriques: ["/services"] },
    ]),
  ].map((lien) => ({ ...lien, actif: lien.rubriques.some((r) => location === r || location.startsWith(`${r}/`)) }));

  const fermerMenu = () => setMenuOuvert(false);

  return (
    <>
    {/* Lien d'évitement : premier élément focusable, visible au focus, vers
        le contenu de la page (<main id="contenu">). */}
    <a
      href="#contenu"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-[calc(env(safe-area-inset-top,0px)+12px)] focus:z-[60] focus:rounded-xl focus:bg-baara-marine focus:px-5 focus:py-3 focus:font-texte focus:font-semibold focus:text-white focus:outline-none focus:ring-2 focus:ring-baara-bleu focus:ring-offset-2"
      data-testid="lien-evitement"
    >
      Aller au contenu
    </a>
    <header className="sticky top-[env(safe-area-inset-top,0px)] z-50 border-b border-baara-trait bg-baara-papier/95 backdrop-blur supports-[backdrop-filter]:bg-baara-papier/85 dark:border-white/10 dark:bg-baara-profond/95">
      <div className="container mx-auto flex h-[76px] items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="flex min-h-11 shrink-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu"
          data-testid="link-accueil-logo"
        >
          {/* Marine sur or : 6:1 (l'ancien logo, blanc sur or, était à 2,4:1). */}
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-baara-or font-titre text-base font-extrabold text-baara-marine" aria-hidden="true">B</span>
          <span className="font-titre text-xl font-bold tracking-tight text-baara-marine dark:text-white">BaaraMatch</span>
        </Link>

        <nav aria-label="Navigation principale" className="hidden items-center gap-1 min-[900px]:flex">
          {liens.map((lien) => (
            <Link key={lien.href} href={lien.href} className={lienNav} aria-current={lien.actif ? "page" : undefined}>
              {lien.libelle}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 min-[900px]:flex">
          {user && <ClocheNotifications variante="entete" />}
          <ThemeToggle className="h-11 w-11" />
          {user ? (
            <>
              <Link
                href={espacePersonnel}
                aria-current={espaceActif ? "page" : undefined}
                className="inline-flex h-11 items-center rounded-lg bg-baara-marine px-5 font-texte text-sm font-semibold text-white hover:bg-baara-profond focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2 dark:bg-white dark:text-baara-marine dark:hover:bg-baara-clair"
                data-testid="link-accueil-espace"
              >
                Mon espace
              </Link>
              <button type="button" onClick={logout} className={lienNav} data-testid="button-accueil-deconnexion">
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={lienNav} data-testid="link-accueil-connexion">Connexion / Inscription</Link>
              <Link
                href="/register/organisation"
                className="inline-flex h-11 items-center rounded-lg bg-baara-marine px-5 font-texte text-sm font-semibold text-white hover:bg-baara-profond focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2 dark:bg-white dark:text-baara-marine dark:hover:bg-baara-clair"
                data-testid="link-accueil-espace-employeur"
              >
                Espace employeur
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 min-[900px]:hidden">
          {user && <ClocheNotifications variante="entete" />}
          <ThemeToggle className="h-11 w-11" />
          <button
            ref={boutonMenuRef}
            type="button"
            onClick={() => setMenuOuvert((ouvert) => !ouvert)}
            aria-expanded={menuOuvert}
            aria-controls={idMenu}
            aria-label={menuOuvert ? "Fermer le menu" : "Ouvrir le menu"}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-baara-marine hover:bg-baara-clair dark:text-white dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu"
            data-testid="button-accueil-menu"
          >
            {menuOuvert ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div id={idMenu} hidden={!menuOuvert} className="border-t border-baara-trait bg-baara-papier px-4 pb-4 pt-2 dark:border-white/10 dark:bg-baara-profond min-[900px]:hidden">
        <nav aria-label="Navigation principale (mobile)">
          <ul className="grid gap-1">
            {liens.map((lien) => (
              <li key={lien.href}>
                <Link href={lien.href} className={lienMenuMobile} onClick={fermerMenu} aria-current={lien.actif ? "page" : undefined}>
                  {lien.libelle}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-2 grid gap-2 border-t border-baara-trait pt-3 dark:border-white/10">
          {user ? (
            <>
              <Link
                href={espacePersonnel}
                onClick={fermerMenu}
                aria-current={espaceActif ? "page" : undefined}
                className={`${lienMenuMobile} ${espaceActif ? "border-l-4 border-baara-or bg-baara-clair font-bold dark:bg-white/10" : ""}`}
              >
                Mon espace
              </Link>
              <button
                type="button"
                onClick={() => { fermerMenu(); logout(); }}
                className="h-12 rounded-lg border border-baara-marine/30 font-texte font-semibold text-baara-marine dark:border-white/30 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu"
              >
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={lienMenuMobile} onClick={fermerMenu}>Connexion / Inscription</Link>
              <Link
                href="/register/organisation"
                onClick={fermerMenu}
                className="flex h-12 items-center justify-center rounded-lg bg-baara-marine font-texte font-semibold text-white dark:bg-white dark:text-baara-marine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu"
              >
                Espace employeur
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
    </>
  );
}
