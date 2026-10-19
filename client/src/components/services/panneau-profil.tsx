import { catalogueServices, type Profil } from "@/donnees/services";

/**
 * Panneau du profil choisi, piloté par catalogueServices[profil].
 * Version provisoire (prompt 2) : la mise en page finale et le sceau arrivent
 * au prompt 3. `tick` alterne pop-a / pop-b pour rejouer l'entrée.
 */
export function PanneauProfil({ profil, tick }: { profil: Profil; tick: number }) {
  const donnees = catalogueServices[profil];
  return (
    <section
      aria-labelledby="titre-panneau-profil"
      className={`container mx-auto px-4 py-10 ${tick % 2 === 0 ? "animate-pop-a" : "animate-pop-b"}`}
      data-testid="panneau-profil"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="titre-panneau-profil" className="font-titre text-3xl font-extrabold text-baara-marine dark:text-white">{donnees.titre}</h2>
        <a href={donnees.cta.href} className="inline-flex min-h-12 items-center rounded-full bg-baara-marine px-6 font-texte font-semibold text-white">
          {donnees.cta.label}
        </a>
      </div>
      {donnees.groupes.map((groupe) => (
        <div key={groupe.titre} className="mt-8">
          <h3 className="font-titre text-xl font-bold text-baara-marine dark:text-white">{groupe.titre}</h3>
          <ul className="mt-3 grid gap-3 min-[900px]:grid-cols-3">
            {groupe.services.map((s) => (
              <li key={s.nom}>
                <h4 className="font-titre font-bold text-baara-marine dark:text-white">{s.nom}</h4>
                <p className="font-texte text-baara-texte dark:text-slate-300">{s.desc}</p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
