import { describe, expect, it } from "vitest";
import { libelleDuree, joursEcoules } from "../client/src/lib/duree";
import { calculerTaches, type CandidatureTache } from "../client/src/lib/taches-espace";

const MAINTENANT = new Date("2026-10-21T12:00:00Z");
const ilYa = (j: number) => new Date(MAINTENANT.getTime() - j * 86_400_000).toISOString();
const dansJ = (j: number) => new Date(MAINTENANT.getTime() + j * 86_400_000).toISOString();
const c = (id: string, o: Partial<CandidatureTache>): CandidatureTache => ({ id, jobTitle: `Poste ${id}`, organizationName: `Employeur ${id}`, status: "pending", createdAt: ilYa(1), ...o });

describe("libelleDuree", () => {
  it("passe des jours aux mois puis à « plus de 6 mois » aux bonnes frontières", () => {
    expect([0, 1, 29, 30, 39, 59].map(libelleDuree)).toEqual(["moins d'un jour", "1 jour", "29 jours", "30 jours", "39 jours", "59 jours"]);
    expect([60, 89, 90, 179].map(libelleDuree)).toEqual(["2 mois", "2 mois", "3 mois", "5 mois"]);
    expect([180, 191, 400].map(libelleDuree)).toEqual(["plus de 6 mois", "plus de 6 mois", "plus de 6 mois"]);
  });
  it("compte les jours entiers écoulés", () => {
    expect(joursEcoules(ilYa(30), MAINTENANT)).toBe(30);
    expect(joursEcoules(dansJ(2), MAINTENANT)).toBe(0);
  });
});

describe("calculerTaches", () => {
  it("applique les seuils de 30 jours et 6 mois", () => {
    expect(calculerTaches([c("a", { createdAt: ilYa(29) })], MAINTENANT)).toEqual([]);
    expect(calculerTaches([c("a", { createdAt: ilYa(30) })], MAINTENANT)[0]).toMatchObject({ type: "relance", titre: "Relancer ou retirer une candidature", detail: "Poste a · sans réponse depuis 30 jours" });
    expect(calculerTaches([c("a", { createdAt: ilYa(179) })], MAINTENANT)[0]).toMatchObject({ type: "relance", detail: "Poste a · sans réponse depuis 5 mois" });
    expect(calculerTaches([c("a", { createdAt: ilYa(180) })], MAINTENANT)[0]).toMatchObject({ type: "attente-longue", titre: "Une candidature reste sans réponse", detail: "Poste a chez Employeur a · sans réponse depuis plus de 6 mois" });
  });

  it("compte depuis le dernier changement de statut", () => {
    expect(calculerTaches([c("a", { createdAt: ilYa(90), statusChangedAt: ilYa(10) })], MAINTENANT)).toEqual([]);
  });

  it("ordonne : créneau, entretien, puis attentes ; 3 au plus, une par candidature", () => {
    const t = calculerTaches([
      c("r", { createdAt: ilYa(40) }),
      c("l", { createdAt: ilYa(200) }),
      c("e2", { status: "interview", interviewDate: dansJ(5) }),
      c("e1", { status: "interview", interviewDate: dansJ(1) }),
      c("s", { status: "interview_proposed" }),
    ], MAINTENANT);
    expect(t.map((x) => x.cle)).toEqual(["creneau-s", "entretien-e1", "entretien-e2"]);
    expect(t[1]).toMatchObject({ titre: "Préparer votre entretien chez Employeur e1", detail: "Poste : Poste e1" });
    expect(calculerTaches([c("r", { createdAt: ilYa(40) }), c("l", { createdAt: ilYa(200) })], MAINTENANT).map((x) => x.cle)).toEqual(["attente-l", "relance-r"]);
  });

  it("ignore un entretien passé, un rappel repoussé et une relance récente", () => {
    expect(calculerTaches([c("a", { status: "interview", interviewDate: ilYa(1) })], MAINTENANT)).toEqual([]);
    expect(calculerTaches([c("a", { createdAt: ilYa(200), rappelReporteJusquau: dansJ(10) })], MAINTENANT)).toEqual([]);
    expect(calculerTaches([c("a", { createdAt: ilYa(45), derniereRelanceLe: ilYa(5) })], MAINTENANT)).toEqual([]);
    expect(calculerTaches([c("a", { createdAt: ilYa(45), derniereRelanceLe: ilYa(31) })], MAINTENANT)).toHaveLength(1);
  });

  it("n'invente rien : sans poste ou sans employeur, pas de tâche", () => {
    expect(calculerTaches([c("a", { status: "interview", organizationName: null })], MAINTENANT)).toEqual([]);
    expect(calculerTaches([c("a", { createdAt: ilYa(40), jobTitle: "" })], MAINTENANT)).toEqual([]);
    expect(calculerTaches([c("a", { createdAt: null, statusChangedAt: null })], MAINTENANT)).toEqual([]);
  });
});
