import { memo, useState } from "react";
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { BadgeVerifie } from "@/components/badge-verifie";
import { initiales, libelleLieu } from "@/lib/employeurs";
import { lienProfil, type Employeur } from "@/types/employeur";

const etiquette = "rounded-full border border-baara-trait px-2.5 py-px font-texte text-[13px] font-semibold dark:border-white/15";

// Logo, ou initiales sur fond clair si l'employeur n'en a pas (ou s'il ne
// se charge pas). alt vide : le nom est déjà dans la carte.
function LogoEmployeur({ nom, url }: { nom: string; url?: string }) {
  const [echec, setEchec] = useState(false);
  const cadre = "grid h-[52px] w-[52px] flex-none place-items-center overflow-hidden rounded-xl border border-baara-trait dark:border-white/10";
  if (url && !echec) {
    return (
      <span className={`${cadre} bg-white`}>
        <img src={url} alt="" width={52} height={52} loading="lazy" decoding="async" onError={() => setEchec(true)} className="h-full w-full object-contain" />
      </span>
    );
  }
  return (
    <span aria-hidden="true" className={`${cadre} bg-baara-clair font-titre text-lg font-extrabold text-baara-marine dark:bg-white/10 dark:text-white`}>
      {initiales(nom)}
    </span>
  );
}

/**
 * Carte d'un employeur : toute la carte est un seul lien vers son profil.
 * Rien ne s'affiche pour une valeur absente ou nulle (pas de « 0 offre »,
 * pas de note : aucune source réelle).
 */
export const CarteEmployeur = memo(function CarteEmployeur({ employeur: e }: { employeur: Employeur }) {
  const lieu = libelleLieu(e.ville, e.pays);
  const offres = e.offresPubliees > 0 ? `${e.offresPubliees} ${e.offresPubliees > 1 ? "offres en cours" : "offre en cours"}` : null;
  // Nom du lien, ponctué : le contenu visuel enchaîne des blocs sans
  // séparateurs. Le badge y est annoncé une seule fois.
  const nomAccessible = [
    e.nom + (e.verifie ? ", employeur vérifié par BaaraMatch" : ""),
    e.type === "agence" ? "agence" : "entreprise",
    e.secteur, lieu, offres,
  ].filter(Boolean).join(", ");
  return (
    <Link
      href={lienProfil(e)}
      aria-label={nomAccessible}
      className="group flex h-full items-start gap-4 rounded-2xl border-[1.5px] border-baara-trait bg-white px-4 py-3.5 transition-[transform,border-color] duration-200 hover:border-baara-marine motion-safe:hover:-translate-y-0.5 focus-visible:border-baara-marine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2 focus-visible:ring-offset-baara-papier dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/50"
      data-testid={`carte-employeur-${e.type}-${e.id}`}
    >
      <LogoEmployeur nom={e.nom} url={e.logoUrl} />
      <span className="min-w-0 flex-1">
        <span className="block font-titre text-lg font-bold leading-snug text-baara-marine [overflow-wrap:anywhere] dark:text-white">
          {e.nom}
          {e.verifie && <BadgeVerifie />}
        </span>
        {offres && (
          <span className="mt-0.5 block font-texte text-[15px] font-semibold text-baara-bleu dark:text-baara-moyen">{offres}</span>
        )}
        <span className="mt-2 flex flex-wrap gap-1.5">
          <span className={`${etiquette} ${e.type === "agence" ? "bg-baara-or-pale text-baara-or-fonce" : "bg-baara-clair text-baara-marine"}`}>
            {e.type === "agence" ? "Agence" : "Entreprise"}
          </span>
          {e.secteur && <span className={`${etiquette} text-baara-texte dark:text-slate-300`}>{e.secteur}</span>}
          {lieu && <span className={`${etiquette} text-baara-texte dark:text-slate-300`}>{lieu}</span>}
        </span>
      </span>
      <ChevronRight className="mt-1 h-4 w-4 flex-none text-baara-marine transition-transform motion-safe:group-hover:translate-x-0.5 dark:text-white" aria-hidden="true" />
    </Link>
  );
});
