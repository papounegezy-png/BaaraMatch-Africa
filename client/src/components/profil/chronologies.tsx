import type { ReactNode } from "react";
import { Award, Banknote, Briefcase, Building2, CalendarClock, GraduationCap, Info, Plus, type LucideIcon } from "lucide-react";
import { BlocProfil, TexteVide } from "@/components/profil/bloc-profil";
import { libelleContrat, libelleDateLongue, libellePeriode } from "@/utils/profil";

export type ExperienceProfil = {
  id: string;
  position: string;
  company: string;
  contractType: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  missionDescription: string;
};
export type FormationProfil = { id: string; level: string; institution: string; degree: string; startYear: string; endYear: string };
export type CertificationProfil = { id: string; name: string; issuer: string; obtainedDate: string };

const boutonAjouter =
  "inline-flex min-h-11 items-center gap-2 rounded-full border-[1.5px] border-baara-marine bg-white px-5 font-texte text-[15px] font-semibold text-baara-marine hover:bg-baara-clair focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2 dark:border-white dark:bg-transparent dark:text-white dark:hover:bg-white/10";
const carte = "rounded-2xl border-[1.5px] border-baara-trait bg-white px-[18px] py-4 dark:border-white/20 dark:bg-white/5";
const titreElement = "font-titre text-lg font-bold leading-snug text-baara-marine [overflow-wrap:anywhere] dark:text-white";
const ligneTexte = "font-texte text-[15px] text-baara-texte dark:text-slate-300";

/** Chronologie : pastille et fil décoratifs, le dernier élément sans fil. */
function Chronologie<T extends { id: string }>({ elements, rendu, testid }: { elements: T[]; rendu: (e: T) => ReactNode; testid: string }) {
  return (
    <ol className="space-y-4" data-testid={testid}>
      {elements.map((e, i) => (
        <li key={e.id} className="relative pl-8">
          <span aria-hidden="true" className="absolute left-0 top-[22px] h-[18px] w-[18px] rounded-full border-[3px] border-baara-bleu bg-white dark:bg-baara-profond" />
          {i < elements.length - 1 && <span aria-hidden="true" className="absolute -bottom-4 left-2 top-10 w-0.5 bg-baara-moyen dark:bg-white/15" />}
          {rendu(e)}
        </li>
      ))}
    </ol>
  );
}

function Vide({ texte, onAjouter, libelleAjouter }: { texte: string; onAjouter?: () => void; libelleAjouter: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <TexteVide>{texte}</TexteVide>
      {onAjouter && (
        <button type="button" onClick={onAjouter} className={boutonAjouter} aria-label={libelleAjouter}>
          <Plus className="h-5 w-5" aria-hidden="true" />
          Ajouter
        </button>
      )}
    </div>
  );
}

function LigneInfo({ Icone, children, testid }: { Icone: LucideIcon; children: ReactNode; testid: string }) {
  return (
    <p className="flex items-start gap-3 rounded-[14px] bg-baara-clair px-4 py-3 font-texte text-[16.5px] font-semibold text-baara-marine dark:bg-white/10 dark:text-white" data-testid={testid}>
      <Icone className="mt-0.5 h-5 w-5 shrink-0 text-baara-bleu dark:text-baara-moyen" aria-hidden="true" />
      <span className="min-w-0 [overflow-wrap:anywhere]">{children}</span>
    </p>
  );
}

