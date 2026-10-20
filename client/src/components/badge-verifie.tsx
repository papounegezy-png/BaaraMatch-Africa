import { pointsSceau } from "@/components/sceau";

// Même sceau à 16 pointes que le sceau bleu, en plus petit et en vert.
const POINTS = pointsSceau(16, 49, 42, 50);

/**
 * Badge « Employeur vérifié par BaaraMatch » : sceau vert et coche blanche,
 * 19 px. À n'afficher que pour un employeur réellement vérifié — aucun ne
 * l'est tant que la vérification par l'équipe n'existe pas.
 */
export function BadgeVerifie({ taille = 19 }: { taille?: number }) {
  return (
    <svg
      role="img"
      aria-label="Employeur vérifié par BaaraMatch"
      viewBox="0 0 100 100"
      width={taille}
      height={taille}
      className="inline-block shrink-0 overflow-visible align-[-0.2em]"
      data-testid="badge-verifie"
    >
      <polygon points={POINTS} className="fill-baara-verifie stroke-baara-verifie" strokeWidth={6} strokeLinejoin="round" />
      <path d="M30 51l13 13 27-29" fill="none" stroke="white" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
