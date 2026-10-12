// Single source of truth for skill suggestions — used by the candidate
// profile editor's skill picker and the recruiter offer form's skills input.
export const SKILLS_LIST = [
  // Bureautique
  "Microsoft Office",
  "Excel",
  "Excel avancé",
  "Word",
  "PowerPoint",
  "Outlook",
  "Microsoft 365",
  "Google Workspace",

  // Développement / Tech
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "PHP",
  "React.js",
  "Node.js",
  "HTML5",
  "CSS3",
  "Bootstrap",
  "Tailwind CSS",
  "SQL",
  "MySQL",
  "PostgreSQL",
  "Bases de données",
  "API REST",
  "Git / GitHub",
  "Docker",
  "IA / API OpenAI",
  "Développement Web",
  "WordPress",
  "SEO",
  "Analyse de données",

  // Finance & Comptabilité
  "Finance",
  "Comptabilité",
  "Gestion financière",
  "Analyse financière",
  "Budgetisation",
  "Gestion budgétaire",
  "Facturation",
  "Gestion de trésorerie",

  // Commercial & Marketing
  "Vente",
  "Négociation",
  "Marketing",
  "Réseaux sociaux",
  "Service client",
  "Photoshop",

  // Logistique & Métiers manuels
  "Gestion de stock",
  "Logistique",
  "Conduite",
  "Permis B",
  "Premiers secours",
  "Cuisine",
  "Électricité",
  "Plomberie",
  "Soudure",
  "Menuiserie",

  // Langues
  "Anglais",
  "Français",
  "Arabe",

  // Savoir-être
  "Gestion de projet",
  "Communication",
  "Leadership",
  "Travail en équipe",
  "Esprit d'analyse",
  "Résolution de problèmes",
  "Autonomie",
  "Rigueur",
  "Adaptabilité",
  "Créativité",
  "Esprit d'initiative",
  "Gestion du temps",
  "Curiosité technologique",
];

export const SKILLS_LIST_SORTED = [...SKILLS_LIST].sort((a, b) =>
  a.localeCompare(b, "fr", { sensitivity: "base" }),
);