export function BlocExperiences({
  experiences,
  plusieursEnCours,
  pretentions,
  disponibilite,
  anneesExperience,
  onModifier,
}: {
  experiences: ExperienceProfil[];
  plusieursEnCours: boolean;
  pretentions?: string;
  disponibilite?: string;
  anneesExperience?: string;
  onModifier: () => void;
}) {
  return (
    <BlocProfil id="experiences" titre="Expérience professionnelle" Icone={Briefcase} libelleModifier="Modifier l'expérience professionnelle" onModifier={onModifier}>
      {plusieursEnCours && (
        <p className="mb-4 flex items-start gap-2 font-texte text-[15px] text-baara-marine dark:text-white" data-testid="warning-multiple-current-experience">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-baara-bleu dark:text-baara-moyen" aria-hidden="true" />
          Plusieurs postes sont indiqués « en cours ». Vérifiez les dates de fin.
        </p>
      )}
      {experiences.length > 0 ? (
        <Chronologie
          testid="chronologie-experiences"
          elements={experiences}
          rendu={(e) => {
            const contrat = libelleContrat(e.contractType);
            const periode = libellePeriode(e.startDate, e.endDate, e.isCurrent);
            return (
              <article className={carte}>
                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
                  <h3 className={`${titreElement} min-w-0 flex-1 basis-48`} data-testid={`text-experience-position-${e.id}`}>{e.position || "Poste non renseigné"}</h3>
                  {contrat && <span className="shrink-0 rounded-full bg-baara-moyen px-2.5 py-0.5 font-texte text-[13.5px] font-bold text-baara-marine dark:bg-white/15 dark:text-white">{contrat}</span>}
                </div>
                {e.company && (
                  <p className="mt-1 flex items-center gap-1.5 font-texte text-[16px] font-semibold text-baara-marine [overflow-wrap:anywhere] dark:text-white">
                    <Building2 className="h-4 w-4 shrink-0 text-baara-bleu dark:text-baara-moyen" aria-hidden="true" />
                    {e.company}
                  </p>
                )}
                {periode && <p className={`mt-1 ${ligneTexte}`} data-testid={`periode-${e.id}`}>{periode}</p>}
                {e.missionDescription && (
                  <div className="mt-3 rounded-xl bg-baara-clair px-3.5 py-3 dark:bg-white/10">
                    <p className="font-texte text-[15px] font-bold text-baara-marine dark:text-white">Missions</p>
                    <p className="mt-1 whitespace-pre-line font-texte text-[15px] text-baara-marine [overflow-wrap:anywhere] dark:text-slate-200">{e.missionDescription}</p>
                  </div>
                )}
              </article>
            );
          }}
        />
      ) : (
        <Vide texte="Aucune expérience ajoutée. Ajoutez vos postes pour montrer votre parcours." onAjouter={onModifier} libelleAjouter="Ajouter une expérience" />
      )}
      {(anneesExperience || pretentions || disponibilite) && (
        <div className="mt-4 space-y-2">
          {anneesExperience && <LigneInfo Icone={Briefcase} testid="text-annees-experience">{anneesExperience}</LigneInfo>}
          {pretentions && <LigneInfo Icone={Banknote} testid="text-salary">Prétentions : {pretentions}</LigneInfo>}
          {disponibilite && <LigneInfo Icone={CalendarClock} testid="text-available">{disponibilite}</LigneInfo>}
        </div>
      )}
    </BlocProfil>
  );
}

export function BlocFormations({ formations, onModifier }: { formations: FormationProfil[]; onModifier: () => void }) {
  return (
    <BlocProfil id="formations" titre="Formations" Icone={GraduationCap} libelleModifier="Modifier les formations" onModifier={onModifier}>
      {formations.length > 0 ? (
        <Chronologie
          testid="chronologie-formations"
          elements={formations}
          rendu={(f) => {
            const diplome = f.degree || f.level || "Formation";
            // « Niveau : … » seulement s'il apporte autre chose que le diplôme.
            const niveau = f.level && f.level.trim().toLowerCase() !== diplome.trim().toLowerCase() ? f.level : null;
            const periode = libellePeriode(f.startYear, f.endYear);
            return (
              <article className={carte}>
                <h3 className={titreElement} data-testid={`text-education-level-${f.id}`}>{diplome}</h3>
                {f.institution && <p className="mt-1 font-texte text-[16px] font-semibold text-baara-marine [overflow-wrap:anywhere] dark:text-white">{f.institution}</p>}
                {niveau && <p className={`mt-1 ${ligneTexte}`}>Niveau : {niveau}</p>}
                {periode && <p className={`mt-1 ${ligneTexte}`}>{periode}</p>}
              </article>
            );
          }}
        />
      ) : (
        <Vide texte="Aucune formation ajoutée." onAjouter={onModifier} libelleAjouter="Ajouter une formation" />
      )}
    </BlocProfil>
  );
}

export function BlocCertifications({ certifications, onModifier }: { certifications: CertificationProfil[]; onModifier: () => void }) {
  return (
    <BlocProfil id="certifications" titre="Certifications professionnelles" Icone={Award} libelleModifier="Modifier les certifications" onModifier={onModifier}>
      {certifications.length > 0 ? (
        <ul className="space-y-3" data-testid="liste-certifications">
          {certifications.map((c) => {
            const jour = /^\d{4}-\d{2}-\d{2}/.test(c.obtainedDate.trim());
            const date = libelleDateLongue(c.obtainedDate);
            return (
              <li key={c.id} className={carte}>
                <h3 className={titreElement} data-testid={`text-certification-name-${c.id}`}>{c.name || "Certification"}</h3>
                <p className="mt-1 font-texte text-[16px] font-medium text-baara-texte [overflow-wrap:anywhere] dark:text-slate-300">{c.issuer || "Organisme non renseigné"}</p>
                <p className={`mt-1 ${ligneTexte}`}>{date ? `Obtenue ${jour ? "le" : "en"} ${date}` : "Date non renseignée"}</p>
              </li>
            );
          })}
        </ul>
      ) : (
        <Vide texte="Aucune certification ajoutée." onAjouter={onModifier} libelleAjouter="Ajouter une certification" />
      )}
    </BlocProfil>
  );
}
