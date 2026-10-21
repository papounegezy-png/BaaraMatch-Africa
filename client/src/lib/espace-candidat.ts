// Espace candidat (/espace-personnel) : textes calculés à partir des
// données réelles du candidat.

/** Premier mot du nom complet (« Aminata Diallo » → « Aminata »). */
export function prenom(nomComplet: string | null | undefined): string {
  return (nomComplet ?? "").trim().split(/\s+/)[0] ?? "";
}

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

/**
 * Phrase sous le titre : entretiens et candidatures en attente de réponse.
 * Rien à signaler : une invitation à chercher une offre.
 */
export function phraseResume(entretiens: number, enAttente: number): string {
  const morceaux = [
    entretiens > 0 ? pluriel(entretiens, "entretien") : null,
    enAttente > 0 ? `${pluriel(enAttente, "candidature")} en attente de réponse` : null,
  ].filter(Boolean);
  if (morceaux.length === 0) return "Prêt à trouver votre prochaine offre ?";
  return `Vous avez ${morceaux.join(" et ")}.`;
}
