import { INTERVALLE_RELANCE_JOURS, MAX_TACHES, SEUIL_ATTENTE_LONGUE_JOURS, SEUIL_RELANCE_JOURS } from "@/constantes/espace";
import { JOUR_MS, joursEcoules, libelleDuree } from "@/lib/duree";
import { formatJobTitle } from "@shared/format-job-title";

// « À faire maintenant » : au plus MAX_TACHES tâches, une par candidature,
// par ordre de priorité. Sans les données d'une règle, pas de tâche.

export type CandidatureTache = {
  id: string;
  status?: string | null;
  jobTitle?: string;
  organizationName?: string | null;
  createdAt?: Date | string | null;
  statusChangedAt?: Date | string | null;
  interviewDate?: Date | string | null;
  // Champs du prompt 7 (absents d'ici là) : rappel repoussé, dernière relance.
  rappelReporteJusquau?: Date | string | null;
  derniereRelanceLe?: Date | string | null;
};

export type TypeTache = "creneau" | "entretien" | "relance" | "attente-longue";

export type Tache = {
  cle: string;
  type: TypeTache;
  candidatureId: string;
  titre: string;
  detail: string;
  poste: string;
};

const SANS_REPONSE = ["pending", "reviewing"];

function poste(c: CandidatureTache): string | null {
  return formatJobTitle(c.jobTitle) || null;
}

const heure = (d: Date | string | null | undefined) => (d ? new Date(d).getTime() : Infinity);

export function calculerTaches(candidatures: CandidatureTache[], maintenant: Date = new Date()): Tache[] {
  const t = maintenant.getTime();
  const taches: Tache[] = [];
  const prises = new Set<string>();
  const ajouter = (tache: Tache) => {
    if (prises.has(tache.candidatureId)) return;
    prises.add(tache.candidatureId);
    taches.push(tache);
  };

  // Créneau d'entretien à choisir : règle existante, avant tout.
  for (const c of candidatures.filter((x) => x.status === "interview_proposed")) {
    const p = poste(c);
    if (!p || !c.organizationName) continue;
    ajouter({ cle: `creneau-${c.id}`, type: "creneau", candidatureId: c.id, poste: p, titre: `Choisir un créneau d'entretien chez ${c.organizationName}`, detail: `Poste : ${p}` });
  }

  // a. Entretien à venir (ou sans date connue), le plus proche d'abord.
  const entretiens = candidatures
    .filter((x) => x.status === "interview" && (!x.interviewDate || heure(x.interviewDate) > t))
    .sort((a, b) => heure(a.interviewDate) - heure(b.interviewDate));
  for (const c of entretiens) {
    const p = poste(c);
    if (!p || !c.organizationName) continue;
    ajouter({ cle: `entretien-${c.id}`, type: "entretien", candidatureId: c.id, poste: p, titre: `Préparer votre entretien chez ${c.organizationName}`, detail: `Poste : ${p}` });
  }

  // b. et c. Sans réponse, la plus ancienne d'abord. Rappel repoussé ou
  // relance récente : pas de tâche.
  const enAttente = candidatures
    .filter((x) => SANS_REPONSE.includes(x.status ?? "pending") && (x.statusChangedAt || x.createdAt))
    .filter((x) => !(x.rappelReporteJusquau && heure(x.rappelReporteJusquau) > t))
    .map((c) => ({ c, jours: joursEcoules((c.statusChangedAt ?? c.createdAt)!, maintenant) }))
    .sort((a, b) => b.jours - a.jours);
  for (const { c, jours } of enAttente) {
    const p = poste(c);
    if (!p) continue;
    if (jours >= SEUIL_ATTENTE_LONGUE_JOURS) {
      if (!c.organizationName) continue;
      ajouter({ cle: `attente-${c.id}`, type: "attente-longue", candidatureId: c.id, poste: p, titre: "Une candidature reste sans réponse", detail: `${p} chez ${c.organizationName} · sans réponse depuis ${libelleDuree(jours)}` });
    } else if (jours >= SEUIL_RELANCE_JOURS) {
      if (c.derniereRelanceLe && t - heure(c.derniereRelanceLe) < INTERVALLE_RELANCE_JOURS * JOUR_MS) continue;
      ajouter({ cle: `relance-${c.id}`, type: "relance", candidatureId: c.id, poste: p, titre: "Relancer ou retirer une candidature", detail: `${p} · sans réponse depuis ${libelleDuree(jours)}` });
    }
  }

  return taches.slice(0, MAX_TACHES);
}
