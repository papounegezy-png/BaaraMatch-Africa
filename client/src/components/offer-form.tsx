import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { RichTextEditor } from "@/components/rich-text-editor";
import { SkillsTagInput } from "@/components/skills-tag-input";
import { JobPreviewCard } from "@/components/job-preview-card";
import { ChevronRight, Clock, Lightbulb, Loader2, RotateCcw } from "lucide-react";
import type { JobPosting } from "@shared/schema";
import { formatJobType } from "@/lib/job-type-labels";

// French labor-law contract categories (CDI/CDD/etc.) — the sole vocabulary
// this form writes. Older postings (created before this form existed) may
// still carry a legacy value like "full-time" — see job-type-labels.ts for
// how that's displayed, and the SelectContent below for how it's kept
// selectable (not silently dropped) when editing one of those.
export const contractTypeOptions = [
  { value: "cdi", label: "CDI" },
  { value: "cdd", label: "CDD" },
  { value: "interim", label: "Intérim" },
  { value: "stage", label: "Stage" },
  { value: "journalier", label: "Journalier" },
  { value: "prestation", label: "Prestation" },
];

export const jobCategoryOptions = [
  "Informatique & Tech",
  "Finance & Comptabilité",
  "Assurances",
  "Marketing & Communication",
  "Ressources Humaines",
  "Commercial & Vente",
  "Administration",
  "Santé",
  "Éducation",
  "Industrie",
  "Mines",
  "Production",
  "BTP & Construction",
  "Hôtellerie & Restauration",
  "Transport & Logistique",
  "Agriculture",
  "Autre",
];

// Same values as missions-management.tsx's educationLevels — kept aligned
// deliberately, unlike contractTypeOptions above.
export const educationLevelOptions = [
  { value: "none", label: "Sans diplôme" },
  { value: "bac", label: "Baccalauréat" },
  { value: "bac+2", label: "Bac+2 (BTS, DUT)" },
  { value: "bac+3", label: "Bac+3 (Licence)" },
  { value: "bac+5", label: "Bac+5 (Master)" },
  { value: "bac+8", label: "Doctorat" },
];

export type OfferFormValue = {
  title: string;
  contractType: string;
  category: string;
  educationLevel: string;
  location: string;
  salaryMin: string;
  salaryMax: string;
  descriptionHtml: string;
  skills: string[];
  visibleToAgencies: boolean;
  acceptsPlatformApplications: boolean;
  applicationDeadline: string;
  startDate: string;
  isRemote: boolean;
  isUrgent: boolean;
  positions: string;
};

export function emptyOfferFormValue(): OfferFormValue {
  return {
    title: "",
    contractType: "cdi",
    category: "",
    educationLevel: "",
    location: "",
    salaryMin: "",
    salaryMax: "",
    descriptionHtml: "",
    skills: [],
    visibleToAgencies: true,
    acceptsPlatformApplications: true,
    applicationDeadline: "",
    startDate: "",
    isRemote: false,
    isUrgent: false,
    positions: "1",
  };
}

// Converts a persisted job row back into form state — the mirror of what
// each caller's buildJobPayload sends. Shared here (not duplicated per
// caller) so the recruiter, agency, and admin edit screens all read an
// existing offer back into the form the exact same way.
export function mapJobPostingToOfferFormValue(job: JobPosting): OfferFormValue {
  return {
    title: job.title,
    contractType: job.jobType,
    category: job.category ?? "",
    educationLevel: job.educationLevel ?? "",
    location: job.location,
    salaryMin: job.salaryMin != null ? String(job.salaryMin) : "",
    salaryMax: job.salaryMax != null ? String(job.salaryMax) : "",
    descriptionHtml: job.description,
    skills: job.requiredSkills ?? [],
    visibleToAgencies: job.visibleToAgencies ?? true,
    acceptsPlatformApplications: job.acceptsPlatformApplications ?? true,
    applicationDeadline: job.applicationDeadline ? new Date(job.applicationDeadline).toISOString().slice(0, 10) : "",
    startDate: job.startDate ? new Date(job.startDate).toISOString().slice(0, 10) : "",
    isRemote: job.isRemote ?? false,
    isUrgent: job.isUrgent ?? false,
    positions: String(job.positions ?? 1),
  };
}

