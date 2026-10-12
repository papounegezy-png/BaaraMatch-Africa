import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, Sparkles } from "lucide-react";
import type { User, AgencyProfile } from "@shared/schema";

interface ProfileResponse {
  user: User;
  profile: AgencyProfile | null;
}

/**
 * Gates the agency billing suite (invoices, financial settings, commission
 * rates, payment methods, salary payments) behind the "Agence Partenaire"
 * plan (150 000 FCFA/mois). Plan is admin-managed — no payment gateway is
 * integrated in this project, so there is no self-service upgrade flow here,
 * only a message telling the agency how to get it.
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

  if (data?.profile?.subscriptionPlan !== "partner") {
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
                La facturation, les commissions et les paiements de salaire sont inclus dans le plan{" "}
                <span className="font-medium text-foreground">Agence Partenaire</span> (150 000 FCFA/mois).
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
