import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Check } from "lucide-react";
import { useMouvementReduit } from "@/hooks/use-mouvement-reduit";

// ── Données de démonstration ────────────────────────────────────────────
// Constantes locales, jamais envoyées à l'API ni mêlées à de vraies données.
// Tous les noms sont des exemples ; la carte porte l'étiquette « Exemple ».
// Les 4 étapes correspondent aux statuts réels pending / reviewing /
// shortlisted / interview (libellés produit : Nouveau, En revue,
// Présélection, Entretien) ; les libellés de la maquette sont gardés ici.
const ETAPES = [
  { libelle: "Reçue", detail: "Candidature envoyée" },
  { libelle: "CV examiné", detail: "Votre CV a été lu" },
  { libelle: "Présélectionné", detail: "Vous êtes retenu pour la suite" },
  { libelle: "Entretien", detail: "Entretien proposé" },
] as const;

const MESSAGES = [
  "Votre candidature chez Groupe Sahel Logistique a bien été reçue.",
  "Le recruteur a examiné votre CV. Nous vous prévenons dès qu'il fait avancer votre dossier.",
  "Bonne nouvelle : vous êtes présélectionné pour ce poste.",
  "Le recruteur vous propose un entretien. Ouvrez BaaraMatch pour confirmer.",
] as const;

// Moments du cycle automatique, en ms depuis son début : étape 0 à 2 s,
// 1 à +1,6 s, 2 à +3,8 s, 3 à +6,2 s, puis 4,3 s de pause avant de reprendre.
const PREMIER_DELAI = 2000;
const DECALAGES = [0, 1600, 3800, 6200] as const;
const PAUSE_FIN = 4300;

// Hauteur d'une ligne d'étape (px) : sert au trait vertical et au curseur.
const PAS_ETAPE = 56;

/**
 * Carte de suivi de l'accueil : une candidate fictive, Awa K., suit sa
 * candidature étape par étape et reçoit une notification à chaque étape.
 */
export function ZoneSuivi() {
  const reduit = useMouvementReduit();
  const [etape, setEtape] = useState(0);
  const [auto, setAuto] = useState(true);
  const [tick, setTick] = useState(0);
  const minuteries = useRef<number[]>([]);

  const viderMinuteries = useCallback(() => {
    minuteries.current.forEach((id) => window.clearTimeout(id));
    minuteries.current = [];
  }, []);

  const allerA = useCallback((n: number) => {
    setEtape(n);
    setTick((t) => t + 1); // relance pop / onde en alternant leurs classes
  }, []);

  // Mouvement réduit : pas de boucle, état fixe sur « Présélectionné ».
  useEffect(() => {
    if (reduit) {
      setAuto(false);
      setEtape(2);
    }
  }, [reduit]);

  // Boucle automatique. Chaque cycle programme ses 4 étapes puis le suivant ;
  // tout est annulé dès qu'auto passe à faux ou au démontage.
  useEffect(() => {
    if (!auto || reduit) return;
    const programmer = (debut: number) => {
      DECALAGES.forEach((decalage, n) => {
        minuteries.current.push(window.setTimeout(() => allerA(n), debut + decalage));
      });
      minuteries.current.push(window.setTimeout(() => {
        minuteries.current = [];
        programmer(0);
      }, debut + DECALAGES[DECALAGES.length - 1] + PAUSE_FIN));
    };
    programmer(PREMIER_DELAI);
    return viderMinuteries;
  }, [auto, reduit, allerA, viderMinuteries]);

  const choisirEtape = (n: number) => {
    setAuto(false);
    allerA(n);
  };

  const basculerAuto = () => {
    if (auto) {
      setAuto(false);
    } else {
      allerA(0);
      setAuto(true);
    }
  };

  const pop = tick % 2 === 0 ? "animate-pop-a" : "animate-pop-b";
  const onde = tick % 2 === 0 ? "animate-onde-a" : "animate-onde-b";

  return (
    <div
      className="relative animate-entree-carte rounded-[24px] bg-baara-marine p-5 text-white shadow-[0_30px_60px_-30px_rgba(2,19,58,0.7)] sm:p-6 min-[900px]:max-[1099px]:p-4 dark:bg-[#0f2a5e] dark:ring-1 dark:ring-white/10"
      style={{ animationDelay: "0.35s" }}
      data-testid="zone-suivi"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-titre text-lg font-bold">Suivi de candidature</p>
          <p className="font-texte text-sm text-white/75">Awa K. · Groupe Sahel Logistique</p>
        </div>
        <span className="rounded-full bg-baara-or-pale px-3 py-1 font-texte text-xs font-bold text-baara-or-fonce">Exemple</span>
      </div>

      <div className="mt-5">
        {/* Les 4 étapes, chacune est un bouton. */}
        <div className="relative" style={{ ["--pas-etape" as string]: `${PAS_ETAPE}px` }}>
          <div className="relative">
            <ol className="relative" aria-label="Étapes de la candidature d'exemple">
              {ETAPES.map((e, n) => {
                const faite = n < etape;
                const active = n === etape;
                return (
                  <li key={e.libelle} className="relative" style={{ height: PAS_ETAPE }}>
                    {n < ETAPES.length - 1 && (
                      <span
                        aria-hidden="true"
                        className={`absolute left-[13px] top-[30px] h-[calc(100%-30px)] w-0.5 ${n < etape ? "bg-baara-moyen" : "bg-white/20"}`}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => choisirEtape(n)}
                      aria-current={active ? "step" : undefined}
                      className="flex h-full w-full items-start gap-3 rounded-lg pr-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-or"
                      data-testid={`etape-suivi-${n}`}
                    >
                      <span
                        aria-hidden="true"
                        className={`relative mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                          active ? `bg-baara-or text-baara-marine ${onde}`
                            : faite ? "bg-baara-moyen text-baara-marine"
                              : "border-2 border-white/40 bg-transparent"
                        }`}
                      >
                        {faite && <Check className="h-4 w-4" strokeWidth={3} />}
                        {active && <span className="h-2 w-2 rounded-full bg-baara-marine" />}
                      </span>
                      <span className="min-w-0">
                        <span className={`block font-texte text-sm font-semibold ${n > etape ? "text-white/70" : "text-white"}`}>{e.libelle}</span>
                        <span className="block font-texte text-xs text-white/70">{n > etape ? "À venir" : e.detail}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            {/* Curseur « Candidat » : hors de la liste, décoratif. */}
            <span
              aria-hidden="true"
              className={`curseur-etape p${etape} pointer-events-none absolute right-0 top-1 rounded-full bg-baara-bleu px-2 py-0.5 font-texte text-[11px] font-bold text-white shadow`}
            >
              Candidat
            </span>
          </div>
        </div>

      </div>

      {/* Notification reçue par le candidat. */}
      <div key={tick} className={`mt-5 flex items-start gap-3 rounded-2xl bg-white p-3 text-baara-marine ${pop}`}>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-baara-clair text-baara-bleu" aria-hidden="true">
          <Bell className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="font-texte text-xs font-semibold text-baara-texte">BaaraMatch · notification</p>
          <p className="font-texte text-sm leading-snug">{MESSAGES[etape]}</p>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">{MESSAGES[etape]}</p>

      {!reduit && (
        <button
          type="button"
          onClick={basculerAuto}
          className="mt-4 inline-flex h-11 items-center rounded-lg border border-white/30 px-4 font-texte text-sm font-semibold text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-or"
          data-testid="button-suivi-pause"
        >
          {auto ? "Mettre l'exemple en pause" : "Relancer l'exemple"}
        </button>
      )}
    </div>
  );
}
