/**
 * Badge « Employeur vérifié par BaaraMatch » : sceau vert à pointes et coche
 * blanche (tracé de la maquette « Page Employeurs »), 21 px, juste après le
 * nom. Vert baara.verifie (#15803D, ≈ 5:1 sur blanc), réservé à ce badge.
 * À n'afficher que pour un employeur réellement vérifié (verified_at).
 * `marge` : 6 px à gauche après un nom en ligne ; inutile dans un conteneur
 * flex qui espace déjà ses éléments.
 */
export function BadgeVerifie({ marge = true }: { marge?: boolean }) {
  return (
    <span
      role="img"
      aria-label="Employeur vérifié par BaaraMatch"
      title="Vérifié par BaaraMatch"
      className={`inline-block shrink-0 align-[-3px] ${marge ? "ml-1.5" : ""}`}
      data-testid="badge-verifie"
    >
      <svg viewBox="0 0 24 24" width={21} height={21} aria-hidden="true" className="block">
        <path
          className="fill-baara-verifie"
          d="M12 1.5l2.3 1.9 3-.3 1.2 2.8 2.8 1.2-.3 3L22.9 12l-1.9 2.3.3 3-2.8 1.2-1.2 2.8-3-.3L12 22.5l-2.3-1.9-3 .3-1.2-2.8-2.8-1.2.3-3L1.1 12l1.9-2.3-.3-3 2.8-1.2 1.2-2.8 3 .3L12 1.5Z"
        />
        <path d="M7.6 12.3l3 3 5.8-6.2" fill="none" stroke="white" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
