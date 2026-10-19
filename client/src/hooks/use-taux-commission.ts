import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

export type TauxPropose = { taux: number; source: string; libelle: string } | null;

/**
 * Taux de commission proposé pour un placement (client + type de contrat),
 * selon les réglages de l'agence (shared/commissions.ts). Tant que l'agence
 * n'a pas touché au champ, `appliquer` reçoit le taux proposé (ou "" sans
 * taux réglé) ; après une saisie manuelle, le champ n'est plus écrasé.
 */
export function useTauxCommissionPropose(
  clientId: string | null | undefined,
  contractType: string | null | undefined,
  appliquer: (valeur: string) => void,
  // Change quand le formulaire est réinitialisé (autre candidat, réouverture).
  cleFormulaire: unknown,
) {
  const [touche, setTouche] = useState(false);
  useEffect(() => setTouche(false), [cleFormulaire]);

  const requete = useQuery<TauxPropose>({
    queryKey: ["/api/agency/commission-rates/applicable", clientId ?? null, contractType ?? null],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (clientId) params.set("clientId", clientId);
      if (contractType) params.set("contractType", contractType);
      const res = await fetch(`/api/agency/commission-rates/applicable?${params}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!touche && requete.data !== undefined) appliquer(requete.data ? String(requete.data.taux) : "");
    // `appliquer` change à chaque rendu : seuls le taux proposé et `touche` comptent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requete.data, touche]);

  return {
    propose: requete.data ?? null,
    /** À appeler quand l'agence modifie le champ elle-même. */
    marquerTouche: () => setTouche(true),
  };
}

/** Phrase d'aide sous le champ : d'où vient le taux, ou s'il a été modifié. */
export function aideTauxCommission(propose: TauxPropose, valeur: string): string {
  const saisi = valeur.trim() === "" ? null : Number(valeur.replace(",", "."));
  if (!propose) return saisi === null ? "Aucun taux réglé pour ce client : laissez vide pour aucune commission." : "Taux saisi pour ce placement.";
  if (saisi === propose.taux) return propose.libelle;
  return `Taux modifié pour ce placement (proposé : ${String(propose.taux).replace(".", ",")} %).`;
}
