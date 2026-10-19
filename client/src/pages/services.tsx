import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Building2, Send, Users } from "lucide-react";
import { EnteteAccueil } from "@/components/home/entete-accueil";
import { BandeauServices } from "@/components/services/bandeau-services";
import { SelecteurProfil, DECALAGE_ANCRES } from "@/components/services/selecteur-profil";
import { PanneauProfil } from "@/components/services/panneau-profil";
import { OffreLancement } from "@/components/services/offre-lancement";
import { Faq } from "@/components/services/faq";
import { ordreProfils } from "@/donnees/services";
import { useProfilServices } from "@/hooks/use-profil-services";


export default function ServicesPage() {
  const { profil, tick, choisirProfil } = useProfilServices();
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
    <div className="min-h-screen bg-baara-papier dark:bg-baara-profond">
      <EnteteAccueil />
      <BandeauServices />
      <SelecteurProfil profil={profil} onChoisir={choisirProfil} />
      {/* Ancres des profils, juste avant le panneau, décalées sous l'en-tête et
          le sélecteur collants. */}
      {ordreProfils.map((p) => (
        <span key={p} id={p} aria-hidden="true" className="block h-0" style={{ scrollMarginTop: DECALAGE_ANCRES }} />
      ))}
      <PanneauProfil profil={profil} tick={tick} />

      <OffreLancement />
      <Faq />

      {/* Formulaire de démo : refondu au prompt 5. */}
      <section className="container mx-auto px-4 py-14 md:py-16">
        <div className="mx-auto max-w-2xl">
          <Card id="demo" style={{ scrollMarginTop: DECALAGE_ANCRES }} className="border-border/70">
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
