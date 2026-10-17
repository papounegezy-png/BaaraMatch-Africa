import { useId, useMemo, useState } from "react";
import { Link } from "wouter";
import { Building2, Handshake } from "lucide-react";
import { useRevele } from "@/hooks/use-revele";

// ── Programme pilote ────────────────────────────────────────────────────
// À CONFIRMER avant tout affichage : désactivé tant que la variable
// VITE_AFFICHER_PROGRAMME_PILOTE ne vaut pas « true ». Attention, ce texte
// (celui de la maquette) ne correspond plus à l'offre décidée depuis :
// 2 mois gratuits pour les agences ET les entreprises.
const PROGRAMME_PILOTE = "Programme pilote : 5 agences, 3 mois offerts.";
const AFFICHER_PROGRAMME_PILOTE = import.meta.env.VITE_AFFICHER_PROGRAMME_PILOTE === "true";

// ── Pipeline d'exemple ──────────────────────────────────────────────────
// Données fictives, locales, marquées « Exemple ». Le filtre par client
// existe réellement dans le produit, côté agence (pipeline des candidatures).
const COLONNES = ["Nouvelles", "CV examiné", "Présélectionné", "Entretien"] as const;
const CLIENTS = ["Groupe Sahel", "Cabinet Kènè", "Coopérative Jigi"] as const;
type Client = (typeof CLIENTS)[number];

interface CandidatExemple {
  nom: string;
  poste: string;
  client: Client;
  colonne: number;
  enAvant?: boolean;
}

// Awa K. reste en « Présélectionné » : la section ne suit pas la carte du
// bandeau (copie indépendante, sans dépendance entre composants).
const CANDIDATS: CandidatExemple[] = [
  { nom: "Seydou D.", poste: "Magasinier", client: "Groupe Sahel", colonne: 0 },
  { nom: "Fanta T.", poste: "Comptable", client: "Coopérative Jigi", colonne: 0 },
  { nom: "Ibrahim C.", poste: "Chauffeur poids lourd", client: "Groupe Sahel", colonne: 1 },
  { nom: "Aminata N.", poste: "Assistante RH", client: "Coopérative Jigi", colonne: 1 },
  { nom: "Awa K.", poste: "Responsable logistique", client: "Groupe Sahel", colonne: 2, enAvant: true },
  { nom: "Mariam S.", poste: "Chargée de recrutement", client: "Cabinet Kènè", colonne: 2 },
  { nom: "Oumar B.", poste: "Technicien de maintenance", client: "Cabinet Kènè", colonne: 3 },
];

const boutonPlein =
  "inline-flex h-11 items-center rounded-lg bg-baara-bleu px-5 font-texte text-sm font-semibold text-white hover:bg-baara-marine " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2";
const boutonContour =
  "inline-flex h-11 items-center rounded-lg border border-baara-marine/40 px-5 font-texte text-sm font-semibold text-baara-marine hover:bg-baara-clair " +
  "dark:border-white/40 dark:text-white dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2";

/**
 * Section Employeurs de l'accueil (maquette « Accueil animé v2 »). Elle
 * s'adresse aux entreprises ET aux agences de recrutement, sans mettre les
 * agences au premier plan ; le pipeline en dessous est un exemple.
 */
