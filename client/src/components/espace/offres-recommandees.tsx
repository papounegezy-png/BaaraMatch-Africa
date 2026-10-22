import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Bookmark, FileSignature, MapPin } from "lucide-react";
import { BadgeVerifie } from "@/components/badge-verifie";
import { formatJobTitle } from "@shared/format-job-title";
import { libelleLieu } from "@/lib/offres";
import { raisonCorrespondance, type Correspondance } from "@/lib/recommandations";
import type { Offre } from "@/types/offre";

export type OffreRecommandee = Offre & { correspondance: Correspondance };

/**
 * Offres recommandées : 2 à 4 cartes, chacune entièrement cliquable vers
 * l'offre. Le bouton « Enregistrer » passe au-dessus du lien étiré.
 */
export function OffresRecommandees({
  offres,
  chargement,
  erreur,
  onReessayer,
  enregistrees,
  onEnregistrer,
}: {
  offres: OffreRecommandee[];
  chargement: boolean;
  erreur: boolean;
  onReessayer: () => void;
  enregistrees: Set<string>;
  onEnregistrer: (id: string, surSucces: (enregistree: boolean) => void) => void;
}) {
  // Annonce (role=status) une fois l'enregistrement confirmé.
  const [annonce, setAnnonce] = useState("");
  const enregistrer = (id: string) =>
    onEnregistrer(id, (enregistree) => setAnnonce(enregistree ? "Offre enregistrée" : "Offre retirée des sauvegardes"));
  const vide = !chargement && !erreur && offres.length === 0;

  return (
    <section aria-labelledby="titre-offres-recommandees" className="mt-10 border-t-2 border-baara-marine pt-5 dark:border-white" data-testid="offres-recommandees">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
        <h2 id="titre-offres-recommandees" className="font-titre text-[22px] font-bold text-baara-marine dark:text-white">
          Offres recommandées
        </h2>
        <Link
          href="/jobs"
          className="inline-flex min-h-11 items-center gap-1.5 font-texte text-[15px] font-bold text-baara-bleu underline underline-offset-4 hover:text-baara-marine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2 dark:text-white"
          data-testid="voir-toutes-offres"
        >
          Voir tout
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      <p role="status" className="sr-only" data-testid="annonce-enregistrement">{annonce}</p>

      {vide ? (
        <div className="mt-4 rounded-[20px] border-[1.5px] border-baara-trait bg-white px-[22px] py-8 text-center dark:border-white/20 dark:bg-white/5">
          <p className="font-texte text-[15.5px] text-baara-texte dark:text-slate-300">Complétez votre profil pour recevoir des offres adaptées.</p>
          <Link
            href="/profile"
            className="mt-3 inline-flex min-h-11 items-center gap-1.5 font-texte text-[15px] font-bold text-baara-bleu underline underline-offset-4 hover:text-baara-marine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2 dark:text-white"
          >
            Modifier mon profil
          </Link>
        </div>
      ) : erreur ? (
        <div className="mt-4 rounded-[20px] border-[1.5px] border-baara-trait bg-white px-[22px] py-6 dark:border-white/20 dark:bg-white/5" role="alert">
          <p className="font-texte text-[15.5px] text-baara-texte dark:text-slate-300">Les offres n'ont pas pu être chargées. Vérifiez votre connexion.</p>
          <button
            type="button"
            onClick={onReessayer}
            className="mt-3 inline-flex min-h-11 items-center rounded-full border-[1.5px] border-baara-marine px-5 font-texte text-[15px] font-semibold text-baara-marine hover:bg-baara-clair focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2 dark:border-white dark:text-white dark:hover:bg-white/10"
          >
            Réessayer
          </button>
        </div>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-4 max-[899px]:grid-cols-1">
          {chargement
            ? [0, 1].map((i) => (
                <li key={i} className="space-y-3 rounded-[20px] border-[1.5px] border-baara-trait bg-white px-[22px] py-5 dark:border-white/20 dark:bg-white/5" aria-hidden="true">
                  <span className="block h-6 w-3/4 animate-pulse rounded bg-baara-moyen motion-reduce:animate-none dark:bg-white/10" />
                  <span className="block h-4 w-1/2 animate-pulse rounded bg-baara-clair motion-reduce:animate-none dark:bg-white/10" />
                  <span className="block h-2 w-full animate-pulse rounded-full bg-baara-clair motion-reduce:animate-none dark:bg-white/10" />
                </li>
              ))
            : offres.map((o) => (
                <li key={o.id} className="flex">
                  <CarteRecommandee offre={o} enregistree={enregistrees.has(o.id)} onEnregistrer={enregistrer} />
                </li>
              ))}
        </ul>
      )}
    </section>
  );
}

