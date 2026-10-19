import type { Express, RequestHandler } from "express";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "./db";
import { agencyClientAgreements, agencyClients, commissionRateSettings } from "@shared/schema";
import { libelleSourceTaux, placementContractTypes, tauxCommissionApplicable, type TauxApplicable } from "@shared/commissions";

type RequireRole = (role: "agency") => RequestHandler;

/**
 * Taux applicable à un placement de l'agence pour ce client et ce type de
 * contrat (ordre de priorité : shared/commissions.ts). null si aucun taux
 * n'est réglé : le placement reste alors sans commission sauf saisie.
 */
export async function chargerTauxApplicable(
  agencyId: string,
  clientId: string | null | undefined,
  contractType: string | null | undefined,
): Promise<TauxApplicable | null> {
  const [reglages, accords] = await Promise.all([
    db.select().from(commissionRateSettings).where(eq(commissionRateSettings.agencyId, agencyId)),
    clientId
      ? db.select().from(agencyClientAgreements)
        .where(and(eq(agencyClientAgreements.agencyId, agencyId), eq(agencyClientAgreements.clientId, clientId)))
      : Promise.resolve([]),
  ]);
  return tauxCommissionApplicable({
    reglages,
    accords: accords.map((a) => ({ ...a, agencyClientId: a.clientId })),
    clientId,
    contractType,
  });
}

/** Le client appartient-il bien à cette agence ? */
export async function clientDeLAgence(agencyId: string, clientId: string): Promise<boolean> {
  const [client] = await db.select({ id: agencyClients.id }).from(agencyClients)
    .where(and(eq(agencyClients.id, clientId), eq(agencyClients.agencyId, agencyId)));
  return !!client;
}

export function registerAgencyCommissionRoutes(app: Express, requireRole: RequireRole) {
  // Lecture seule, pas réservée au plan Partenaire : les formulaires de
  // placement s'en servent pour préremplir le taux.
  app.get("/api/agency/commission-rates/applicable", requireRole("agency"), async (req, res) => {
    try {
      const { clientId, contractType } = z.object({
        clientId: z.string().min(1).optional(),
        contractType: z.enum(placementContractTypes).optional(),
      }).parse(req.query);
      const agencyId = req.session.userId!;
      if (clientId && !(await clientDeLAgence(agencyId, clientId))) {
        return res.status(404).json({ message: "Client introuvable" });
      }
      const applicable = await chargerTauxApplicable(agencyId, clientId, contractType);
      res.json(applicable ? { ...applicable, libelle: libelleSourceTaux(applicable.source, contractType) } : null);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Paramètres invalides", errors: error.errors });
      console.error("Error resolving commission rate:", error);
      res.status(500).json({ message: "Erreur lors du calcul du taux de commission" });
    }
  });
}
