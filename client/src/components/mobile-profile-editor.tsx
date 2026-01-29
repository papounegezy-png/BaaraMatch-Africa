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
  MicOff,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Plus,
  X,
  Save,
  ChevronRight,
  CheckCircle2,
  Play,
  Pause,
  Trash2,
  Upload,
  FileText,
  StopCircle,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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
  const queryClient = useQueryClient();
  const [skills, setSkills] = useState<string[]>(profile?.skills || []);
  const [newSkill, setNewSkill] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasVoiceCV, setHasVoiceCV] = useState(!!profile?.voiceCvUrl);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [cvFileName, setCvFileName] = useState<string | null>(null);
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const [voiceCvBlob, setVoiceCvBlob] = useState<Blob | null>(null);
  const [voiceCvUrl, setVoiceCvUrl] = useState<string | null>(profile?.voiceCvUrl || null);

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
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de sauvegarder le profil.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (isRecording) {
      recordingInterval.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 60) {
            handleStopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
    }
    return () => {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
    };
  }, [isRecording]);

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      recordingStartTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach(track => track.stop());
        
        const elapsedSeconds = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
        
        if (elapsedSeconds >= 5) {
          setVoiceCvBlob(audioBlob);
          const blobUrl = URL.createObjectURL(audioBlob);
          setVoiceCvUrl(blobUrl);
          setHasVoiceCV(true);
          toast({
            title: "CV Vocal enregistré !",
            description: `Durée: ${formatTime(elapsedSeconds)}`,
          });
        } else {
          setRecordingTime(0);
          toast({
            title: "Enregistrement trop court",
            description: "Votre présentation doit durer au moins 5 secondes.",
            variant: "destructive",
          });
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      toast({
        title: "Enregistrement démarré",
        description: "Présentez-vous en quelques phrases (max 1 min)...",
      });
    } catch (error) {
      toast({
        title: "Accès au microphone refusé",
        description: "Veuillez autoriser l'accès au microphone dans les paramètres de votre navigateur.",
        variant: "destructive",
      });
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handlePlayVoiceCV = () => {
    if (isPlayingVoice && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlayingVoice(false);
      return;
    }
    
    const audioSource = voiceCvUrl || profile?.voiceCvUrl;
    if (!audioSource) return;
    
    const audio = new Audio(audioSource);
    audioRef.current = audio;
    
    audio.onended = () => {
      setIsPlayingVoice(false);
    };
    
    audio.onerror = () => {
      setIsPlayingVoice(false);
      toast({
        title: "Erreur de lecture",
        description: "Impossible de lire le CV vocal.",
        variant: "destructive",
      });
    };
    
    audio.play().catch(() => {
      setIsPlayingVoice(false);
    });
    setIsPlayingVoice(true);
  };

  const handleDeleteVoiceCV = () => {
    setHasVoiceCV(false);
    setVoiceCvBlob(null);
    setVoiceCvUrl(null);
    setRecordingTime(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    toast({
      title: "CV Vocal supprimé",
      description: "Vous pouvez en enregistrer un nouveau.",
    });
  };

  const handleCVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Fichier trop volumineux",
          description: "La taille maximum est de 5 Mo.",
          variant: "destructive",
        });
        return;
      }
      setCvFileName(file.name);
      toast({
        title: "CV uploadé",
        description: file.name,
      });
    }
  };

  const onSubmit = (data: ProfileFormData) => {
    const userUpdates: Record<string, unknown> = {
      fullName: data.fullName,
      phone: data.phone,
      city: data.city,
    };

    const profileUpdates: Record<string, unknown> = {
      title: data.title,
      bio: data.bio,
      experience: data.experience,
      education: data.education,
      whatsappNumber: data.whatsappNumber,
      availableFrom: data.availableFrom,
      salaryExpectation: data.salaryExpectation,
      skills: skills,
    };

    saveProfileMutation.mutate({ userUpdates, profileUpdates });
    
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

      <Card className="overflow-hidden">
        <CardHeader className="pb-2 bg-gradient-to-r from-accent/10 to-accent/5">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center">
              <Mic className="h-4 w-4 text-white" />
            </div>
            CV Vocal WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <p className="text-sm text-muted-foreground">
            Enregistrez une courte présentation audio (style message vocal) pour vous démarquer.
          </p>

          {!hasVoiceCV && !isRecording && (
            <div className="flex flex-col items-center py-6 space-y-4">
              <Button
                onClick={handleStartRecording}
                className="rounded-full bg-accent hover:bg-accent/90 shadow-lg"
                size="lg"
                data-testid="button-start-recording"
              >
                <Mic className="h-6 w-6 mr-2" />
                Enregistrer
              </Button>
              <p className="text-sm text-muted-foreground">Appuyez pour enregistrer</p>
            </div>
          )}

          {isRecording && (
            <div className="flex flex-col items-center py-6 space-y-4">
              <Button
                onClick={handleStopRecording}
                variant="destructive"
                size="lg"
                className="rounded-full shadow-lg"
                data-testid="button-stop-recording"
              >
                <StopCircle className="h-6 w-6 mr-2" />
                Arrêter
              </Button>
              <div className="flex items-center gap-3">
                <div className="flex gap-0.5">
                  {[...Array(12)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-red-500 rounded-full animate-pulse"
                      style={{
                        height: `${8 + Math.random() * 16}px`,
                        animationDelay: `${i * 0.1}s`,
                      }}
                    />
                  ))}
                </div>
                <span className="font-mono text-lg font-semibold text-destructive">
                  {formatTime(recordingTime)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Enregistrement en cours...</p>
            </div>
          )}

          {hasVoiceCV && !isRecording && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-accent/10 border border-accent/20">
                <Button
                  onClick={handlePlayVoiceCV}
                  size="icon"
                  className="rounded-full bg-accent hover:bg-accent/90 shrink-0"
                  data-testid="button-play-voice"
                  disabled={!voiceCvUrl && !profile?.voiceCvUrl}
                >
                  {isPlayingVoice ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5 ml-0.5" />
                  )}
                </Button>
                <div className="flex-1">
                  <div className="flex gap-0.5 items-center h-8">
                    {[...Array(30)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-accent/60 rounded-full"
                        style={{ height: `${4 + Math.random() * 20}px` }}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatTime(recordingTime || 45)} • CV vocal enregistré
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDeleteVoiceCV}
                  className="text-destructive"
                  data-testid="button-delete-voice"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleStartRecording}
                data-testid="button-rerecord"
              >
                <Mic className="h-4 w-4" />
                Réenregistrer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            CV Document
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Uploadez votre CV au format PDF ou Word (max 5 Mo).
          </p>
          {cvFileName ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <FileText className="h-8 w-8 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{cvFileName}</p>
                <p className="text-xs text-muted-foreground">Document uploadé</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCvFileName(null)}
                className="text-destructive shrink-0"
                data-testid="button-delete-cv"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <label className="block cursor-pointer">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={handleCVUpload}
                data-testid="input-cv-upload"
              />
              <div className="flex items-center justify-center gap-2 p-8 rounded-xl border-2 border-dashed border-muted-foreground/30 hover-elevate">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Cliquez pour uploader</span>
              </div>
            </label>
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
