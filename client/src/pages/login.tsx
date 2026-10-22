import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { loginSchema } from "@shared/schema";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, Loader2 } from "lucide-react";

type LoginFormData = z.infer<typeof loginSchema>;

function normalizeAuthUser(raw: any) {
  if (!raw) {
    return raw;
  }
  return {
    ...raw,
    userType: raw.userType ?? raw.user_type,
    fullName: raw.fullName ?? raw.full_name,
    avatarUrl: raw.avatarUrl ?? raw.avatar_url,
    isVerified: raw.isVerified ?? raw.is_verified,
    createdAt: raw.createdAt ?? raw.created_at,
    updatedAt: raw.updatedAt ?? raw.updated_at,
  };
}

function normalizeUserType(value?: string) {
  return value?.toLowerCase().trim();
}

function getRedirectPathByUserType(rawUserType?: string) {
  const userType = normalizeUserType(rawUserType);
  if (userType === "agency") {
    return "/agency/dashboard";
  }
  if (userType === "company") {
    return "/company/dashboard";
  }
  if (userType === "candidate") {
    return "/espace-personnel";
  }
  if (userType === "admin") {
    return "/admin/dashboard";
  }
  return "/";
}

// Adresse de retour après connexion (?retour=/jobs?contrat=CDI…), posée par
// les pages qui demandent de se connecter (« Enregistrer » une offre). Seules
// les adresses internes au site sont suivies : pas d'autre domaine ni de
// « //… », pour ne pas servir de redirection ouverte.
function adresseDeRetour(): string | null {
  const retour = new URLSearchParams(window.location.search).get("retour");
  if (!retour || !retour.startsWith("/") || retour.startsWith("//") || retour.startsWith("/login")) return null;
  return retour;
}

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading || !user) {
      return;
    }

    setLocation(adresseDeRetour() ?? getRedirectPathByUserType(user.userType));
  }, [user, isLoading, setLocation]);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response.json();
    },
    onSuccess: async (user) => {
      const normalizedUser = normalizeAuthUser(user);

      // Prevent redirect race by updating auth cache immediately.
      queryClient.setQueryData(["/api/auth/me"], normalizedUser);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Connexion réussie",
        description: "Bienvenue sur BaaraMatch Africa !",
      });

      const userTypeFromResponse = (normalizedUser as { userType?: string })?.userType;

      let resolvedUserType = userTypeFromResponse;

      if (!resolvedUserType) {
        try {
          const meRes = await fetch("/api/auth/me", { credentials: "include" });
          if (meRes.ok) {
            const me = await meRes.json() as { userType?: string; user_type?: string };
            resolvedUserType = me.userType ?? me.user_type;
          }
        } catch {
          // Ignore network fallback error; default redirect below will handle it.
        }
      }

      setLocation(adresseDeRetour() ?? getRedirectPathByUserType(resolvedUserType));
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur de connexion",
        description: error.message || "Email ou mot de passe incorrect",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-primary-deeper">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-md gradient-gold">
              <Briefcase className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">
              Baara<span className="text-gradient-gold">Match</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-white" data-testid="text-login-title">
            Connexion
          </h1>
          <p className="text-primary-mid">
            Connectez-vous à votre compte BaaraMatch
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          autoComplete="email"
                          placeholder="votre@email.com"
                          {...field}
                          data-testid="input-login-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Mot de passe</FormLabel>
                        <a
                          href="mailto:contact@baaramatch.africa?subject=Mot%20de%20passe%20oubli%C3%A9"
                          className="text-sm text-primary hover:underline"
                          data-testid="link-forgot-password"
                        >
                          Mot de passe oublié ?
                        </a>
                      </div>
                      <FormControl>
                        <PasswordInput
                          autoComplete="current-password"
                          placeholder="••••••••"
                          {...field}
                          data-testid="input-login-password"
                          toggleTestId="button-toggle-login-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                  data-testid="button-login-submit"
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connexion...
                    </>
                  ) : (
                    "Se connecter"
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Pas encore de compte ?</span>{" "}
              <Link
                href="/register"
                className="text-primary font-medium hover:underline"
                data-testid="link-register-from-login"
              >
                Créer un compte
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
