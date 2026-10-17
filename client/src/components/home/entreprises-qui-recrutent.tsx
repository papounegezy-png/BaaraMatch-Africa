import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { EmployeurQuiRecrute, SecteurQuiRecrute } from "@shared/categories";
import { Skeleton } from "@/components/ui/skeleton";
import { useRevele } from "@/hooks/use-revele";
import { useMouvementReduit } from "@/hooks/use-mouvement-reduit";
import { lienSecteur } from "@/lib/secteurs";

// Défilement d'un bouton : largeur d'une carte (268 px) + écart (16 px).
const PAS_RAIL = 284;

function TuileEmployeur({ employeur, rang }: { employeur: EmployeurQuiRecrute; rang: number }) {
  const fond = rang % 2 === 0 ? "bg-baara-clair" : "bg-baara-moyen";
  return (
    <li className={`grid h-12 w-12 place-items-center overflow-hidden rounded-xl border border-baara-trait ${employeur.logoUrl ? "bg-white" : fond} dark:border-white/10`} title={employeur.nom}>
      {employeur.logoUrl ? (
        <img src={employeur.logoUrl} alt={employeur.nom} width={48} height={48} loading="lazy" className="h-full w-full object-contain p-1" />
      ) : (
        <span role="img" aria-label={employeur.nom} className="font-titre text-lg font-bold text-baara-marine">
          {employeur.nom.trim().charAt(0).toLocaleUpperCase("fr")}
        </span>
      )}
    </li>
  );
}

/**
 * « Entreprises qui recrutent en ce moment » (maquette « Accueil animé v2 »).
 * Données réelles de GET /api/accueil/secteurs : seuls les secteurs ayant une
 * offre active, et seuls les employeurs qui ont accepté d'apparaître ici
 * (visibleAccueil). En cas d'erreur ou sans secteur, la section disparaît.
 */
export function EntreprisesQuiRecrutent() {
  const id = useId();
  const reduit = useMouvementReduit();
  const [ref, visible] = useRevele<HTMLElement>();
  const rail = useRef<HTMLUListElement>(null);
  const [auDebut, setAuDebut] = useState(true);
  const [aLaFin, setALaFin] = useState(true);
  const { data, isLoading, isError } = useQuery<SecteurQuiRecrute[]>({ queryKey: ["/api/accueil/secteurs"] });

  const mesurer = useCallback(() => {
    const el = rail.current;
    if (!el) return;
    setAuDebut(el.scrollLeft <= 1);
    setALaFin(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    mesurer();
    el.addEventListener("scroll", mesurer, { passive: true });
    window.addEventListener("resize", mesurer);
    return () => {
      el.removeEventListener("scroll", mesurer);
      window.removeEventListener("resize", mesurer);
    };
  }, [mesurer, data]);

  const defiler = (sens: 1 | -1) => {
    rail.current?.scrollBy({ left: sens * PAS_RAIL, behavior: reduit ? "auto" : "smooth" });
  };

  if (isError || (!isLoading && (!data || data.length === 0))) return null;

  const secteurs = data ?? [];
  const avecBoutons = !isLoading && secteurs.length > 1 && !(auDebut && aLaFin);
  const bouton =
    "grid h-12 w-12 place-items-center rounded-full border border-baara-trait bg-white text-baara-marine transition-colors hover:border-baara-marine " +
    "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-baara-trait focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2 " +
    "dark:border-white/15 dark:bg-white/5 dark:text-white";

  return (
    <section id="entreprises" ref={ref} aria-labelledby={`${id}-titre`} className="scroll-mt-24 bg-white py-14 dark:bg-baara-profond min-[900px]:py-20">
      <div className={`container mx-auto px-4 revele ${visible ? "visible" : ""}`}>
        <div className="flex items-end justify-between gap-4">
          <h2 id={`${id}-titre`} className="font-titre text-3xl font-bold tracking-tight text-baara-marine dark:text-white min-[900px]:text-4xl">
            Entreprises qui recrutent en ce moment
          </h2>
          {avecBoutons && (
            <div className="hidden shrink-0 gap-2 min-[900px]:flex">
              <button type="button" className={bouton} onClick={() => defiler(-1)} disabled={auDebut} aria-controls="rail-entreprises" aria-label="Secteurs précédents" data-testid="button-rail-precedent">
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <button type="button" className={bouton} onClick={() => defiler(1)} disabled={aLaFin} aria-controls="rail-entreprises" aria-label="Secteurs suivants" data-testid="button-rail-suivant">
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div role="status" className="mt-6 flex gap-4 overflow-hidden">
            <span className="sr-only">Chargement des secteurs qui recrutent</span>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} aria-hidden="true" className="w-[244px] shrink-0 space-y-4 rounded-2xl border border-baara-trait p-5 min-[900px]:w-[268px] dark:border-white/10">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-32" />
                <div className="flex gap-2">{Array.from({ length: 4 }).map((__, j) => <Skeleton key={j} className="h-12 w-12 rounded-xl" />)}</div>
                <Skeleton className="h-4 w-40" />
              </div>
            ))}
          </div>
        ) : (
          // Le rail défile seul (pas la page) ; focalisable pour défiler aux
          // flèches du clavier. Barre de défilement masquée.
          <ul
            id="rail-entreprises"
            ref={rail}
            tabIndex={0}
            aria-label="Secteurs qui recrutent, défilement horizontal"
            className="relative -mx-4 mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-3 pt-1 [scrollbar-width:none] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-baara-bleu [&::-webkit-scrollbar]:hidden"
            data-testid="rail-entreprises"
          >
            {secteurs.map((s, i) => (
              <li
                key={s.valeur}
                className={`revele ${visible ? "visible" : ""} flex w-[244px] shrink-0 snap-start min-[900px]:w-[268px]`}
                style={{ transitionDelay: `${0.12 * (i + 1)}s` }}
                data-testid={`carte-secteur-${s.secteur.toLowerCase()}`}
              >
                <article className="flex w-full flex-col gap-4 rounded-2xl border border-baara-trait bg-white p-5 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-1 hover:border-baara-marine hover:shadow-[0_14px_30px_-18px_rgba(13,41,87,0.45)] dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/50">
                  <div>
                    <h3 className="font-titre text-xl font-bold text-baara-marine dark:text-white">{s.secteur}</h3>
                    <p className="font-texte text-sm tabular-nums text-baara-texte dark:text-slate-300">
                      {s.offresActives} offre{s.offresActives > 1 ? "s" : ""} active{s.offresActives > 1 ? "s" : ""}
                    </p>
                  </div>
                  {s.entreprises.length > 0 && (
                    <ul className="flex gap-2" aria-label={`Employeurs qui recrutent en ${s.secteur}`}>
                      {s.entreprises.map((e, rang) => <TuileEmployeur key={e.id} employeur={e} rang={rang} />)}
                    </ul>
                  )}
                  <Link
                    href={lienSecteur(s.valeur)}
                    className="mt-auto inline-flex min-h-11 items-center gap-1.5 self-start rounded-sm font-texte text-sm font-semibold text-baara-bleu hover:underline hover:decoration-2 hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu dark:text-baara-moyen"
                    data-testid={`link-secteur-${s.secteur.toLowerCase()}`}
                  >
                    Voir les offres du secteur
                    <span className="sr-only"> {s.secteur}</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
