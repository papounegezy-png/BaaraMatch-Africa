import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  SelectItem,
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
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User, CandidateProfile } from "@shared/schema";

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

interface MobileProfileEditorProps {
  user: User;
  profile?: CandidateProfile;
  onSave?: (data: ProfileFormData) => void;
}

export function MobileProfileEditor({ user, profile, onSave }: MobileProfileEditorProps) {
  const { toast } = useToast();
  const [skills, setSkills] = useState<string[]>(profile?.skills || []);
  const [newSkill, setNewSkill] = useState("");
  const [isRecording, setIsRecording] = useState(false);

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
    if (profile?.education) score++;
    if (profile?.whatsappNumber) score++;
    if (skills && skills.length > 0) score++;
    if (profile?.voiceCvUrl) score++;
    
    return Math.round((score / total) * 100);
  }

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleVoiceCV = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      toast({
        title: "Enregistrement démarré",
        description: "Présentez-vous en quelques phrases...",
      });
    } else {
      toast({
        title: "Enregistrement terminé",
        description: "Votre CV vocal a été enregistré.",
      });
    }
  };

  const onSubmit = (data: ProfileFormData) => {
    if (onSave) {
      onSave(data);
    }
    toast({
      title: "Profil mis à jour",
      description: "Vos modifications ont été enregistrées.",
    });
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
                data-testid="button-change-avatar"
              >
                <Camera className="h-4 w-4" />
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Mic className="h-4 w-4 text-primary" />
            CV Vocal WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Enregistrez une courte présentation audio pour vous démarquer auprès des recruteurs.
          </p>
          <Button 
            variant={isRecording ? "destructive" : "outline"} 
            className="w-full gap-2"
            onClick={handleVoiceCV}
            data-testid="button-record-voice-cv"
          >
            <Mic className={`h-4 w-4 ${isRecording ? "animate-pulse" : ""}`} />
            {isRecording ? "Arrêter l'enregistrement" : "Enregistrer mon CV vocal"}
          </Button>
          {profile?.voiceCvUrl && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-600 dark:text-green-400">CV vocal enregistré</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      <FormLabel className="flex items-center gap-1 text-green-600">
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
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Ex: Développeur Full Stack"
                        data-testid="input-title" 
                      />
                    </FormControl>
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
                  <Input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="Ajouter une compétence"
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                    data-testid="input-new-skill"
                  />
                  <Button type="button" size="icon" onClick={addSkill} data-testid="button-add-skill">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="gap-1 pr-1">
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="ml-1 hover:text-destructive"
                        data-testid={`button-remove-skill-${skill}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Formation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="education"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Niveau d'études</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-education">
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="bac">Baccalauréat</SelectItem>
                        <SelectItem value="bac+2">Bac+2 (BTS, DUT)</SelectItem>
                        <SelectItem value="bac+3">Bac+3 (Licence)</SelectItem>
                        <SelectItem value="bac+5">Bac+5 (Master)</SelectItem>
                        <SelectItem value="bac+8">Doctorat</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                        <SelectItem value="200-400">200K - 400K FCFA</SelectItem>
                        <SelectItem value="400-600">400K - 600K FCFA</SelectItem>
                        <SelectItem value="600-800">600K - 800K FCFA</SelectItem>
                        <SelectItem value="800-1M">800K - 1M FCFA</SelectItem>
                        <SelectItem value="1M+">1M+ FCFA</SelectItem>
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
                        <SelectItem value="immediate">Immédiate</SelectItem>
                        <SelectItem value="1-week">1 semaine</SelectItem>
                        <SelectItem value="2-weeks">2 semaines</SelectItem>
                        <SelectItem value="1-month">1 mois</SelectItem>
                        <SelectItem value="3-months">3 mois</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Button 
            type="submit" 
            className="w-full gap-2 h-12"
            data-testid="button-save-profile"
          >
            <Save className="h-4 w-4" />
            Enregistrer les modifications
          </Button>
        </form>
      </Form>
    </div>
  );
}
