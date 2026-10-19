import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, Sparkles } from "lucide-react";
import type { User, AgencyProfile } from "@shared/schema";
import { estPartenaire } from "@shared/plans";

interface ProfileResponse {
  user: User;
  profile: AgencyProfile | null;
}

/**
 * Gates the agency billing suite (invoices, financial settings, commission
 * rates, payment methods, salary payments) behind the "Agence Partenaire"
 * plan. Offre de lancement : 60 jours de Partenaire par agence (voir
 * shared/plans.ts), puis plan géré par le Super Admin — aucun paiement en
 * ligne n'existe, d'où un simple message pour obtenir le plan.
 */
export function RequirePartnerPlan({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useQuery<ProfileResponse>({
    queryKey: ["/api/profile"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!estPartenaire(data?.profile)) {
    // Essai de lancement terminé (date de fin passée) ou jamais ouvert.
    const essaiTermine = !!data?.profile?.partnerTrialEndsAt;
    return (
      <div className="flex items-center justify-center py-16">
        <Card className="max-w-md w-full border-primary/30">
          <CardContent className="pt-10 pb-8 px-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-semibold" data-testid="text-partner-plan-required">
                Réservé au plan Agence Partenaire
              </h2>
              <p className="text-sm text-muted-foreground">
                {essaiTermine && "Votre période d'essai de 2 mois est terminée. "}
                La facturation, les commissions et les paiements de salaire font partie du plan{" "}
                <span className="font-medium text-foreground">Agence Partenaire</span>.
              </p>
            </div>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5 pt-2">
              <Sparkles className="h-3.5 w-3.5" />
              Contactez BaaraMatch pour activer ce plan sur votre compte.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