export function SectionEmployeurs() {
  const id = useId();
  const [ref, visible] = useRevele<HTMLElement>();
  const [client, setClient] = useState<Client | null>(null);

  const parColonne = useMemo(
    () => COLONNES.map((_, n) => CANDIDATS.filter((c) => c.colonne === n && (!client || c.client === client))),
    [client],
  );
  const apparait = visible ? "visible" : "";

  return (
    <section id="employeurs" ref={ref} aria-labelledby={`${id}-titre`} className="scroll-mt-24 bg-baara-papier py-14 dark:bg-[#071a44] min-[900px]:py-20">
      <div className="container mx-auto px-4">
        <h2 id={`${id}-titre`} className={`revele ${apparait} font-titre text-3xl font-bold tracking-tight text-baara-marine dark:text-white min-[900px]:text-4xl`}>
          Employeurs : recevez, triez, suivez.
        </h2>

        <div className="mt-8 grid gap-5 min-[900px]:grid-cols-2">
          <article className={`revele ${apparait} flex flex-col gap-4 rounded-2xl border border-baara-trait bg-white p-6 dark:border-white/10 dark:bg-white/[0.04]`} style={{ transitionDelay: "0.12s" }}>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-baara-clair text-baara-bleu dark:bg-white/10 dark:text-baara-moyen" aria-hidden="true">
                <Building2 className="h-5 w-5" />
              </span>
              <h3 className="font-titre text-xl font-bold text-baara-marine dark:text-white">Entreprises</h3>
            </div>
            <p className="max-w-[46ch] font-texte text-baara-texte dark:text-slate-300">
              Publiez une offre en quelques minutes, recevez des candidatures classées par correspondance et planifiez vos entretiens au même endroit.
            </p>
            <div className="mt-auto">
              <Link href="/register/organisation" className={boutonPlein} data-testid="link-employeurs-entreprise">Publier une offre</Link>
            </div>
          </article>

          <article className={`revele ${apparait} flex flex-col gap-4 rounded-2xl border border-baara-trait bg-white p-6 dark:border-white/10 dark:bg-white/[0.04]`} style={{ transitionDelay: "0.24s" }}>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-baara-clair text-baara-bleu dark:bg-white/10 dark:text-baara-moyen" aria-hidden="true">
                <Handshake className="h-5 w-5" />
              </span>
              <h3 className="font-titre text-xl font-bold text-baara-marine dark:text-white">Agences de recrutement</h3>
            </div>
            <p className="max-w-[46ch] font-texte text-baara-texte dark:text-slate-300">
              Gérez vos candidats et vos clients, filtrez les candidatures par client et suivez chaque placement jusqu'au contrat.
            </p>
            {AFFICHER_PROGRAMME_PILOTE && (
              <p className="w-fit rounded-full bg-baara-or-pale px-3 py-1 font-texte text-sm font-semibold text-baara-or-fonce">{PROGRAMME_PILOTE}</p>
            )}
            <div className="mt-auto">
              {/* La page Services n'a pas encore de section agences : lien vers la page. */}
              <Link href="/services" className={boutonContour} data-testid="link-employeurs-agences">Découvrir l'offre agences</Link>
            </div>
          </article>
        </div>

        {/* Pipeline d'exemple. */}
        <div className={`revele ${apparait} mt-8 rounded-[24px] border border-baara-trait bg-white p-5 dark:border-white/10 dark:bg-white/[0.04] sm:p-6`} style={{ transitionDelay: "0.36s" }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="font-titre text-lg font-bold text-baara-marine dark:text-white">Vos candidatures, étape par étape</h3>
              <span className="rounded-full bg-baara-or-pale px-3 py-1 font-texte text-xs font-bold text-baara-or-fonce">Exemple</span>
            </div>
          </div>

          <div className="mt-4">
            <p id={`${id}-filtre`} className="font-texte text-sm text-baara-texte dark:text-slate-300">Pour une agence : filtrez par client</p>
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-labelledby={`${id}-filtre`}>
              {[null, ...CLIENTS].map((c) => {
                const actif = client === c;
                return (
                  <button
                    key={c ?? "tous"}
                    type="button"
                    aria-pressed={actif}
                    onClick={() => setClient(c)}
                    className={`min-h-11 rounded-full border px-4 font-texte text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2 ${
                      actif
                        ? "border-baara-marine bg-baara-marine text-white dark:border-white dark:bg-white dark:text-baara-marine"
                        : "border-baara-trait bg-white text-baara-marine hover:border-baara-marine dark:border-white/15 dark:bg-transparent dark:text-white"
                    }`}
                    data-testid={`filtre-client-${c ? c.toLowerCase().replace(/\s+/g, "-") : "tous"}`}
                  >
                    {c ?? "Tous les clients"}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 min-[700px]:grid-cols-4">
            {COLONNES.map((colonne, n) => {
              const cartes = parColonne[n];
              return (
                <section
                  key={colonne}
                  aria-label={`${colonne}, ${cartes.length} candidat${cartes.length > 1 ? "s" : ""}`}
                  className={`revele ${apparait} min-w-0 rounded-2xl bg-baara-clair/70 p-3 dark:bg-white/[0.05]`}
                  style={{ transitionDelay: `${0.45 + 0.1 * n}s` }}
                  data-testid={`colonne-employeur-${n}`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="font-texte text-sm font-semibold text-baara-marine dark:text-white">{colonne}</p>
                    <span className="rounded-full bg-white px-2 py-0.5 font-texte text-xs font-bold tabular-nums text-baara-marine dark:bg-white/10 dark:text-white" aria-hidden="true">
                      {cartes.length}
                    </span>
                  </div>
                  {cartes.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-baara-trait p-3 text-center font-texte text-sm text-baara-texte dark:border-white/15 dark:text-slate-400">Aucun candidat</p>
                  ) : (
                    <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
                      {cartes.map((c, i) => (
                        <li
                          key={`${c.nom}-${client ?? "tous"}`}
                          className={`rounded-xl bg-white p-3 shadow-sm dark:bg-baara-marine ${c.enAvant ? `border-l-4 border-baara-or ${visible ? "animate-pop-a" : ""}` : `revele ${apparait}`}`}
                          style={{ transitionDelay: `${0.6 + 0.1 * n + 0.06 * i}s`, animationDelay: c.enAvant ? "0.9s" : undefined }}
                        >
                          <p className="truncate font-texte text-sm font-bold text-baara-marine dark:text-white">{c.nom}</p>
                          <p className="break-words font-texte text-xs text-baara-texte dark:text-slate-300">{c.poste}</p>
                          <p className="mt-1 truncate font-texte text-xs font-medium text-baara-bleu dark:text-baara-moyen">{c.client}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
