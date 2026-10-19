import { z } from "zod";

// Demande de démo de la page /services : même validation côté formulaire et
// côté serveur (POST /api/demo-requests).

export const profilsDemandeDemo = ["entreprise", "agence"] as const;
export type ProfilDemandeDemo = (typeof profilsDemandeDemo)[number];

const EMAIL = z.string().email();

/** Le contact saisi est-il un e-mail, un numéro plausible, ou ni l'un ni l'autre ? */
export function typeContact(valeur: string): "email" | "telephone" | null {
  const v = valeur.trim();
  if (v.includes("@")) return EMAIL.safeParse(v).success ? "email" : null;
  // Chiffres, espaces, points, tirets et un « + » initial, parenthèses
  // ignorées (« (+223) 20 22… ») ; 8 à 15 chiffres (norme E.164).
  if (!/^\+?[\d\s.\-]+$/.test(v.replace(/[()]/g, "").trim())) return null;
  const chiffres = v.replace(/\D/g, "").length;
  return chiffres >= 8 && chiffres <= 15 ? "telephone" : null;
}

export const demandeDemoSchema = z.object({
  fullName: z.string().trim().min(2, "Indiquez votre nom et prénom.").max(120, "Nom trop long."),
  company: z.string().trim().min(2, "Indiquez le nom de votre entreprise ou agence.").max(160, "Nom trop long."),
  contact: z.string().trim().min(1, "Indiquez un téléphone ou un e-mail.").max(160, "Contact trop long.")
    .refine((v) => typeContact(v) !== null, "Saisissez un e-mail valide ou un numéro de téléphone (8 chiffres au moins)."),
  profileType: z.enum(profilsDemandeDemo, { errorMap: () => ({ message: "Choisissez entreprise ou agence." }) }),
  // Champ piège invisible : un humain le laisse vide.
  siteWeb: z.string().optional(),
});

export type DemandeDemo = z.infer<typeof demandeDemoSchema>;

/** Erreurs par champ, au premier message pour chacun. */
export function erreursDemandeDemo(valeurs: unknown): Partial<Record<keyof DemandeDemo, string>> {
  const resultat = demandeDemoSchema.safeParse(valeurs);
  if (resultat.success) return {};
  const erreurs: Partial<Record<keyof DemandeDemo, string>> = {};
  for (const issue of resultat.error.issues) {
    const champ = issue.path[0] as keyof DemandeDemo;
    if (champ && !erreurs[champ]) erreurs[champ] = issue.message;
  }
  return erreurs;
}

/** Message d'échec affiché au visiteur, selon le statut HTTP (aucun = réseau). */
export function messageEchecDemo(statut?: number): string {
  if (statut === 429) return "Trop de demandes envoyées depuis cette connexion. Réessayez dans quelques minutes.";
  if (statut === 400) return "Certaines informations sont invalides. Vérifiez les champs, puis réessayez.";
  if (statut) return "La demande n'a pas pu être enregistrée. Réessayez dans un instant.";
  return "Envoi impossible : vérifiez votre connexion internet, puis réessayez.";
}
