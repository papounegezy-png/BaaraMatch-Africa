import { Building2, Mountain, Truck, Landmark, Users, Laptop, type LucideIcon } from "lucide-react";
import { SECTEURS_ACCUEIL_BASE } from "@shared/categories";

// Secteurs mis en avant sur l'accueil (liste partagée avec le serveur dans
// shared/categories.ts), avec leur icône. `valeur` est une entrée du
// vocabulaire d'OfferForm ; le filtre /jobs?category=… rattache aussi les
// anciennes valeurs (« BTP », « Tech »…) via categorieCanonique.
export interface SecteurAccueil {
  libelle: string;
  valeur: string;
  icone: LucideIcon;
}

const ICONES: Record<string, LucideIcon> = {
  "BTP & Construction": Building2,
  Mines: Mountain,
  "Transport & Logistique": Truck,
  "Finance & Comptabilité": Landmark,
  "Ressources Humaines": Users,
  "Informatique & Tech": Laptop,
};

export const SECTEURS_ACCUEIL: SecteurAccueil[] = SECTEURS_ACCUEIL_BASE.map((s) => ({ ...s, icone: ICONES[s.valeur] }));

export function lienSecteur(valeur: string): string {
  return `/jobs?category=${encodeURIComponent(valeur)}`;
}
