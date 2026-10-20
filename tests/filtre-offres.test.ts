import { describe, expect, it } from "vitest";
import { compterParContrat, contratDepuisParametre, correspondTexte, facettes, filtrerOffres, normaliserTexte, secteursDepuisParametres } from "../client/src/lib/filtre-offres";
import type { Offre } from "../client/src/types/offre";

const offre = (o: Partial<Offre>): Offre => ({
  id: o.id ?? "x", titre: "Offre", employeurId: "e1", employeurNom: "Employeur", employeurVerifie: false,
  contrat: "CDI", description: "", urgent: false, publieLe: "2026-10-20T00:00:00.000Z", ...o,
});

const offres = [
  offre({ id: "1", titre: "Chef de chantier", employeurNom: "Sahel BTP", ville: "Bamako", contrat: "CDI" }),
  offre({ id: "2", titre: "Électricien industriel", employeurNom: "Énergie Plus", ville: "BAMAKO", contrat: "CDD" }),
  offre({ id: "3", titre: "Comptable", employeurNom: "Cabinet Kènè", ville: "Dakar", contrat: "CDD", employeurId: "e2" }),
  offre({ id: "4", titre: "Développeur", employeurNom: "Tech Mali", ville: "Ségou", contrat: "Freelance" }),
  offre({ id: "5", titre: "Agent journalier", employeurNom: "Sahel BTP", ville: "Kayes", contrat: "Journalier" }),
];

describe("filtrage des offres", () => {
  it("compare sans accents ni casse", () => {
    expect(normaliserTexte("  BAMAKO  ")).toBe("bamako");
    expect(normaliserTexte("Électricien")).toBe("electricien");
    expect(correspondTexte("electricien", ["Électricien industriel"])).toBe(true);
    expect(correspondTexte("kene", ["Cabinet Kènè"])).toBe(true);
  });

  it("exige chaque mot de la recherche, dans le titre ou l'employeur", () => {
    expect(filtrerOffres(offres, { recherche: "chef chantier" }).map((o) => o.id)).toEqual(["1"]);
    expect(filtrerOffres(offres, { recherche: "sahel" }).map((o) => o.id)).toEqual(["1", "5"]);
    expect(filtrerOffres(offres, { recherche: "chef dakar" })).toHaveLength(0);
  });

  it("filtre par lieu, contrat et employeur, critères combinés", () => {
    expect(filtrerOffres(offres, { lieu: "bamako" }).map((o) => o.id)).toEqual(["1", "2"]);
    expect(filtrerOffres(offres, { lieu: "segou" }).map((o) => o.id)).toEqual(["4"]);
    expect(filtrerOffres(offres, { lieu: "bamako", contrat: "CDD" }).map((o) => o.id)).toEqual(["2"]);
    expect(filtrerOffres(offres, { employeurId: "e2" }).map((o) => o.id)).toEqual(["3"]);
  });

  it("compte par contrat avec les autres critères appliqués", () => {
    expect(compterParContrat(offres, { contrat: "CDI" })).toEqual({ toutes: 5, CDI: 1, CDD: 2, Freelance: 1 });
    expect(compterParContrat(offres, { lieu: "bamako" })).toEqual({ toutes: 2, CDI: 1, CDD: 1, Freelance: 0 });
  });

  it("lit le contrat de l'adresse, ancien ou nouveau paramètre", () => {
    expect(contratDepuisParametre("cdi")).toBe("CDI");
    expect(contratDepuisParametre("Freelance")).toBe("Freelance");
    expect(contratDepuisParametre("stage")).toBeNull();
    expect(contratDepuisParametre(null)).toBeNull();
  });
});

describe("filtres du panneau", () => {
  const maintenant = new Date("2026-10-20T12:00:00Z");
  const jours = (n: number) => new Date(maintenant.getTime() - n * 86_400_000).toISOString();
  const liste = [
    offre({ id: "a", ville: "Bamako", secteur: "BTP et construction", experienceMin: 3, publieLe: jours(0.5) }),
    offre({ id: "b", ville: "BAMAKO", secteur: "Mines et carrières", experienceMin: 6, publieLe: jours(3) }),
    offre({ id: "c", ville: "Dakar", secteur: "BTP et construction", publieLe: jours(20) }),
    offre({ id: "d", ville: "Kayes", secteur: undefined, experienceMin: 0, publieLe: jours(45) }),
  ];
  const ids = (c: Parameters<typeof filtrerOffres>[1]) => filtrerOffres(liste, { maintenant, ...c }).map((o) => o.id);

  it("retient une offre si elle correspond à l'une des valeurs cochées du groupe", () => {
    expect(ids({ secteurs: ["BTP et construction", "Mines et carrières"] })).toEqual(["a", "b", "c"]);
    expect(ids({ villes: ["bamako"] })).toEqual(["a", "b"]);
    expect(ids({ experiences: ["2-5", "0-2"] })).toEqual(["a", "d"]);
  });

  it("combine les groupes entre eux", () => {
    expect(ids({ secteurs: ["BTP et construction"], villes: ["bamako"] })).toEqual(["a"]);
    expect(ids({ secteurs: ["BTP et construction"], experiences: ["5-10"] })).toEqual([]);
  });

  it("filtre par date de publication", () => {
    expect(ids({ publieeDepuisJours: 1 })).toEqual(["a"]);
    expect(ids({ publieeDepuisJours: 7 })).toEqual(["a", "b"]);
    expect(ids({ publieeDepuisJours: 30 })).toEqual(["a", "b", "c"]);
  });

  it("compte chaque groupe sans son propre filtre, et regroupe les villes", () => {
    const f = facettes(liste, { maintenant, villes: ["bamako"], secteurs: ["Mines et carrières"] });
    expect(f.villes.find((v) => v.valeur === "bamako")).toEqual({ valeur: "bamako", libelle: "Bamako", nombre: 1 });
    expect(f.villes.map((v) => v.valeur)).toEqual(["bamako", "dakar", "kayes"]);
    expect(f.secteurs.find((s) => s.valeur === "BTP et construction")?.nombre).toBe(1);
    expect(f.secteurs.find((s) => s.valeur === "Mines et carrières")?.nombre).toBe(1);
    expect(f.secteurs).toHaveLength(32);
    expect(f.experiences.map((e) => e.nombre)).toEqual([0, 0, 1, 0]);
  });

  it("lit les secteurs de l'adresse, nouveaux ou anciens", () => {
    expect(secteursDepuisParametres(["BTP & Construction", "Mines et carrières", "inconnu"])).toEqual(["BTP et construction", "Mines et carrières"]);
  });
});
