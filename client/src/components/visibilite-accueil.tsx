import { useId } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type ProfilAvecVisibilite = { profile: { visibleAccueil?: boolean } | null };

/**
 * Accord de l'employeur (entreprise ou agence) pour apparaître sur l'accueil,
 * dans « Entreprises qui recrutent en ce moment ». Désactivé par défaut
 * (opt-in) ; enregistré tout de suite via PATCH /api/profile.
 */
export function VisibiliteAccueil() {
  const id = useId();
  const { toast } = useToast();
  const { data, isLoading } = useQuery<ProfilAvecVisibilite>({ queryKey: ["/api/profile"] });
  const visible = data?.profile?.visibleAccueil ?? false;

  const mutation = useMutation({
    mutationFn: async (visibleAccueil: boolean) => {
      const response = await apiRequest("PATCH", "/api/profile", { profileUpdates: { visibleAccueil } });
      return response.json();
    },
    onSuccess: (_reponse, visibleAccueil) => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accueil/secteurs"] });
      toast({
        title: visibleAccueil ? "Vous apparaissez sur l'accueil" : "Vous n'apparaissez plus sur l'accueil",
        description: visibleAccueil
          ? "Votre nom s'affiche à côté du secteur de vos offres actives."
          : "Vos offres restent publiées et visibles dans la liste des offres.",
      });
    },
    onError: () => {
      toast({ title: "Réglage non enregistré", description: "Vérifiez votre connexion puis réessayez.", variant: "destructive" });
    },
  });

  return (
    <Card data-testid="card-visibilite-accueil">
      <CardHeader>
        <CardTitle>Visibilité sur l'accueil</CardTitle>
        <CardDescription>
          La page d'accueil de BaaraMatch présente les employeurs qui recrutent, secteur par secteur.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor={`${id}-interrupteur`}>Apparaître dans « Entreprises qui recrutent en ce moment »</Label>
            <p id={`${id}-aide`} className="text-sm text-muted-foreground">
              Votre nom, et votre logo s'il est renseigné, s'affichent tant que vous avez des offres actives. Vous pouvez retirer votre accord à tout moment.
            </p>
          </div>
          <Switch
            id={`${id}-interrupteur`}
            aria-describedby={`${id}-aide`}
            checked={mutation.isPending ? mutation.variables : visible}
            disabled={isLoading || mutation.isPending}
            onCheckedChange={(valeur) => mutation.mutate(valeur)}
            data-testid="switch-visibilite-accueil"
          />
        </div>
      </CardContent>
    </Card>
  );
}
