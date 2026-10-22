import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Camera,
  Mic,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Plus,
  X,
  Save,
  Calendar,
  Trash2,
  Upload,
  FileText,
  Download,
  Eye,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { SKILLS_LIST_SORTED } from "@/lib/skills-list";
import { GestionCvVocal, type CvVocal } from "@/components/cv-vocal/gestion-cv-vocal";
import type {
  User,
  CandidateProfile,
  CandidateEducationEntry,
  CandidateCertificationEntry,
  CandidateExperienceEntry,
} from "@shared/schema";

const JOB_TITLE_GROUPS = [
  {
    label: "Suivi, Evaluation & Donnees",
    options: [
      "Spécialiste Suivi & Évaluation",
      "Chargé de Suivi-Évaluation",
      "Responsable M&E",
      "Consultant en évaluation",
      "Expert en analyse d'impact",
      "Chargé d'études",
      "Data Manager",
      "Statisticien",
      "Data Analyst",
      "Agent de collecte de donnees",
    ],
  },
  {
    label: "Tech & Produit",
    options: [
      "Développeur Web",
      "Développeur Frontend",
      "Développeur Backend",
      "Développeur Mobile",
      "Développeur Full Stack",
      "Ingénieur logiciel",
      "Ingénieur DevOps",
      "Technicien informatique",
      "Designer UI/UX",
      "Business Analyst",
    ],
  },
  {
    label: "Gestion, Projet & Conseil",
    options: [
      "Chef de projet",
      "Coordinateur de projet",
      "Chargé de programme",
      "Coordinateur terrain",
      "Responsable des opérations",
      "Consultant",
      "Consultant développement",
      "Responsable projet ONG",
    ],
  },
  {
    label: "RH, Administration & Communication",
    options: [
      "Chargé de recrutement",
      "Ressources Humaines",
      "Responsable administratif",
      "Assistant(e) administratif(ve)",
      "Secrétaire",
      "Réceptionniste",
      "Chargé de communication",
      "Community Manager",
    ],
  },
  {
    label: "Marketing & Contenu",
    options: [
      "Responsable marketing",
      "Marketing Digital",
      "Digital marketing manager",
      "Content manager",
      "Commercial",
    ],
  },
  {
    label: "Finance, Audit & Controle",
    options: [
      "Analyste financier",
      "Contrôleur de gestion",
      "Auditeur",
      "Responsable financier",
      "Comptable",
    ],
  },
  {
    label: "Logistique & Supply Chain",
    options: [
      "Responsable logistique",
      "Assistant logistique",
      "Gestionnaire de stock",
      "Supply Chain Manager",
    ],
  },
  {
    label: "Sante, Education & Terrain",
    options: [
      "Agent de santé",
      "Infirmier(ère)",
      "Enseignant(e)",
    ],
  },
  {
    label: "Metiers techniques & Services",
    options: [
      "Agent de sécurité",
      "Chauffeur",
      "Cuisinier",
      "Serveur/Serveuse",
      "Vendeur/Vendeuse",
      "Électricien",
      "Plombier",
      "Mécanicien",
      "Maçon",
      "Menuisier",
      "Agent d'entretien",
    ],
  },
  {
    label: "Autres",
    options: ["Freelance", "Autre"],
  },
] as const;

const JOB_TITLE_GROUPS_SORTED = JOB_TITLE_GROUPS.map((group) => ({
  ...group,
  options: [...group.options].sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" })),
}));

const EDUCATION_LEVELS = [
  "Baccalaureat",
  "Bac+2 (BTS, DUT)",
  "Bac+3 (Licence)",
  "Bac+5 (Master)",
  "Doctorat",
  "Formation professionnelle",
];

const EDUCATION_LEVELS_SORTED = [...EDUCATION_LEVELS].sort((a, b) =>
  a.localeCompare(b, "fr", { sensitivity: "base" }),
);

const CONTRACT_TYPES = [
  "CDI",
  "CDD",
  "Stage",
  "Freelance",
  "Interim",
  "Temps partiel",
  "Temps plein",
  "Alternance",
  "Autre",
];

