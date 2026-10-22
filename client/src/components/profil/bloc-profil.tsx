import type { ReactNode } from "react";
import { Pencil, type LucideIcon } from "lucide-react";

export const lienModifier =
  "inline-flex min-h-11 shrink-0 items-center gap-1.5 font-texte text-[15px] font-bold text-baara-bleu underline underline-offset-4 hover:text-baara-marine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2 dark:text-white";

/**
 * Bloc de « Mon profil » : carte blanche, filet marine au-dessus du titre,
 * bouton « Modifier » dont le nom accessible est propre à la section.
 */
export function BlocProfil({
  id,
  titre,
  Icone,
  libelleModifier,
  onModifier,
  taille = "principal",
  children,
}: {
  id: string;
  titre: string;
  Icone?: LucideIcon;
  libelleModifier?: string;
  onModifier?: () => void;
  taille?: "principal" | "lateral";
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`titre-${id}`}
      className="scroll-mt-24 rounded-[20px] border-[1.5px] border-baara-trait bg-white px-[26px] py-6 max-[639px]:px-5 max-[639px]:py-5 dark:border-white/20 dark:bg-white/5"
      data-testid={`bloc-${id}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t-2 border-baara-marine pt-4 dark:border-white">
        <h2 id={`titre-${id}`} className={`flex items-center gap-2.5 font-titre font-bold text-baara-marine dark:text-white ${taille === "lateral" ? "text-[20px]" : "text-[21px]"}`}>
          {Icone && <Icone className="h-[22px] w-[22px] shrink-0 text-baara-bleu dark:text-baara-moyen" aria-hidden="true" />}
          {titre}
        </h2>
        {onModifier && libelleModifier && (
          <button type="button" onClick={onModifier} aria-label={libelleModifier} className={lienModifier} data-testid={`modifier-${id}`}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Modifier
          </button>
        )}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Texte d'une section vide. */
export function TexteVide({ children }: { children: ReactNode }) {
  return <p className="max-w-[68ch] font-texte text-[16px] text-baara-texte dark:text-slate-300">{children}</p>;
}
