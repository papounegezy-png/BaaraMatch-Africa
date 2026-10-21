import { SECTEURS, secteurDeCategorie, type Secteur } from "./secteurs";
import type { ResumeAvis } from "./avis";

// Profil public d'un employeur, tel que GET /api/employeurs/:id le renvoie
// (pages /agencies/:id et /companies/:id). Aucune donnée absente n'est
// complétée.

export type TypeEmployeur = "agence" | "entreprise";

export type ProfilEmployeur = {
  id: string;
  type: TypeEmployeur;
  nom: string;
  logoUrl?: string;
  // Photo de couverture (entreprises seulement pour l'instant).
  banniereUrl?: string;
  ville?: string;
  pays?: string;
  // Vérification BaaraMatch (verified_at, action admin). Jamais
  // users.isVerified, qui signifie « compte prospect réclamé ».
  verifie: boolean;
  description?: string;
  anneeCreation?: number;
  secteur?: Secteur;
  siteWeb?: string;
  // Absents pour un compte prospect (coordonnées jamais publiées par lui).
  email?: string;
  telephone?: string;
  offresActives: number;
  avis: ResumeAvis;
  // Pour l'utilisateur connecté (faux pour un visiteur).
  suiviParMoi: boolean;
  peutDonnerAvis: boolean;
};

export type LigneProfilEmployeur = {
  id: string;
  type: "agency" | "company";
  nom: string | null;
  logoUrl: string | null;
  banniereUrl: string | null;
  ville: string | null;
  pays: string | null;
  verifieLe: Date | string | null;
  description: string | null;
  anneeCreation: number | null;
  secteur: string | null;
  industry: string | null;
  siteWeb: string | null;
  email: string | null;
  telephone: string | null;
  prospect: boolean | null;
  offres: number;
};

const texte = (v: string | null | undefined) => v?.trim().replace(/[ \t]+/g, " ") || undefined;
const annee = (v: number | null | undefined) => (typeof v === "number" && v > 1800 && v <= new Date().getFullYear() ? v : undefined);

export function profilDepuisLigne(
  l: LigneProfilEmployeur,
  extra: { avis: ResumeAvis; suiviParMoi: boolean; peutDonnerAvis: boolean },
): ProfilEmployeur {
  // Secteur choisi (32 valeurs), sinon celui déduit du texte libre industry.
  const secteur = (SECTEURS as readonly string[]).includes(l.secteur ?? "") ? (l.secteur as Secteur) : secteurDeCategorie(l.industry);
  return {
    id: l.id,
    type: l.type === "agency" ? "agence" : "entreprise",
    nom: texte(l.nom) ?? "",
    logoUrl: texte(l.logoUrl),
    banniereUrl: texte(l.banniereUrl),
    ville: texte(l.ville),
    pays: texte(l.pays),
    verifie: !!l.verifieLe,
    description: texte(l.description),
    anneeCreation: annee(l.anneeCreation),
    secteur: secteur ?? undefined,
    siteWeb: texte(l.siteWeb),
    // Un compte prospect n'a jamais publié ses coordonnées.
    email: l.prospect ? undefined : texte(l.email),
    telephone: l.prospect ? undefined : texte(l.telephone),
    offresActives: Number(l.offres) || 0,
    ...extra,
  };
}
