/**
 * Bandeau de la page Services (maquette « Services »). Titre en deux lignes
 * qui montent l'une après l'autre, puis une phrase en fondu. Sous
 * prefers-reduced-motion, la règle globale d'index.css fige tout à l'état final.
 */
export function BandeauServices() {
  return (
    <section aria-labelledby="titre-services" className="bg-baara-papier dark:bg-baara-profond">
      <div className="container mx-auto px-4 pb-10 pt-12 min-[900px]:pb-14 min-[900px]:pt-16">
        <h1
          id="titre-services"
          className="font-titre text-[clamp(36px,4.6vw,58px)] font-extrabold leading-[1.05] tracking-tight text-baara-marine dark:text-white"
          data-testid="text-services-title"
        >
          <span className="block overflow-hidden pb-[0.06em]">
            <span className="block animate-monte" style={{ animationDelay: "0.1s" }}>Ce que vous obtenez</span>
          </span>
          <span className="block overflow-hidden pb-[0.06em]">
            <span className="block animate-monte" style={{ animationDelay: "0.26s" }}>avec BaaraMatch.</span>
          </span>
        </h1>
        <p
          className="mt-5 max-w-[46ch] animate-fondu font-texte text-lg text-baara-texte dark:text-slate-300 min-[900px]:text-xl"
          style={{ animationDelay: "0.45s" }}
        >
          La plateforme de recrutement terrain qui relie candidats, entreprises et agences.
        </p>
      </div>
    </section>
  );
}
