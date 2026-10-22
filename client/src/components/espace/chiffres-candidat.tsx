import { Link } from "wouter";
import { Briefcase, FileText, Handshake, Users, type LucideIcon } from "lucide-react";
import { chiffre, MOTS_CHIFFRES, type MotsChiffre } from "@/lib/espace-candidat";

type EtatChiffre = { nombre?: number; chargement: boolean; erreur: boolean };

type Carte = {
  cle: string;
  href: string;
  Icone: LucideIcon;
  mots: MotsChiffre;
  etat: EtatChiffre;
  sousLigne?: string | null;
};

/**
 * Quatre chiffres de l'espace candidat, chacun un lien. Le nom accessible de
 * chaque carte est son texte visible (« 4 candidatures, 2 en attente de
 * réponse »).
 */
export function ChiffresCandidat({
  candidatures,
  entretiens,
  offresDisponibles,
  offresRecues,
  enAttente,
}: {
  candidatures: EtatChiffre;
  entretiens: EtatChiffre;
  offresDisponibles: EtatChiffre;
  offresRecues: EtatChiffre;
  enAttente: number;
}) {
  const cartes: Carte[] = [
    {
      cle: "candidatures",
      href: "/candidate-applications",
      Icone: FileText,
      mots: MOTS_CHIFFRES.candidatures,
      etat: candidatures,
      sousLigne: enAttente > 0 ? `${enAttente} en attente de réponse` : null,
    },
    { cle: "entretiens", href: "/candidate-applications?filtre=entretiens", Icone: Users, mots: MOTS_CHIFFRES.entretiens, etat: entretiens },
    { cle: "offres-disponibles", href: "/jobs", Icone: Briefcase, mots: MOTS_CHIFFRES.offresDisponibles, etat: offresDisponibles },
    { cle: "offres-recues", href: "/candidate-applications?filtre=offres", Icone: Handshake, mots: MOTS_CHIFFRES.offresRecues, etat: offresRecues },
  ];

  return (
    <section aria-label="Vos chiffres" className="mt-10">
      <ul className="grid grid-cols-4 gap-4 max-[1099px]:grid-cols-2 max-[639px]:gap-3">
        {cartes.map((carte) => (
          <li key={carte.cle} className="flex">
            <CarteChiffre carte={carte} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function CarteChiffre({ carte: { cle, href, Icone, mots, etat, sousLigne } }: { carte: Carte }) {
  const pret = !etat.chargement && !etat.erreur && etat.nombre !== undefined;
  const { valeur, libelle, vide } = chiffre(pret ? etat.nombre! : 2, mots);
  // Sans chiffre (chargement, erreur), le libellé est au pluriel.
  const titre = pret ? libelle : mots.plusieurs;

  return (
    <Link
      href={href}
      className="flex min-h-24 w-full items-center gap-4 rounded-[20px] border-[1.5px] border-baara-trait bg-white px-[22px] py-5 transition-colors hover:border-baara-marine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2 motion-reduce:transition-none max-[639px]:flex-col max-[639px]:items-start max-[639px]:gap-3 max-[639px]:px-4 max-[639px]:py-4 dark:border-white/20 dark:bg-white/5 dark:hover:border-white"
      data-testid={`chiffre-${cle}`}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-baara-clair" aria-hidden="true">
        <Icone className="h-6 w-6 text-baara-bleu" aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-col">
        {etat.chargement ? (
          <span className="block h-8 w-14 animate-pulse rounded-lg bg-baara-moyen motion-reduce:animate-none dark:bg-white/10" aria-hidden="true" />
        ) : etat.erreur ? (
          <>
            <span className="sr-only">{titre} : </span>
            <span className="font-titre text-[20px] font-extrabold leading-tight text-baara-marine dark:text-white">Indisponible</span>
          </>
        ) : (
          <span className={`font-titre font-extrabold leading-none text-baara-marine dark:text-white ${vide ? "text-[20px] leading-tight" : "text-[32px] max-[639px]:text-[28px]"}`}>
            {valeur}
          </span>
        )}
        <span
          className="mt-1 block font-texte text-[15px] text-baara-texte first-letter:uppercase [overflow-wrap:anywhere] dark:text-slate-300"
          aria-hidden={etat.erreur ? "true" : undefined}
        >
          {" "}{titre}
          {/* Virgule du nom accessible (« 4 candidatures, 2 en attente »), dans
              le flux : en sr-only, Chrome la précède d'un espace. */}
          {pret && sousLigne && <span className="select-none text-transparent">,</span>}
        </span>
        {pret && sousLigne && (
          <span className="block font-texte text-sm text-baara-texte dark:text-slate-300">
            {sousLigne}
          </span>
        )}
      </span>
    </Link>
  );
}
