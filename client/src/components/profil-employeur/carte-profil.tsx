import { useState, type ReactNode } from "react";
import { MapPin } from "lucide-react";
import { BadgeVerifie } from "@/components/badge-verifie";
import { initiales, libelleLieu } from "@/lib/employeurs";
import type { ProfilEmployeur } from "@/types/profil-employeur";

// Bannière : photo de couverture de l'entreprise, sinon aplat marine ; filet
// or de 4 px dans les deux cas. Décorative (alt vide).
function Banniere({ url }: { url?: string }) {
  const [echec, setEchec] = useState(false);
  return (
    <div className="h-32 overflow-hidden border-b-4 border-baara-or bg-baara-marine min-[900px]:h-44">
      {url && !echec && (
        <img src={url} alt="" width={1180} height={176} decoding="async" onError={() => setEchec(true)} className="h-full w-full object-cover" />
      )}
    </div>
  );
}

// Logo, ou initiales sur fond clair s'il manque ou ne se charge pas.
function Logo({ nom, url }: { nom: string; url?: string }) {
  const [echec, setEchec] = useState(false);
  // Bordure blanche de 4 px, puis contour fin (anneau) couleur trait.
  const cadre = "grid h-[88px] w-[88px] flex-none place-items-center overflow-hidden rounded-[20px] border-4 border-white ring-1 ring-baara-trait min-[900px]:h-[104px] min-[900px]:w-[104px] min-[900px]:rounded-3xl dark:border-baara-profond";
  if (url && !echec) {
    return (
      <span className={`${cadre} bg-white`}>
        <img src={url} alt="" width={104} height={104} decoding="async" onError={() => setEchec(true)} className="h-full w-full object-contain" />
      </span>
    );
  }
  return (
    <span aria-hidden="true" className={`${cadre} bg-baara-clair font-titre text-[28px] font-extrabold text-baara-marine min-[900px]:text-[32px]`}>
      {initiales(nom)}
    </span>
  );
}

/**
 * Grande carte du profil : bannière, puis ligne d'identité (logo qui
 * chevauche la bannière, nom en h1, badge vérifié, lieu) et actions.
 * `children` : ce qui suit dans la carte (invitation, onglets).
 */
export function CarteProfilEmployeur({ profil, actions, children }: { profil: ProfilEmployeur; actions?: ReactNode; children?: ReactNode }) {
  const lieu = libelleLieu(profil.ville, profil.pays);
  return (
    <article
      aria-labelledby="nom-employeur"
      className="overflow-hidden rounded-[20px] border-[1.5px] border-baara-trait bg-white dark:border-white/10 dark:bg-white/[0.04] min-[900px]:rounded-3xl"
      data-testid="carte-profil-employeur"
    >
      <Banniere url={profil.banniereUrl} />
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4 px-5 pb-5 min-[900px]:px-8 min-[900px]:pb-6">
        {/* Le logo chevauche la bannière ; le nom reste sous elle (contraste) :
            à côté du logo dès 640 px, en dessous avant. */}
        <div className="-mt-11 flex min-w-0 flex-[999_1_420px] flex-wrap items-start gap-x-5 gap-y-3 min-[900px]:-mt-[52px]">
          <Logo nom={profil.nom} url={profil.logoUrl} />
          <div className="min-w-0 basis-full min-[640px]:flex-1 min-[640px]:basis-0 min-[640px]:pt-[52px] min-[900px]:pt-[60px]">
            <h1
              id="nom-employeur"
              className="font-titre text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-baara-marine [overflow-wrap:anywhere] dark:text-white min-[900px]:text-[32px]"
              data-testid="nom-employeur"
            >
              {profil.nom}
              {profil.verifie && <span className="ml-2 inline-block align-[-2px]"><BadgeVerifie marge={false} taille={26} /></span>}
            </h1>
            {lieu && (
              <p className="mt-1.5 flex items-center gap-1.5 font-texte text-base text-baara-texte dark:text-slate-300" data-testid="lieu-employeur">
                <MapPin className="h-4 w-4 flex-none text-baara-bleu dark:text-baara-moyen" aria-hidden="true" />
                {lieu}
              </p>
            )}
          </div>
        </div>
        {actions && <div className="flex flex-[1_1_100%] flex-wrap gap-3 pb-1 min-[900px]:flex-none">{actions}</div>}
      </div>
      {children}
    </article>
  );
}