function formatThousands(digits: string): string {
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

type FieldErrors = Partial<Record<"title" | "contractType" | "category" | "location" | "descriptionHtml" | "salaryMax", string>>;

const fieldInputId: Record<keyof FieldErrors, string> = {
  title: "offer-title",
  contractType: "offer-contract-type",
  category: "offer-category",
  location: "offer-location",
  descriptionHtml: "rich-text-editor",
  salaryMax: "offer-salary-max",
};
const fieldOrder: (keyof FieldErrors)[] = ["title", "contractType", "category", "location", "descriptionHtml", "salaryMax"];

export type OfferSaveResult = { id: string; status: "PUBLIEE" | "EN_REVISION" };

/**
 * The job-posting form — used as-is by the recruiter screen (company/agency
 * posting their own offer) and the admin "créer une offre pour le compte
 * de..." screen. Validation and state management live entirely here; only
 * the organization context and the actual persistence call are injected by
 * the caller, so the two screens never duplicate this logic between them.
 */
export function OfferForm({
  organization,
  initialData,
  isLoadingInitialData = false,
  onSaveDraft,
  onPublish,
  backHref,
  backLabel = "Offres",
  mode = "create",
  draftId: initialDraftId = null,
}: {
  organization: { name: string; userType: "company" | "agency"; isFreemium?: boolean };
  initialData?: OfferFormValue;
  isLoadingInitialData?: boolean;
  // Both receive the id of the draft this form is working on (null until
  // one exists), so saving twice or publishing after a draft updates that
  // same job instead of creating a duplicate. onSaveDraft returns the id of
  // the job it created/updated.
  onSaveDraft?: (data: OfferFormValue, draftId: string | null) => Promise<string | void>;
  onPublish: (data: OfferFormValue, draftId: string | null) => Promise<OfferSaveResult>;
  // An existing offline job being continued (opened from the offer list).
  draftId?: string | null;
  backHref?: string;
  backLabel?: string;
  // "edit" swaps copy (title, button labels, success message) for modifying
  // an already-published offer and drops the "brouillon" concept, which
  // doesn't apply to a job that's already live.
  mode?: "create" | "edit";
}) {
  const isEditMode = mode === "edit";
  const { toast } = useToast();
  const [value, setValue] = useState<OfferFormValue>(initialData ?? emptyOfferFormValue());
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishResult, setPublishResult] = useState<OfferSaveResult | null>(null);
  const [draftId, setDraftId] = useState<string | null>(initialDraftId);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the confirmation so screen reader users aren't left on a
  // form that just disappeared without any announcement of what happened.
  useEffect(() => {
    if (publishResult) {
      successHeadingRef.current?.focus();
    }
  }, [publishResult]);

  // Only sync once the real data arrives — RichTextEditor must never
  // initialize on an empty draft and then get overwritten a moment later.
  useEffect(() => {
    if (!isLoadingInitialData && initialData) {
      setValue(initialData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingInitialData]);

  const set = <K extends keyof OfferFormValue>(key: K, next: OfferFormValue[K]) => {
    setValue((prev) => ({ ...prev, [key]: next }));
    if (errors[key as keyof FieldErrors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!value.title.trim()) next.title = "Le titre du poste est obligatoire.";
    if (!value.contractType) next.contractType = "Le type de contrat est obligatoire.";
    if (!value.category.trim()) next.category = "Le métier est obligatoire.";
    if (!value.location.trim()) next.location = "La ville est obligatoire.";
    if (stripHtml(value.descriptionHtml).length < 20) {
      next.descriptionHtml = "La description doit contenir au moins quelques phrases avant publication.";
    }
    const min = parseInt(value.salaryMin, 10);
    const max = parseInt(value.salaryMax, 10);
    if (!Number.isNaN(min) && !Number.isNaN(max) && max < min) {
      next.salaryMax = "Le salaire maximum doit être supérieur ou égal au salaire minimum.";
    }
    return next;
  };

  const focusFirstError = (foundErrors: FieldErrors) => {
    const firstKey = fieldOrder.find((key) => foundErrors[key]);
    if (!firstKey) return;
    const target =
      firstKey === "descriptionHtml"
        ? document.querySelector<HTMLElement>('[data-testid="rich-text-editor-content"] .ProseMirror')
        : document.getElementById(fieldInputId[firstKey]);
    target?.focus();
  };

  const publishLabel = isEditMode
    ? "Enregistrer les modifications"
    : organization.isFreemium
    ? "Soumettre pour validation"
    : "Publier l'offre";

  const handleSaveDraft = async () => {
    if (!onSaveDraft) return;
    setIsSavingDraft(true);
    try {
      const savedId = await onSaveDraft(value, draftId);
      if (savedId) setDraftId(savedId);
      toast({ title: "Brouillon enregistré", description: "Il n'est pas visible par les candidats tant que vous ne l'avez pas publié." });
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Impossible d'enregistrer le brouillon",
        variant: "destructive",
      });
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handlePublish = async () => {
    const foundErrors = validate();
    setErrors(foundErrors);
    if (Object.keys(foundErrors).length > 0) {
      focusFirstError(foundErrors);
      return;
    }
    setIsPublishing(true);
    setPublishError(null);
    try {
      const result = await onPublish(value, draftId);
      setPublishResult(result);
    } catch (err) {
      // Form content is never cleared on failure — the recruiter can just
      // retry without retyping anything.
      setPublishError(err instanceof Error ? err.message : "Une erreur est survenue lors de la publication.");
    } finally {
      setIsPublishing(false);
    }
  };

  if (publishResult) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-4" data-testid="offer-form-success" role="status">
        <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
          <ChevronRight className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-xl font-bold" tabIndex={-1} ref={successHeadingRef}>
          {isEditMode ? "Modifications enregistrées" : publishResult.status === "PUBLIEE" ? "Offre publiée" : "Offre soumise pour validation"}
        </h2>
        <p className="text-muted-foreground">
          {isEditMode
            ? "L'offre a été mise à jour."
            : publishResult.status === "PUBLIEE"
            ? "L'offre est visible immédiatement par les candidats."
            : "Votre offre a bien été reçue. L'équipe BaaraMatch l'examinera sous 24h maximum ; elle sera visible par les candidats dès sa validation."}
        </p>
        {!isEditMode && publishResult.status === "EN_REVISION" && (
          <p className="text-sm text-muted-foreground" data-testid="text-offer-review-followup">
            Vous recevrez une notification dans BaaraMatch dès qu'elle sera validée ou si elle n'est pas retenue. Son statut reste consultable à tout moment dans « {backLabel} ».
          </p>
        )}
        {backHref && (
          <Link href={backHref}>
            <Button data-testid="button-offer-success-back">Retour à {backLabel.toLowerCase()}</Button>
          </Link>
        )}
      </div>
    );
  }

  if (isLoadingInitialData) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid lg:grid-cols-[65%_1fr] gap-6">
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <nav className="text-sm text-muted-foreground mb-1" aria-label="Fil d'ariane">
            {backHref ? <Link href={backHref}>{backLabel}</Link> : backLabel} / {isEditMode ? "Modifier l'offre" : "Nouvelle offre"}
          </nav>
          <h1 className="text-2xl font-bold">{isEditMode ? "Modifier l'offre" : "Publier une offre"}</h1>
          {/* Said before submitting, not only on the success screen: a
              Standard agency's offer goes through moderation (POST /api/jobs). */}
          {organization.isFreemium && !isEditMode && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground" data-testid="text-offer-review-delay">
              <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
              Votre offre sera examinée par l'équipe BaaraMatch sous 24h maximum avant d'être visible des candidats.
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {onSaveDraft && !isEditMode && (
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isSavingDraft || isPublishing}
              data-testid="button-save-draft"
            >
              {isSavingDraft ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Enregistrer le brouillon
            </Button>
          )}
          <Button onClick={handlePublish} disabled={isPublishing || isSavingDraft} data-testid="button-publish-offer">
            {isPublishing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {publishLabel}
          </Button>
        </div>
      </div>

      {publishError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm"
          data-testid="text-publish-error"
        >
          <span className="text-destructive">{publishError}</span>
          <Button size="sm" variant="outline" onClick={handlePublish} className="gap-1.5 flex-shrink-0">
            <RotateCcw className="h-3.5 w-3.5" />
            Réessayer
          </Button>
        </div>
      )}

      <div className="grid lg:grid-cols-[65%_1fr] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="offer-title">Titre du poste</Label>
                <Input
                  id="offer-title"
                  value={value.title}
                  onChange={(e) => set("title", e.target.value)}
                  aria-required="true"
                  aria-invalid={!!errors.title}
                  aria-describedby={errors.title ? "offer-title-error" : undefined}
                  data-testid="input-offer-title"
                />
                {errors.title && (
                  <p id="offer-title-error" role="alert" aria-live="polite" className="text-sm text-destructive">
                    {errors.title}
                  </p>
                )}
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="offer-contract-type">Type de contrat</Label>
                  <Select value={value.contractType} onValueChange={(v) => set("contractType", v)}>
                    <SelectTrigger id="offer-contract-type" data-testid="select-offer-contract-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {contractTypeOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                      {value.contractType && !contractTypeOptions.some((opt) => opt.value === value.contractType) && (
                        <SelectItem value={value.contractType}>
                          {formatJobType(value.contractType)}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="offer-category">Métier</Label>
                  <Select value={value.category} onValueChange={(v) => set("category", v)}>
                    <SelectTrigger
                      id="offer-category"
                      aria-required="true"
                      aria-invalid={!!errors.category}
                      aria-describedby={errors.category ? "offer-category-error" : undefined}
                      data-testid="select-offer-category"
                    >
                      <SelectValue placeholder="Sélectionnez un métier" />
                    </SelectTrigger>
                    <SelectContent>
                      {jobCategoryOptions.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && (
                    <p id="offer-category-error" role="alert" aria-live="polite" className="text-sm text-destructive">
                      {errors.category}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="offer-location">Ville</Label>
                  <Input
                    id="offer-location"
                    value={value.location}
                    onChange={(e) => set("location", e.target.value)}
                    aria-required="true"
                    aria-invalid={!!errors.location}
                    aria-describedby={errors.location ? "offer-location-error" : undefined}
                    data-testid="input-offer-location"
                  />
                  {errors.location && (
                    <p id="offer-location-error" role="alert" aria-live="polite" className="text-sm text-destructive">
                      {errors.location}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="offer-salary-min">Salaire minimum (FCFA)</Label>
                  <Input
                    id="offer-salary-min"
                    inputMode="numeric"
                    value={formatThousands(value.salaryMin)}
                    onChange={(e) => set("salaryMin", e.target.value.replace(/\D/g, ""))}
                    data-testid="input-offer-salary-min"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="offer-salary-max">Salaire maximum (FCFA)</Label>
                  <Input
                    id="offer-salary-max"
                    inputMode="numeric"
                    value={formatThousands(value.salaryMax)}
                    onChange={(e) => set("salaryMax", e.target.value.replace(/\D/g, ""))}
                    aria-invalid={!!errors.salaryMax}
                    aria-describedby={errors.salaryMax ? "offer-salary-max-error" : undefined}
                    data-testid="input-offer-salary-max"
                  />
                  {errors.salaryMax && (
                    <p id="offer-salary-max-error" role="alert" aria-live="polite" className="text-sm text-destructive">
                      {errors.salaryMax}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="offer-education-level">Niveau d'études</Label>
                  <Select value={value.educationLevel} onValueChange={(v) => set("educationLevel", v)}>
                    <SelectTrigger id="offer-education-level" data-testid="select-offer-education-level">
                      <SelectValue placeholder="Non spécifié" />
                    </SelectTrigger>
                    <SelectContent>
                      {educationLevelOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Description du poste</CardTitle>
            </CardHeader>
            <CardContent>
              <RichTextEditor value={value.descriptionHtml} onChange={(html) => set("descriptionHtml", html)} />
              {errors.descriptionHtml && (
                <p role="alert" aria-live="polite" className="text-sm text-destructive mt-2">
                  {errors.descriptionHtml}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Compétences requises</CardTitle>
            </CardHeader>
            <CardContent>
              <SkillsTagInput value={value.skills} onChange={(skills) => set("skills", skills)} />
            </CardContent>
          </Card>

        </div>

        <div className="space-y-6 lg:sticky lg:top-20 min-w-0">
          <JobPreviewCard
            title={value.title}
            organizationName={organization.name}
            location={value.location}
            jobType={value.contractType}
            skills={value.skills}
          />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Paramètres de publication</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label htmlFor="offer-accepts-platform-applications">Candidature sur la plateforme</Label>
                  <p className="text-sm text-muted-foreground">Les candidats peuvent postuler directement depuis BaaraMatch</p>
                </div>
                <Switch
                  id="offer-accepts-platform-applications"
                  checked={value.acceptsPlatformApplications}
                  onCheckedChange={(checked) => set("acceptsPlatformApplications", checked)}
                  data-testid="switch-offer-accepts-platform-applications"
                />
              </div>

              {organization.userType === "company" && (
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="offer-visible-agencies" className="flex-1">
                    Visible aux agences partenaires
                  </Label>
                  <Switch
                    id="offer-visible-agencies"
                    checked={value.visibleToAgencies}
                    onCheckedChange={(checked) => set("visibleToAgencies", checked)}
                    data-testid="switch-offer-visible-agencies"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="offer-application-deadline">Date limite de candidature</Label>
                <Input
                  id="offer-application-deadline"
                  type="date"
                  value={value.applicationDeadline}
                  onChange={(e) => set("applicationDeadline", e.target.value)}
                  data-testid="input-offer-application-deadline"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="offer-start-date">Date de début souhaitée</Label>
                <Input
                  id="offer-start-date"
                  type="date"
                  value={value.startDate}
                  onChange={(e) => set("startDate", e.target.value)}
                  data-testid="input-offer-start-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="offer-positions">Nombre de postes à pourvoir</Label>
                <Input
                  id="offer-positions"
                  type="number"
                  min={1}
                  value={value.positions}
                  onChange={(e) => set("positions", e.target.value.replace(/\D/g, ""))}
                  data-testid="input-offer-positions"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label htmlFor="offer-is-remote">Télétravail possible</Label>
                  <p className="text-sm text-muted-foreground">Le poste peut être exercé à distance</p>
                </div>
                <Switch
                  id="offer-is-remote"
                  checked={value.isRemote}
                  onCheckedChange={(checked) => set("isRemote", checked)}
                  data-testid="switch-offer-is-remote"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label htmlFor="offer-is-urgent">Recrutement urgent</Label>
                  <p className="text-sm text-muted-foreground">Marquer comme prioritaire</p>
                </div>
                <Switch
                  id="offer-is-urgent"
                  checked={value.isUrgent}
                  onCheckedChange={(checked) => set("isUrgent", checked)}
                  data-testid="switch-offer-is-urgent"
                />
              </div>
            </CardContent>
          </Card>

          <div
            className="rounded-lg border px-4 py-3 text-sm flex gap-2.5"
            style={{ backgroundColor: "#FBF2DC", borderColor: "#E8D9AD", color: "#7A5A0C" }}
            data-testid="card-offer-tip"
          >
            <Lightbulb className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>Une description structurée (Missions / Profil recherché) améliore la précision du matching IA.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