const CONTRACT_TYPES_SORTED = [...CONTRACT_TYPES].sort((a, b) =>
  a.localeCompare(b, "fr", { sensitivity: "base" }),
);

const SALARY_EXPECTATIONS = [
  { value: "200-400", label: "200K - 400K FCFA" },
  { value: "400-600", label: "400K - 600K FCFA" },
  { value: "600-800", label: "600K - 800K FCFA" },
  { value: "800-1M", label: "800K - 1M FCFA" },
  { value: "1M+", label: "1M+ FCFA" },
] as const;

const SALARY_EXPECTATIONS_SORTED = [...SALARY_EXPECTATIONS].sort((a, b) =>
  a.label.localeCompare(b.label, "fr", { sensitivity: "base" }),
);

const AVAILABILITY_OPTIONS = [
  { value: "immediate", label: "Immédiate" },
  { value: "1-week", label: "1 semaine" },
  { value: "2-weeks", label: "2 semaines" },
  { value: "1-month", label: "1 mois" },
  { value: "3-months", label: "3 mois" },
] as const;

const AVAILABILITY_OPTIONS_SORTED = [...AVAILABILITY_OPTIONS].sort((a, b) =>
  a.label.localeCompare(b.label, "fr", { sensitivity: "base" }),
);

const ACCEPTED_CV_TYPES = [
  "application/pdf",
];

const PAYLOAD_TOO_LARGE_TITLE = "Envoi refuse par le serveur";
const PAYLOAD_TOO_LARGE_DESCRIPTION =
  "Le serveur a refuse la taille de la requete. Essayez un PDF optimise, puis reessayez.";

