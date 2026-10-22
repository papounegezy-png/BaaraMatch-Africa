import type { CandidateProfile, User } from "@shared/schema";

// Complétion du profil candidat : 10 critères, et la première étape
// manquante (même liste, pour que le lien et le pourcentage concordent).
// (Repris de l'ancien tableau de bord candidat.)

// Utilitaire pour normaliser les champs potentiellement string/object/array
export function parseArrayField<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") {
    const objectValues = Object.values(value as Record<string, unknown>);
    return Array.isArray(objectValues) ? (objectValues as T[]) : [];
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed as T[];
      if (parsed && typeof parsed === "object") {
        return Object.values(parsed as Record<string, unknown>) as T[];
      }
    } catch {
      return [];
    }
  }
  return [];
}

export function calculateProfileCompletion(user: User, profile?: CandidateProfile): number {
  const educationEntries = parseArrayField<any>(profile?.educationEntries);
  const certificationEntries = parseArrayField<any>(profile?.certifications);
  const completionChecks = [
    !!user.fullName,
    !!user.phone,
    !!user.city,
    !!profile?.title,
    !!profile?.bio,
    !!profile?.experience,
    educationEntries.length > 0 || !!profile?.education,
    certificationEntries.length > 0,
    !!profile?.resumeUrl,
    !!profile?.skills?.length,
  ];
  return Math.round((completionChecks.filter(Boolean).length / completionChecks.length) * 100);
}

// The single most useful missing item, from the same 10 criteria as
// calculateProfileCompletion (so the link and the % always agree), ordered
// by what recruiters look at first; `section` opens the matching block of
// the profile editor (/profile?section=…).
export function nextProfileStep(user: User, profile?: CandidateProfile): { label: string; section: string } | null {
  const hasEducation = parseArrayField<any>(profile?.educationEntries).length > 0 || !!profile?.education;
  const hasCertification = parseArrayField<any>(profile?.certifications).length > 0;
  const steps: [boolean, string, string][] = [
    [!!profile?.resumeUrl, "Importer votre CV", "cv"],
    [!!profile?.skills?.length, "Ajouter vos compétences", "professional"],
    [!!profile?.title, "Indiquer le poste recherché", "professional"],
    [!!user.city, "Indiquer votre ville", "personal"],
    [!!profile?.experience, "Décrire votre expérience", "experiences"],
    [!!user.fullName && !!user.phone, "Compléter vos coordonnées", "personal"],
    [hasEducation, "Ajouter une formation", "education"],
    [!!profile?.bio, "Ajouter une courte présentation", "professional"],
    [hasCertification, "Ajouter une certification", "certifications"],
  ];
  const missing = steps.find(([done]) => !done);
  return missing ? { label: missing[1], section: missing[2] } : null;
}
