import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Users } from "lucide-react";
import { EnteteAccueil } from "@/components/home/entete-accueil";
import { BandeauServices } from "@/components/services/bandeau-services";
import { SelecteurProfil, DECALAGE_ANCRES } from "@/components/services/selecteur-profil";
import { PanneauProfil } from "@/components/services/panneau-profil";
import { OffreLancement } from "@/components/services/offre-lancement";
import { Faq } from "@/components/services/faq";
import { DemandeDemo } from "@/components/services/demande-demo";
import { ordreProfils } from "@/donnees/services";
import { useProfilServices } from "@/hooks/use-profil-services";

export default function ServicesPage() {
  const { profil, tick, choisirProfil } = useProfilServices();
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

      <DemandeDemo />

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
