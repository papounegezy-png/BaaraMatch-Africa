import { useId, useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { JobPosting } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useRevele } from "@/hooks/use-revele";
import { formatJobType, normaliserTypeContrat } from "@/lib/job-type-labels";
import { formatJobTitle } from "@/lib/format-job-title";

type OffreAvecEmployeur = JobPosting & { organizationName: string | null };

const FILTRES = [
  { code: "", libelle: "Tous les contrats" },
  { code: "cdi", libelle: "CDI" },
  { code: "cdd", libelle: "CDD" },
  { code: "stage", libelle: "Stage" },
  { code: "interim", libelle: "Intérim" },
] as const;

// /api/jobs ne filtre pas côté serveur : on filtre les 12 dernières offres
// actives (l'API les renvoie déjà triées de la plus récente à la plus ancienne).
const FENETRE = 12;
const LIGNES_MAX = 4;

const relatif = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });

function anciennete(date: Date | string | null | undefined): string {
  if (!date) return "";
  const jours = Math.round((Date.now() - new Date(date).getTime()) / 86_400_000);
  const texte = jours < 31 ? relatif.format(-jours, "day")
    : jours < 365 ? relatif.format(-Math.round(jours / 30), "month")
      : relatif.format(-Math.round(jours / 365), "year");
  return texte.charAt(0).toLocaleUpperCase("fr") + texte.slice(1);
}

function LigneSquelette() {
  return (
    <li className="flex min-h-[88px] items-center gap-4 px-4 py-4 min-[700px]:min-h-[76px]" aria-hidden="true">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-6 w-14 rounded-full" />
    </li>
  );
}

/**
 * Offres récentes de l'accueil (maquette « Accueil animé v2 »), avec les
 * vraies offres actives de GET /api/jobs. Même clé de requête que /jobs :
 * React Query ne la fait qu'une fois. Aucune offre d'exemple n'est affichée.
 */
