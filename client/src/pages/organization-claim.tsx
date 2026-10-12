import { Link, useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { claimOrganizationSchema } from "@shared/schema";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, ShieldCheck } from "lucide-react";

type ClaimFormData = z.infer<typeof claimOrganizationSchema>;

export default function OrganizationClaimPage() {
  const params = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ClaimFormData>({
    resolver: zodResolver(claimOrganizationSchema),
    defaultValues: {
      token: params.token ?? "",
      password: "",
      confirmPassword: "",
    },
  });

  const claimMutation = useMutation({
    mutationFn: async (data: ClaimFormData) => {
      const response = await apiRequest("POST", "/api/organizations/claim", data);
      return response.json();
    },
    onSuccess: (userData) => {
      queryClient.setQueryData(["/api/auth/me"], userData);
      toast({
        title: "Compte récupéré",
        description: "Votre compte est maintenant actif, définissez votre profil pour continuer.",
      });
      if (userData.userType === "agency") {
        setLocation("/agency/dashboard");
      } else {
        setLocation("/company/dashboard");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Lien invalide",
        description: error.message || "Ce lien de récupération est invalide ou a déjà été utilisé.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ClaimFormData) => {
    claimMutation.mutate({ ...data, token: params.token ?? "" });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-gradient-to-br from-background via-card to-muted">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm text-muted-foreground">Retour à l'accueil</span>
          </Link>
          <div className="w-14 h-14 mx-auto rounded-xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Récupérer votre organisation</h1>
          <p className="text-muted-foreground text-sm">
            Un administrateur BaaraMatch a créé un profil pour votre organisation et publié une offre en votre nom.
            Définissez un mot de passe pour prendre le contrôle du compte.
          </p>
        </div>

        <Card>
          <CardHeader />
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nouveau mot de passe</FormLabel>
                      <FormControl>
                        <Input type="password" data-testid="input-claim-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmer le mot de passe</FormLabel>
                      <FormControl>
                        <Input type="password" data-testid="input-claim-confirm-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={claimMutation.isPending} data-testid="button-claim-submit">
                  {claimMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Récupération...
                    </>
                  ) : (
                    "Activer mon compte"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
