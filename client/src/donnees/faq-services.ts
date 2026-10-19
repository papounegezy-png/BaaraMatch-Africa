// Questions fréquentes de la page /services. Chaque réponse a été vérifiée
// dans le code (19/10/2026) ; quatre questions, pas une de plus.

export type QuestionFaq = { question: string; reponse: string };

export const faqServices: QuestionFaq[] = [
  {
    question: "Combien ça coûte ?",
    reponse: "Gratuit pour les candidats. Agences et entreprises : 2 mois gratuits avec tous les modules, puis des conditions annoncées à l'avance.",
  },
  {
    // Corrigée par rapport à la maquette : pendant les 2 mois gratuits, une
    // agence est en plan Partenaire (shared/plans.ts), donc publie sans
    // validation. La vérification « sous 24 h » ne concerne que le plan
    // Standard, après l'essai ; ce délai est annoncé dans le formulaire
    // d'offre mais n'est pas garanti par le code (À CONFIRMER).
    question: "Mes offres sont-elles vérifiées ?",
    reponse: "Entreprises : en ligne dès la publication. Agences : en ligne tout de suite en plan Partenaire, inclus pendant les 2 mois gratuits ; en plan Standard, vérifiées sous 24 h.",
  },
  {
    question: "Mon client a-t-il besoin d'un compte ?",
    reponse: "Non. La fiche client et l'enquête de satisfaction fonctionnent sans compte.",
  },
  {
    question: "Et WhatsApp ?",
    reponse: "Bientôt, dès l'activation. Aujourd'hui, BaaraMatch fonctionne sur ordinateur et sur mobile.",
  },
];