export function OffresRecentes() {
  const id = useId();
  const [filtre, setFiltre] = useState("");
  const [ref, visible] = useRevele<HTMLElement>();
  const { data, isLoading, isError, refetch, isFetching } = useQuery<OffreAvecEmployeur[]>({ queryKey: ["/api/jobs"] });

  const offres = useMemo(() => {
    const recentes = (data ?? []).slice(0, FENETRE);
    const filtrees = filtre ? recentes.filter((o) => normaliserTypeContrat(o.jobType) === filtre) : recentes;
    return filtrees.slice(0, LIGNES_MAX);
  }, [data, filtre]);

  const libelleFiltre = FILTRES.find((f) => f.code === filtre)?.libelle ?? "";

  return (
    <section
      id="offres"
      ref={ref}
      aria-labelledby={`${id}-titre`}
      className="scroll-mt-24 bg-white py-14 dark:bg-baara-profond min-[900px]:py-20"
    >
      <div className={`container mx-auto px-4 revele ${visible ? "visible" : ""}`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id={`${id}-titre`} className="font-titre text-3xl font-bold tracking-tight text-baara-marine dark:text-white min-[900px]:text-4xl">
            Offres récentes
          </h2>
          <Link
            href="/jobs"
            className="rounded-sm font-texte font-semibold text-baara-marine underline decoration-baara-or decoration-2 underline-offset-4 hover:decoration-baara-marine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu dark:text-white dark:hover:decoration-white"
            data-testid="link-offres-voir-tout"
          >
            Voir toutes les offres
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filtrer par type de contrat">
          {FILTRES.map((f) => {
            const actif = filtre === f.code;
            return (
              <button
                key={f.code || "tous"}
                type="button"
                aria-pressed={actif}
                onClick={() => setFiltre(f.code)}
                className={`min-h-11 rounded-full border px-4 font-texte text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2 ${
                  actif
                    ? "border-baara-marine bg-baara-marine text-white dark:border-white dark:bg-white dark:text-baara-marine"
                    : "border-baara-trait bg-white text-baara-marine hover:border-baara-marine dark:border-white/15 dark:bg-white/5 dark:text-white"
                }`}
                data-testid={`filtre-contrat-${f.code || "tous"}`}
              >
                {f.libelle}
              </button>
            );
          })}
        </div>

        {/* Hauteur réservée pour 4 lignes : changer de filtre ne fait pas sauter la page. */}
        <div className="mt-5 min-h-[360px] min-[700px]:min-h-[312px]">
          {isError ? (
            <div role="alert" className="flex flex-col items-start gap-3 rounded-2xl border border-baara-trait p-6 dark:border-white/10">
              <p className="font-texte text-baara-marine dark:text-white">Impossible de charger les offres pour le moment.</p>
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isFetching}
                className="h-11 rounded-lg bg-baara-bleu px-5 font-texte text-sm font-semibold text-white hover:bg-baara-marine disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2"
                data-testid="button-offres-reessayer"
              >
                {isFetching ? "Nouvel essai…" : "Réessayer"}
              </button>
            </div>
          ) : isLoading ? (
            <div role="status" aria-live="polite">
              <span className="sr-only">Chargement des offres récentes</span>
              <ul className="divide-y divide-baara-trait rounded-2xl border border-baara-trait dark:divide-white/10 dark:border-white/10">
                {Array.from({ length: LIGNES_MAX }).map((_, i) => <LigneSquelette key={i} />)}
              </ul>
            </div>
          ) : offres.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-baara-trait p-6 font-texte text-baara-texte dark:border-white/15 dark:text-slate-300" data-testid="text-offres-vide">
              {filtre
                ? <>Aucune offre en {libelleFiltre} pour le moment. Essayez « Tous les contrats ».</>
                : "Aucune offre publiée pour le moment."}
            </p>
          ) : (
            <ul className="divide-y divide-baara-trait overflow-hidden rounded-2xl border border-baara-trait bg-white dark:divide-white/10 dark:border-white/10 dark:bg-white/[0.03]" data-testid="liste-offres-recentes">
              {offres.map((offre, i) => (
                <li
                  key={offre.id}
                  className={`revele ${visible ? "visible" : ""}`}
                  style={{ transitionDelay: `${0.12 * (i + 1)}s` }}
                >
                  <Link
                    href={`/jobs/${offre.id}`}
                    className="group grid min-h-[88px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-4 transition-transform duration-200 hover:-translate-x-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-baara-bleu [grid-template-areas:'titre_contrat'_'meta_date'] min-[700px]:min-h-[76px] min-[700px]:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto_7.5rem] min-[700px]:[grid-template-areas:'titre_entreprise_ville_contrat_date']"
                    data-testid={`offre-recente-${offre.id}`}
                  >
                    <span className="truncate font-texte text-base font-semibold text-baara-marine group-hover:underline group-hover:decoration-baara-or group-hover:decoration-2 group-hover:underline-offset-4 dark:text-white [grid-area:titre]">
                      {formatJobTitle(offre.title)}
                    </span>
                    {/* Mobile : « entreprise · ville » sous l'intitulé ; dès
                        700 px, deux colonnes distinctes (display: contents). */}
                    <span className="flex min-w-0 items-center gap-1.5 font-texte text-sm text-baara-texte dark:text-slate-300 [grid-area:meta] min-[700px]:contents">
                      {offre.organizationName && (
                        <span className="truncate min-[700px]:[grid-area:entreprise]">{offre.organizationName}</span>
                      )}
                      {offre.organizationName && offre.location && <span aria-hidden="true" className="min-[700px]:hidden">·</span>}
                      {offre.location && (
                        <span className="truncate min-[700px]:[grid-area:ville]">{formatJobTitle(offre.location)}</span>
                      )}
                    </span>
                    {formatJobType(offre.jobType) && (
                      <span className="justify-self-end rounded-full bg-baara-clair px-2.5 py-1 font-texte text-xs font-semibold text-baara-marine dark:bg-white/10 dark:text-white [grid-area:contrat]">
                        {formatJobType(offre.jobType)}
                      </span>
                    )}
                    <span className="justify-self-end whitespace-nowrap font-texte text-sm tabular-nums text-baara-texte dark:text-slate-300 [grid-area:date]">
                      {anciennete(offre.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="sr-only" aria-live="polite">
          {!isLoading && !isError ? `${offres.length} offre${offres.length > 1 ? "s" : ""} affichée${offres.length > 1 ? "s" : ""}${filtre ? ` en ${libelleFiltre}` : ""}` : ""}
        </p>
      </div>
    </section>
  );
}
