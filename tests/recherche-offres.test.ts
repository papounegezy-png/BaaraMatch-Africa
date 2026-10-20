import { describe, expect, it } from "vitest";
import { apercuDescription, offreDepuisLigne, type LigneOffre, type Offre } from "../shared/offre";
import { lireParametresOffres, rechercherOffres } from "../shared/recherche-offres";

const MAINTENANT = new Date("2026-10-20T12:00:00Z");
const ilYa = (jours: number) => new Date(MAINTENANT.getTime() - jours * 86_400_000).toISOString();

function offre(id: string, o: Partial<Offre> = {}): Offre {
  return { id, titre: `Offre ${id}`, employeurId: "e1", employeurNom: "Sahel BTP", employeurVerifie: false, contrat: "CDI", description: "", urgent: false, publieLe: ilYa(1), ...o };
}

const OFFRES: Offre[] = [
  offre("a", { ville: "Bamako", contrat: "CDI", secteur: "BTP et construction", experienceMin: 3, publieLe: ilYa(1) }),
  offre("b", { ville: "BAMAKO", contrat: "CDD", secteur: "Mines et carrières", experienceMin: 0, publieLe: ilYa(3) }),
  offre("c", { ville: "Kayès", contrat: "Freelance", secteur: "Mines et carrières", experienceMin: 6, publieLe: ilYa(10) }),
  offre("d", { ville: "kayes", contrat: "CDI", secteur: "BTP et construction", publieLe: ilYa(40) }),
  offre("e", { ville: "Sikasso", contrat: null, titre: "Chef de chantier", publieLe: ilYa(2) }),
];

const chercher = (q: Record<string, unknown>) => rechercherOffres(OFFRES, lireParametresOffres(q), MAINTENANT);

describe("paramètres de GET /api/offres", () => {
  it("lit les listes répétées, avec ou sans crochets, ou séparées par des virgules", () => {
    expect(lireParametresOffres({ ville: ["Bamako", "Kayès"] }).villes).toEqual(["bamako", "kayes"]);
    expect(lireParametresOffres({ "ville[]": "BAMAKO" }).villes).toEqual(["bamako"]);
    expect(lireParametresOffres({ exp: "2-5,10+" }).experiences).toEqual(["2-5", "10+"]);
  });

  it("ignore les valeurs inconnues au lieu de refuser la requête", () => {
    const p = lireParametresOffres({ contrat: "temps plein", exp: "99", tri: "note", page: "-3", taille: "500", secteur: "Inconnu", publiee_depuis_jours: "abc" });
    expect([p.contrat, p.experiences, p.tri, p.page, p.taille, p.secteurs, p.publieeDepuisJours]).toEqual([null, [], "recent", 1, 50, [], null]);
  });

  it("comprend les anciens noms et l'ancien vocabulaire des secteurs", () => {
    const p = lireParametresOffres({ location: "Bamako", type: "cdd", category: "BTP & Construction", companyId: "e9" });
    expect([p.lieu, p.contrat, p.secteurs, p.employeurId]).toEqual(["Bamako", "CDD", ["BTP et construction"], "e9"]);
  });
});

describe("recherche", () => {
  it("compare les villes sans casse ni accents", () => {
    expect(chercher({ ville: "bamakó" }).offres.map((o) => o.id)).toEqual(["a", "b"]);
    expect(chercher({ ville: "KAYES" }).total).toBe(2);
    expect(chercher({ lieu: "kayès" }).total).toBe(2);
  });

  it("trie par date de publication, la plus récente d'abord", () => {
    expect(chercher({}).offres.map((o) => o.id)).toEqual(["a", "e", "b", "c", "d"]);
  });

  it("pagine et ramène une page trop grande à la dernière", () => {
    const r = chercher({ taille: "2", page: "2" });
    expect([r.offres.map((o) => o.id), r.total, r.page, r.nbPages]).toEqual([["b", "c"], 5, 2, 3]);
    expect(chercher({ taille: "2", page: "99" }).page).toBe(3);
  });

  it("combine les filtres : contrat, secteur, expérience, date et texte", () => {
    expect(chercher({ contrat: "CDI", secteur: "BTP et construction" }).total).toBe(2);
    expect(chercher({ exp: ["0-2", "5-10"] }).offres.map((o) => o.id)).toEqual(["b", "c"]);
    expect(chercher({ publiee_depuis_jours: "7" }).total).toBe(3);
    expect(chercher({ q: "chef chantier" }).offres.map((o) => o.id)).toEqual(["e"]);
  });

  it("compte chaque facette avec les autres filtres, sans le sien", () => {
    const f = chercher({ ville: "bamako", contrat: "CDI" }).facettes;
    // Contrats : la ville s'applique, pas le contrat.
    expect(f.contrats).toEqual({ toutes: 2, CDI: 1, CDD: 1, Freelance: 0 });
    // Villes : le contrat s'applique, pas la ville ; graphies regroupées.
    expect(f.villes.map((v) => `${v.libelle}:${v.nombre}`)).toEqual(["Bamako:1", "Kayès:1", "Sikasso:0"]);
    expect(f.secteurs.find((s) => s.valeur === "BTP et construction")?.nombre).toBe(1);
    expect(f.experiences.map((e) => e.nombre)).toEqual([0, 1, 0, 0]);
  });
});

describe("modèle d'offre côté serveur", () => {
  it("aperçu texte de la description, sans balises ni entités", () => {
    expect(apercuDescription("<p>PROFIL&nbsp;RECHERCHÉ</p><ul><li>Bac+2 &amp; 3 ans</li></ul><p>Contrat &#233;tabli</p>")).toBe("PROFIL RECHERCHÉ Bac+2 & 3 ans Contrat établi");
    expect(apercuDescription("<p>Mission de démonstration</p>")).toBe("");
    expect(apercuDescription(`<p>${"a".repeat(400)}</p>`, 10)).toBe(`${"a".repeat(10)}…`);
  });

  it("ligne de la base → offre, sans rien inventer", () => {
    const ligne = {
      id: "j1", title: "Chef de quart", agencyId: null, companyId: "c1", organizationName: "Sahel Mines", logoUrl: "/logo.png", verifiedAt: new Date(),
      jobType: "freelance", category: "Mines", experienceMin: 2, experienceMax: null, salaryMin: 300000, salaryMax: null, salaryCurrency: "XOF", salaryPeriod: "mois",
      location: " Kayes ", description: "<p>Texte</p>", isUrgent: true, createdAt: new Date("2026-10-19T08:00:00Z"),
    } as unknown as LigneOffre;
    const o = offreDepuisLigne(ligne);
    expect(o).toMatchObject({ contrat: "Freelance", secteur: "Mines et carrières", employeurVerifie: true, employeurLogoUrl: "/logo.png", periodeSalaire: "mois", ville: "Kayes", description: "Texte", urgent: true });
    expect(o.experienceMax).toBeUndefined();
    expect(o.employeurNote).toBeUndefined();
    expect(offreDepuisLigne({ ...ligne, verifiedAt: null }).employeurVerifie).toBe(false);
  });
});
