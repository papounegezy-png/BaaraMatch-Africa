import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Briefcase, MapPin, Search } from "lucide-react";
import { contractTypeOptions } from "@/lib/options-offre";
import { SECTEURS_ACCUEIL, lienSecteur } from "@/lib/secteurs";
import { ZoneSuivi } from "./zone-suivi";

// Une case de recherche : icône dans un rond clair, vrai <label> (masqué
// visuellement), anneau de focus sur toute la case.
function Champ({ id, libelle, icone, children }: { id: string; libelle: string; icone: ReactNode; children: ReactNode }) {
  return (
    <div className="flex h-14 min-w-0 items-center gap-3 rounded-xl px-2 focus-within:ring-2 focus-within:ring-baara-bleu">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-baara-clair text-baara-bleu dark:bg-white/10 dark:text-white" aria-hidden="true">
        {icone}
      </span>
      <label htmlFor={id} className="sr-only">{libelle}</label>
      {children}
    </div>
  );
}

const styleSaisie =
  "h-full min-w-0 flex-1 bg-transparent font-texte text-base text-baara-marine placeholder:text-baara-texte outline-none dark:text-white dark:placeholder:text-slate-400";

/**
 * Bandeau d'accroche de l'accueil (maquette « Accueil animé v2 ») : titre,
 * recherche, secteurs, appel aux recruteurs, et la carte de suivi à droite.
 * La recherche mène à /jobs avec les paramètres que cette page lit déjà
 * (q, location) plus type pour le contrat.
 */
