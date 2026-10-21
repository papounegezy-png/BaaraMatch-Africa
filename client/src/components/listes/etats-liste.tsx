// États « aucun résultat » et « erreur » des pages de liste (Offres,
// Employeurs). L'erreur garde la recherche et les filtres : seul le
// chargement est relancé.

export const focusVisible = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2 dark:focus-visible:ring-offset-baara-profond";

export const boutonPlein = `inline-flex min-h-11 items-center rounded-full bg-baara-marine px-6 font-texte font-semibold text-white hover:bg-baara-bleu dark:bg-white dark:text-baara-marine ${focusVisible}`;

export function EtatVide({ titre, texte, onReinitialiser, testId }: { titre: string; texte: string; onReinitialiser: () => void; testId: string }) {
  return (
    <div className="rounded-2xl border-[1.5px] border-dashed border-baara-trait px-6 py-12 text-center dark:border-white/15" data-testid={testId}>
      <h3 className="font-titre text-xl font-bold text-baara-marine dark:text-white">{titre}</h3>
      <p className="mx-auto mt-2 max-w-md text-pretty font-texte text-baara-texte dark:text-slate-300">{texte}</p>
      <button type="button" onClick={onReinitialiser} className={`mt-6 ${boutonPlein}`} data-testid="bouton-reinitialiser-vide">
        Réinitialiser les filtres
      </button>
    </div>
  );
}

const TEXTE_ERREUR_LISTE = "Vérifiez votre connexion puis réessayez. Votre recherche et vos filtres sont conservés.";

export function EtatErreur({ titre, texte = TEXTE_ERREUR_LISTE, onReessayer, testId }: { titre: string; texte?: string; onReessayer: () => void; testId: string }) {
  return (
    <div role="alert" className="rounded-2xl border-[1.5px] border-baara-trait px-6 py-10 text-center dark:border-white/15" data-testid={testId}>
      <h3 className="font-titre text-xl font-bold text-baara-marine dark:text-white">{titre}</h3>
      <p className="mx-auto mt-2 max-w-md text-pretty font-texte text-baara-texte dark:text-slate-300">{texte}</p>
      <button type="button" onClick={onReessayer} className={`mt-6 ${boutonPlein}`}>Réessayer</button>
    </div>
  );
}
