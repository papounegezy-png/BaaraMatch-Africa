import { secteurDeCategorie, type Secteur } from "@shared/secteurs";

// Profil public d'un employeur (pages /agencies/:id et /companies/:id).
// Aucune donnée absente n'est complétée. Lu pour l'instant dans les listes
// GET /api/agencies et /api/companies (route dédiée au prompt 6).

export type TypeEmployeur = "agence" | "entreprise";

export type ProfilEmployeur = {
  id: string;
  type: TypeEmployeur;
  nom: string;
  logoUrl?: string;
  // Entreprises seulement (photo de couverture téléversée).
  banniereUrl?: string;
  ville?: string;
  pays?: string;
  // Vérification BaaraMatch (verified_at). Pas encore exposée par ces
  // listes : toujours faux d'ici le prompt 6. Jamais users.isVerified.
  verifie: boolean;
  description?: string;
  anneeCreation?: number;
  secteur?: Secteur;
  siteWeb?: string;
  // Absents pour un compte prospect (coordonnées jamais publiées par lui).
  email?: string;
  telephone?: string;
};

type Commun = {
  id: string;
  fullName: string;
  email: string | null;
  phone?: string | null;
  avatarUrl: string | null;
  city: string | null;
  country: string | null;
};
export type AgenceApi = Commun & {
  profile: { agencyName: string | null; description: string | null; website: string | null; foundedYear: number | null; verifiedAt?: string | null; secteur?: string | null } | null;
};
export type EntrepriseApi = Commun & {
  profile: { companyName: string | null; description: string | null; website: string | null; foundedYear: number | null; industry: string | null; logoUrl: string | null; coverImageUrl: string | null; verifiedAt?: string | null; secteur?: string | null } | null;
};

const texte = (v: string | null | undefined) => v?.trim().replace(/[ \t]+/g, " ") || undefined;
const annee = (v: number | null | undefined) => (typeof v === "number" && v > 1800 && v <= new Date().getFullYear() ? v : undefined);

export function profilAgence(a: AgenceApi): ProfilEmployeur {
  return {
    id: a.id,
    type: "agence",
    nom: texte(a.profile?.agencyName) ?? a.fullName.trim(),
    logoUrl: texte(a.avatarUrl),
    ville: texte(a.city),
    pays: texte(a.country),
    verifie: !!a.profile?.verifiedAt,
    description: texte(a.profile?.description),
    anneeCreation: annee(a.profile?.foundedYear),
    secteur: secteurDeCategorie(a.profile?.secteur) ?? undefined,
    siteWeb: texte(a.profile?.website),
    email: texte(a.email),
    telephone: texte(a.phone),
  };
}

export function profilEntreprise(e: EntrepriseApi): ProfilEmployeur {
  return {
    id: e.id,
    type: "entreprise",
    nom: texte(e.profile?.companyName) ?? e.fullName.trim(),
    logoUrl: texte(e.profile?.logoUrl) ?? texte(e.avatarUrl),
    banniereUrl: texte(e.profile?.coverImageUrl),
    ville: texte(e.city),
    pays: texte(e.country),
    verifie: !!e.profile?.verifiedAt,
    description: texte(e.profile?.description),
    anneeCreation: annee(e.profile?.foundedYear),
    secteur: (secteurDeCategorie(e.profile?.secteur) ?? secteurDeCategorie(e.profile?.industry)) ?? undefined,
    siteWeb: texte(e.profile?.website),
    email: texte(e.email),
    telephone: texte(e.phone),
  };
}
