import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Brain,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock3,
  FileCheck2,
  MessageSquare,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

const services = [
  {
    icon: Brain,
    title: "Matching intelligent",
    description:
      "Classement automatique des profils selon vos critères métier, compétences et disponibilité.",
    bullets: ["Tri rapide", "Score de pertinence", "Recommandations en continu"],
  },
  {
    icon: Users,
    title: "Sourcing de talents",
    description:
      "Accédez à un vivier qualifié de candidats et optimisez vos campagnes de recrutement.",
    bullets: ["Profils vérifiés", "Filtres avancés", "Recherche multicanale"],
  },
  {
    icon: FileCheck2,
    title: "Suivi de candidatures",
    description:
      "Pilotez votre pipeline de recrutement avec des statuts clairs et une visibilité en temps réel.",
    bullets: ["Pipeline visuel", "Historique d'actions", "Alertes clés"],
  },
  {
    icon: MessageSquare,
    title: "Communication centralisée",
    description:
      "Échangez avec candidats et équipes depuis un seul espace pour éviter la perte d'information.",
    bullets: ["Messages unifiés", "Templates prêts", "Notifications utiles"],
  },
  {
    icon: ShieldCheck,
    title: "Conformité et sécurité",
    description:
      "Gestion sécurisée des données candidats avec des standards de protection adaptés au recrutement.",
    bullets: ["Accès contrôlé", "Traçabilité", "Bonnes pratiques RH"],
  },
  {
    icon: Clock3,
    title: "Accompagnement opérationnel",
    description:
      "Nos équipes vous aident à structurer vos workflows pour réduire vos délais de recrutement.",
    bullets: ["Onboarding guidé", "Support prioritaire", "Conseils d'optimisation"],
  },
];

const plans = [
  {
    name: "Start",
    subtitle: "Pour lancer vos recrutements",
    price: "Sur devis",
    features: ["Publication d'offres", "Tri de candidatures", "Dashboard essentiel"],
  },
  {
    name: "Growth",
    subtitle: "Pour accélérer votre volume",
    price: "Sur devis",
    featured: true,
    features: ["Matching intelligent", "Pipeline collaboratif", "Reporting avancé"],
  },
  {
    name: "Enterprise",
    subtitle: "Pour les besoins complexes",
    price: "Sur devis",
    features: ["Modules personnalisés", "SLA dédié", "Accompagnement stratégique"],
  },
  {
    name: "Agence Partenaire",
    subtitle: "Pour les agences de placement",
    price: "150 000 FCFA/mois",
    features: [
      "Recherche et matching de candidats",
      "Gestion des placements et missions",
      "Facturation clients et suivi des commissions",
    ],
  },
];

const faqs = [
  {
    question: "Quels types d'entreprises peuvent utiliser BaaraMatch ?",
    answer:
      "BaaraMatch est adapté aux agences de recrutement, PME et grandes entreprises qui souhaitent structurer et accélérer leurs recrutements.",
  },
  {
    question: "Le matching intelligent est-il personnalisable ?",
    answer:
      "Oui. Les critères de matching peuvent s'ajuster selon vos besoins: compétences, disponibilité, localisation et niveau d'expérience.",
  },
  {
    question: "Combien de temps prend la mise en place ?",
    answer:
      "La mise en route est rapide. La plupart des équipes démarrent en quelques heures avec notre accompagnement onboarding.",
  },
  {
    question: "Proposez-vous une démonstration avant engagement ?",
    answer:
      "Oui, vous pouvez demander une démo directement via le formulaire ci-dessous et notre équipe vous recontacte rapidement.",
  },
];

const revealContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const revealItem = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: "easeOut" as const },
  },
};