const profileSchema = z.object({
  fullName: z.string().min(2, "Nom requis"),
  phone: z.string().optional(),
  whatsappNumber: z.string().optional(),
  city: z.string().optional(),
  title: z.string().optional(),
  bio: z.string().max(500, "Maximum 500 caractères").optional(),
  experience: z.string().optional(),
  education: z.string().optional(),
  availableFrom: z.string().optional(),
  salaryExpectation: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

type EditorSection =
  | "personal"
  | "professional"
  | "cv"
  | "education"
  | "certifications"
  | "experiences"
  | "preferences";

interface MobileProfileEditorProps {
  user: User;
  profile?: CandidateProfile;
  onSave?: (data: ProfileFormData) => void;
  initialSection?: EditorSection;
}

export function MobileProfileEditor({ user, profile, onSave, initialSection }: MobileProfileEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const sectionRefs = useRef<Partial<Record<EditorSection, HTMLDivElement | null>>>({});
  const sectionHighlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [highlightedSection, setHighlightedSection] = useState<EditorSection | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const uploadAvatarMutation = useMutation({
    mutationFn: async (imageBase64: string) => {
      const response = await apiRequest("POST", "/api/avatar/upload", { imageBase64 });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({ title: "Photo mise à jour", description: "Votre photo de profil a été enregistrée." });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de télécharger la photo.", variant: "destructive" });
    },
  });

  const handleAvatarClick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Fichier trop volumineux", description: "La taille maximum est de 2 Mo.", variant: "destructive" });
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast({ title: "Format invalide", description: "Veuillez sélectionner une image.", variant: "destructive" });
      return;
    }

    setIsUploadingAvatar(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      uploadAvatarMutation.mutate(reader.result as string);
      setIsUploadingAvatar(false);
    };
    reader.onerror = () => {
      toast({ title: "Erreur", description: "Impossible de lire le fichier.", variant: "destructive" });
      setIsUploadingAvatar(false);
    };
    reader.readAsDataURL(file);
  };

  const getFriendlySaveErrorMessage = (error: Error) => {
    const message = (error.message || "").toLowerCase();
    const isPayloadTooLarge =
      message.includes("413") ||
      message.includes("request entity too large") ||
      message.includes("payload too large");

    if (isPayloadTooLarge) {
      return {
        title: PAYLOAD_TOO_LARGE_TITLE,
        description: PAYLOAD_TOO_LARGE_DESCRIPTION,
      };
    }

    return {
      title: "Erreur",
      description: error.message || "Impossible de sauvegarder le profil.",
    };
  };

  const [skills, setSkills] = useState<string[]>(profile?.skills || []);
  const [newSkill, setNewSkill] = useState("");
  const [cvFileName, setCvFileName] = useState<string | null>(profile?.resumeFileName || null);
  const [cvMimeType, setCvMimeType] = useState<string | null>(profile?.resumeMimeType || null);
  const [cvFileUrl, setCvFileUrl] = useState<string | null>(profile?.resumeUrl || null);
  const [pendingCvFile, setPendingCvFile] = useState<File | null>(null);
  const [cvUpdated, setCvUpdated] = useState(false);
  const [educationEntries, setEducationEntries] = useState<CandidateEducationEntry[]>(profile?.educationEntries || []);
  const [certifications, setCertifications] = useState<CandidateCertificationEntry[]>(profile?.certifications || []);
  const [experiences, setExperiences] = useState<CandidateExperienceEntry[]>(profile?.experiences || []);

  const saveProfileMutation = useMutation({
    mutationFn: async (data: { userUpdates: Record<string, unknown>; profileUpdates: Record<string, unknown> }) => {
      const response = await apiRequest("PATCH", "/api/profile", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({
        title: "Profil mis à jour",
        description: "Vos modifications ont été enregistrées avec succès.",
      });
    },
  });


  useEffect(() => {
    if (!initialSection) return;

    const target = sectionRefs.current[initialSection];
    if (!target) return;

    target.scrollIntoView({ behavior: "smooth", block: "start" });

    setHighlightedSection(initialSection);
    if (sectionHighlightTimeoutRef.current) {
      clearTimeout(sectionHighlightTimeoutRef.current);
    }
    sectionHighlightTimeoutRef.current = setTimeout(() => {
      setHighlightedSection(null);
    }, 2200);
  }, [initialSection]);

  useEffect(() => {
    return () => {
      if (sectionHighlightTimeoutRef.current) {
        clearTimeout(sectionHighlightTimeoutRef.current);
      }
    };
  }, []);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user.fullName,
      phone: user.phone || "",
      whatsappNumber: profile?.whatsappNumber || "",
      city: user.city || "",
      title: profile?.title || "",
      bio: profile?.bio || "",
      experience: profile?.experience || "",
      education: profile?.education || "",
      availableFrom: profile?.availableFrom || "",
      salaryExpectation: profile?.salaryExpectation || "",
    },
  });

  const profileCompletion = calculateProfileCompletion(user, profile, skills);

  function calculateProfileCompletion(user: User, profile?: CandidateProfile, skills?: string[]): number {
    let score = 0;
    const total = 10;
    
    if (user.fullName) score++;
    if (user.phone) score++;
    if (user.city) score++;
    if (profile?.title) score++;
    if (profile?.bio) score++;
    if (profile?.experience) score++;
    if ((profile?.educationEntries && profile.educationEntries.length > 0) || profile?.education) score++;
    if (profile?.whatsappNumber) score++;
    if (skills && skills.length > 0) score++;
    if (profile?.voiceCvUrl) score++;
    
    return Math.round((score / total) * 100);
  }

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleCVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const resetInput = () => {
        e.target.value = "";
      };

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Fichier superieur a 5 Mo",
          description: "Le CV doit faire 5 Mo maximum.",
          variant: "destructive",
        });
        resetInput();
        return;
      }

      const extension = file.name.split(".").pop()?.toLowerCase();
      const isAcceptedExtension = ["pdf"].includes(extension || "");
      const isAcceptedMime = ACCEPTED_CV_TYPES.includes(file.type);
      if (!isAcceptedExtension && !isAcceptedMime) {
        toast({
          title: "Format invalide",
          description: "Format autorise: PDF uniquement.",
          variant: "destructive",
        });
        resetInput();
        return;
      }

      if (cvFileUrl && cvFileUrl.startsWith("blob:")) {
        URL.revokeObjectURL(cvFileUrl);
      }

      const previewUrl = URL.createObjectURL(file);
      setCvFileUrl(previewUrl);
      setCvFileName(file.name);
      setCvMimeType(file.type || "application/pdf");
      setPendingCvFile(file);
      setCvUpdated(true);
      toast({
        title: "CV importe",
        description: "Votre CV est pret a etre enregistre.",
      });

      resetInput();
    }
  };

  const handlePreviewCv = () => {
    if (!cvFileUrl) return;
    window.open(cvFileUrl, "_blank", "noopener,noreferrer");
  };

  const handleDownloadCv = () => {
    if (!cvFileUrl) return;
    const link = document.createElement("a");
    link.href = cvFileUrl;
    link.download = cvFileName || "cv-candidat";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteCv = () => {
    if (cvFileUrl && cvFileUrl.startsWith("blob:")) {
      URL.revokeObjectURL(cvFileUrl);
    }
    setCvFileName(null);
    setCvMimeType(null);
    setCvFileUrl(null);
    setPendingCvFile(null);
    setCvUpdated(true);
  };

  const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

  const addEducation = () => {
    if (educationEntries.length >= 4) {
      toast({
        title: "Limite atteinte",
        description: "Vous pouvez ajouter jusqu'a 4 niveaux d'etudes.",
      });
      return;
    }

    setEducationEntries((prev) => [
      ...prev,
      {
        id: createId(),
        level: "",
        institution: "",
        degree: "",
        startYear: "",
        endYear: "",
      },
    ]);
  };

  const updateEducation = (id: string, field: keyof CandidateEducationEntry, value: string) => {
    setEducationEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry)));
  };

  const removeEducation = (id: string) => {
    setEducationEntries((prev) => prev.filter((entry) => entry.id !== id));
  };

  const addCertification = () => {
    setCertifications((prev) => [
      ...prev,
      {
        id: createId(),
        name: "",
        issuer: "",
        obtainedDate: "",
      },
    ]);
  };

  const updateCertification = (id: string, field: keyof CandidateCertificationEntry, value: string) => {
    setCertifications((prev) => prev.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry)));
  };

  const removeCertification = (id: string) => {
    setCertifications((prev) => prev.filter((entry) => entry.id !== id));
  };

  const addExperience = () => {
    setExperiences((prev) => [
      ...prev,
      {
        id: createId(),
        position: "",
        company: "",
        contractType: "",
        startDate: "",
        endDate: null,
        isCurrent: false,
        missionDescription: "",
      },
    ]);
  };

  const updateExperience = (id: string, field: keyof CandidateExperienceEntry, value: string | boolean | null) => {
    setExperiences((prev) =>
      prev.map((entry) => {
        if (entry.id !== id) return entry;
        if (field === "isCurrent") {
          return { ...entry, isCurrent: Boolean(value), endDate: value ? null : entry.endDate };
        }
        return { ...entry, [field]: value };
      }),
    );
  };

  const removeExperience = (id: string) => {
    setExperiences((prev) => prev.filter((entry) => entry.id !== id));
  };

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || "");
        const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : "";
        resolve(base64);
      };
      reader.onerror = () => reject(new Error("Impossible de lire un chunk du fichier."));
      reader.readAsDataURL(blob);
    });

  const uploadCvInChunks = async (file: File) => {
    const chunkSize = 64 * 1024;
    const totalChunks = Math.ceil(file.size / chunkSize);
    const uploadId = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
      const start = chunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);
      const chunkBase64 = await blobToBase64(chunk);

      await apiRequest("POST", "/api/profile/resume-chunk", {
        uploadId,
        fileName: file.name,
        mimeType: file.type || "application/pdf",
        chunkIndex,
        totalChunks,
        chunkBase64,
      });
    }
  };


  const onSubmit = async (data: ProfileFormData) => {
        // Contrôle: une seule expérience peut être "En cours"
        const currentExperiences = experiences.filter((e) => e.isCurrent);
        if (currentExperiences.length > 1) {
          toast({
            title: "Erreur: plusieurs postes en cours",
            description: "Vous ne pouvez avoir qu'un seul poste marqué comme 'En cours'. Veuillez corriger vos expériences.",
            variant: "destructive",
          });
          return;
        }
    const sanitizedEducationEntries = educationEntries
      .map((entry) => ({
        ...entry,
        level: entry.level.trim(),
        institution: entry.institution.trim(),
        degree: entry.degree.trim(),
        startYear: entry.startYear.trim(),
        endYear: entry.endYear.trim(),
      }))
      .filter((entry) => entry.level || entry.institution || entry.degree || entry.startYear || entry.endYear);

    const sanitizedCertifications = certifications
      .map((entry) => ({
        ...entry,
        name: entry.name.trim(),
        issuer: entry.issuer.trim(),
        obtainedDate: entry.obtainedDate.trim(),
      }))
      .filter((entry) => entry.name || entry.issuer || entry.obtainedDate);

    const sanitizedExperiences = experiences
      .map((entry) => ({
        ...entry,
        position: entry.position.trim(),
        company: entry.company.trim(),
        contractType: entry.contractType.trim(),
        startDate: entry.startDate.trim(),
        endDate: entry.endDate?.trim() || null,
        missionDescription: entry.missionDescription.trim(),
      }))
      .filter((entry) => entry.position || entry.company || entry.contractType || entry.startDate || entry.missionDescription);

    const userUpdates: Record<string, unknown> = {
      fullName: data.fullName,
      phone: data.phone,
      city: data.city,
    };

    const profileUpdates: Record<string, unknown> = {
      title: data.title,
      bio: data.bio,
      experience: data.experience,
      education: sanitizedEducationEntries[0]?.level || data.education,
      whatsappNumber: data.whatsappNumber,
      availableFrom: data.availableFrom,
      salaryExpectation: data.salaryExpectation,
      skills: skills,
      educationEntries: sanitizedEducationEntries,
      certifications: sanitizedCertifications,
      experiences: sanitizedExperiences,
    };

    try {
      if (cvUpdated && pendingCvFile) {
        await uploadCvInChunks(pendingCvFile);
      }

      if (cvUpdated && !pendingCvFile && !cvFileUrl) {
        profileUpdates.resumeUrl = null;
        profileUpdates.resumeFileName = null;
        profileUpdates.resumeMimeType = null;
      }


      await saveProfileMutation.mutateAsync({ userUpdates, profileUpdates });
      setCvUpdated(false);
      setPendingCvFile(null);
    } catch (error) {
      const friendlyError = getFriendlySaveErrorMessage(error as Error);
      toast({
        title: friendlyError.title,
        description: friendlyError.description,
        variant: "destructive",
      });
    }
    
    if (onSave) {
      onSave(data);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-4 pb-24">
      <input
        type="file"
        ref={avatarInputRef}
        onChange={handleAvatarFileChange}
        accept="image/*"
        className="hidden"
        data-testid="input-avatar-upload"
      />
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user.avatarUrl || undefined} />
                <AvatarFallback className="text-xl gradient-gold text-white">
                  {getInitials(user.fullName)}
                </AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                className="absolute bottom-0 right-0 rounded-full shadow-lg"
                onClick={handleAvatarClick}
                disabled={isUploadingAvatar || uploadAvatarMutation.isPending}
                data-testid="button-change-avatar"
              >
                {isUploadingAvatar || uploadAvatarMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-lg">{user.fullName}</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Profil complété</span>
                  <span className="font-medium">{profileCompletion}%</span>
                </div>
                <Progress value={profileCompletion} className="h-2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CV vocal : enregistré tout de suite, indépendamment du formulaire. */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Mic className="h-4 w-4" aria-hidden="true" />
            CV vocal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <GestionCvVocal cvVocal={(profile as (CandidateProfile & { cvVocal?: CvVocal }) | undefined)?.cvVocal} />
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div
            ref={(el) => {
              sectionRefs.current.personal = el;
            }}
            className={`transition-all duration-500 rounded-2xl ${highlightedSection === "personal" ? "ring-2 ring-primary/60 bg-primary/5 p-1" : ""}`}
          >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Informations personnelles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom complet</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-fullname" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        Téléphone
                      </FormLabel>
                      <FormControl>
                        <Input {...field} type="tel" data-testid="input-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="whatsappNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1 text-accent">
                        <Phone className="h-3 w-3" />
                        WhatsApp
                      </FormLabel>
                      <FormControl>
                        <Input {...field} type="tel" data-testid="input-whatsapp" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Ville
                    </FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-city" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          </div>

          <div
            ref={(el) => {
              sectionRefs.current.professional = el;
            }}
            className={`transition-all duration-500 rounded-2xl ${highlightedSection === "professional" ? "ring-2 ring-primary/60 bg-primary/5 p-1" : ""}`}
          >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Profil professionnel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titre du poste recherché</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-title">
                          <SelectValue placeholder="Sélectionnez un poste" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {JOB_TITLE_GROUPS_SORTED.map((group, groupIndex) => (
                          <div key={group.label}>
                            <SelectGroup>
                              <SelectLabel className="text-xs uppercase tracking-wide text-muted-foreground">
                                {group.label}
                              </SelectLabel>
                              {group.options.map((title) => (
                                <SelectItem key={title} value={title}>
                                  {title}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                            {groupIndex < JOB_TITLE_GROUPS_SORTED.length - 1 ? <SelectSeparator /> : null}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Présentation</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Présentez-vous en quelques lignes..."
                        className="min-h-[100px] resize-none"
                        data-testid="input-bio"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="experience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Années d'expérience</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-experience">
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0-1">0-1 an</SelectItem>
                        <SelectItem value="1-3">1-3 ans</SelectItem>
                        <SelectItem value="3-5">3-5 ans</SelectItem>
                        <SelectItem value="5-10">5-10 ans</SelectItem>
                        <SelectItem value="10+">10+ ans</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FormLabel className="mb-2 block">Compétences</FormLabel>
                <div className="flex gap-2 mb-3">
                  <Select
                    value={newSkill}
                    onValueChange={(value) => {
                      if (value && !skills.includes(value)) {
                        setSkills([...skills, value]);
                      }
                      setNewSkill("");
                    }}
                  >
                    <SelectTrigger className="flex-1" data-testid="select-skill">
                      <SelectValue placeholder="Sélectionnez une compétence" />
                    </SelectTrigger>
                    <SelectContent>
                      {SKILLS_LIST_SORTED.filter(skill => !skills.includes(skill)).map((skill) => (
                        <SelectItem key={skill} value={skill}>
                          {skill}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="gap-1 pr-0.5">
                      {skill}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSkill(skill)}
                        className="ml-1 shrink-0"
                        data-testid={`button-remove-skill-${skill}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          </div>

          <div
            ref={(el) => {
              sectionRefs.current.cv = el;
            }}
            className={`transition-all duration-500 rounded-2xl ${highlightedSection === "cv" ? "ring-2 ring-primary/60 bg-primary/5 p-1" : ""}`}
          >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Uploader votre CV
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Import PDF uniquement (max 5 Mo). Vous pouvez remplacer le CV a tout moment.
              </p>
              {cvFileUrl ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <FileText className="h-8 w-8 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{cvFileName || "CV importé"}</p>
                    <p className="text-xs text-muted-foreground">{cvMimeType || "Document"}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handlePreviewCv}
                      data-testid="button-preview-cv"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleDownloadCv}
                      data-testid="button-download-cv"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleDeleteCv}
                      className="text-destructive"
                      data-testid="button-delete-cv"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
              <label className="block cursor-pointer">
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={handleCVUpload}
                  data-testid="input-cv-upload"
                />
                <div className="flex items-center justify-center gap-2 p-8 rounded-xl border-2 border-dashed border-muted-foreground/30 hover-elevate">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {cvFileUrl ? "Remplacer le CV" : "Cliquez pour uploader"}
                  </span>
                </div>
              </label>
              {cvFileUrl ? (
                <p className="text-xs text-muted-foreground">Astuce: cliquez sur l'icone oeil pour apercu ou fleche pour telechargement.</p>
              ) : null}
            </CardContent>
          </Card>
          </div>

          <div
            ref={(el) => {
              sectionRefs.current.education = el;
            }}
            className={`transition-all duration-500 rounded-2xl ${highlightedSection === "education" ? "ring-2 ring-primary/60 bg-primary/5 p-1" : ""}`}
          >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Formation (Education)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Ajoutez jusqu'a 4 niveaux d'etudes.</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addEducation}
                  disabled={educationEntries.length >= 4}
                  data-testid="button-add-education"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter
                </Button>
              </div>

              {educationEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune formation ajoutee.</p>
              ) : null}

              {educationEntries.map((entry, index) => (
                <div key={entry.id} className="rounded-lg border p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Formation {index + 1}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => removeEducation(entry.id)}
                      data-testid={`button-remove-education-${entry.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <FormLabel>Niveau d'etudes</FormLabel>
                    <Select value={entry.level} onValueChange={(value) => updateEducation(entry.id, "level", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selectionnez un niveau" />
                      </SelectTrigger>
                      <SelectContent>
                        {EDUCATION_LEVELS_SORTED.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <FormLabel>Universite / Institut</FormLabel>
                      <Input
                        value={entry.institution}
                        onChange={(e) => updateEducation(entry.id, "institution", e.target.value)}
                        placeholder="Ex: UCAD"
                      />
                    </div>
                    <div>
                      <FormLabel>Diplome obtenu</FormLabel>
                      <Input
                        value={entry.degree}
                        onChange={(e) => updateEducation(entry.id, "degree", e.target.value)}
                        placeholder="Ex: Master en Finance"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <FormLabel>Annee de debut</FormLabel>
                      <Input
                        type="number"
                        min="1950"
                        max="2100"
                        value={entry.startYear}
                        onChange={(e) => updateEducation(entry.id, "startYear", e.target.value)}
                        placeholder="2020"
                      />
                    </div>
                    <div>
                      <FormLabel>Annee de fin</FormLabel>
                      <Input
                        type="number"
                        min="1950"
                        max="2100"
                        value={entry.endYear}
                        onChange={(e) => updateEducation(entry.id, "endYear", e.target.value)}
                        placeholder="2023"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          </div>

          <div
            ref={(el) => {
              sectionRefs.current.certifications = el;
            }}
            className={`transition-all duration-500 rounded-2xl ${highlightedSection === "certifications" ? "ring-2 ring-primary/60 bg-primary/5 p-1" : ""}`}
          >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Certifications professionnelles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Ajoutez une ou plusieurs certifications.</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addCertification}
                  data-testid="button-add-certification"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter
                </Button>
              </div>

              {certifications.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune certification ajoutee.</p>
              ) : null}

              {certifications.map((entry, index) => (
                <div key={entry.id} className="rounded-lg border p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Certification {index + 1}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => removeCertification(entry.id)}
                      data-testid={`button-remove-certification-${entry.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div>
                    <FormLabel>Nom de la certification</FormLabel>
                    <Input
                      value={entry.name}
                      onChange={(e) => updateCertification(entry.id, "name", e.target.value)}
                      placeholder="Ex: AWS Certified Cloud Practitioner"
                    />
                  </div>
                  <div>
                    <FormLabel>Organisme delivreur</FormLabel>
                    <Input
                      value={entry.issuer}
                      onChange={(e) => updateCertification(entry.id, "issuer", e.target.value)}
                      placeholder="Ex: Amazon Web Services"
                    />
                  </div>
                  <div>
                    <FormLabel>Date d'obtention</FormLabel>
                    <Input
                      type="date"
                      value={entry.obtainedDate}
                      onChange={(e) => updateCertification(entry.id, "obtainedDate", e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          </div>

          <div
            ref={(el) => {
              sectionRefs.current.experiences = el;
            }}
            className={`transition-all duration-500 rounded-2xl ${highlightedSection === "experiences" ? "ring-2 ring-primary/60 bg-primary/5 p-1" : ""}`}
          >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Experiences professionnelles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Ajoutez vos experiences, comme sur LinkedIn.</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addExperience}
                  data-testid="button-add-experience"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter
                </Button>
              </div>

              {experiences.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune experience ajoutee.</p>
              ) : null}

              {experiences.map((entry, index) => (
                <div key={entry.id} className="rounded-lg border p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Experience {index + 1}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => removeExperience(entry.id)}
                      data-testid={`button-remove-experience-${entry.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <FormLabel>Poste</FormLabel>
                      <Input
                        value={entry.position}
                        onChange={(e) => updateExperience(entry.id, "position", e.target.value)}
                        placeholder="Ex: Developpeur Full Stack"
                      />
                    </div>
                    <div>
                      <FormLabel>Entreprise</FormLabel>
                      <Input
                        value={entry.company}
                        onChange={(e) => updateExperience(entry.id, "company", e.target.value)}
                        placeholder="Ex: BaaraMatch"
                      />
                    </div>
                  </div>

                  <div>
                    <FormLabel>Type de contrat</FormLabel>
                    <Select
                      value={entry.contractType}
                      onValueChange={(value) => updateExperience(entry.id, "contractType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selectionnez un contrat" />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTRACT_TYPES_SORTED.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <FormLabel>Debut</FormLabel>
                      <Input
                        type="date"
                        value={entry.startDate}
                        onChange={(e) => updateExperience(entry.id, "startDate", e.target.value)}
                      />
                    </div>
                    <div>
                      <FormLabel>Fin</FormLabel>
                      <Input
                        type="date"
                        value={entry.endDate || ""}
                        disabled={entry.isCurrent}
                        onChange={(e) => updateExperience(entry.id, "endDate", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={entry.isCurrent}
                      onCheckedChange={(checked) => updateExperience(entry.id, "isCurrent", checked === true)}
                      id={`experience-current-${entry.id}`}
                    />
                    <label htmlFor={`experience-current-${entry.id}`} className="text-sm text-muted-foreground">
                      Poste en cours
                    </label>
                  </div>

                  <div>
                    <FormLabel>Description des missions</FormLabel>
                    <Textarea
                      value={entry.missionDescription}
                      onChange={(e) => updateExperience(entry.id, "missionDescription", e.target.value)}
                      placeholder="Decrivez vos responsabilites principales..."
                      className="min-h-[90px] resize-none"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          </div>

          <div
            ref={(el) => {
              sectionRefs.current.preferences = el;
            }}
            className={`transition-all duration-500 rounded-2xl ${highlightedSection === "preferences" ? "ring-2 ring-primary/60 bg-primary/5 p-1" : ""}`}
          >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              <FormField
                control={form.control}
                name="salaryExpectation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prétentions salariales</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-salary">
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SALARY_EXPECTATIONS_SORTED.map((salaryOption) => (
                          <SelectItem key={salaryOption.value} value={salaryOption.value}>
                            {salaryOption.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="availableFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Disponibilité</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-availability">
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {AVAILABILITY_OPTIONS_SORTED.map((availabilityOption) => (
                          <SelectItem key={availabilityOption.value} value={availabilityOption.value}>
                            {availabilityOption.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          </div>

          <Button 
            type="submit"
            size="lg"
            className="w-full gap-2"
            data-testid="button-save-profile"
            disabled={saveProfileMutation.isPending}
          >
            {saveProfileMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Enregistrer les modifications
              </>
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
