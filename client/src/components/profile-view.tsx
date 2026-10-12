import { useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Award,
  Briefcase,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  DollarSign,
  Download,
  Edit,
  Eye,
  FileText,
  GraduationCap,
  Lightbulb,
  Loader2,
  MapPin,
  Mic,
  Phone,
  Sparkles,
  User,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { User as AppUser, CandidateProfile } from "@shared/schema";

interface ProfileViewProps {
  user: AppUser;
  onEdit: () => void;
}

export function ProfileView({ user, onEdit }: ProfileViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: profileData } = useQuery<{ user: AppUser; profile: CandidateProfile | null }>({
    queryKey: ["/api/profile"],
  });

  const profile = profileData?.profile;
  const currentUser = profileData?.user || user;

  const parseArrayField = <T,>(value: unknown): T[] => {
    if (Array.isArray(value)) return value as T[];
    if (value && typeof value === "object") {
      const objectValues = Object.values(value as Record<string, unknown>);
      return Array.isArray(objectValues) ? (objectValues as T[]) : [];
    }
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed as T[];
        if (parsed && typeof parsed === "object") {
          return Object.values(parsed as Record<string, unknown>) as T[];
        }
      } catch {
        return [];
      }
    }
    return [];
  };

  const normalizeString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

  // Education: ensure year and institution display robustly
  const educationEntries = parseArrayField<any>(profile?.educationEntries)
    .map((entry) => ({
      id: normalizeString(entry?.id) || `${Math.random().toString(16).slice(2, 8)}`,
      level: normalizeString(entry?.level),
      institution:
        normalizeString(entry?.institution) ||
        normalizeString(entry?.school) ||
        normalizeString(entry?.university),
      degree: normalizeString(entry?.degree),
      startYear: normalizeString(entry?.startYear),
      endYear: normalizeString(entry?.endYear),
    }))
    .filter((entry) => entry.level || entry.institution || entry.degree || entry.startYear || entry.endYear);

  // Robust fallback for certifications (legacy text or malformed)
  let certificationEntries = parseArrayField<any>(profile?.certifications)
    .map((entry) => ({
      id: normalizeString(entry?.id) || `${Math.random().toString(16).slice(2, 8)}`,
      name: normalizeString(entry?.name),
      issuer: normalizeString(entry?.issuer),
      obtainedDate: normalizeString(entry?.obtainedDate),
    }))
    .filter((entry) => entry.name || entry.issuer || entry.obtainedDate);

  // If no structured certifications but legacy text exists, add as fallback
  if (certificationEntries.length === 0 && typeof profile?.certifications === "string" && profile.certifications.trim()) {
    certificationEntries = [
      {
        id: `${Math.random().toString(16).slice(2, 8)}`,
        name: profile.certifications.trim(),
        issuer: "",
        obtainedDate: "",
      },
    ];
  }

  // If still empty, check for legacy field 'certification' (singular)
  if (certificationEntries.length === 0 && typeof profile?.certification === "string" && profile.certification.trim()) {
    certificationEntries = [
      {
        id: `${Math.random().toString(16).slice(2, 8)}`,
        name: profile.certification.trim(),
        issuer: "",
        obtainedDate: "",
      },
    ];
  }

  const experienceEntries = parseArrayField<any>(profile?.experiences)
    .map((entry) => ({
      id: normalizeString(entry?.id) || `${Math.random().toString(16).slice(2, 8)}`,
      position: normalizeString(entry?.position),
      company: normalizeString(entry?.company),
      contractType: normalizeString(entry?.contractType),
      startDate: normalizeString(entry?.startDate),
      endDate: normalizeString(entry?.endDate),
      isCurrent: Boolean(entry?.isCurrent),
      missionDescription: normalizeString(entry?.missionDescription),
    }))
    .filter((entry) => entry.position || entry.company || entry.contractType || entry.startDate || entry.endDate || entry.missionDescription);


  // Control: Only one current experience allowed
  const currentExperiences = experienceEntries.filter((e) => e.isCurrent);
  const hasMultipleCurrent = currentExperiences.length > 1;

  const sortedExperienceEntries = [...experienceEntries].sort((a, b) => {
    const aCurrent = a?.isCurrent ? 1 : 0;
    const bCurrent = b?.isCurrent ? 1 : 0;
    if (aCurrent !== bCurrent) return bCurrent - aCurrent;
    return String(b?.startDate || "").localeCompare(String(a?.startDate || ""));
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: async (imageBase64: string) => {
      const response = await apiRequest("POST", "/api/avatar/upload", { imageBase64 });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({
        title: "Photo mise a jour",
        description: "Votre photo de profil a ete enregistree.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de telecharger la photo.",
        variant: "destructive",
      });
    },
  });

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille maximum est de 2 Mo.",
        variant: "destructive",
      });
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Format invalide",
        description: "Veuillez selectionner une image.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      uploadAvatarMutation.mutate(base64);
      setIsUploading(false);
    };
    reader.onerror = () => {
      toast({
        title: "Erreur",
        description: "Impossible de lire le fichier.",
        variant: "destructive",
      });
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const handleViewResume = () => {
    if (!profile?.resumeUrl) return;
    window.open(profile.resumeUrl, "_blank", "noopener,noreferrer");
  };

  const handleDownloadResume = () => {
    if (!profile?.resumeUrl) return;
    const link = document.createElement("a");
    link.href = profile.resumeUrl;
    link.download = profile.resumeFileName || "cv-candidat";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "-";
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(`${value}T00:00:00`).toLocaleDateString("fr-FR");
    }
    return value;
  };

  const completionChecks = [
    !!currentUser.fullName,
    !!currentUser.phone,
    !!currentUser.city,
    !!profile?.title,
    !!profile?.bio,
    !!profile?.experience,
    educationEntries.length > 0 || !!profile?.education,
    certificationEntries.length > 0,
    !!profile?.resumeUrl,
    !!profile?.skills?.length,
  ];

  const profileCompletion = Math.round((completionChecks.filter(Boolean).length / completionChecks.length) * 100);
  const experienceCount = sortedExperienceEntries.length > 0 ? sortedExperienceEntries.length : profile?.experience ? 1 : 0;
  const educationCount = educationEntries.length > 0 ? educationEntries.length : profile?.education ? 1 : 0;
  const certificationCount = certificationEntries.length;

  const suggestions = useMemo(() => {
    const items: string[] = [];
    if (!profile?.title) items.push("Ajoutez un titre de poste cible.");
    if (!profile?.bio) items.push("Ajoutez une breve presentation professionnelle.");
    if (!educationEntries.length && !profile?.education) items.push("Renseignez au moins une formation.");
    if (!certificationEntries.length) items.push("Ajoutez vos certifications pour renforcer le profil.");
    if (!profile?.resumeUrl) items.push("Importez votre CV PDF pour etre visible des recruteurs.");
    if (!profile?.skills?.length) items.push("Ajoutez des competences cles.");
    return items;
  }, [profile, educationEntries.length, certificationEntries.length]);

  const activity = [
    profile?.updatedAt ? `Profil mis a jour le ${new Date(profile.updatedAt).toLocaleDateString("fr-FR")}` : "Profil jamais mis a jour",
    profile?.resumeUrl ? "CV disponible" : "CV non ajoute",
    experienceEntries.length > 0 ? `${experienceEntries.length} experience(s) ajoutee(s)` : "Aucune experience detaillee",
  ];

  const openEditorSection = (
    section: "personal" | "professional" | "cv" | "education" | "certifications" | "experiences" | "preferences",
  ) => {
    setLocation(`/profile?section=${section}`);
    onEdit();
  };

  return (
    <div className="space-y-5 pb-24">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        data-testid="input-avatar-upload"
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <section className="space-y-5">
          <Card className="overflow-hidden border-border/70 shadow-sm">
            <div className="bg-gradient-to-r from-primary/15 via-accent/10 to-transparent px-6 pt-6 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-20 w-20 ring-4 ring-background shadow-sm">
                      <AvatarImage src={currentUser.avatarUrl || undefined} />
                      <AvatarFallback className="text-xl bg-primary/10 text-primary">
                        {getInitials(currentUser.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      size="icon"
                      className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary shadow-lg"
                      onClick={handlePhotoClick}
                      disabled={isUploading || uploadAvatarMutation.isPending}
                      data-testid="button-upload-avatar"
                    >
                      {isUploading || uploadAvatarMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight" data-testid="text-profile-name">
                      {currentUser.fullName}
                    </h2>
                    {profile?.title ? (
                      <p className="text-sm text-muted-foreground" data-testid="text-profile-title">
                        {profile.title}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Ajoutez un titre professionnel</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {currentUser.city ? (
                        <Badge variant="secondary" className="gap-1">
                          <MapPin className="h-3 w-3" />
                          {currentUser.city}
                        </Badge>
                      ) : null}
                      {currentUser.isVerified ? (
                        <Badge className="gap-1 bg-accent">
                          <CheckCircle2 className="h-3 w-3" />
                          Verifie
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="gap-2" onClick={onEdit} data-testid="button-edit-profile-top">
                  <Edit className="h-4 w-4" />
                  Modifier
                </Button>
              </div>
            </div>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Profil complete</span>
                  <span className="font-medium">{profileCompletion}%</span>
                </div>
                <Progress value={profileCompletion} className="h-2.5" />
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="rounded-lg border border-border/70 bg-muted/30 p-2 text-center">
                    <p className="text-[11px] text-muted-foreground">Experiences</p>
                    <p className="text-sm font-semibold">{experienceCount}</p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-muted/30 p-2 text-center">
                    <p className="text-[11px] text-muted-foreground">Formations</p>
                    <p className="text-sm font-semibold">{educationCount}</p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-muted/30 p-2 text-center">
                    <p className="text-[11px] text-muted-foreground">Certifications</p>
                    <p className="text-sm font-semibold">{certificationCount}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/70 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Infos personnelles
                </CardTitle>
                <Button variant="ghost" size="sm" className="gap-1" onClick={() => openEditorSection("personal")}>
                  <Edit className="h-3.5 w-3.5" />
                  Modifier
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border/70 p-3">
                <p className="text-xs text-muted-foreground">Nom complet</p>
                <p className="font-medium">{currentUser.fullName || "-"}</p>
              </div>
              <div className="rounded-xl border border-border/70 p-3">
                <p className="text-xs text-muted-foreground">Telephone</p>
                <p className="font-medium flex items-center gap-2">
                  <Phone className="h-3 w-3" />
                  {currentUser.phone || "-"}
                </p>
              </div>
              <div className="rounded-xl border border-border/70 p-3">
                <p className="text-xs text-muted-foreground">Ville</p>
                <p className="font-medium">{currentUser.city || "-"}</p>
              </div>
              <div className="rounded-xl border border-border/70 p-3">
                <p className="text-xs text-muted-foreground">WhatsApp</p>
                <p className="font-medium">{profile?.whatsappNumber || "-"}</p>
              </div>
            </CardContent>
          </Card>

          {profile?.bio ? (
            <Card className="rounded-2xl border-border/70 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">A propos</CardTitle>
                  <Button variant="ghost" size="sm" className="gap-1" onClick={() => openEditorSection("professional")}>
                    <Edit className="h-3.5 w-3.5" />
                    Modifier
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground" data-testid="text-bio">{profile.bio}</p>
              </CardContent>
            </Card>
          ) : null}

          <Card className="rounded-2xl border-border/70 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  CV du candidat
                </CardTitle>
                <Button variant="ghost" size="sm" className="gap-1" onClick={() => openEditorSection("cv")}>
                  <Edit className="h-3.5 w-3.5" />
                  Modifier
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {profile?.resumeUrl ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/25">
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate" data-testid="text-resume-file-name">
                        {profile.resumeFileName || "CV PDF"}
                      </p>
                      <p className="text-xs text-muted-foreground">{profile.resumeMimeType || "Document"}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" className="flex-1 gap-2" onClick={handleViewResume} data-testid="button-view-resume">
                      <Eye className="h-4 w-4" />
                      Ouvrir le CV
                    </Button>
                    <Button type="button" variant="outline" className="flex-1 gap-2 border-border/70" onClick={handleDownloadResume} data-testid="button-download-resume">
                      <Download className="h-4 w-4" />
                      Telecharger
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-muted-foreground/40 p-4 text-sm text-muted-foreground">
                  Aucun CV importe pour le moment.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/70 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Experience professionnelle
                </CardTitle>
                {hasMultipleCurrent && (
                  <span className="ml-2 text-xs text-red-600 font-semibold" data-testid="warning-multiple-current-experience">
                    ⚠️ Plusieurs postes marqués "En cours". Veuillez corriger.
                  </span>
                )}
                <Button variant="ghost" size="sm" className="gap-1" onClick={() => openEditorSection("experiences")}>
                  <Edit className="h-3.5 w-3.5" />
                  Modifier
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {sortedExperienceEntries.length > 0 ? (
                <div className="relative pl-7">
                  <div className="absolute left-2.5 top-1 bottom-1 w-px bg-border" />
                  <div className="space-y-3">
                    {sortedExperienceEntries.map((experience) => (
                      <div key={experience.id} className="relative rounded-xl border border-border/70 p-4 space-y-2 bg-muted/20">
                        <span className="absolute -left-[22px] top-5 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-sm" data-testid={`text-experience-position-${experience.id}`}>
                              {experience.position || "Poste"}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {experience.company || "Entreprise"}
                            </p>
                          </div>
                          {experience.contractType ? <Badge className="bg-secondary/15 text-secondary border border-secondary/25 text-xs">{experience.contractType}</Badge> : null}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(experience.startDate) || "-"} - {experience.isCurrent ? "En cours" : formatDate(experience.endDate) || "-"}
                        </p>
                        {experience.missionDescription ? (
                          <div className="rounded-lg border border-border/70 bg-background/70 p-2.5">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Missions</p>
                            <p className="text-sm text-muted-foreground">{experience.missionDescription}</p>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                profile?.experience ? (
                  <div className="relative pl-7">
                    <div className="absolute left-2.5 top-1 bottom-1 w-px bg-border" />
                    <div className="relative rounded-xl border border-border/70 p-4 bg-muted/20">
                      <span className="absolute -left-[22px] top-5 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                      <p className="font-semibold text-sm">Experience professionnelle</p>
                      <p className="text-xs text-muted-foreground mt-1">Niveau d'experience: {profile.experience}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Aucune experience renseignee</p>
                )
              )}

              {profile?.salaryExpectation ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/10">
                  <DollarSign className="h-4 w-4 text-accent" />
                  <span data-testid="text-salary">{profile.salaryExpectation} FCFA/mois</span>
                </div>
              ) : null}

              {profile?.availableFrom ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span data-testid="text-available">Disponible a partir du {profile.availableFrom}</span>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/70 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Formations
                </CardTitle>
                <Button variant="ghost" size="sm" className="gap-1" onClick={() => openEditorSection("education")}>
                  <Edit className="h-3.5 w-3.5" />
                  Modifier
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {educationEntries.length > 0 ? (
                <div className="relative pl-7">
                  <div className="absolute left-2.5 top-1 bottom-1 w-px bg-border" />
                  <div className="space-y-3">
                    {educationEntries.map((education) => (
                      <div key={education.id} className="relative rounded-xl border border-border/70 p-4 space-y-2 bg-muted/20">
                        <span className="absolute -left-[22px] top-5 h-3 w-3 rounded-full border-2 border-accent bg-background" />
                        <p className="font-semibold text-sm" data-testid={`text-education-level-${education.id}`}>
                          {education.level || "Niveau non renseigne"}
                        </p>
                        <p className="text-xs text-muted-foreground">{education.institution || "Etablissement non renseigne"}</p>
                        {education.degree ? (
                          <p className="text-sm">{education.degree}</p>
                        ) : null}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{education.startYear || "-"} - {education.endYear || "-"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                profile?.education ? (
                  <div className="relative pl-7">
                    <div className="absolute left-2.5 top-1 bottom-1 w-px bg-border" />
                    <div className="relative rounded-xl border border-border/70 p-4 bg-muted/20">
                      <span className="absolute -left-[22px] top-5 h-3 w-3 rounded-full border-2 border-accent bg-background" />
                      <p className="font-semibold text-sm">Formation</p>
                      <p className="text-xs text-muted-foreground mt-1">{profile.education}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Aucune formation renseignee</p>
                )
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/70 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Certifications professionnelles
                </CardTitle>
                <Button variant="ghost" size="sm" className="gap-1" onClick={() => openEditorSection("certifications")}>
                  <Edit className="h-3.5 w-3.5" />
                  Modifier
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {certificationEntries.length > 0 ? (
                certificationEntries.map((certification) => (
                  <div key={certification.id} className="rounded-xl border border-border/70 p-4 space-y-2 bg-muted/20">
                    <p className="font-semibold text-sm" data-testid={`text-certification-name-${certification.id}`}>
                      {certification.name || "Certification"}
                    </p>
                    <p className="text-xs text-muted-foreground">{certification.issuer || "Organisme non renseigne"}</p>
                    {certification.obtainedDate ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>Obtenue le {formatDate(certification.obtainedDate)}</span>
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">Aucune certification renseignee</p>
              )}
            </CardContent>
          </Card>

          {profile?.skills && profile.skills.length > 0 ? (
            <Card className="rounded-2xl border-border/70 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Competences
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="gap-1" onClick={() => openEditorSection("professional")}>
                    <Edit className="h-3.5 w-3.5" />
                    Modifier
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" data-testid={`badge-skill-${skill}`}>
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {profile?.voiceCvUrl ? (
            <Card className="rounded-2xl border-border/70 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Mic className="h-4 w-4" />
                  CV Vocal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/10">
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                  <span className="text-sm">CV vocal enregistre</span>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Button size="lg" className="w-full gap-2" onClick={onEdit} data-testid="button-edit-profile">
            <Edit className="h-4 w-4" />
            Modifier mon profil
          </Button>
        </section>

        <aside className="space-y-5">
          <Card className="border-border/70 shadow-sm xl:sticky xl:top-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Progression du profil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Niveau actuel</span>
                <span className="font-medium">{profileCompletion}%</span>
              </div>
              <Progress value={profileCompletion} className="h-2" />
              <p className="text-xs text-muted-foreground">Objectif recommande: 90%+ pour augmenter la visibilite du profil.</p>
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Suggestions UX
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {suggestions.length > 0 ? (
                suggestions.map((item, index) => (
                  <div key={index} className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm">
                    {item}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Excellent profil. Continuez a le maintenir a jour.</p>
              )}
              <Button variant="outline" className="w-full gap-2" onClick={() => openEditorSection("preferences")}>
                <Edit className="h-4 w-4" />
                Completer mon profil
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Activite
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {activity.map((item, index) => (
                <div key={index} className="rounded-lg border border-border/70 px-3 py-2 text-sm">
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
