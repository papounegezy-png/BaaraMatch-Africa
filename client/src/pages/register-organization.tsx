import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import {
  Briefcase,
  Building2,
  Handshake,
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Ticket,
  Building,
} from "lucide-react";

type AccountType = "company" | "agency";

interface FormState {
  accountType: AccountType | null;
  invitationCode: string;
  email: string;
  phone: string;
  contactName: string;
  password: string;
  confirmPassword: string;
  companyName: string;
  industry: string;
  city: string;
  rccmNumber: string;
}

const initialForm: FormState = {
  accountType: null,
  invitationCode: "",
  email: "",
  phone: "",
  contactName: "",
  password: "",
  confirmPassword: "",
  companyName: "",
  industry: "",
  city: "",
  rccmNumber: "",
};

const stepLabels = ["Type de compte", "Vos informations", "Votre organisation"];

function StepProgress({ current }: { current: number }) {
  return (
    <div className="space-y-2">
      <Progress value={((current + 1) / stepLabels.length) * 100} className="h-1.5" />
      <div className="flex justify-between">
        {stepLabels.map((label, index) => (
          <span
            key={label}
            aria-current={index === current ? "step" : undefined}
            className={`text-xs ${index === current ? "font-semibold text-primary" : "text-muted-foreground"}`}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-xs text-destructive" role="alert" aria-live="polite">
      {message}
    </p>
  );
}

export default function RegisterOrganizationPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCodeField, setShowCodeField] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successPlan, setSuccessPlan] = useState<"standard" | "partner" | null | undefined>(undefined);
  const firstFieldRef = useRef<HTMLInputElement | HTMLButtonElement>(null);

  // Same "is this your business?" check as the Sprint 0 flow — an admin may
  // already have created this organization as a prospect (with a job posted
  // on its behalf) before it registered for real. Preserved here rather
  // than dropped, since company/agency signups now land on this page.
  const [prospectMatch, setProspectMatch] = useState<{ organizationName: string } | null>(null);
  const [claimMode, setClaimMode] = useState(false);
  const [claimPassword, setClaimPassword] = useState("");
  const [claimConfirmPassword, setClaimConfirmPassword] = useState("");

  const matchCheckMutation = useMutation({
    mutationFn: async (data: { userType: AccountType; phone: string }) => {
      const response = await apiRequest("POST", "/api/organizations/prospect-match", data);
      return response.json();
    },
    onSuccess: (result: { match: boolean; organizationName?: string }) => {
      setProspectMatch(result.match ? { organizationName: result.organizationName ?? "" } : null);
    },
  });

  const claimByContactMutation = useMutation({
    mutationFn: async (data: { userType: AccountType; phone: string; password: string; confirmPassword: string }) => {
      const response = await apiRequest("POST", "/api/organizations/claim-by-contact", data);
      return response.json();
    },
    onSuccess: (userData) => {
      queryClient.setQueryData(["/api/auth/me"], userData);
      setLocation(userData.userType === "agency" ? "/agency/dashboard" : "/company/dashboard");
    },
    onError: (error: Error) => {
      setSubmitError(error.message || "Impossible de réclamer ce compte");
    },
  });

  const checkProspectMatch = () => {
    if (form.accountType && form.phone.trim().length >= 6) {
      matchCheckMutation.mutate({ userType: form.accountType, phone: form.phone });
    }
  };

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, [step]);

  const update = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validateStep = (targetStep: number): boolean => {
    const nextErrors: Record<string, string> = {};
    if (targetStep === 0) {
      if (!form.accountType) nextErrors.accountType = "Choisissez un type de compte pour continuer.";
    }
    if (targetStep === 1) {
      if (!/^\S+@\S+\.\S+$/.test(form.email)) nextErrors.email = "Adresse email invalide.";
      if (form.phone.trim().length < 6) nextErrors.phone = "Numéro de téléphone invalide.";
      if (!form.contactName.trim()) nextErrors.contactName = "Le nom du contact est requis.";
      if (form.password.length < 6) nextErrors.password = "6 caractères minimum.";
      if (form.confirmPassword !== form.password) nextErrors.confirmPassword = "Les mots de passe ne correspondent pas.";
    }
    if (targetStep === 2) {
      if (!form.companyName.trim()) nextErrors.companyName = "La raison sociale est requise.";
      if (!form.industry.trim()) nextErrors.industry = "Le secteur d'activité est requis.";
      if (!form.city.trim()) nextErrors.city = "La ville est requise.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const goNext = () => {
    if (validateStep(step)) setStep((s) => Math.min(s + 1, stepLabels.length - 1));
  };
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const registerMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/register-organization", {
        accountType: form.accountType,
        email: form.email,
        phone: form.phone,
        contactName: form.contactName,
        password: form.password,
        companyName: form.companyName,
        industry: form.industry,
        city: form.city,
        rccmNumber: form.rccmNumber.trim() || undefined,
        invitationCode: form.invitationCode.trim() || undefined,
      });
      return response.json();
    },
    onSuccess: (userData) => {
      queryClient.setQueryData(["/api/auth/me"], userData);
      setSuccessPlan(userData.obtainedPlan ?? null);
    },
    onError: (error: Error) => {
      const message = error.message || "Une erreur est survenue lors de l'inscription.";
      // A rejected invitation code gets its own field-level message, and
      // sends the candidate back to step 1 where the code field lives —
      // not a generic failure they have to guess the cause of.
      if (message.toLowerCase().includes("code d'invitation")) {
        setErrors((prev) => ({ ...prev, invitationCode: message }));
        setShowCodeField(true);
        setStep(0);
      } else {
        setSubmitError(message);
      }
    },
  });

  const handleSubmit = () => {
    setSubmitError(null);
    if (!validateStep(2)) return;
    registerMutation.mutate();
  };

  if (claimMode && prospectMatch && form.accountType) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-gradient-to-br from-background via-card to-muted">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
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
                <Label htmlFor="claim-org-password">Nouveau mot de passe</Label>
                <PasswordInput id="claim-org-password" autoComplete="new-password" aria-describedby="claim-org-password-hint" value={claimPassword} onChange={(e) => setClaimPassword(e.target.value)} data-testid="input-claim-org-password" />
                <p id="claim-org-password-hint" className="text-xs text-muted-foreground">6 caractères minimum.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="claim-org-confirm-password">Confirmer le mot de passe</Label>
                <PasswordInput id="claim-org-confirm-password" autoComplete="new-password" value={claimConfirmPassword} onChange={(e) => setClaimConfirmPassword(e.target.value)} data-testid="input-claim-org-confirm-password" />
              </div>
              {submitError && <p className="text-sm text-destructive" role="alert">{submitError}</p>}
              <Button
                className="w-full"
                disabled={claimByContactMutation.isPending || !claimPassword || claimPassword !== claimConfirmPassword}
                onClick={() => claimByContactMutation.mutate({ userType: form.accountType!, phone: form.phone, password: claimPassword, confirmPassword: claimConfirmPassword })}
                data-testid="button-claim-org-submit"
              >
                {claimByContactMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Activer mon compte
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => { setClaimMode(false); setProspectMatch(null); }} data-testid="button-cancel-claim-org">
                Ce n'est pas nous — continuer l'inscription
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (successPlan !== undefined) {
    const isPartner = successPlan === "partner";
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-gradient-to-br from-background via-card to-muted">
        <Card className="max-w-md w-full">
          <CardContent className="pt-10 pb-8 px-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-xl font-bold" data-testid="text-register-success-title">
              {isPartner
                ? "Bienvenue ! Votre compte Agence Partenaire est actif avec 3 mois d'essai gratuit."
                : "Bienvenue ! Votre compte est prêt."}
            </h1>
            <Button
              className="w-full"
              onClick={() => setLocation(form.accountType === "agency" ? "/agency/dashboard" : "/company/dashboard")}
              data-testid="button-go-to-dashboard"
            >
              Accéder à mon espace
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-gradient-to-br from-background via-card to-muted">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-md gradient-gold">
              <Briefcase className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight">
              Baara<span className="text-gradient-gold">Match</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold" data-testid="text-register-org-title">Créer un compte organisation</h1>
        </div>

        <StepProgress current={step} />

        <Card>
          <CardContent className="p-6 space-y-4">
            {step === 0 && (
              <div className="space-y-4">
                <div className="grid gap-3">
                  <button
                    ref={firstFieldRef as React.RefObject<HTMLButtonElement>}
                    type="button"
                    onClick={() => update("accountType", "company")}
                    className={`text-left rounded-lg border-2 p-4 hover-elevate transition-colors ${form.accountType === "company" ? "border-primary bg-primary/5" : "border-border"}`}
                    data-testid="card-account-type-company"
                    aria-pressed={form.accountType === "company"}
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="h-6 w-6 text-primary shrink-0" />
                      <div>
                        <p className="font-semibold">Entreprise</p>
                        <p className="text-sm text-muted-foreground">Publiez vos offres et gérez vos recrutements</p>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => update("accountType", "agency")}
                    className={`text-left rounded-lg border-2 p-4 hover-elevate transition-colors ${form.accountType === "agency" ? "border-primary bg-primary/5" : "border-border"}`}
                    data-testid="card-account-type-agency"
                    aria-pressed={form.accountType === "agency"}
                  >
                    <div className="flex items-center gap-3">
                      <Handshake className="h-6 w-6 text-primary shrink-0" />
                      <div>
                        <p className="font-semibold">Agence de placement</p>
                        <p className="text-sm text-muted-foreground">Gérez vos missions, votre portefeuille de clients et vos candidatures</p>
                      </div>
                    </div>
                  </button>
                </div>
                <FieldError message={errors.accountType} />

                {!showCodeField ? (
                  <button
                    type="button"
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1.5"
                    onClick={() => setShowCodeField(true)}
                    data-testid="button-reveal-invitation-code"
                  >
                    <Ticket className="h-3.5 w-3.5" />
                    J'ai un code d'invitation
                  </button>
                ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor="invitation-code">Code d'invitation</Label>
                    <Input
                      id="invitation-code"
                      placeholder="PILOTE-XXXX"
                      value={form.invitationCode}
                      onChange={(e) => update("invitationCode", e.target.value.toUpperCase())}
                      data-testid="input-invitation-code"
                    />
                    <FieldError message={errors.invitationCode} />
                  </div>
                )}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="org-email">Email</Label>
                  <Input
                    id="org-email"
                    ref={firstFieldRef as React.RefObject<HTMLInputElement>}
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    data-testid="input-org-email"
                  />
                  <FieldError message={errors.email} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="org-phone">Téléphone</Label>
                  <Input
                    id="org-phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+221 77 000 00 00"
                    value={form.phone}
                    onChange={(e) => { update("phone", e.target.value); setProspectMatch(null); }}
                    onBlur={checkProspectMatch}
                    data-testid="input-org-phone"
                  />
                  <FieldError message={errors.phone} />
                </div>

                {prospectMatch && (
                  <Card className="bg-primary/5 border-primary/30">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Building className="h-4 w-4 text-primary" />
                        Est-ce votre entreprise ?
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Une organisation correspondant à ce numéro, « {prospectMatch.organizationName} », existe déjà sur BaaraMatch — créée par un administrateur.
                      </p>
                      <div className="flex gap-2">
                        <Button type="button" size="sm" onClick={() => setClaimMode(true)} data-testid="button-claim-prospect-org">
                          Oui, réclamer ce compte
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setProspectMatch(null)} data-testid="button-dismiss-prospect-org">
                          Non, continuer l'inscription
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="org-contact-name">Nom du contact</Label>
                  <Input
                    id="org-contact-name"
                    value={form.contactName}
                    onChange={(e) => update("contactName", e.target.value)}
                    data-testid="input-org-contact-name"
                  />
                  <FieldError message={errors.contactName} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="org-password">Mot de passe</Label>
                  <PasswordInput
                    id="org-password"
                    autoComplete="new-password"
                    aria-describedby="org-password-hint"
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    data-testid="input-org-password"
                    toggleTestId="button-toggle-password"
                  />
                  <p id="org-password-hint" className="text-xs text-muted-foreground">6 caractères minimum.</p>
                  <FieldError message={errors.password} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="org-confirm-password">Confirmer le mot de passe</Label>
                  <PasswordInput
                    id="org-confirm-password"
                    autoComplete="new-password"
                    value={form.confirmPassword}
                    onChange={(e) => update("confirmPassword", e.target.value)}
                    data-testid="input-org-confirm-password"
                    toggleTestId="button-toggle-confirm-password"
                  />
                  <FieldError message={errors.confirmPassword} />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="org-company-name">Raison sociale</Label>
                  <Input
                    id="org-company-name"
                    ref={firstFieldRef as React.RefObject<HTMLInputElement>}
                    value={form.companyName}
                    onChange={(e) => update("companyName", e.target.value)}
                    data-testid="input-org-company-name"
                  />
                  <FieldError message={errors.companyName} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="org-industry">Secteur d'activité</Label>
                  <Input
                    id="org-industry"
                    value={form.industry}
                    onChange={(e) => update("industry", e.target.value)}
                    data-testid="input-org-industry"
                  />
                  <FieldError message={errors.industry} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="org-city">Ville</Label>
                  <Input
                    id="org-city"
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                    data-testid="input-org-city"
                  />
                  <FieldError message={errors.city} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="org-rccm">RCCM <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
                  <Input
                    id="org-rccm"
                    value={form.rccmNumber}
                    onChange={(e) => update("rccmNumber", e.target.value)}
                    data-testid="input-org-rccm"
                  />
                </div>
                {submitError && (
                  <p className="text-sm text-destructive" role="alert" aria-live="polite" data-testid="text-submit-error">
                    {submitError}
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-between pt-2">
              {step > 0 ? (
                <Button type="button" variant="ghost" className="gap-2" onClick={goBack} data-testid="button-wizard-back">
                  <ArrowLeft className="h-4 w-4" />
                  Précédent
                </Button>
              ) : <span />}

              {step < stepLabels.length - 1 ? (
                <Button type="button" className="gap-2" onClick={goNext} data-testid="button-wizard-next">
                  Suivant
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={registerMutation.isPending}
                  data-testid="button-wizard-submit"
                >
                  {registerMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Créer mon compte
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">Déjà un compte ?</span>{" "}
          <Link href="/login" className="text-primary font-medium hover:underline" data-testid="link-login-from-register-org">
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}
