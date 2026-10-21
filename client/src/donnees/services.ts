// Catalogue des services de la page /services : seule source du contenu.
// Le JSX ne contient aucune chaîne de service ; modifier ce fichier suffit.
// Chaque service a été vérifié dans le code (audit du 19/10/2026) ; ceux qui
// n'existent qu'en partie portent un commentaire « À CONFIRMER ».

export type Profil = "candidats" | "entreprises" | "agences";
export type Service = { nom: string; desc: string };
export type Groupe = { titre: string; services: Service[] };
export type ProfilServices = {
  titre: string;
  sceau: { ligne1: string; ligne2?: string; libelle: string };
  cta: { label: string; href: string };
  groupes: Groupe[];
};

export const ordreProfils: Profil[] = ["candidats", "entreprises", "agences"];

export const libellesProfils: Record<Profil, string> = {
  candidats: "Candidats",
  entreprises: "Entreprises",
  agences: "Agences",
};

export const catalogueServices: Record<Profil, ProfilServices> = {
  candidats: {
    titre: "Candidats",
    sceau: { ligne1: "Gratuit", libelle: "Gratuit" },
    cta: { label: "Créer mon profil", href: "/register" },
    groupes: [
      {
        titre: "Trouver une offre",
        services: [
          { nom: "Recherche d'offres", desc: "Métier, ville, catégorie, contrat, tri." },
          // À CONFIRMER : liste fixe de repères de Bamako uniquement ; choisir un
          // repère filtre sur le nom du quartier (texte), sans calcul de distance.
          { nom: "Recherche par repères", desc: "Offres autour d'un quartier connu." },
          { nom: "Offres recommandées", desc: "Classées par score, avec la raison." },
          { nom: "Fiche offre complète", desc: "Salaire, compétences, début, partage." },
          { nom: "Annuaire des employeurs", desc: "Profil et offres de chaque employeur." },
          { nom: "Offres sauvegardées", desc: "À garder pour plus tard." },
        ],
      },
      {
        titre: "Postuler",
        services: [
          { nom: "Candidature en quelques clics", desc: "Le profil sert de dossier." },
          { nom: "Profil et CV en ligne", desc: "CV PDF, compétences, barre de complétion." },
          { nom: "CV vocal", desc: "Se présenter à l'oral, sans rédiger." },
        ],
      },
      {
        titre: "Suivre ses candidatures",
        services: [
          { nom: "Mes candidatures", desc: "Statut à chaque étape, retrait possible." },
          { nom: "Créneau d'entretien", desc: "Le candidat choisit parmi les créneaux." },
          { nom: "Prochaines actions", desc: "Entretien, relance, profil à compléter." },
          { nom: "Notifications", desc: "Chaque changement de statut." },
        ],
      },
    ],
  },

  entreprises: {
    titre: "Entreprises",
    sceau: { ligne1: "2 mois", ligne2: "gratuits", libelle: "2 mois gratuits" },
    cta: { label: "Publier une offre", href: "/register/organisation" },
    groupes: [
      {
        titre: "Publier",
        services: [
          { nom: "Création d'offre", desc: "Salaire, compétences, dates, postes, urgence." },
          { nom: "Mise en ligne immédiate", desc: "Visible dès la publication." },
          { nom: "Page entreprise publique", desc: "Une vitrine avec vos offres." },
        ],
      },
      {
        titre: "Recruter",
        services: [
          { nom: "Candidatures classées", desc: "Score, raison, CV et CV vocal." },
          { nom: "Étapes de recrutement", desc: "De Nouveau à Recruté, liste ou Kanban." },
          { nom: "Entretiens", desc: "Créneaux proposés, calendrier." },
          { nom: "Export Excel", desc: "Les candidatures d'une offre en un fichier." },
          { nom: "Tableau de bord", desc: "Offres, candidatures, entretiens, recrutements." },
        ],
      },
      {
        titre: "Gérer son personnel",
        services: [
          { nom: "Annuaire des employés", desc: "Fiches, rôles, intégration." },
          { nom: "Congés et absences", desc: "Demandes, calendrier, soldes." },
          // Organigramme construit à partir de l'annuaire et des départements.
          { nom: "Organisation", desc: "Organigramme, départements, postes." },
        ],
      },
      {
        titre: "Chantiers BTP et mines",
        services: [
          { nom: "Chantiers et sites", desc: "Affectations, rotations, hébergements." },
          { nom: "Habilitations", desc: "Certifications, alertes d'expiration." },
          { nom: "EPI et équipements", desc: "Inventaire, attributions, non-conformités." },
          { nom: "HSE", desc: "Incidents, formations, statistiques." },
        ],
      },
    ],
  },

  agences: {
    titre: "Agences de placement",
    sceau: { ligne1: "2 mois", ligne2: "gratuits", libelle: "2 mois gratuits" },
    cta: { label: "Demander une démo", href: "#demo" },
    groupes: [
      {
        titre: "Gérer ses candidats",
        services: [
          { nom: "Base candidats", desc: "Recherche, statuts, score, export Excel." },
          { nom: "Ajout de candidats", desc: "Même sans compte, depuis le terrain." },
          { nom: "CV et pièces jointes", desc: "Le dossier au même endroit." },
          { nom: "Historique des placements", desc: "Où et quand chaque candidat a été placé." },
        ],
      },
      {
        titre: "Gérer ses clients",
        services: [
          { nom: "Fiches entreprises clientes", desc: "Le client n'a pas besoin de compte." },
          { nom: "Contacts RH", desc: "Interlocuteurs et contact principal." },
          { nom: "Besoins de recrutement", desc: "Une demande client devient une offre." },
          { nom: "Contrats et accords", desc: "Du brouillon à la signature." },
          { nom: "Suivi de la relation", desc: "Appels, rendez-vous, relances planifiées." },
          { nom: "Satisfaction client", desc: "Enquête par lien, sans compte." },
        ],
      },
      {
        titre: "Recruter pour ses clients",
        services: [
          // À CONFIRMER : la validation manuelle existe en plan Standard, mais
          // « 24 h » n'est qu'un texte d'interface, sans délai garanti. Pendant
          // l'essai Partenaire de 60 jours, aucune validation ne s'applique.
          { nom: "Offres et missions", desc: "Rattachées au client, vérifiées sous 24 h en Standard." },
          { nom: "Candidatures par client", desc: "Filtre client, score expliqué, export." },
          { nom: "Shortlist et affectations", desc: "Sélection présentée, candidats affectés." },
          { nom: "Calendrier et pipeline", desc: "Entretiens et vue Kanban." },
          { nom: "Placements et contrats", desc: "CDI, CDD, freelance, échéances." },
        ],
      },
      {
        titre: "Facturer et payer",
        services: [
          // À CONFIRMER : existe (plan Partenaire, donc pendant l'essai de 60 jours),
          // mais concerne la publication des offres, pas la facturation : ce
          // service irait mieux dans « Recruter pour ses clients ».
          { nom: "Publication directe", desc: "En ligne tout de suite, sans validation." },
          { nom: "Missions terrain", desc: "Suivi, clôture, litiges." },
          { nom: "Facturation clients", desc: "Factures, envoi, suivi des paiements." },
          { nom: "Rémunérations et commissions", desc: "Intérimaires, taux par client." },
          { nom: "États de paiement", desc: "Dû, payé, en retard ; export comptable." },
        ],
      },
    ],
  },
};
