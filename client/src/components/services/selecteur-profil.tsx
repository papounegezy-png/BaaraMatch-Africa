import { libellesProfils, ordreProfils, type Profil } from "@/donnees/services";

// Hauteur de la barre (py-3 + bouton de 48 px + 2 bordures) : les ancres de la
// page la décalent, en plus de l'en-tête (76 px + 1 px de bordure).
export const HAUTEUR_SELECTEUR = 74;
export const DECALAGE_ANCRES = 77 + HAUTEUR_SELECTEUR;

/**
 * Barre collante de choix du profil, juste sous l'en-tête collant de
 * l'accueil. L'état vit dans la page (useProfilServices).
 */
export function SelecteurProfil({ profil, onChoisir }: { profil: Profil; onChoisir: (p: Profil) => void }) {
  return (
    <div
      className="sticky top-[calc(env(safe-area-inset-top,0px)+77px)] z-20 border-y border-baara-trait bg-baara-papier/95 backdrop-blur supports-[backdrop-filter]:bg-baara-papier/85 dark:border-white/10 dark:bg-baara-profond/95"
      data-testid="selecteur-profil"
    >
      <div className="container mx-auto flex items-center gap-4 px-4 py-3">
        <div role="group" aria-label="Choisir un profil" className="grid flex-1 grid-cols-3 gap-2 min-[900px]:flex min-[900px]:flex-none">
          {ordreProfils.map((p) => {
            const actif = p === profil;
            return (
              <button
                key={p}
                type="button"
                aria-pressed={actif}
                onClick={() => onChoisir(p)}
                className={`min-h-12 rounded-full px-3 font-texte text-[15px] font-semibold transition-colors min-[900px]:px-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2 focus-visible:ring-offset-baara-papier ${
                  actif
                    ? "bg-baara-marine text-white dark:bg-white dark:text-baara-marine"
                    : "text-baara-marine hover:bg-white dark:text-white dark:hover:bg-white/10"
                }`}
                data-testid={`bouton-profil-${p}`}
              >
                {libellesProfils[p]}
              </button>
            );
          })}
        </div>
        <a
          href="#demo"
          className="ml-auto hidden min-h-12 items-center rounded-lg border border-baara-marine/40 px-6 font-texte text-[15px] font-semibold text-baara-marine hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2 dark:border-white/40 dark:text-white dark:hover:bg-white/10 min-[900px]:inline-flex"
          data-testid="lien-selecteur-demo"
        >
          Demander une démo
        </a>
      </div>
    </div>
  );
}
