import type { Request } from "express";

/**
 * En-tête posé par les tests automatisés (tests/ et e2e/) sur chacune de
 * leurs requêtes. Les suites créent des dizaines de comptes en quelques
 * minutes et dépassaient les limiteurs de débit du serveur de développement
 * (429), d'où de faux échecs.
 */
export const EN_TETE_TESTS = "x-tests-baaramatch";

/**
 * À passer en option `skip` des limiteurs (express-rate-limit) : ignore la
 * limite pour une requête de test, mais JAMAIS en production — là, l'en-tête
 * n'a aucun effet, quiconque pouvant l'envoyer.
 */
export function ignorerLimitePourLesTests(req: Request): boolean {
  return process.env.NODE_ENV !== "production" && req.get(EN_TETE_TESTS) === "1";
}
