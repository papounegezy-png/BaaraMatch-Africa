import { Link } from "wouter";
import { ArrowRight, Search } from "lucide-react";
import { formatJobTitle } from "@shared/format-job-title";
import { dateExacte, depuisQuand, statutCandidature } from "@/lib/statuts-candidature";

export type CandidatureRecente = {
  id: string;
  status?: string | null;
  jobTitle?: string;
  organizationName?: string | null;
  location?: string | null;
  createdAt?: Date | string | null;
};

const MAX_LIGNES = 5;

/** Dernières candidatures, chaque ligne menant à sa fiche dans Mes candidatures. */
export function CandidaturesRecentes({
  candidatures,
  chargement,
  erreur,
  onReessayer,
}: {
  candidatures: CandidatureRecente[];
  chargement: boolean;
  erreur: boolean;
  onReessayer: () => void;
}) {
  const lignes = [...candidatures]
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    .slice(0, MAX_LIGNES);
  const vide = !chargement && !erreur && candidatures.length === 0;

  return (
    <section aria-labelledby="titre-candidatures-recentes" className="mt-10 border-t-2 border-baara-marine pt-5 dark:border-white" data-testid="candidatures-recentes">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
        <h2 id="titre-candidatures-recentes" className="font-titre text-[22px] font-bold text-baara-marine dark:text-white">
          Candidatures récentes
        </h2>
        {!vide && (
          <Link
            href="/candidate-applications"
            className="inline-flex min-h-11 items-center gap-1.5 font-texte text-[15px] font-bold text-baara-bleu underline underline-offset-4 hover:text-baara-marine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2 dark:text-white"
            data-testid="voir-toutes-candidatures"
          >
            Voir tout
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </div>

      {vide ? (
        <div className="mt-4 rounded-[20px] border-[1.5px] border-baara-trait bg-white px-[22px] py-8 text-center dark:border-white/20 dark:bg-white/5">
          <p className="font-texte text-[15.5px] text-baara-texte dark:text-slate-300">Vous n'avez pas encore postulé.</p>
          <Link
            href="/jobs"
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-baara-bleu px-5 font-texte text-[15px] font-semibold text-white hover:bg-baara-marine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Rechercher des offres
          </Link>
        </div>
      ) : erreur ? (
        <div className="mt-4 rounded-[20px] border-[1.5px] border-baara-trait bg-white px-[22px] py-6 dark:border-white/20 dark:bg-white/5" role="alert">
          <p className="font-texte text-[15.5px] text-baara-texte dark:text-slate-300">Vos candidatures n'ont pas pu être chargées. Vérifiez votre connexion.</p>
          <button
            type="button"
            onClick={onReessayer}
            className="mt-3 inline-flex min-h-11 items-center rounded-full border-[1.5px] border-baara-marine px-5 font-texte text-[15px] font-semibold text-baara-marine hover:bg-baara-clair focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2 dark:border-white dark:text-white dark:hover:bg-white/10"
          >
            Réessayer
          </button>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-baara-trait overflow-hidden rounded-[20px] border-[1.5px] border-baara-trait bg-white dark:divide-white/15 dark:border-white/20 dark:bg-white/5">
          {chargement
            ? [0, 1, 2, 3].map((i) => (
                <li key={i} className="flex items-center justify-between gap-4 px-[22px] py-4" aria-hidden="true">
                  <span className="flex-1 space-y-2">
                    <span className="block h-5 w-2/3 animate-pulse rounded bg-baara-moyen motion-reduce:animate-none dark:bg-white/10" />
                    <span className="block h-4 w-1/2 animate-pulse rounded bg-baara-clair motion-reduce:animate-none dark:bg-white/10" />
                  </span>
                  <span className="block h-8 w-28 animate-pulse rounded-full bg-baara-clair motion-reduce:animate-none dark:bg-white/10" />
                </li>
              ))
            : lignes.map((c) => <LigneCandidature key={c.id} candidature={c} />)}
        </ul>
      )}
    </section>
  );
}

function LigneCandidature({ candidature: c }: { candidature: CandidatureRecente }) {
  const { libelle, Icone, classes } = statutCandidature(c.status);
  const poste = formatJobTitle(c.jobTitle) || "Offre";
  // Rien d'inventé : chaque morceau absent est simplement omis.
  const morceaux = [c.organizationName?.trim(), c.location?.trim()].filter(Boolean) as string[];

  return (
    <li
      className="relative flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-[22px] py-4 transition-colors hover:bg-baara-clair has-[a:focus-visible]:bg-baara-clair has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-inset has-[a:focus-visible]:ring-baara-bleu motion-reduce:transition-none dark:hover:bg-white/10 dark:has-[a:focus-visible]:bg-white/10"
      data-testid={`candidature-recente-${c.id}`}
    >
      <div className="min-w-0 flex-1 basis-56">
        <h3 className="font-titre text-lg font-bold leading-snug text-baara-marine [overflow-wrap:anywhere] dark:text-white">
          {/* Lien unique de la ligne : son pseudo-élément couvre toute la ligne. */}
          <Link href={`/candidate-applications#candidature-${c.id}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {poste}
          </Link>
        </h3>
        <p className="mt-0.5 font-texte text-[15.5px] text-baara-texte [overflow-wrap:anywhere] dark:text-slate-300">
          {morceaux.join(" · ")}
          {c.createdAt && (
            <>
              {morceaux.length > 0 && " · "}
              <time dateTime={new Date(c.createdAt).toISOString()} title={dateExacte(c.createdAt)}>
                {depuisQuand(c.createdAt)}
              </time>
            </>
          )}
        </p>
      </div>
      <span className={`inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full px-3 font-texte text-sm font-bold ${classes}`} data-testid={`statut-${c.id}`}>
        <Icone className="h-4 w-4" aria-hidden="true" />
        {libelle}
      </span>
    </li>
  );
}
