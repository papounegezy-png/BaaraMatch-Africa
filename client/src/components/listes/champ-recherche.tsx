import { useEffect, useId, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";

const DELAI_SAISIE_MS = 250;

/**
 * Champ de recherche à filtrage en direct : la valeur saisie est transmise
 * 250 ms après la dernière frappe. Une valeur imposée de l'extérieur
 * (réinitialisation, bouton Retour) remplace la saisie.
 */
export function ChampRecherche({ libelle, icone: Icone, valeur, onChange, testId, autoComplete }: {
  libelle: string;
  icone: LucideIcon;
  valeur: string;
  onChange: (v: string) => void;
  testId: string;
  autoComplete?: string;
}) {
  const id = useId();
  const [saisie, setSaisie] = useState(valeur);
  const derniereEnvoyee = useRef(valeur);

  useEffect(() => {
    if (valeur !== derniereEnvoyee.current) {
      derniereEnvoyee.current = valeur;
      setSaisie(valeur);
    }
  }, [valeur]);

  useEffect(() => {
    if (saisie === derniereEnvoyee.current) return;
    const minuterie = window.setTimeout(() => {
      derniereEnvoyee.current = saisie;
      onChange(saisie);
    }, DELAI_SAISIE_MS);
    return () => window.clearTimeout(minuterie);
    // onChange change à chaque rendu du parent : seule la saisie compte.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saisie]);

  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">{libelle}</label>
      <Icone className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-baara-bleu" aria-hidden="true" />
      <input
        id={id}
        type="search"
        value={saisie}
        onChange={(e) => setSaisie(e.target.value)}
        placeholder={libelle}
        autoComplete={autoComplete ?? "off"}
        className="min-h-[52px] w-full rounded-full border border-baara-marine/35 bg-white pl-12 pr-5 font-texte text-base text-baara-marine placeholder:text-baara-texte focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-1 dark:border-white/30 dark:bg-white/5 dark:text-white"
        data-testid={testId}
      />
    </div>
  );
}
