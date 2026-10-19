import { Link } from "wouter";
import { Sceau } from "@/components/sceau";
import { catalogueServices, type Profil } from "@/donnees/services";

const boutonCta =
  "inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-baara-marine px-7 font-texte text-[15px] font-semibold text-white " +
  "hover:bg-baara-profond focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2 focus-visible:ring-offset-baara-papier " +
  "dark:bg-white dark:text-baara-marine dark:hover:bg-baara-moyen min-[900px]:w-auto";

/**
 * Panneau du profil choisi, entièrement généré depuis catalogueServices[profil]
 * (aucune chaîne de service ici). Liste aérée : filets, titres, une ligne de
 * description ; ni cartes, ni icônes. `tick` alterne pop-a / pop-b pour
 * rejouer l'entrée à chaque changement de profil.
 */
export function PanneauProfil({ profil, tick }: { profil: Profil; tick: number }) {
  const { titre, sceau, cta, groupes } = catalogueServices[profil];
  const lienInterne = cta.href.startsWith("/");

  return (
    <section
      aria-labelledby="titre-panneau-profil"
      className={`container mx-auto px-4 pb-16 pt-10 min-[900px]:pb-20 min-[900px]:pt-14 ${tick % 2 === 0 ? "animate-pop-a" : "animate-pop-b"}`}
      data-testid="panneau-profil"
    >
      <div className="flex flex-col gap-6 min-[900px]:flex-row min-[900px]:items-center min-[900px]:justify-between">
        <div className="flex items-center gap-5">
          <h2
            id="titre-panneau-profil"
            className="font-titre text-[clamp(30px,3.4vw,42px)] font-extrabold leading-tight tracking-tight text-baara-marine dark:text-white"
          >
            {titre}
          </h2>
          <Sceau ligne1={sceau.ligne1} ligne2={sceau.ligne2} libelle={sceau.libelle} />
        </div>
        {lienInterne ? (
          <Link href={cta.href} className={boutonCta} data-testid="lien-cta-profil">{cta.label}</Link>
        ) : (
          <a href={cta.href} className={boutonCta} data-testid="lien-cta-profil">{cta.label}</a>
        )}
      </div>

      <div className="mt-10 space-y-12">
        {groupes.map((groupe) => (
          <div key={groupe.titre} className="border-t-2 border-baara-marine pt-5 dark:border-white/50">
            <h3 className="font-titre text-xl font-bold text-baara-marine dark:text-white">{groupe.titre}</h3>
            <ul className="mt-4 grid grid-cols-1 gap-x-8 min-[900px]:grid-cols-2 min-[1000px]:grid-cols-3">
              {groupe.services.map((service) => (
                <li key={service.nom} className="border-t border-baara-trait py-4 dark:border-white/15">
                  <h4 className="font-titre text-[17px] font-bold text-baara-marine dark:text-white">{service.nom}</h4>
                  <p className="mt-1 font-texte text-[15.5px] leading-snug text-baara-texte dark:text-slate-300">{service.desc}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