export function BandeauAccroche() {
  const [, setLocation] = useLocation();
  const [metier, setMetier] = useState("");
  const [ville, setVille] = useState("");
  const [contrat, setContrat] = useState("");
  const id = useId();

  const rechercher = (e: FormEvent) => {
    e.preventDefault();
    const parametres = new URLSearchParams();
    if (metier.trim()) parametres.set("q", metier.trim());
    if (ville.trim()) parametres.set("location", ville.trim());
    if (contrat) parametres.set("type", contrat);
    const requete = parametres.toString();
    setLocation(`/jobs${requete ? `?${requete}` : ""}`);
  };

  return (
    <section aria-labelledby={`${id}-titre`} className="overflow-x-clip bg-baara-papier dark:bg-baara-profond">
      <div className="container mx-auto grid gap-10 px-4 pb-14 pt-10 min-[900px]:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] min-[900px]:items-center min-[900px]:gap-12 min-[900px]:pb-20 min-[900px]:pt-14">
        <div className="min-w-0">
          {/* Taille plafonnée pour que « Suivez chaque étape. » tienne sur
              une ligne dans la colonne ; pas de text-balance, qui isolait
              « Suivez » sur sa propre ligne. */}
          <h1
            id={`${id}-titre`}
            className="font-titre text-[clamp(2rem,3.9vw,3.75rem)] font-extrabold leading-[1.05] tracking-[-0.02em] text-baara-marine dark:text-white"
            data-testid="text-hero-title"
          >
            {/* Chaque ligne monte depuis un conteneur overflow-hidden. */}
            <span className="block overflow-hidden pb-[0.06em]">
              <span className="block animate-monte" style={{ animationDelay: "0.1s" }}>Postulez une fois.</span>
            </span>
            <span className="block overflow-hidden pb-[0.06em]">
              <span className="block animate-monte" style={{ animationDelay: "0.26s" }}>Suivez chaque étape.</span>
            </span>
          </h1>

          <p className="mt-5 max-w-[34rem] animate-fondu font-texte text-lg leading-relaxed text-baara-texte dark:text-slate-300" style={{ animationDelay: "0.5s" }}>
            Vous voyez où en est chaque candidature, et l'employeur trie ses candidats au même endroit.
          </p>

          <form
            role="search"
            aria-label="Rechercher une offre"
            onSubmit={rechercher}
            className="mt-7 grid animate-fondu gap-1 rounded-2xl border border-baara-trait bg-white p-2 shadow-[0_18px_40px_-24px_rgba(13,41,87,0.45)] dark:border-white/10 dark:bg-baara-marine min-[700px]:grid-cols-2 min-[1280px]:grid-cols-[1.3fr_0.8fr_1.25fr_auto] min-[1280px]:items-center [&>*:first-child]:min-[700px]:col-span-2 [&>*:first-child]:min-[1280px]:col-span-1 [&>button]:min-[700px]:col-span-2 [&>button]:min-[1280px]:col-span-1"
            style={{ animationDelay: "0.65s" }}
            data-testid="form-hero-search"
          >
            <Champ id={`${id}-metier`} libelle="Métier ou mot-clé" icone={<Search className="h-4 w-4" />}>
              <input
                id={`${id}-metier`}
                type="search"
                value={metier}
                onChange={(e) => setMetier(e.target.value)}
                placeholder="Métier ou mot-clé"
                autoComplete="off"
                className={styleSaisie}
                data-testid="input-hero-search-keyword"
              />
            </Champ>
            <Champ id={`${id}-ville`} libelle="Ville" icone={<MapPin className="h-4 w-4" />}>
              <input
                id={`${id}-ville`}
                type="text"
                value={ville}
                onChange={(e) => setVille(e.target.value)}
                placeholder="Ville"
                autoComplete="address-level2"
                className={styleSaisie}
                data-testid="input-hero-search-city"
              />
            </Champ>
            <Champ id={`${id}-contrat`} libelle="Type de contrat" icone={<Briefcase className="h-4 w-4" />}>
              <select
                id={`${id}-contrat`}
                value={contrat}
                onChange={(e) => setContrat(e.target.value)}
                className={`${styleSaisie} cursor-pointer appearance-none pr-2 dark:[color-scheme:dark]`}
                data-testid="select-hero-contract"
              >
                <option value="">Type de contrat</option>
                {contractTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Champ>
            <button
              type="submit"
              className="h-14 rounded-xl bg-baara-bleu px-7 font-texte text-base font-semibold text-white hover:bg-baara-marine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2 dark:hover:bg-white dark:hover:text-baara-marine"
              data-testid="button-hero-search"
            >
              Rechercher
            </button>
          </form>

          <nav aria-label="Parcourir par secteur" className="mt-5 animate-fondu" style={{ animationDelay: "0.8s" }}>
            <ul className="flex flex-wrap gap-2">
              {SECTEURS_ACCUEIL.map(({ libelle, valeur, icone: Icone }) => (
                <li key={valeur}>
                  <Link
                    href={lienSecteur(valeur)}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-baara-trait bg-white px-4 font-texte text-sm font-medium text-baara-marine hover:border-baara-marine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:border-white/50"
                    data-testid={`link-secteur-${libelle.toLowerCase()}`}
                  >
                    <Icone className="h-4 w-4 text-baara-bleu dark:text-baara-moyen" aria-hidden="true" />
                    {libelle}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/jobs"
                  className="inline-flex min-h-11 items-center rounded-full px-4 font-texte text-sm font-semibold text-baara-bleu underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu dark:text-baara-moyen"
                >
                  Voir tout
                </Link>
              </li>
            </ul>
          </nav>

          <div className="mt-7 animate-fondu space-y-1.5" style={{ animationDelay: "0.8s" }}>
            <p className="font-texte text-base text-baara-marine dark:text-white">
              Vous recrutez ?{" "}
              <Link
                href="/register/organisation"
                className="py-3 font-semibold underline decoration-baara-or decoration-2 underline-offset-4 hover:decoration-baara-marine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu rounded-sm dark:hover:decoration-white"
                data-testid="link-hero-employer-cta"
              >
                Publiez votre première offre gratuitement
              </Link>
            </p>
            {/* WhatsApp n'est pas encore actif : on ne le nomme pas. Les
                notifications de statut dans l'application, elles, existent. */}
            <p className="font-texte text-sm text-baara-texte dark:text-slate-400">Vous êtes prévenu à chaque étape.</p>
          </div>
        </div>

        <div className="min-w-0">
          <ZoneSuivi />
        </div>
      </div>
    </section>
  );
}
