import { useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  CheckCircle2,
  Edit,
  Lightbulb,
  Mic,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { User as AppUser, CandidateProfile } from "@shared/schema";
import { CarteIdentite } from "@/components/profil/carte-identite";
import { BlocAPropos, BlocCv, BlocInfosPersonnelles } from "@/components/profil/blocs-informations";
import { BlocCertifications, BlocExperiences, BlocFormations } from "@/components/profil/chronologies";
import { libelleAnneesExperience, libelleDisponibilite, libelleSalaire, lirePretentions } from "@/utils/profil";

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

  // Anciennes données, hors du type actuel : certifications enregistrées
  // en texte libre, ou champ « certification » au singulier.
  const ancien = profile as unknown as { certifications?: unknown; certification?: unknown } | null | undefined;
  const texteAncien = [ancien?.certifications, ancien?.certification]
    .find((v): v is string => typeof v === "string" && v.trim() !== "");
  if (certificationEntries.length === 0 && texteAncien) {
    certificationEntries = [
      {
        id: `${Math.random().toString(16).slice(2, 8)}`,
        name: texteAncien.trim(),
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

  // Formations (fin, puis début) et certifications (date d'obtention) : la
  // plus récente d'abord. Ancienne formation en texte libre : une entrée.
  const sortedEducationEntries = (educationEntries.length > 0
    ? [...educationEntries]
    : profile?.education?.trim()
      ? [{ id: "formation-texte", level: "", institution: "", degree: profile.education.trim(), startYear: "", endYear: "" }]
      : []
  ).sort((a, b) => (b.endYear || b.startYear).localeCompare(a.endYear || a.startYear));
  const sortedCertificationEntries = [...certificationEntries].sort((a, b) => b.obtainedDate.localeCompare(a.obtainedDate));

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

  const handleViewResume = async () => {
    if (!profile?.resumeUrl) return;
    // Un CV enregistré en data: (base64) ne s'ouvre pas tel quel dans un
    // nouvel onglet (Chrome le bloque) : il passe par un lien blob:.
    if (!profile.resumeUrl.startsWith("data:")) {
      window.open(profile.resumeUrl, "_blank", "noopener,noreferrer");
      return;
    }
    const onglet = window.open("", "_blank");
    try {
      const fichier = await (await fetch(profile.resumeUrl)).blob();
      const lien = URL.createObjectURL(fichier);
      if (onglet) onglet.location.href = lien;
      else window.open(lien, "_blank");
      setTimeout(() => URL.revokeObjectURL(lien), 60_000);
    } catch {
      onglet?.close();
      toast({ title: "Impossible d'ouvrir le CV", description: "Téléchargez-le pour le consulter.", variant: "destructive" });
    }
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
    <div className="pb-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        data-testid="input-avatar-upload"
      />

      {/* Colonne principale et colonne de suivi : celle-ci passe dessous
          quand la place manque (flex-wrap). */}
      <div className="flex flex-wrap gap-8">
        <div className="min-w-0 space-y-5 [flex:999_1_620px]">
          <CarteIdentite
            nom={currentUser.fullName}
            titre={profile?.title}
            ville={currentUser.city}
            avatarUrl={currentUser.avatarUrl}
            verifie={!!currentUser.isVerified}
            complet={profileCompletion >= 100}
            tuiles={[
              { ancre: "experiences", libelle: "Expériences", singulier: "Expérience", nombre: experienceCount },
              { ancre: "formations", libelle: "Formations", singulier: "Formation", nombre: educationCount },
              { ancre: "certifications", libelle: "Certifications", singulier: "Certification", nombre: certificationCount },
            ]}
            envoiPhoto={isUploading || uploadAvatarMutation.isPending}
            onChangerPhoto={handlePhotoClick}
            onModifier={() => openEditorSection("personal")}
          />

          <BlocInfosPersonnelles
            nom={currentUser.fullName}
            telephone={currentUser.phone}
            ville={currentUser.city}
            whatsapp={profile?.whatsappNumber}
            onModifier={() => openEditorSection("personal")}
          />

          <BlocAPropos presentation={profile?.bio} onModifier={() => openEditorSection("professional")} />

          <BlocCv
            nomFichier={profile?.resumeFileName}
            typeMime={profile?.resumeMimeType}
            disponible={!!profile?.resumeUrl}
            onOuvrir={handleViewResume}
            onTelecharger={handleDownloadResume}
            onModifier={() => openEditorSection("cv")}
          />

          <BlocExperiences
            experiences={sortedExperienceEntries}
            plusieursEnCours={hasMultipleCurrent}
            anneesExperience={libelleAnneesExperience(profile?.experience)}
            pretentions={(() => { const p = lirePretentions(profile?.salaryExpectation); return p ? libelleSalaire(p.min, p.max) : undefined; })()}
            disponibilite={libelleDisponibilite(profile?.availableFrom)}
            onModifier={() => openEditorSection("experiences")}
          />

          <BlocFormations formations={sortedEducationEntries} onModifier={() => openEditorSection("education")} />

          <BlocCertifications certifications={sortedCertificationEntries} onModifier={() => openEditorSection("certifications")} />

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

          {/* Sur ordinateur, ce bouton est dans le titre de la page. */}
          <Button size="lg" className="w-full gap-2 min-[900px]:hidden" onClick={onEdit} data-testid="button-edit-profile">
            <Edit className="h-4 w-4" />
            Modifier mon profil
          </Button>
        </div>

        <aside aria-label="Suivi du profil" className="min-w-0 space-y-5 [flex:1_1_320px]">
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
