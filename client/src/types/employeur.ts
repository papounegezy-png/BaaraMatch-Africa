import { secteurDeCategorie, type Secteur } from "@shared/secteurs";

// Modèle d'un employeur pour la page Employeurs (/agencies), adapté de
// GET /api/agencies et GET /api/companies. Aucune donnée absente n'est
// complétée.

export type TypeEmployeur = "entreprise" | "agence";

export type Employeur = {
  id: string;
  nom: string;
  type: TypeEmployeur;
  logoUrl?: string;
  ville?: string;
  pays?: string;
  // Entreprises : d'après `industry` (texte libre) quand il correspond à un
  // des 32 secteurs. Agences : aucun secteur enregistré aujourd'hui.
  secteur?: Secteur;
  // Offres actives publiées par l'employeur.
  offresPubliees: number;
  // Masquée : aucune source réelle des notes (décision du 20/10/2026).
  note?: number;
  // Vérification BaaraMatch (verified_at). Pas encore exposée par l'API :
  // toujours faux d'ici là. Jamais users.isVerified (compte réclamé).
  verifie: boolean;
};

// Champs lus dans les réponses de l'API (le reste est ignoré).
export type AgenceApi = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  city: string | null;
  country: string | null;
  profile: { agencyName: string | null; verifiedAt?: string | null } | null;
};

export type EntrepriseApi = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  city: string | null;
  country: string | null;
  profile: { companyName: string | null; industry: string | null; logoUrl: string | null; verifiedAt?: string | null } | null;
};

export type OffreResumeApi = { agencyId: string | null; companyId: string };

const texte = (v: string | null | undefined) => v?.trim() || undefined;

/** Nombre d'offres actives par employeur (l'agence si agencyId, sinon l'entreprise). */
export function offresParEmployeur(offres: OffreResumeApi[]): Map<string, number> {
  const parId = new Map<string, number>();
  for (const o of offres) {
    const id = o.agencyId ?? o.companyId;
    parId.set(id, (parId.get(id) ?? 0) + 1);
  }
  return parId;
}

export function agenceVersEmployeur(a: AgenceApi, offres: Map<string, number>): Employeur {
  return {
    id: a.id,
    nom: texte(a.profile?.agencyName) ?? a.fullName.trim(),
    type: "agence",
    logoUrl: texte(a.avatarUrl),
    ville: texte(a.city),
    pays: texte(a.country),
    offresPubliees: offres.get(a.id) ?? 0,
    verifie: !!a.profile?.verifiedAt,
  };
}

export function entrepriseVersEmployeur(e: EntrepriseApi, offres: Map<string, number>): Employeur {
  return {
    id: e.id,
    nom: texte(e.profile?.companyName) ?? e.fullName.trim(),
    type: "entreprise",
    logoUrl: texte(e.profile?.logoUrl) ?? texte(e.avatarUrl),
    ville: texte(e.city),
    pays: texte(e.country),
    secteur: secteurDeCategorie(e.profile?.industry) ?? undefined,
    offresPubliees: offres.get(e.id) ?? 0,
    verifie: !!e.profile?.verifiedAt,
  };
}

/** Adresse du profil public de l'employeur. */
export function lienProfil(e: Pick<Employeur, "id" | "type">): string {
  return e.type === "agence" ? `/agencies/${e.id}` : `/companies/${e.id}`;
}