export default function ServicesPage() {
  const { toast } = useToast();
  const [isSubmittingDemo, setIsSubmittingDemo] = useState(false);
  const [demoForm, setDemoForm] = useState({
    fullName: "",
    email: "",
    company: "",
    message: "",
  });

  const handleDemoSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setIsSubmittingDemo(true);
      await apiRequest("POST", "/api/demo-requests", {
        fullName: demoForm.fullName,
        email: demoForm.email,
        company: demoForm.company,
        message: demoForm.message,
      });

      toast({
        title: "Demande envoyee",
        description: "Merci. Notre equipe vous contactera rapidement pour planifier une demo.",
      });

      setDemoForm({
        fullName: "",
        email: "",
        company: "",
        message: "",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible d'envoyer votre demande pour le moment.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingDemo(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <section className="relative overflow-hidden border-b bg-gradient-to-br from-background via-muted/30 to-card">
        <div className="container mx-auto px-4 py-16 md:py-20">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <Badge variant="secondary" className="gap-2 text-xs md:text-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Services BaaraMatch
            </Badge>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight" data-testid="text-services-title">
              Des services RH modernes pour recruter plus vite et mieux
            </h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-3xl mx-auto">
              Que vous soyez agence ou entreprise, BaaraMatch vous propose des outils simples,
              performants et intuitifs pour attirer, évaluer et convertir les bons talents.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link href="/jobs">
                <Button className="gap-2" data-testid="button-services-explore-jobs">
                  <Briefcase className="h-4 w-4" />
                  Explorer les offres
                </Button>
              </Link>
              <Link href="/agencies">
                <Button variant="outline" className="gap-2" data-testid="button-services-view-employers">
                  <Building2 className="h-4 w-4" />
                  Voir les employeurs
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-14 md:py-16">
        <motion.div
          className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-6"
          variants={revealContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.18 }}
        >
          {services.map((service) => (
            <motion.div key={service.title} variants={revealItem}>
              <Card className="h-full border-border/70 hover:shadow-md transition-shadow">
              <CardHeader className="space-y-3">
                <div className="w-11 h-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <service.icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">{service.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{service.description}</p>
                <ul className="space-y-2">
                  {service.bullets.map((bullet) => (
                    <li key={bullet} className="text-sm flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="bg-muted/40 border-y">
        <div className="container mx-auto px-4 py-14 md:py-16">
          <div className="text-center space-y-3 mb-8">
            <h2 className="text-2xl md:text-3xl font-bold">Des packs adaptés à votre rythme</h2>
            <p className="text-muted-foreground">Choisissez la formule qui correspond à votre niveau de maturité RH.</p>
          </div>
          <motion.div
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5"
            variants={revealContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            {plans.map((plan) => (
              <motion.div key={plan.name} variants={revealItem}>
                <Card
                  className={`h-full ${plan.featured ? "border-primary shadow-md" : "border-border/70"}`}
                >
                <CardHeader>
                  {plan.featured && <Badge className="w-fit">Recommandé</Badge>}
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{plan.subtitle}</p>
                  <p className="text-lg font-semibold pt-2">{plan.price}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="text-sm flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      {feature}
                    </div>
                  ))}
                </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-14 md:py-16">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-6 md:gap-8">
          <Card id="faq" className="scroll-mt-24 border-border/70">
            <CardHeader>
              <CardTitle className="text-2xl">FAQ</CardTitle>
              <p className="text-sm text-muted-foreground">
                Les reponses aux questions les plus frequentes sur nos services.
              </p>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={faq.question} value={`faq-${index}`}>
                    <AccordionTrigger className="text-left hover:no-underline">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          <Card id="demo" className="scroll-mt-24 border-border/70">
            <CardHeader>
              <CardTitle className="text-2xl">Demander une demo</CardTitle>
              <p className="text-sm text-muted-foreground">
                Remplissez ce formulaire et nous vous recontactons rapidement.
              </p>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleDemoSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="demo-full-name">Nom complet</Label>
                  <Input
                    id="demo-full-name"
                    value={demoForm.fullName}
                    onChange={(event) => setDemoForm((prev) => ({ ...prev, fullName: event.target.value }))}
                    placeholder="Ex: Awa Traore"
                    required
                    data-testid="input-demo-full-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="demo-email">Email professionnel</Label>
                  <Input
                    id="demo-email"
                    type="email"
                    value={demoForm.email}
                    onChange={(event) => setDemoForm((prev) => ({ ...prev, email: event.target.value }))}
                    placeholder="vous@entreprise.com"
                    required
                    data-testid="input-demo-email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="demo-company">Entreprise</Label>
                  <Input
                    id="demo-company"
                    value={demoForm.company}
                    onChange={(event) => setDemoForm((prev) => ({ ...prev, company: event.target.value }))}
                    placeholder="Nom de votre structure"
                    required
                    data-testid="input-demo-company"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="demo-message">Besoin principal</Label>
                  <Textarea
                    id="demo-message"
                    value={demoForm.message}
                    onChange={(event) => setDemoForm((prev) => ({ ...prev, message: event.target.value }))}
                    placeholder="Quels sont vos objectifs recrutement ?"
                    rows={4}
                    required
                    data-testid="input-demo-message"
                  />
                </div>

                <Button type="submit" className="w-full gap-2" disabled={isSubmittingDemo} data-testid="button-submit-demo">
                  <Send className="h-4 w-4" />
                  {isSubmittingDemo ? "Envoi en cours..." : "Envoyer la demande"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="container mx-auto px-4 py-14 md:py-16">
        <Card className="border-border/70 bg-card">
          <CardContent className="p-8 md:p-10 text-center space-y-4">
            <h2 className="text-2xl md:text-3xl font-bold">Prêt à structurer vos recrutements ?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Créez votre espace agence ou entreprise et activez les services adaptés à vos objectifs.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link href="/register?type=agency">
                <Button className="gap-2" data-testid="button-services-agency-register">
                  <Building2 className="h-4 w-4" />
                  Espace agence
                </Button>
              </Link>
              <Link href="/register?type=company">
                <Button variant="outline" className="gap-2" data-testid="button-services-company-register">
                  <Users className="h-4 w-4" />
                  Espace entreprise
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
