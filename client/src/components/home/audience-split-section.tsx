import { Link } from "wouter";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AudienceSplitSection() {
  return (
    <section className="py-16 md:py-24 bg-muted/40" aria-label="Espaces dédiés">
      <div className="container mx-auto px-4">
        <div className="grid gap-6 lg:grid-cols-2 max-w-6xl mx-auto">
          <div className="rounded-2xl border border-border/70 bg-background p-6 md:p-8 space-y-4">
            <span className="inline-flex items-center rounded-full bg-[#EAF0FD] text-primary-text px-3 py-1 text-xs font-medium">
              Espace employeurs
            </span>
            <h2 className="text-2xl md:text-3xl font-bold">Outils RH pour entreprises et agences</h2>
            <p className="text-muted-foreground leading-relaxed">
              Gérez le recrutement, les candidatures et le suivi opérationnel depuis une plateforme unifiée.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Publication et validation des offres</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Suivi des candidatures en temps réel</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Gestion des missions et du portefeuille clients</li>
            </ul>
            <Link href="/services">
              <Button className="gap-2" data-testid="button-discover-hr-solutions">
                Découvrir les solutions RH
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="rounded-2xl border border-border/70 bg-background p-6 md:p-8 space-y-4">
            <span className="inline-flex items-center rounded-full bg-gold/15 text-gold-dark px-3 py-1 text-xs font-medium">
              Espace candidats
            </span>
            <h2 className="text-2xl md:text-3xl font-bold">Opportunités adaptées, candidature simplifiée</h2>
            <p className="text-muted-foreground leading-relaxed">
              Identifiez les offres alignées à votre profil et postulez en quelques clics.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-gold shrink-0" /> Offres correspondant à votre profil</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-gold shrink-0" /> Candidature en quelques clics</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-gold shrink-0" /> Suivi de chaque candidature</li>
            </ul>
            <Link href="/register?type=candidate">
              <Button variant="outline" className="gap-2" data-testid="button-create-profile">
                Créer mon profil
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
