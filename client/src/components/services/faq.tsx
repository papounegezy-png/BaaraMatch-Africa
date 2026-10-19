import { DECALAGE_ANCRES } from "@/components/services/selecteur-profil";
import { faqServices } from "@/donnees/faq-services";

/**
 * Questions fréquentes de la page Services : <details>/<summary> natifs,
 * sans JavaScript. Le « + » pivote de 45° à l'ouverture.
 */
export function Faq() {
  return (
    <section
      id="faq"
      aria-labelledby="titre-faq"
      className="bg-baara-papier py-16 dark:bg-baara-profond min-[900px]:py-20"
      style={{ scrollMarginTop: DECALAGE_ANCRES }}
      data-testid="faq-services"
    >
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-[820px]">
          <h2 id="titre-faq" className="font-titre text-[clamp(30px,3.4vw,42px)] font-extrabold leading-tight tracking-tight text-baara-marine dark:text-white">
            Questions fréquentes
          </h2>
          <div className="mt-8 divide-y divide-baara-trait border-t-[1.5px] border-baara-marine dark:divide-white/15 dark:border-white/50">
            {faqServices.map((item) => (
              <details key={item.question} className="group">
                <summary className="flex min-h-[60px] cursor-pointer list-none items-center justify-between gap-4 rounded-sm py-3 font-titre text-[17px] font-bold text-baara-marine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu dark:text-white [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <span
                    aria-hidden="true"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-baara-marine/40 font-texte text-xl leading-none transition-transform duration-200 group-open:rotate-45 dark:border-white/40"
                  >
                    +
                  </span>
                </summary>
                <p className="pb-5 pr-12 font-texte text-[15.5px] leading-relaxed text-baara-texte dark:text-slate-300">{item.reponse}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
