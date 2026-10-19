// Listes de valeurs du formulaire d'offre, dans un module léger : les pages
// qui n'ont besoin que des listes (bandeau de l'accueil, recherche d'offres)
// n'embarquent pas le formulaire et son éditeur de texte riche.
// offer-form.tsx les réexporte.

// French labor-law contract categories (CDI/CDD/etc.) — the sole vocabulary
// OfferForm writes. Older postings (created before the form existed) may
// still carry a legacy value like "full-time" — see job-type-labels.ts for
// how that's displayed.
export const contractTypeOptions = [
  { value: "cdi", label: "CDI" },
  { value: "cdd", label: "CDD" },
  { value: "interim", label: "Intérim" },
  { value: "stage", label: "Stage" },
  { value: "journalier", label: "Journalier" },
  { value: "prestation", label: "Prestation" },
];

// Liste partagée avec le serveur (shared/categories.ts).
export { jobCategoryOptions } from "@shared/categories";

// Same values as missions-management.tsx's educationLevels — kept aligned
// deliberately, unlike contractTypeOptions above.
export const educationLevelOptions = [
  { value: "none", label: "Sans diplôme" },
  { value: "bac", label: "Baccalauréat" },
  { value: "bac+2", label: "Bac+2 (BTS, DUT)" },
  { value: "bac+3", label: "Bac+3 (Licence)" },
  { value: "bac+5", label: "Bac+5 (Master)" },
  { value: "bac+8", label: "Doctorat" },
];
