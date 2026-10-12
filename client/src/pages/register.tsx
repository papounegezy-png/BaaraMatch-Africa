import { Link, useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { registerSchema, type UserType } from "@shared/schema";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, Users, Building2, Handshake, Loader2, ArrowLeft, MessageCircle, FileCheck, ShieldCheck, Building } from "lucide-react";
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
  admin: {
    label: "Admin",
    description: "Gestion administrateur",
    icon: ShieldCheck,
    features: ["Supervision", "Configuration", "Rapports avancés"],
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

  // "Is this your business?" — checked against prospect accounts an admin
  // may have already created (with a job posted on their behalf) before the
  // real organization registered.
  const [prospectMatch, setProspectMatch] = useState<{ organizationName: string } | null>(null);
  const [claimMode, setClaimMode] = useState(false);
  const [claimPassword, setClaimPassword] = useState("");
  const [claimConfirmPassword, setClaimConfirmPassword] = useState("");

  const matchCheckMutation = useMutation({
    mutationFn: async (data: { userType: "company" | "agency"; phone: string }) => {
      const response = await apiRequest("POST", "/api/organizations/prospect-match", data);
      return response.json();
    },
    onSuccess: (result: { match: boolean; organizationName?: string }) => {
      setProspectMatch(result.match ? { organizationName: result.organizationName ?? "" } : null);
    },
  });

  const claimByContactMutation = useMutation({
    mutationFn: async (data: { userType: "company" | "agency"; phone: string; password: string; confirmPassword: string }) => {
      const response = await apiRequest("POST", "/api/organizations/claim-by-contact", data);
      return response.json();
    },
    onSuccess: (userData) => {
      queryClient.setQueryData(["/api/auth/me"], userData);
      toast({
        title: "Compte récupéré",
        description: "Vous avez repris le contrôle de votre organisation.",
      });
      setLocation(userData.userType === "agency" ? "/agency/dashboard" : "/company/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de réclamer ce compte",
        variant: "destructive",
      });
    },
  });

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
      // No pre-selected country: a Bamako candidate who didn't touch the
      // list used to be saved as "Sénégal". Optional field — never guess.
      country: undefined,
    },
  });

  const checkProspectMatch = () => {
    const phone = form.getValues("phone");
    if ((selectedType === "company" || selectedType === "agency") && phone && phone.length >= 6) {
      matchCheckMutation.mutate({ userType: selectedType, phone });
    }
  };

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
        setLocation("/espace-personnel");
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
    // Company/agency now go through the detailed organization wizard
    // (industry, RCCM, pilot invitation codes) — candidates and admins keep
    // this lighter single-step flow.
    if (type === "company" || type === "agency") {
      setLocation("/register/organisation");
      return;
    }
    setSelectedType(type);
    form.setValue("userType", type);
    setStep("form");
    setProspectMatch(null);
    setClaimMode(false);
  };

  if (claimMode && (selectedType === "company" || selectedType === "agency") && prospectMatch) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-gradient-to-br from-background via-card to-muted">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-md gradient-gold">
                <Briefcase className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold tracking-tight">
                Baara<span className="text-gradient-gold">Match</span>
              </span>
            </Link>
            <div className="w-14 h-14 mx-auto rounded-xl bg-primary/10 flex items-center justify-center">
              <Building className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Réclamer "{prospectMatch.organizationName}"</h1>
            <p className="text-muted-foreground text-sm">
              Cette organisation existe déjà sur BaaraMatch, créée par un administrateur. Définissez un mot de passe pour en prendre le contrôle.
            </p>
          </div>

          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <label htmlFor="claim-contact-password" className="text-sm font-medium">Nouveau mot de passe</label>
                <PasswordInput
                  id="claim-contact-password"
                  autoComplete="new-password"
                  aria-describedby="claim-contact-password-hint"
                  value={claimPassword}
                  onChange={(e) => setClaimPassword(e.target.value)}
                  data-testid="input-claim-contact-password"
                />
                <p id="claim-contact-password-hint" className="text-sm text-muted-foreground">6 caractères minimum.</p>
              </div>
              <div className="space-y-2">
                <label htmlFor="claim-contact-confirm-password" className="text-sm font-medium">Confirmer le mot de passe</label>
                <PasswordInput
                  id="claim-contact-confirm-password"
                  autoComplete="new-password"
                  value={claimConfirmPassword}
                  onChange={(e) => setClaimConfirmPassword(e.target.value)}
                  data-testid="input-claim-contact-confirm-password"
                />
              </div>
              <Button
                className="w-full"
                disabled={claimByContactMutation.isPending || !claimPassword || claimPassword !== claimConfirmPassword}
                onClick={() => claimByContactMutation.mutate({
                  userType: selectedType,
                  phone: form.getValues("phone") ?? "",
                  password: claimPassword,
                  confirmPassword: claimConfirmPassword,
                })}
                data-testid="button-claim-contact-submit"
              >
                {claimByContactMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Récupération...
                  </>
                ) : (
                  "Activer mon compte"
                )}
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => { setClaimMode(false); setProspectMatch(null); }}
                data-testid="button-cancel-claim-contact"
              >
                Ce n'est pas nous — créer un nouveau compte
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
                            autoComplete="email"
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
                              autoComplete="tel"
                              placeholder="+221 77 000 00 00"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => {
                                field.onChange(e);
                                if (prospectMatch) setProspectMatch(null);
                              }}
                              onBlur={(e) => {
                                field.onBlur();
                                checkProspectMatch();
                              }}
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
                              value={field.value ?? ""}
                              data-testid="input-register-city"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {prospectMatch && (selectedType === "company" || selectedType === "agency") && (
                    <Card className="bg-primary/5 border-primary/30">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Building className="h-4 w-4 text-primary" />
                          Est-ce votre entreprise ?
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Une organisation correspondant à ce numéro, « {prospectMatch.organizationName} », existe déjà sur BaaraMatch — créée par un administrateur, avec peut-être déjà une offre publiée en votre nom.
                        </p>
                        <div className="flex gap-2">
                          <Button type="button" size="sm" onClick={() => setClaimMode(true)} data-testid="button-claim-prospect">
                            Oui, réclamer ce compte
                          </Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => setProspectMatch(null)} data-testid="button-dismiss-prospect-match">
                            Non, continuer l'inscription
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pays</FormLabel>
                        <Select
                          value={(field.value as string | undefined) || undefined}
                          onValueChange={(value) => field.onChange(value)}
                        >
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
                          <PasswordInput
                            autoComplete="new-password"
                            placeholder="••••••••"
                            {...field}
                            data-testid="input-register-password"
                            toggleTestId="button-toggle-register-password"
                          />
                        </FormControl>
                        {/* FormControl wires this into the input's aria-describedby. */}
                        <FormDescription>6 caractères minimum.</FormDescription>
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
                          <PasswordInput
                            autoComplete="new-password"
                            placeholder="••••••••"
                            {...field}
                            data-testid="input-register-confirm-password"
                            toggleTestId="button-toggle-register-confirm-password"
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
