// Sceau bleu « de vérification » à 16 pointes (maquette « Services »).
// Utilisé pour « Gratuit » / « 2 mois gratuits » sur la page Services.

const BRANCHES = 16;
const RAYON_EXTERIEUR = 49;
const RAYON_INTERIEUR = 42;
const CENTRE = 50;

/** Sommets d'une étoile : alternance rayon extérieur / intérieur, pointe en haut. */
export function pointsSceau(branches = BRANCHES, rExt = RAYON_EXTERIEUR, rInt = RAYON_INTERIEUR, c = CENTRE): string {
  return Array.from({ length: branches * 2 }, (_, i) => {
    const rayon = i % 2 === 0 ? rExt : rInt;
    const angle = -Math.PI / 2 + (i * Math.PI) / branches;
    return `${(c + rayon * Math.cos(angle)).toFixed(2)},${(c + rayon * Math.sin(angle)).toFixed(2)}`;
  }).join(" ");
}

// Constante de module : calculée une fois.
const POINTS = pointsSceau();

const TAILLES = {
  m: { boite: "h-[92px] w-[92px]", ligne1: "text-[19px]", ligne2: "text-[15px]" },
  xl: { boite: "h-[148px] w-[148px]", ligne1: "text-[30px]", ligne2: "text-[22px]" },
} as const;

export function Sceau({ ligne1, ligne2, libelle, taille = "m" }: { ligne1: string; ligne2?: string; libelle: string; taille?: "m" | "xl" }) {
  const t = TAILLES[taille];
  return (
    <span
      role="img"
      aria-label={libelle}
      className={`relative inline-grid shrink-0 -rotate-6 place-items-center ${t.boite}`}
      data-testid="sceau"
    >
      {/* Un seul polygone ; le contour arrondi (stroke-linejoin) adoucit les pointes. */}
      <svg
        viewBox="0 0 100 100"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full overflow-visible fill-baara-bleu stroke-baara-bleu drop-shadow-[0_6px_10px_theme(colors.baara.marine/25%)]"
      >
        <polygon points={POINTS} strokeWidth={5} strokeLinejoin="round" />
      </svg>
      <span aria-hidden="true" className="relative flex flex-col items-center text-center leading-none text-white">
        <span className={`font-titre font-extrabold ${t.ligne1}`}>{ligne1}</span>
        {ligne2 && <span className={`mt-0.5 font-titre font-bold ${t.ligne2}`}>{ligne2}</span>}
      </span>
    </span>
  );
}
