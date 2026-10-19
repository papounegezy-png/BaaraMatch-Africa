import { Sceau } from "@/components/sceau";
import { DECALAGE_ANCRES } from "@/components/services/selecteur-profil";

// Aucun tarif, aucune date de fin, aucun nombre de places : à valider avant
// tout affichage. La règle des 2 mois est dans shared/plans.ts.
const LIGNES = [
  { titre: "Agences et entreprises", detail: "Tous les modules, sans restriction de plan." },
  { titre: "Candidats", detail: "Gratuit, sans limite de candidatures." },
];

function Coche() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 fill-none stroke-baara-or" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

/** Bande « Offre de lancement » de la page Services, sur fond marine. */
export function OffreLancement() {
  return (
    <section
      id="lancement"
      aria-labelledby="titre-lancement"
      className="bg-baara-marine py-16 text-white"
      style={{ scrollMarginTop: DECALAGE_ANCRES }}
      data-testid="offre-lancement"
    >
      <div className="container mx-auto grid gap-10 px-4 min-[1000px]:grid-cols-[1.3fr_1fr] min-[1000px]:items-center">
        <div>
          <h2 id="titre-lancement" className="font-titre text-[clamp(30px,3.4vw,42px)] font-extrabold leading-tight tracking-tight">
            Offre de lancement
          </h2>
          <div className="mt-5">
            <Sceau ligne1="2 mois" ligne2="gratuits" libelle="2 mois gratuits" taille="xl" />
          </div>
        </div>
        <div>
          <ul className="space-y-5">
            {LIGNES.map((ligne) => (
              <li key={ligne.titre} className="flex gap-3">
                <Coche />
                <div>
                  <p className="font-titre text-lg font-bold">{ligne.titre}</p>
                  <p className="font-texte text-white/90">{ligne.detail}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-6 font-texte text-sm text-white/[0.78]">Les conditions après les 2 mois seront annoncées à l'avance.</p>
        </div>
      </div>
    </section>
  );
}
