import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Languages,
  Calendar,
  Banknote,
  Plus,
  X,
  ArrowLeft,
  Save,
  Loader2,
  CheckCircle,
  FileText,
  Upload,
  File,
  Trash2,
  Award,
  IdCard,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const educationLevels = [
  { value: "none", label: "Sans diplôme" },
  { value: "bac", label: "Baccalauréat" },
  { value: "bac+2", label: "Bac+2 (BTS, DUT)" },
  { value: "bac+3", label: "Bac+3 (Licence)" },
  { value: "bac+5", label: "Bac+5 (Master)" },
  { value: "bac+8", label: "Doctorat" },
];

const languagesList = [
  "Français",
  "Anglais", 
  "Arabe",
  "Wolof",
  "Peul",
  "Mandingue",
  "Sérère",
  "Diola",
  "Portugais",
  "Espagnol",
];

const availabilityOptions = [
  { value: "immediate", label: "Immédiate" },
  { value: "1_week", label: "1 semaine" },
  { value: "2_weeks", label: "2 semaines" },
  { value: "1_month", label: "1 mois" },
  { value: "3_months", label: "3 mois" },
];

interface UploadedFile {
  file: File;
  type: "cv" | "diploma" | "certificate" | "id" | "other";
  name: string;
}

export function NewCandidateForm() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [skillInput, setSkillInput] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<UploadedFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    whatsappNumber: "",
    city: "",
    // Left empty unless the agency types it — no assumed country.
    country: "",
    title: "",
    bio: "",
    skills: [] as string[],
    experience: "",
    experienceYears: "",
    education: "",
    educationLevel: "",
    languages: [] as string[],
    availableFrom: "immediate",
    salaryExpectation: "",
    preferredContact: "whatsapp",
    enableWhatsappNotifications: true,
  });

  const createCandidateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/candidates', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      toast({
        title: "Candidat créé",
        description: "Le nouveau candidat a été ajouté avec succès",
      });
      setLocation("/agency/candidates");
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le candidat",
        variant: "destructive",
      });
    },
  });

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData({ ...formData, skills: [...formData.skills, skillInput.trim()] });
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({ ...formData, skills: formData.skills.filter(s => s !== skill) });
  };

  const toggleLanguage = (lang: string) => {
    if (formData.languages.includes(lang)) {
      setFormData({ ...formData, languages: formData.languages.filter(l => l !== lang) });
    } else {
      setFormData({ ...formData, languages: [...formData.languages, lang] });
    }
  };

  const handleCvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Fichier trop volumineux",
          description: "Le CV doit faire moins de 5 Mo",
          variant: "destructive",
        });
        return;
      }
      const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Format non supporté",
          description: "Veuillez télécharger un fichier PDF ou Word",
          variant: "destructive",
        });
        return;
      }
      setCvFile(file);
    }
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>, docType: UploadedFile["type"]) => {
    const files = e.target.files;
    if (files) {
      const newDocs: UploadedFile[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: "Fichier trop volumineux",
            description: `${file.name} doit faire moins de 5 Mo`,
            variant: "destructive",
          });
          continue;
        }
        newDocs.push({ file, type: docType, name: file.name });
      }
      setDocuments([...documents, ...newDocs]);
    }
  };

  const removeDocument = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  const getDocTypeLabel = (type: UploadedFile["type"]) => {
    const labels: Record<UploadedFile["type"], string> = {
      cv: "CV",
      diploma: "Diplôme",
      certificate: "Certificat",
      id: "Pièce d'identité",
      other: "Autre",
    };
    return labels[type];
  };

  const getDocTypeIcon = (type: UploadedFile["type"]) => {
    const icons: Record<UploadedFile["type"], React.ReactNode> = {
      cv: <FileText className="h-4 w-4" />,
      diploma: <GraduationCap className="h-4 w-4" />,
      certificate: <Award className="h-4 w-4" />,
      id: <IdCard className="h-4 w-4" />,
      other: <File className="h-4 w-4" />,
    };
    return icons[type];
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko';
    return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
  };

  const handleSubmit = () => {
    if (!formData.fullName || !formData.email || !formData.phone) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir le nom, l'email et le téléphone",
        variant: "destructive",
      });
      return;
    }

    const candidateData = {
      user: {
        email: formData.email,
        fullName: formData.fullName,
        phone: formData.phone,
        city: formData.city,
        country: formData.country,
        userType: "candidate",
        password: Math.random().toString(36).slice(-8),
      },
      profile: {
        title: formData.title,
        bio: formData.bio,
        skills: formData.skills,
        experience: formData.experience,
        experienceYears: formData.experienceYears ? parseInt(formData.experienceYears) : null,
        education: formData.education,
        educationLevel: formData.educationLevel,
        languages: formData.languages,
        availableFrom: formData.availableFrom,
        salaryExpectation: formData.salaryExpectation,
        whatsappNumber: formData.whatsappNumber || formData.phone,
        preferredContact: formData.preferredContact,
      }
    };

    createCandidateMutation.mutate(candidateData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setLocation("/agency/candidates")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Nouveau Candidat
          </h1>
          <p className="text-sm text-muted-foreground">
            Ajouter un nouveau candidat à votre base de données
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" />
              Informations personnelles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nom complet *</Label>
              <Input
                id="fullName"
                placeholder="Ex: Mamadou Diallo"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                data-testid="input-fullname"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="email@exemple.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10"
                  data-testid="input-email"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    placeholder="+221 77 123 45 67"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="pl-10"
                    data-testid="input-phone"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  placeholder="Même que téléphone si vide"
                  value={formData.whatsappNumber}
                  onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                  data-testid="input-whatsapp"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Ville</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="city"
                    placeholder="Ex: Dakar"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="pl-10"
                    data-testid="input-city"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Pays</Label>
                <Input
                  id="country"
                  placeholder="Ex. Mali"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  data-testid="input-country"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5">
                <Label>Notifications WhatsApp</Label>
                <p className="text-xs text-muted-foreground">Recevoir les alertes emploi par WhatsApp</p>
              </div>
              <Switch
                checked={formData.enableWhatsappNotifications}
                onCheckedChange={(checked) => setFormData({ ...formData, enableWhatsappNotifications: checked })}
                data-testid="switch-whatsapp-notifications"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Briefcase className="h-5 w-5 text-primary" />
              Profil professionnel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre / Poste recherché</Label>
              <Input
                id="title"
                placeholder="Ex: Développeur Web Full Stack"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                data-testid="input-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Présentation</Label>
              <Textarea
                id="bio"
                placeholder="Brève description du candidat..."
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={3}
                data-testid="input-bio"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Années d'expérience</Label>
                <Input
                  type="number"
                  placeholder="Ex: 5"
                  value={formData.experienceYears}
                  onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                  data-testid="input-experience-years"
                />
              </div>
              <div className="space-y-2">
                <Label>Niveau d'études</Label>
                <Select 
                  value={formData.educationLevel} 
                  onValueChange={(v) => setFormData({ ...formData, educationLevel: v })}
                >
                  <SelectTrigger data-testid="select-education">
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {educationLevels.map((level) => (
                      <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience">Expérience professionnelle</Label>
              <Textarea
                id="experience"
                placeholder="Détails de l'expérience professionnelle..."
                value={formData.experience}
                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                rows={3}
                data-testid="input-experience"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="education">Formation</Label>
              <Textarea
                id="education"
                placeholder="Diplômes et formations..."
                value={formData.education}
                onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                rows={2}
                data-testid="input-education"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <GraduationCap className="h-5 w-5 text-primary" />
              Compétences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Ajouter une compétence</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: React, Python, Excel..."
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  data-testid="input-skill"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon"
                  onClick={addSkill}
                  data-testid="button-add-skill"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {formData.skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                    {skill}
                    <button 
                      onClick={() => removeSkill(skill)}
                      className="ml-1 hover:text-destructive"
                      data-testid={`button-remove-skill-${skill}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <div className="space-y-2 pt-2">
              <Label className="flex items-center gap-2">
                <Languages className="h-4 w-4" />
                Langues parlées
              </Label>
              <div className="flex flex-wrap gap-2">
                {languagesList.map((lang) => (
                  <Badge
                    key={lang}
                    variant={formData.languages.includes(lang) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleLanguage(lang)}
                    data-testid={`badge-language-${lang}`}
                  >
                    {formData.languages.includes(lang) && <CheckCircle className="h-3 w-3 mr-1" />}
                    {lang}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              CV & Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Curriculum Vitae (CV)
              </Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                {cvFile ? (
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-sm truncate max-w-[200px]">{cvFile.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(cvFile.size)}</p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setCvFile(null)}
                      data-testid="button-remove-cv"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Glissez-déposez votre CV ou cliquez pour sélectionner
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">PDF ou Word, max 5 Mo</p>
                    <label htmlFor="cv-upload">
                      <Button variant="outline" size="sm" asChild>
                        <span className="cursor-pointer">
                          <Upload className="h-4 w-4 mr-2" />
                          Choisir un fichier
                        </span>
                      </Button>
                    </label>
                    <input
                      id="cv-upload"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleCvUpload}
                      className="hidden"
                      data-testid="input-cv-upload"
                    />
                  </>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <File className="h-4 w-4" />
                Documents complémentaires
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <label htmlFor="diploma-upload" className="cursor-pointer">
                  <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 hover:bg-muted/30 transition-colors">
                    <GraduationCap className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                    <p className="text-xs font-medium">Diplômes</p>
                    <p className="text-xs text-muted-foreground">PDF, Images</p>
                  </div>
                  <input
                    id="diploma-upload"
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleDocumentUpload(e, "diploma")}
                    className="hidden"
                    data-testid="input-diploma-upload"
                  />
                </label>

                <label htmlFor="certificate-upload" className="cursor-pointer">
                  <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 hover:bg-muted/30 transition-colors">
                    <Award className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                    <p className="text-xs font-medium">Certificats</p>
                    <p className="text-xs text-muted-foreground">PDF, Images</p>
                  </div>
                  <input
                    id="certificate-upload"
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleDocumentUpload(e, "certificate")}
                    className="hidden"
                    data-testid="input-certificate-upload"
                  />
                </label>

                <label htmlFor="id-upload" className="cursor-pointer">
                  <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 hover:bg-muted/30 transition-colors">
                    <IdCard className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                    <p className="text-xs font-medium">Pièce d'identité</p>
                    <p className="text-xs text-muted-foreground">PDF, Images</p>
                  </div>
                  <input
                    id="id-upload"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleDocumentUpload(e, "id")}
                    className="hidden"
                    data-testid="input-id-upload"
                  />
                </label>

                <label htmlFor="other-upload" className="cursor-pointer">
                  <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 hover:bg-muted/30 transition-colors">
                    <File className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                    <p className="text-xs font-medium">Autres</p>
                    <p className="text-xs text-muted-foreground">PDF, Images</p>
                  </div>
                  <input
                    id="other-upload"
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleDocumentUpload(e, "other")}
                    className="hidden"
                    data-testid="input-other-upload"
                  />
                </label>
              </div>

              {documents.length > 0 && (
                <div className="space-y-2 mt-4">
                  <p className="text-sm font-medium">{documents.length} document(s) ajouté(s)</p>
                  <div className="space-y-2">
                    {documents.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                            {getDocTypeIcon(doc.type)}
                          </div>
                          <div>
                            <p className="text-sm truncate max-w-[200px]">{doc.name}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{getDocTypeLabel(doc.type)}</Badge>
                              <span className="text-xs text-muted-foreground">{formatFileSize(doc.file.size)}</span>
                            </div>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => removeDocument(index)}
                          data-testid={`button-remove-doc-${index}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Téléchargement en cours...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-primary" />
              Disponibilité & Prétentions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Disponibilité</Label>
              <Select 
                value={formData.availableFrom} 
                onValueChange={(v) => setFormData({ ...formData, availableFrom: v })}
              >
                <SelectTrigger data-testid="select-availability">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availabilityOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Banknote className="h-4 w-4" />
                Prétentions salariales
              </Label>
              <Input
                placeholder="Ex: 500 000 - 700 000 XOF/mois"
                value={formData.salaryExpectation}
                onChange={(e) => setFormData({ ...formData, salaryExpectation: e.target.value })}
                data-testid="input-salary"
              />
            </div>

            <div className="space-y-2">
              <Label>Moyen de contact préféré</Label>
              <Select 
                value={formData.preferredContact} 
                onValueChange={(v) => setFormData({ ...formData, preferredContact: v })}
              >
                <SelectTrigger data-testid="select-contact-preference">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="phone">Téléphone</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-4">
        <Button 
          variant="outline"
          onClick={() => setLocation("/agency/candidates")}
        >
          Annuler
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={createCandidateMutation.isPending}
          data-testid="button-submit-candidate"
        >
          {createCandidateMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Enregistrer le candidat
        </Button>
      </div>
    </div>
  );
}
