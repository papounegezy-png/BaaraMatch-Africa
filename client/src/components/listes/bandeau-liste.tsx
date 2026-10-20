import type { ReactNode } from "react";

/**
 * Bandeau des pages de liste (Offres, Employeurs) : titre en deux lignes,
 * alignées à gauche, qui montent l'une après l'autre ; phrase en fondu ;
 * puis la recherche. Sous prefers-reduced-motion, index.css fige tout à
 * l'état final.
 */
export function BandeauListe({ idTitre, lignes, phrase, testIdTitre, children }: {
  idTitre: string;
  lignes: [string, string];
  phrase: ReactNode;
  testIdTitre: string;
  children?: ReactNode;
}) {
  return (
    <section aria-labelledby={idTitre} className="bg-baara-papier dark:bg-baara-profond">
      <div className="container mx-auto px-4 pb-8 pt-12 min-[900px]:pb-10 min-[900px]:pt-16">
        <h1
          id={idTitre}
          className="font-titre text-[clamp(36px,4.6vw,58px)] font-extrabold leading-[1.05] tracking-[-0.02em] text-baara-marine dark:text-white"
          data-testid={testIdTitre}
        >
          {lignes.map((ligne, i) => (
            <span key={ligne} className="block overflow-hidden pb-[0.06em]">
              <span className="block animate-monte" style={{ animationDelay: `${0.1 + i * 0.16}s` }}>{ligne}</span>
            </span>
          ))}
        </h1>
        <p className="mt-5 max-w-[60ch] animate-fondu text-pretty font-texte text-lg text-baara-texte dark:text-slate-300" style={{ animationDelay: "0.45s" }}>
          {phrase}
        </p>
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}
