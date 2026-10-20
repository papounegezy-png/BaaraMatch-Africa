import { memo, useId } from "react";
import { Link } from "wouter";
import { Banknote, Bookmark, Briefcase, FileText, MapPin, Star } from "lucide-react";
import { BadgeVerifie } from "@/components/badge-verifie";
import { formatJobTitle } from "@/lib/format-job-title";
import { libelleDate, libelleExperience, libelleLieu, libelleSalaire } from "@/lib/offres";
import type { Offre } from "@/types/offre";

function initiales(nom: string): string {
  return nom.split(/\s+/).filter((m) => /[A-Za-zÀ-ÿ0-9]/.test(m)).slice(0, 2).map((m) => m[0]!.toUpperCase()).join("") || "?";
}

function LogoEmployeur({ offre }: { offre: Offre }) {
  const cadre = "grid h-12 w-12 flex-none place-items-center overflow-hidden rounded-[14px] border border-baara-trait min-[900px]:h-14 min-[900px]:w-14 dark:border-white/10";
  // alt="" : le nom de l'employeur est déjà écrit dans la carte.
  if (offre.employeurLogoUrl) {
    return <img src={offre.employeurLogoUrl} alt="" width={56} height={56} loading="lazy" className={`${cadre} bg-white object-contain p-1`} />;
  }
  return (
    <span aria-hidden="true" className={`${cadre} bg-baara-clair font-titre text-base font-bold text-baara-marine dark:bg-white/10 dark:text-white`}>
      {initiales(offre.employeurNom)}
    </span>
  );
}

/**
 * Carte d'une offre de la page Offres. Toute la carte mène au détail par un
 * seul lien (le titre, étendu à la carte par un pseudo-élément) ; le bouton
 * « Enregistrer » passe au-dessus et ne déclenche pas ce lien. Une donnée
 * absente n'est pas affichée, sauf le salaire (« Selon profil »).
 */
export const CarteOffre = memo(function CarteOffre({ offre, enregistree, onEnregistrer, afficherEnregistrer }: {
  offre: Offre;
  enregistree: boolean;
  onEnregistrer: (id: string) => void;
  afficherEnregistrer: boolean;
}) {
  const id = useId();
  const titre = formatJobTitle(offre.titre);
  const lieu = libelleLieu(offre.ville, offre.pays);
  const experience = libelleExperience(offre.experienceMin, offre.experienceMax);
  const date = libelleDate(offre.publieLe);
  const etiquettes = [offre.contrat, offre.secteur].filter(Boolean);
  const infos = [
    experience && { icone: Briefcase, texte: experience, nom: "Expérience" },
    { icone: Banknote, texte: libelleSalaire(offre.salaireMin, offre.salaireMax, offre.devise, offre.periodeSalaire), nom: "Salaire" },
    lieu && { icone: MapPin, texte: lieu, nom: "Lieu" },
  ].filter((i): i is { icone: typeof Briefcase; texte: string; nom: string } => !!i);

  return (
    <article
      aria-labelledby={`${id}-titre ${id}-employeur${lieu ? ` ${id}-lieu` : ""}`}
      className="group relative rounded-2xl border-[1.5px] border-baara-trait bg-white px-4 py-[18px] transition-[transform,border-color] duration-200 hover:border-baara-marine focus-within:border-baara-marine motion-safe:hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/50 min-[900px]:rounded-[20px] min-[900px]:px-6 min-[900px]:py-[22px]"
      data-testid={`carte-offre-${offre.id}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 id={`${id}-titre`} className="break-words font-titre text-[19px] font-bold leading-snug text-baara-marine dark:text-white min-[900px]:text-[21px]">
              <Link
                href={`/jobs/${offre.id}`}
                className="rounded-sm after:absolute after:inset-0 after:rounded-[inherit] after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-baara-bleu group-hover:underline group-hover:decoration-2 group-hover:underline-offset-4"
              >
                {titre}
              </Link>
            </h3>
            {offre.urgent && (
              <span className="rounded-full bg-baara-urgent-fond px-2.5 py-px font-texte text-[13px] font-bold text-baara-urgent" data-testid="pastille-urgent">
                Urgent
              </span>
            )}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-texte text-[15px] text-baara-texte dark:text-slate-300">
            <strong id={`${id}-employeur`} className="font-semibold text-baara-marine dark:text-white">{offre.employeurNom}</strong>
            {offre.employeurVerifie && <BadgeVerifie marge={false} />}
            {offre.employeurNote != null && (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Star className="h-4 w-4 fill-baara-or text-baara-or" aria-hidden="true" />
                {offre.employeurNote.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}/5
              </span>
            )}
          </p>
        </div>
        <LogoEmployeur offre={offre} />
      </div>

      <ul className="mt-4 flex flex-col gap-2 font-texte text-[15px] text-baara-marine dark:text-white min-[900px]:flex-row min-[900px]:flex-wrap min-[900px]:items-center min-[900px]:gap-0 min-[900px]:divide-x min-[900px]:divide-baara-trait dark:min-[900px]:divide-white/15">
        {infos.map(({ icone: Icone, texte, nom }) => (
          <li key={nom} className="flex items-center gap-2 min-[900px]:px-4 min-[900px]:first:pl-0">
            <Icone className="h-[18px] w-[18px] flex-none text-baara-bleu dark:text-baara-moyen" aria-hidden="true" />
            <span className="sr-only">{nom} : </span>
            <span id={nom === "Lieu" ? `${id}-lieu` : undefined}>{texte}</span>
          </li>
        ))}
      </ul>

      {offre.description && (
        <p className="mt-3 flex gap-2 font-texte text-[15.5px] leading-relaxed text-baara-texte dark:text-slate-300">
          <FileText className="mt-1 h-[18px] w-[18px] flex-none text-baara-texte dark:text-slate-400" aria-hidden="true" />
          <span className="line-clamp-2">{offre.description}</span>
        </p>
      )}

      {etiquettes.length > 0 && (
        <p className="mt-3 font-texte text-[14.5px] text-baara-texte dark:text-slate-300">{etiquettes.join(" · ")}</p>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="font-texte text-sm text-baara-texte dark:text-slate-400">{date}</span>
        {afficherEnregistrer && (
          <button
            type="button"
            onClick={() => onEnregistrer(offre.id)}
            aria-pressed={enregistree}
            // Nom constant : l'état « enregistrée » est porté par aria-pressed.
            aria-label={`Enregistrer l'offre : ${titre}`}
            className="relative z-10 inline-flex min-h-11 items-center gap-2 rounded-full px-3 font-texte text-[15px] font-semibold text-baara-marine hover:bg-baara-clair focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu dark:text-white dark:hover:bg-white/10"
            data-testid={`bouton-enregistrer-${offre.id}`}
          >
            <Bookmark className={`h-5 w-5 ${enregistree ? "fill-baara-bleu text-baara-bleu" : ""}`} aria-hidden="true" />
            {enregistree ? "Enregistrée" : "Enregistrer"}
          </button>
        )}
      </div>
    </article>
  );
});
