import { Download, Eye, FileText, Phone, Plus, User, type LucideIcon } from "lucide-react";
import { BlocProfil, TexteVide } from "@/components/profil/bloc-profil";
import { formaterTelephone, libelleTypeFichier } from "@/utils/profil";

const boutonPlein =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-baara-bleu px-6 font-texte text-[15px] font-semibold text-white hover:bg-baara-marine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2";
const boutonContour =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-[1.5px] border-baara-marine bg-white px-6 font-texte text-[15px] font-semibold text-baara-marine hover:bg-baara-clair focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2 dark:border-white dark:bg-transparent dark:text-white dark:hover:bg-white/10";

function Entree({ libelle, valeur, Icone }: { libelle: string; valeur: string | null; Icone?: LucideIcon }) {
  return (
    <div className="rounded-2xl border-[1.5px] border-baara-trait px-4 py-3 dark:border-white/20">
      <dt className="font-texte text-[14.5px] text-baara-texte dark:text-slate-300">{libelle}</dt>
      <dd className="mt-0.5 flex items-center gap-2 [overflow-wrap:anywhere]">
        {valeur ? (
          <>
            {Icone && <Icone className="h-4 w-4 shrink-0 text-baara-bleu dark:text-baara-moyen" aria-hidden="true" />}
            <span className="font-texte text-lg font-bold text-baara-marine dark:text-white">{valeur}</span>
          </>
        ) : (
          <span className="font-texte text-[15px] font-medium text-baara-texte dark:text-slate-300">Non renseigné</span>
        )}
      </dd>
    </div>
  );
}

export function BlocInfosPersonnelles({
  nom,
  telephone,
  ville,
  whatsapp,
  onModifier,
}: {
  nom?: string | null;
  telephone?: string | null;
  ville?: string | null;
  whatsapp?: string | null;
  onModifier: () => void;
}) {
  return (
    <BlocProfil id="infos-personnelles" titre="Infos personnelles" Icone={User} libelleModifier="Modifier les infos personnelles" onModifier={onModifier}>
      <dl className="grid grid-cols-2 gap-3 max-[639px]:grid-cols-1">
        <Entree libelle="Nom complet" valeur={nom?.trim() || null} />
        <Entree libelle="Téléphone" valeur={formaterTelephone(telephone)} Icone={Phone} />
        <Entree libelle="Ville" valeur={ville?.trim() || null} />
        <Entree libelle="WhatsApp" valeur={formaterTelephone(whatsapp)} Icone={Phone} />
      </dl>
    </BlocProfil>
  );
}

export function BlocAPropos({ presentation, onModifier }: { presentation?: string | null; onModifier: () => void }) {
  return (
    <BlocProfil id="a-propos" titre="À propos" libelleModifier="Modifier la présentation" onModifier={onModifier}>
      {presentation?.trim() ? (
        <p className="max-w-[68ch] whitespace-pre-line font-texte text-[16.5px] leading-relaxed text-baara-marine [overflow-wrap:anywhere] dark:text-white" data-testid="text-bio">
          {presentation.trim()}
        </p>
      ) : (
        <TexteVide>Vous n'avez pas encore ajouté de présentation. Présentez-vous en quelques lignes pour être mieux repéré par les employeurs.</TexteVide>
      )}
    </BlocProfil>
  );
}

export function BlocCv({
  nomFichier,
  typeMime,
  disponible,
  onOuvrir,
  onTelecharger,
  onModifier,
}: {
  nomFichier?: string | null;
  typeMime?: string | null;
  disponible: boolean;
  onOuvrir: () => void;
  onTelecharger: () => void;
  onModifier: () => void;
}) {
  return (
    <BlocProfil id="cv" titre="CV du candidat" Icone={FileText} libelleModifier="Modifier le CV" onModifier={onModifier}>
      {disponible ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl border-[1.5px] border-baara-moyen bg-baara-clair p-4 dark:border-white/15 dark:bg-white/5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white dark:bg-white/10" aria-hidden="true">
              <FileText className="h-5 w-5 text-baara-bleu dark:text-baara-moyen" />
            </span>
            <div className="min-w-0">
              <p className="font-texte text-[16px] font-bold text-baara-marine [overflow-wrap:anywhere] dark:text-white" data-testid="text-resume-file-name">
                {nomFichier?.trim() || "CV"}
              </p>
              <p className="font-texte text-[14.5px] text-baara-texte dark:text-slate-300" data-testid="type-cv">{libelleTypeFichier(typeMime, nomFichier)}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 max-[639px]:flex-col">
            <button type="button" onClick={onOuvrir} className={`${boutonPlein} flex-1`} data-testid="button-view-resume">
              <Eye className="h-5 w-5" aria-hidden="true" />
              Ouvrir le CV
            </button>
            <button type="button" onClick={onTelecharger} className={`${boutonContour} flex-1`} data-testid="button-download-resume">
              <Download className="h-5 w-5" aria-hidden="true" />
              Télécharger
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TexteVide>Aucun CV ajouté.</TexteVide>
          <button type="button" onClick={onModifier} className={boutonContour} data-testid="button-add-resume">
            <Plus className="h-5 w-5" aria-hidden="true" />
            Ajouter mon CV
          </button>
        </div>
      )}
    </BlocProfil>
  );
}
