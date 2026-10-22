import { useId, type ReactNode } from "react";
import { Briefcase, CalendarCheck, CheckCircle2, FileText, Lightbulb, Mic, Pencil, Sparkles, TrendingUp, type LucideIcon } from "lucide-react";
import { BlocProfil, TexteVide } from "@/components/profil/bloc-profil";
import { accorderNombre, libelleDateLongue } from "@/utils/profil";

const boutonContour =
  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-baara-marine bg-white px-5 font-texte text-[15px] font-semibold text-baara-marine hover:bg-baara-clair focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2 dark:border-white dark:bg-transparent dark:text-white dark:hover:bg-white/10";

export function BlocCompetences({ competences, onModifier }: { competences: string[]; onModifier: () => void }) {
  const liste = competences.map((c) => c.trim()).filter(Boolean);
  return (
    <BlocProfil id="competences" titre="Compétences" Icone={Sparkles} libelleModifier="Modifier les compétences" onModifier={onModifier}>
      {liste.length > 0 ? (
        <ul className="flex flex-wrap gap-2" data-testid="liste-competences">
          {liste.map((c) => (
            <li key={c} className="inline-flex min-h-9 items-center rounded-full bg-baara-clair px-3.5 font-texte text-[15px] font-semibold text-baara-marine [overflow-wrap:anywhere] dark:bg-white/10 dark:text-white" data-testid={`badge-skill-${c}`}>
              {c}
            </li>
          ))}
        </ul>
      ) : (
        <TexteVide>Aucune compétence ajoutée.</TexteVide>
      )}
    </BlocProfil>
  );
}

export function BlocCvVocal() {
  return (
    <BlocProfil id="cv-vocal" titre="CV vocal" Icone={Mic}>
      <p className="flex items-center gap-2 font-texte text-[16px] font-semibold text-baara-marine dark:text-white">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-baara-bleu dark:text-baara-moyen" aria-hidden="true" />
        CV vocal enregistré
      </p>
    </BlocProfil>
  );
}

function Activite({ Icone, children }: { Icone: LucideIcon; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3 font-texte text-[15.5px] text-baara-marine dark:text-white">
      <Icone className="mt-0.5 h-5 w-5 shrink-0 text-baara-bleu dark:text-baara-moyen" aria-hidden="true" />
      <span className="min-w-0">{children}</span>
    </li>
  );
}

/** Colonne de suivi : progression, conseil, activité. */
export function ColonneSuivi({
  completion,
  miseAJour,
  cvDisponible,
  nbExperiences,
  onCompleter,
  onMettreAJour,
}: {
  completion: number;
  miseAJour?: Date | string | null;
  cvDisponible: boolean;
  nbExperiences: number;
  onCompleter: () => void;
  onMettreAJour: () => void;
}) {
  const idNiveau = useId();
  const complet = completion >= 100;
  const dateMiseAJour = libelleDateLongue(miseAJour ?? null);
  const experiences = accorderNombre(nbExperiences, "expérience ajoutée", "expériences ajoutées");
  const activites = [
    dateMiseAJour && miseAJour && (
      <Activite key="maj" Icone={CalendarCheck}>
        Profil mis à jour le <time dateTime={new Date(miseAJour).toISOString()}>{dateMiseAJour}</time>
      </Activite>
    ),
    cvDisponible && <Activite key="cv" Icone={FileText}>CV disponible</Activite>,
    experiences && <Activite key="exp" Icone={Briefcase}>{experiences}</Activite>,
  ].filter(Boolean);

  return (
    <aside aria-label="Suivi du profil" className="min-w-0 space-y-5 [flex:1_1_320px]">
      <BlocProfil id="progression" titre="Progression du profil" Icone={TrendingUp} taille="lateral">
        <p className="flex items-baseline justify-between gap-3 font-texte text-[15.5px] text-baara-marine dark:text-white">
          <span id={idNiveau}>Niveau actuel</span>
          <span className="font-bold tabular-nums" data-testid="pourcentage-completion">{completion} %</span>
        </p>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={completion}
          aria-labelledby={idNiveau}
          className="mt-2 h-2.5 overflow-hidden rounded-full bg-baara-moyen dark:bg-white/15"
        >
          <div className="h-full rounded-full bg-baara-bleu" style={{ width: `${completion}%` }} />
        </div>
        <p className="mt-3 font-texte text-[14.5px] text-baara-texte dark:text-slate-300">
          Objectif conseillé : 90 % ou plus pour être mieux repéré par les employeurs.
        </p>
      </BlocProfil>

      <BlocProfil id="conseils" titre="Conseils" Icone={Lightbulb} taille="lateral">
        <p className="font-texte text-[15.5px] text-baara-marine dark:text-white">
          {complet ? "Excellent profil. Pensez à le garder à jour." : "Complétez votre profil pour être mieux repéré par les employeurs."}
        </p>
        <button type="button" onClick={complet ? onMettreAJour : onCompleter} className={`${boutonContour} mt-4`} data-testid="bouton-conseil">
          <Pencil className="h-4 w-4" aria-hidden="true" />
          {complet ? "Mettre à jour mon profil" : "Compléter mon profil"}
        </button>
      </BlocProfil>

      {activites.length > 0 && (
        <BlocProfil id="activite" titre="Activité" Icone={CalendarCheck} taille="lateral">
          <ul className="space-y-3" data-testid="liste-activite">{activites}</ul>
        </BlocProfil>
      )}
    </aside>
  );
}
