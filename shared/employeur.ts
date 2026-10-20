import { SECTEURS, type Secteur } from "./secteurs";

// Employeur de la page Employeurs (/agencies), tel que GET /api/employeurs
// le renvoie. Aucune donnée absente n'est complétée.

export type TypeEmployeur = "entreprise" | "agence";

export type Employeur = {
  id: string;
  nom: string;
  type: TypeEmployeur;
  logoUrl?: string;
  ville?: string;
  pays?: string;
  secteur?: Secteur;
  // Offres actives publiées par l'employeur.
  offresPubliees: number;
  // Masquée : aucune source réelle des notes (décision du 20/10/2026).
  note?: number;
  // Vérification BaaraMatch (verified_at, action admin) ; jamais
  // users.isVerified, qui signifie seulement « compte prospect réclamé ».
  verifie: boolean;
};

// Ligne lue en base (storage.getEmployeursPublics).
export type LigneEmployeur = {
  id: string;
  type: "agency" | "company";
  nom: string | null;
  logoUrl: string | null;
  ville: string | null;
  pays: string | null;
  secteur: string | null;
  verifieLe: Date | string | null;
  offres: number;
};

const texte = (v: string | null | undefined) => v?.trim().replace(/\s+/g, " ") || undefined;

export function employeurDepuisLigne(l: LigneEmployeur): Employeur {
  return {
    id: l.id,
    nom: texte(l.nom) ?? "",
    type: l.type === "agency" ? "agence" : "entreprise",
    logoUrl: texte(l.logoUrl),
    ville: texte(l.ville),
    pays: texte(l.pays),
    secteur: (SECTEURS as readonly string[]).includes(l.secteur ?? "") ? (l.secteur as Secteur) : undefined,
    offresPubliees: Number(l.offres) || 0,
    verifie: !!l.verifieLe,
  };
}

/** Adresse du profil public de l'employeur. */
export function lienProfil(e: Pick<Employeur, "id" | "type">): string {
  return e.type === "agence" ? `/agencies/${e.id}` : `/companies/${e.id}`;
}
