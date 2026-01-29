import { Link, useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { registerSchema, type UserType } from "@shared/schema";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, Users, Building2, Handshake, Loader2, ArrowLeft, MessageCircle, FileCheck, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";

type RegisterFormData = z.infer<typeof registerSchema>;

const userTypeLabels: Record<UserType, { label: string; description: string; icon: React.ComponentType<{ className?: string }>; features: string[] }> = {
  candidate: {
    label: "Candidat",
    description: "Je recherche un emploi",
    icon: Users,
    features: ["Notifications WhatsApp", "CV en ligne", "Matching intelligent"],
  },
  agency: {
    label: "Agence de Placement",
    description: "Je place des candidats",
    icon: Handshake,
    features: ["Vérification APDP", "Gestion des candidats", "Accès entreprises"],
  },
  company: {
    label: "Entreprise",
    description: "Je recrute des talents",
    icon: Building2,
    features: ["Profil B2B", "Gestion des offres", "Tableau de bord RH"],
  },
};

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const typeParam = searchParams.get("type") as UserType | null;
  const [step, setStep] = useState<"type" | "form">(typeParam ? "form" : "type");
  const [selectedType, setSelectedType] = useState<UserType | null>(typeParam);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      userType: selectedType || "candidate",
      phone: "",
      city: "",
      country: "Sénégal",
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormData) => {
      const { confirmPassword, ...registerData } = data;
      const response = await apiRequest("POST", "/api/auth/register", registerData);
      return response.json();
    },
    onSuccess: (userData) => {
      queryClient.setQueryData(["/api/auth/me"], userData);
      toast({
        title: "Inscription réussie",
        description: "Votre compte a été créé avec succès !",
      });
      // Redirect based on user type
      if (userData.userType === "agency") {
        setLocation("/agency/dashboard");
      } else if (userData.userType === "company") {
        setLocation("/company/dashboard");
      } else {
        setLocation("/dashboard");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur d'inscription",
        description: error.message || "Une erreur est survenue lors de l'inscription",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RegisterFormData) => {
    registerMutation.mutate(data);
  };

  const handleTypeSelect = (type: UserType) => {
    setSelectedType(type);
    form.setValue("userType", type);
    setStep("form");
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-gradient-to-br from-background via-card to-muted">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-md gradient-gold">
              <Briefcase className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight">
              Baara<span className="text-gradient-gold">Match</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold" data-testid="text-register-title">
            Créer un compte
          </h1>
          <p className="text-muted-foreground">
            {step === "type"
              ? "Choisissez votre type de compte"
              : `Inscription en tant que ${userTypeLabels[selectedType!].label}`}
          </p>
        </div>

        {step === "type" ? (
          <div className="grid gap-4">
            {(Object.entries(userTypeLabels) as [UserType, typeof userTypeLabels[UserType]][]).map(
              ([type, { label, description, icon: Icon, features }]) => (
                <Card
                  key={type}
                  className="hover-elevate cursor-pointer"
                  onClick={() => handleTypeSelect(type)}
                  data-testid={`card-type-${type}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{label}</h3>
                        <p className="text-sm text-muted-foreground">{description}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {features.map((feature) => (
                        <span key={feature} className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            )}

            <div className="text-center text-sm mt-4">
              <span className="text-muted-foreground">Déjà un compte ?</span>{" "}
              <Link
                href="/login"
                className="text-primary font-medium hover:underline"
                data-testid="link-login-from-register"
              >
                Se connecter
              </Link>
            </div>
          </div>
        ) : (
          <Card>
            <CardHeader className="pb-4">
              <Button
                variant="ghost"
                size="sm"
                className="w-fit gap-2 -ml-2"
                onClick={() => setStep("type")}
                data-testid="button-back-to-type"
              >
                <ArrowLeft className="h-4 w-4" />
                Changer de type
              </Button>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {selectedType === "candidate"
                            ? "Nom complet"
                            : selectedType === "agency"
                            ? "Nom de l'agence"
                            : "Nom de l'entreprise"}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder={
                              selectedType === "candidate"
                                ? "Votre nom complet"
                                : selectedType === "agency"
                                ? "Nom de votre agence"
                                : "Nom de votre entreprise"
                            }
                            {...field}
                            data-testid="input-register-fullname"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="votre@email.com"
                            {...field}
                            data-testid="input-register-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Téléphone</FormLabel>
                          <FormControl>
                            <Input
                              type="tel"
                              placeholder="+221 77 000 00 00"
                              {...field}
                              data-testid="input-register-phone"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ville</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Dakar"
                              {...field}
                              data-testid="input-register-city"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pays</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-register-country">
                              <SelectValue placeholder="Sélectionnez un pays" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Sénégal">Sénégal</SelectItem>
                            <SelectItem value="Côte d'Ivoire">Côte d'Ivoire</SelectItem>
                            <SelectItem value="Mali">Mali</SelectItem>
                            <SelectItem value="Burkina Faso">Burkina Faso</SelectItem>
                            <SelectItem value="Guinée">Guinée</SelectItem>
                            <SelectItem value="Cameroun">Cameroun</SelectItem>
                            <SelectItem value="Bénin">Bénin</SelectItem>
                            <SelectItem value="Togo">Togo</SelectItem>
                            <SelectItem value="Niger">Niger</SelectItem>
                            <SelectItem value="Mauritanie">Mauritanie</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedType === "candidate" && (
                    <Card className="bg-muted/50 border-dashed">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <MessageCircle className="h-4 w-4 text-green-600" />
                          Intégration WhatsApp
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Recevez les alertes d'offres directement sur WhatsApp. 
                          Assurez-vous que votre numéro de téléphone est lié à WhatsApp.
                        </p>
                        <div className="flex items-center gap-2 pt-2">
                          <Checkbox id="whatsapp-consent" defaultChecked data-testid="checkbox-whatsapp-consent" />
                          <label htmlFor="whatsapp-consent" className="text-xs text-muted-foreground cursor-pointer">
                            J'accepte de recevoir des notifications WhatsApp
                          </label>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {selectedType === "agency" && (
                    <Card className="bg-muted/50 border-dashed">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <ShieldCheck className="h-4 w-4 text-blue-600" />
                          Conformité APDP requise
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Pour opérer en tant qu'agence de placement, vous devrez fournir :
                        </p>
                        <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                          <li>Certificat d'enregistrement APDP</li>
                          <li>Registre de commerce (RCCM)</li>
                          <li>Numéro de licence de placement</li>
                        </ul>
                        <p className="text-xs text-muted-foreground italic pt-1">
                          Ces documents seront demandés après l'inscription pour vérification.
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {selectedType === "company" && (
                    <Card className="bg-muted/50 border-dashed">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <FileCheck className="h-4 w-4 text-primary" />
                          Profil Entreprise B2B
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Informations optionnelles pour la facturation (à compléter après inscription) :
                        </p>
                        <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                          <li>Numéro SIRET / NINEA</li>
                          <li>Numéro de TVA intracommunautaire</li>
                          <li>Adresse de facturation</li>
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mot de passe</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            {...field}
                            data-testid="input-register-password"
                          />
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
                          <Input
                            type="password"
                            placeholder="••••••••"
                            {...field}
                            data-testid="input-register-confirm-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={registerMutation.isPending}
                    data-testid="button-register-submit"
                  >
                    {registerMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Création du compte...
                      </>
                    ) : (
                      "Créer mon compte"
                    )}
                  </Button>
                </form>
              </Form>

              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">Déjà un compte ?</span>{" "}
                <Link
                  href="/login"
                  className="text-primary font-medium hover:underline"
                  data-testid="link-login-from-register-form"
                >
                  Se connecter
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
