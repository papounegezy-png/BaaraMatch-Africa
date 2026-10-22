import { CalendarClock, Clock, Eye, Handshake, ListChecks, MinusCircle, Trophy, Undo2, User, type LucideIcon } from "lucide-react";
import { joursEcoules, libelleDuree } from "@/lib/duree";

// Statut d'une candidature vu par le candidat : une icône ET un mot, jamais
// la couleur seule. Pas de vert ni de rouge : le vert est réservé, le rouge
// sert uniquement au point de notification.

export type StyleStatut = { libelle: string; Icone: LucideIcon; classes: string };

const ENTRETIEN = "bg-baara-moyen text-baara-marine dark:bg-baara-bleu/30 dark:text-white";
const ATTENTE = "bg-[#FBF2DC] text-[#7A5A0C] dark:bg-[#7A5A0C]/30 dark:text-[#FBF2DC]";
const AVANCEE = "bg-baara-clair text-baara-bleu dark:bg-white/10 dark:text-white";
const DECISION = "bg-baara-marine text-white dark:bg-white dark:text-baara-marine";
const CLOSE = "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200";

export const STATUTS_CANDIDATURE: Record<string, StyleStatut> = {
  pending: { libelle: "En attente", Icone: Clock, classes: ATTENTE },
  reviewing: { libelle: "En examen", Icone: Eye, classes: ATTENTE },
  shortlisted: { libelle: "Présélectionnée", Icone: ListChecks, classes: AVANCEE },
  interview_proposed: { libelle: "Créneau à choisir", Icone: CalendarClock, classes: ENTRETIEN },
  interview: { libelle: "Entretien", Icone: User, classes: ENTRETIEN },
  offered: { libelle: "Offre reçue", Icone: Handshake, classes: DECISION },
  hired: { libelle: "Poste obtenu", Icone: Trophy, classes: DECISION },
  rejected: { libelle: "Non retenue", Icone: MinusCircle, classes: CLOSE },
  withdrawn: { libelle: "Retirée", Icone: Undo2, classes: CLOSE },
};

export function statutCandidature(statut: string | null | undefined): StyleStatut {
  return STATUTS_CANDIDATURE[statut ?? "pending"] ?? STATUTS_CANDIDATURE.pending;
}

/** « aujourd'hui », « hier », « il y a 39 jours », « il y a plus de 6 mois ». */
export function depuisQuand(date: Date | string, maintenant: Date = new Date()): string {
  const jours = joursEcoules(date, maintenant);
  if (jours === 0) return "aujourd'hui";
  if (jours === 1) return "hier";
  return `il y a ${libelleDuree(jours)}`;
}

/** Date exacte, pour title et lecteurs d'écran : « 21 octobre 2026 ». */
export function dateExacte(date: Date | string): string {
  return new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
