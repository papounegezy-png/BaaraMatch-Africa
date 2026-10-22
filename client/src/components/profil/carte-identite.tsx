import { BadgeCheck, Camera, CheckCircle2, Loader2, MapPin, Pencil } from "lucide-react";
import { initiales, motAccorde } from "@/utils/profil";

// libelle : au pluriel ; singulier : pour 0 et 1 (« 1 Expérience »).
export type TuileProfil = { ancre: string; libelle: string; singulier: string; nombre: number };

const pastille = "inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 font-texte text-[14.5px] font-bold";

/**
 * Carte d'identité de « Mon profil » : avatar (et changement de photo),
 * nom, titre, ville, puis trois tuiles qui mènent aux sections.
 */
export function CarteIdentite({
  nom,
  titre,
  ville,
  avatarUrl,
  verifie,
  complet,
  tuiles,
  envoiPhoto,
  onChangerPhoto,
  onModifier,
}: {
  nom: string;
  titre?: string | null;
  ville?: string | null;
  avatarUrl?: string | null;
  verifie: boolean;
  complet: boolean;
  tuiles: TuileProfil[];
  envoiPhoto: boolean;
  onChangerPhoto: () => void;
  onModifier: () => void;
}) {
  const avatar = "h-28 w-28 rounded-full border-4 border-white ring-[1.5px] ring-baara-trait max-[639px]:h-24 max-[639px]:w-24 dark:border-baara-profond dark:ring-white/20";

  return (
    <section aria-labelledby="nom-profil" className="overflow-hidden rounded-[24px] border-[1.5px] border-baara-trait bg-white dark:border-white/20 dark:bg-white/5" data-testid="carte-identite">
      <div className="flex flex-wrap items-start gap-x-6 gap-y-4 border-b border-baara-moyen bg-baara-clair p-7 max-[639px]:p-5 dark:border-white/10 dark:bg-white/5">
        <div className="relative shrink-0">
          {avatarUrl ? (
            // alt="" : le nom est écrit juste à côté.
            <img src={avatarUrl} alt="" width={112} height={112} className={`${avatar} bg-white object-cover`} data-testid="avatar-profil" />
          ) : (
            <span className={`${avatar} grid place-items-center bg-white font-titre text-[34px] font-extrabold text-baara-marine dark:bg-white/10 dark:text-white`} aria-hidden="true" data-testid="avatar-profil">
              {initiales(nom)}
            </span>
          )}
          <button
            type="button"
            onClick={onChangerPhoto}
            disabled={envoiPhoto}
            aria-label="Changer la photo de profil"
            className="absolute bottom-0 right-0 inline-flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-white bg-baara-bleu text-white hover:bg-baara-marine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2 disabled:opacity-70 dark:border-baara-profond"
            data-testid="button-upload-avatar"
          >
            {envoiPhoto ? <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Camera className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>

        <div className="min-w-0 flex-1 basis-60">
          <h2 id="nom-profil" className="font-titre text-[28px] font-extrabold leading-tight text-baara-marine [overflow-wrap:anywhere] dark:text-white" data-testid="text-profile-name">
            {nom}
          </h2>
          {titre?.trim() ? (
            <p className="mt-1 font-texte text-lg font-semibold text-baara-marine [overflow-wrap:anywhere] dark:text-white" data-testid="titre-professionnel">
              {titre}
            </p>
          ) : (
            <p className="mt-1 font-texte text-[16px] text-baara-texte dark:text-slate-300">Ajoutez un titre professionnel</p>
          )}
          {(ville?.trim() || complet || verifie) && (
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="Informations du profil">
              {ville?.trim() && (
                <li className={`${pastille} border-[1.5px] border-baara-trait bg-white text-baara-marine dark:border-white/20 dark:bg-transparent dark:text-white`}>
                  <MapPin className="h-4 w-4 text-baara-bleu dark:text-baara-moyen" aria-hidden="true" />
                  {ville}
                </li>
              )}
              {complet && (
                <li className={`${pastille} bg-baara-complet-fond text-baara-complet-texte`} data-testid="pastille-profil-complet">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Profil complet
                </li>
              )}
              {verifie && (
                <li className={`${pastille} border-[1.5px] border-baara-trait bg-white text-baara-marine dark:border-white/20 dark:bg-transparent dark:text-white`}>
                  <BadgeCheck className="h-4 w-4 text-baara-bleu dark:text-baara-moyen" aria-hidden="true" />
                  Compte vérifié
                </li>
              )}
            </ul>
          )}
        </div>

        <button
          type="button"
          onClick={onModifier}
          aria-label="Modifier l'identité"
          className="inline-flex min-h-11 items-center gap-1.5 font-texte text-[15px] font-bold text-baara-bleu underline underline-offset-4 hover:text-baara-marine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2 dark:text-white"
          data-testid="button-edit-profile-top"
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
          Modifier
        </button>
      </div>

      <ul className="grid grid-cols-3 gap-3 p-7 max-[639px]:gap-2 max-[639px]:p-5" aria-label="Sections du profil">
        {tuiles.map((t) => (
          <li key={t.ancre} className="flex">
            <a
              href={`#${t.ancre}`}
              className="flex min-h-[84px] w-full flex-col items-center justify-center rounded-2xl border-[1.5px] border-baara-trait px-2 text-center transition-colors hover:border-baara-marine hover:bg-baara-clair focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2 motion-reduce:transition-none dark:border-white/20 dark:hover:border-white dark:hover:bg-white/10"
              data-testid={`tuile-${t.ancre}`}
            >
              <span className="font-titre text-[26px] font-extrabold leading-none text-baara-marine tabular-nums dark:text-white">{t.nombre}</span>
              <span className="mt-1.5 font-texte text-[15px] text-baara-texte [overflow-wrap:anywhere] dark:text-slate-300">{motAccorde(t.nombre, t.singulier, t.libelle)}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
