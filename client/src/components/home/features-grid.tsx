import { ShieldCheck, GitBranch, Handshake, MessageCircle, type LucideIcon } from "lucide-react";

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

// Card 4 (WhatsApp) is worded in the conditional/neutral register on
// purpose — the WhatsApp webhook integration exists in the codebase
// (server/whatsapp.ts) but has no credentials configured in this
// environment, so it isn't live yet. Flip to an affirmative tense once
// it's actually deployed.
const features: Feature[] = [
  {
    icon: ShieldCheck,
    title: "Offres vérifiées",
    description: "Chaque offre publiée par un compte Freemium est validée manuellement sous 24h avant mise en ligne.",
  },
  {
    icon: GitBranch,
    title: "Pipeline clair",
    description: "Suivez chaque candidature de la réception à l'embauche, avec un statut clair à chaque étape.",
  },
  {
    icon: Handshake,
    title: "Missions & agences",
    description: "Les agences gèrent leurs missions de placement et leur portefeuille de clients depuis un espace dédié.",
  },
  {
    icon: MessageCircle,
    title: "Suivi WhatsApp",
    description: "Les candidats pourront bientôt recevoir leurs notifications de candidature directement sur WhatsApp.",
  },
];

export function FeaturesGrid() {
  return (
    <section className="py-16 md:py-24 bg-card border-y" aria-labelledby="features-title">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-3 mb-10 md:mb-14">
          <h2 id="features-title" className="text-3xl md:text-4xl font-bold" data-testid="text-features-title">
            Fonctionnalités principales
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-2xl border border-border/70 p-6 space-y-3" data-testid={`card-feature-${feature.title.toLowerCase().replace(/\s+/g, "-")}`}>
              <div className="w-11 h-11 rounded-xl bg-[#EAF0FD] flex items-center justify-center">
                <feature.icon className="h-5 w-5 text-primary-text" />
              </div>
              <h3 className="text-lg font-semibold leading-snug">{feature.title}</h3>
              <p className="text-sm text-baara-texte dark:text-slate-300 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