function CarteRecommandee({ offre, enregistree, onEnregistrer }: { offre: OffreRecommandee; enregistree: boolean; onEnregistrer: (id: string) => void }) {
  const titre = formatJobTitle(offre.titre);
  const lieu = libelleLieu(offre.ville, offre.pays);
  const { score, correspondent } = offre.correspondance;
  const raison = raisonCorrespondance(correspondent);
  const infos = [
    lieu && { Icone: MapPin, texte: lieu, nom: "Lieu" },
    offre.contrat && { Icone: FileSignature, texte: offre.contrat, nom: "Contrat" },
  ].filter((i): i is { Icone: typeof MapPin; texte: string; nom: string } => !!i);

  return (
    <article
      className="group relative flex w-full flex-col rounded-[20px] border-[1.5px] border-baara-trait bg-white px-[22px] py-5 transition-colors hover:border-baara-marine focus-within:border-baara-marine motion-reduce:transition-none dark:border-white/20 dark:bg-white/5 dark:hover:border-white/60"
      data-testid={`offre-recommandee-${offre.id}`}
    >
      <h3 className="font-titre text-[19px] font-bold leading-snug text-baara-marine [overflow-wrap:anywhere] dark:text-white">
        <Link
          href={`/jobs/${offre.id}`}
          className="rounded-sm after:absolute after:inset-0 after:rounded-[inherit] after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-baara-bleu group-hover:underline group-hover:decoration-2 group-hover:underline-offset-4"
        >
          {titre}
        </Link>
      </h3>
      {offre.employeurNom && (
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-texte text-[15px]">
          <strong className="font-semibold text-baara-marine dark:text-white">{offre.employeurNom}</strong>
          {offre.employeurVerifie && <BadgeVerifie marge={false} />}
        </p>
      )}
      {infos.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 font-texte text-[15px] text-baara-marine dark:text-white">
          {infos.map(({ Icone, texte, nom }) => (
            <li key={nom} className="flex items-center gap-2">
              <Icone className="h-[18px] w-[18px] flex-none text-baara-bleu dark:text-baara-moyen" aria-hidden="true" />
              <span className="sr-only">{nom} : </span>
              {texte}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4">
        <p className="font-texte text-[14.5px] font-semibold text-baara-marine dark:text-white">
          {score} % de correspondance avec votre profil
        </p>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-baara-moyen dark:bg-white/15" aria-hidden="true">
          <div className="h-full rounded-full bg-baara-bleu" style={{ width: `${score}%` }} />
        </div>
        {raison && <p className="mt-1.5 font-texte text-sm text-baara-texte dark:text-slate-300">{raison}</p>}
      </div>

      <div className="mt-auto flex justify-end pt-3">
        <button
          type="button"
          onClick={() => onEnregistrer(offre.id)}
          aria-pressed={enregistree}
          // Nom constant : l'état « enregistrée » est porté par aria-pressed.
          aria-label={`Enregistrer l'offre : ${titre}`}
          className="relative z-10 -mr-3 inline-flex min-h-11 items-center gap-2 rounded-full px-3 font-texte text-[15px] font-semibold text-baara-marine hover:bg-baara-clair focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu dark:text-white dark:hover:bg-white/10"
          data-testid={`enregistrer-${offre.id}`}
        >
          <Bookmark className={`h-5 w-5 ${enregistree ? "fill-baara-bleu text-baara-bleu" : ""}`} aria-hidden="true" />
          {enregistree ? "Enregistrée" : "Enregistrer"}
        </button>
      </div>
    </article>
  );
}
