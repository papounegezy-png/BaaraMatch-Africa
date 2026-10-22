import { Link } from "wouter";
import { Bookmark, CheckCircle2, ChevronRight, Eye, MapPin, Pencil, Search, type LucideIcon } from "lucide-react";
import { calculateProfileCompletion, nextProfileStep } from "@/lib/completion-profil";
import type { CandidateProfile, User } from "@shared/schema";

const pastille =
  "inline-flex min-h-11 flex-[1_1_auto] items-center whitespace-nowrap justify-center gap-2 rounded-full border-[1.5px] border-baara-marine bg-white px-4 font-texte text-[15px] font-semibold text-baara-marine hover:bg-baara-clair focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2 dark:border-white dark:bg-transparent dark:text-white dark:hover:bg-white/10";

function initiales(nom: string): string {
  return nom.trim().split(/\s+/).slice(0, 2).map((m) => m[0]?.toUpperCase() ?? "").join("") || "?";
}

/**
 * Colonne latérale de l'espace candidat : carte profil (avatar, ville,
 * complétion) et actions rapides. Ni téléphone ni e-mail ici.
 */
export function ColonneProfil({
  utilisateur,
  profil,
  chargement,
  nbSauvegardees,
}: {
  utilisateur?: User;
  profil?: CandidateProfile | null;
  chargement: boolean;
  nbSauvegardees: number;
}) {
  return (
    <aside aria-label="Votre profil" className="mt-10 min-w-0 [flex:1_1_320px]" data-testid="colonne-profil">
      {chargement || !utilisateur ? (
        <div className="rounded-[20px] border-[1.5px] border-baara-trait bg-white p-6 dark:border-white/20 dark:bg-white/5" aria-hidden="true">
          <span className="block h-[72px] w-[72px] animate-pulse rounded-full bg-baara-clair motion-reduce:animate-none dark:bg-white/10" />
          <span className="mt-4 block h-6 w-1/2 animate-pulse rounded bg-baara-moyen motion-reduce:animate-none dark:bg-white/10" />
          <span className="mt-3 block h-2 w-full animate-pulse rounded-full bg-baara-clair motion-reduce:animate-none dark:bg-white/10" />
        </div>
      ) : (
        <CarteProfil utilisateur={utilisateur} profil={profil ?? undefined} />
      )}

      <section aria-labelledby="titre-actions-rapides" className="mt-10 border-t-2 border-baara-marine pt-5 dark:border-white">
        <h2 id="titre-actions-rapides" className="font-titre text-[22px] font-bold text-baara-marine dark:text-white">
          Actions rapides
        </h2>
        <ul className="mt-4 divide-y divide-baara-trait overflow-hidden rounded-[20px] border-[1.5px] border-baara-trait bg-white dark:divide-white/15 dark:border-white/20 dark:bg-white/5">
          <ActionRapide href="/jobs" Icone={Search} libelle="Rechercher des offres" />
          <ActionRapide href="/saved-jobs" Icone={Bookmark} libelle={`Offres sauvegardées${nbSauvegardees > 0 ? ` (${nbSauvegardees})` : ""}`} />
        </ul>
      </section>
    </aside>
  );
}

function CarteProfil({ utilisateur, profil }: { utilisateur: User; profil?: CandidateProfile }) {
  const completion = calculateProfileCompletion(utilisateur, profil);
  const etape = nextProfileStep(utilisateur, profil);
  const lieu = [utilisateur.city?.trim(), utilisateur.country?.trim()].filter(Boolean).join(", ");
  const avatar = "h-[72px] w-[72px] shrink-0 rounded-full border-2 border-white ring-[1.5px] ring-baara-trait dark:border-baara-profond dark:ring-white/20";

  return (
    <div className="rounded-[20px] border-[1.5px] border-baara-trait bg-white p-6 dark:border-white/20 dark:bg-white/5" data-testid="carte-profil">
      <div className="flex items-center gap-4">
        {utilisateur.avatarUrl ? (
          // alt="" : le nom est écrit juste à côté.
          <img src={utilisateur.avatarUrl} alt="" width={72} height={72} className={`${avatar} bg-baara-clair object-cover`} />
        ) : (
          <span className={`${avatar} grid place-items-center bg-baara-clair font-titre text-2xl font-bold text-baara-marine dark:bg-white/10 dark:text-white`} aria-hidden="true">
            {initiales(utilisateur.fullName)}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="font-titre text-[22px] font-extrabold leading-tight text-baara-marine [overflow-wrap:anywhere] dark:text-white" data-testid="nom-profil">
            {utilisateur.fullName}
          </h2>
          {lieu && (
            <p className="mt-1 flex items-center gap-1.5 font-texte text-[15px] text-baara-texte dark:text-slate-300" data-testid="lieu-profil">
              <MapPin className="h-4 w-4 shrink-0 text-baara-bleu dark:text-baara-moyen" aria-hidden="true" />
              {lieu}
            </p>
          )}
        </div>
      </div>

      {completion >= 100 ? (
        <p className="mt-5 flex items-center gap-2 rounded-xl bg-baara-complet-fond px-4 py-3 font-texte text-[15px] font-semibold text-baara-complet-texte" data-testid="profil-complet">
          <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
          Profil complet
        </p>
      ) : (
        <div className="mt-5" data-testid="completion-profil">
          <p className="flex items-baseline justify-between gap-3 font-texte text-[15px] text-baara-marine dark:text-white">
            <span>Profil complété</span>
            <span className="font-bold tabular-nums">{completion} %</span>
          </p>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={completion}
            aria-label="Profil complété"
            className="mt-2 h-2 overflow-hidden rounded-full bg-baara-moyen dark:bg-white/15"
          >
            <div className="h-full rounded-full bg-baara-bleu" style={{ width: `${completion}%` }} />
          </div>
          {etape && (
            <Link
              href={`/profile?section=${etape.section}`}
              className="mt-2 inline-flex min-h-11 items-center font-texte text-[15px] font-bold text-baara-bleu underline underline-offset-4 hover:text-baara-marine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2 dark:text-white"
              title={etape.label}
              data-testid="lien-completer-profil"
            >
              Compléter mon profil
            </Link>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <Link href="/profile?section=personal" className={pastille}>
          <Pencil className="h-4 w-4" aria-hidden="true" />
          Modifier
        </Link>
        <Link href="/profile/view" className={pastille}>
          <Eye className="h-4 w-4" aria-hidden="true" />
          Aperçu du profil
        </Link>
      </div>
    </div>
  );
}

function ActionRapide({ href, Icone, libelle }: { href: string; Icone: LucideIcon; libelle: string }) {
  return (
    <li>
      <Link
        href={href}
        className="flex min-h-14 items-center gap-3 px-5 font-texte text-[15.5px] font-semibold text-baara-marine hover:bg-baara-clair focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-baara-bleu dark:text-white dark:hover:bg-white/10"
      >
        <Icone className="h-5 w-5 shrink-0 text-baara-bleu dark:text-baara-moyen" aria-hidden="true" />
        <span className="flex-1">{libelle}</span>
        <ChevronRight className="h-5 w-5 shrink-0 text-baara-texte" aria-hidden="true" />
      </Link>
    </li>
  );
}
