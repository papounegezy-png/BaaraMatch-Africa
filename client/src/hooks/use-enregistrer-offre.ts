import { useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useSavedJobs } from "@/hooks/use-saved-jobs";

/**
 * « Enregistrer » sur les cartes d'offre (page Offres, profil employeur).
 * Réservé aux candidats (/api/saved-jobs) : un visiteur est envoyé à la
 * connexion puis ramené ici ; une entreprise ou une agence ne voit pas le
 * bouton. `surEnregistrer` garde la même identité d'un rendu à l'autre, pour
 * les cartes mémorisées.
 */
export function useEnregistrerOffre() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { savedJobIds, toggleSave } = useSavedJobs();
  const enregistrer = (id: string) => {
    if (!user) {
      setLocation(`/login?retour=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    toggleSave(id);
  };
  const ref = useRef(enregistrer);
  ref.current = enregistrer;
  const surEnregistrer = useCallback((id: string) => ref.current(id), []);
  return { savedJobIds, peutEnregistrer: !user || user.userType === "candidate", surEnregistrer };
}
