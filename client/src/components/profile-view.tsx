import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { User as AppUser, CandidateProfile } from "@shared/schema";
import { CarteIdentite } from "@/components/profil/carte-identite";
import { BlocAPropos, BlocCv, BlocInfosPersonnelles } from "@/components/profil/blocs-informations";
import { BlocCertifications, BlocExperiences, BlocFormations } from "@/components/profil/chronologies";
import { libelleAnneesExperience, libelleDisponibilite, libellePretentions } from "@/utils/profil";
import { BlocCompetences, BlocCvVocal, ColonneSuivi } from "@/components/profil/suivi-profil";
import { calculateProfileCompletion, nextProfileStep } from "@/lib/completion-profil";

type EditorSection = "personal" | "professional" | "cv" | "education" | "certifications" | "experiences" | "preferences";

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
        title: "Photo mise à jour",
        description: "Votre photo de profil a été enregistrée.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "La photo n'a pas pu être envoyée. Réessayez.",
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
        description: "Choisissez une image (JPEG, PNG ou WebP).",
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

  // Le CV se lit par GET /api/profile/cv (l'API ne renvoie plus le fichier
  // en base64) : affiché dans un onglet, ou téléchargé avec son nom.
  const handleViewResume = () => {
    if (!profile?.resumeUrl) return;
    window.open(profile.resumeUrl, "_blank", "noopener,noreferrer");
  };

  const handleDownloadResume = () => {
    if (!profile?.resumeUrl) return;
    const link = document.createElement("a");
    link.href = profile.resumeUrl.startsWith("/api/profile/cv") ? "/api/profile/cv?telechargement=1" : profile.resumeUrl;
    link.download = profile.resumeFileName || "cv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Même calcul que l'espace candidat (lib/completion-profil.ts).
  const profileCompletion = calculateProfileCompletion(currentUser, profile ?? undefined);
  const experienceCount = sortedExperienceEntries.length > 0 ? sortedExperienceEntries.length : profile?.experience ? 1 : 0;
  const educationCount = educationEntries.length > 0 ? educationEntries.length : profile?.education ? 1 : 0;
  const certificationCount = certificationEntries.length;

  const openEditorSection = (section: EditorSection) => {
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
            pretentions={libellePretentions(profile?.salaryExpectation)}
            disponibilite={libelleDisponibilite(profile?.availableFrom)}
            onModifier={() => openEditorSection("experiences")}
          />

          <BlocFormations formations={sortedEducationEntries} onModifier={() => openEditorSection("education")} />

          <BlocCertifications certifications={sortedCertificationEntries} onModifier={() => openEditorSection("certifications")} />

          <BlocCompetences competences={profile?.skills ?? []} onModifier={() => openEditorSection("professional")} />

          {profile?.voiceCvUrl ? <BlocCvVocal /> : null}

          {/* Sur ordinateur, ce bouton est dans le titre de la page. */}
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-baara-bleu px-6 font-texte text-[16px] font-semibold text-white hover:bg-baara-marine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2 min-[900px]:hidden"
            data-testid="button-edit-profile"
          >
            <Pencil className="h-5 w-5" aria-hidden="true" />
            Modifier mon profil
          </button>
        </div>

        <ColonneSuivi
          completion={profileCompletion}
          miseAJour={profile?.updatedAt}
          cvDisponible={!!profile?.resumeUrl}
          nbExperiences={experienceEntries.length}
          onCompleter={() => openEditorSection(nextProfileStep(currentUser, profile ?? undefined)?.section as EditorSection ?? "personal")}
          onMettreAJour={onEdit}
        />
      </div>
    </div>
  );
}
