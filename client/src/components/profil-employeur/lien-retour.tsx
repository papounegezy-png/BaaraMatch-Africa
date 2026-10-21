import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { pagePrecedente } from "@/lib/page-precedente";

// Où mène le lien : la page précédente du site si elle existe (une offre,
// la liste filtrée), sinon la liste des employeurs. Le libellé dit où l'on va.
function destination(): { href: string; libelle: string } {
  const p = pagePrecedente();
  const chemin = p?.split("?")[0] ?? "";
  if (!p || /^\/(agencies|companies)\/[^/]+$/.test(chemin)) return { href: "/agencies", libelle: "Retour aux employeurs" };
  if (chemin === "/agencies") return { href: p, libelle: "Retour aux employeurs" };
  if (/^\/jobs\/[^/]+$/.test(chemin)) return { href: p, libelle: "Retour à l'offre" };
  if (chemin === "/jobs" || chemin === "/candidate/jobs") return { href: p, libelle: "Retour aux offres" };
  return { href: p, libelle: "Retour" };
}

export function LienRetour() {
  const { href, libelle } = destination();
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center gap-2 rounded-sm font-texte text-[15px] font-semibold text-baara-marine hover:text-baara-bleu focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu dark:text-white dark:hover:text-baara-moyen"
      data-testid="lien-retour-employeurs"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      {libelle}
    </Link>
  );
}
