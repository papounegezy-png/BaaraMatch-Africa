import { Building2, Mountain, Truck, Landmark, Users, Laptop, type LucideIcon } from "lucide-react";

// Secteurs mis en avant sur l'accueil. `valeur` reprend exactement une
// entrée de jobCategoryOptions (offer-form.tsx), c'est-à-dire ce que le
// formulaire d'offre écrit dans job.category : le filtre /jobs?category=…
// retrouve donc de vraies offres. Il n'existe pas d'API des secteurs ;
// cette liste fixe la remplace tant qu'il n'y en a pas.
export interface SecteurAccueil {
  libelle: string;
  valeur: string;
  icone: LucideIcon;
}

export const SECTEURS_ACCUEIL: SecteurAccueil[] = [
  { libelle: "BTP", valeur: "BTP & Construction", icone: Building2 },
  { libelle: "Mines", valeur: "Mines", icone: Mountain },
  { libelle: "Logistique", valeur: "Transport & Logistique", icone: Truck },
  { libelle: "Finance", valeur: "Finance & Comptabilité", icone: Landmark },
  { libelle: "RH", valeur: "Ressources Humaines", icone: Users },
  { libelle: "Tech", valeur: "Informatique & Tech", icone: Laptop },
];

export function lienSecteur(valeur: string): string {
  return `/jobs?category=${encodeURIComponent(valeur)}`;
}
