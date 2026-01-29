import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Camera,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Edit,
  Calendar,
  DollarSign,
  CheckCircle2,
  Loader2,
  MessageCircle,
  Mic,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { User, CandidateProfile } from "@shared/schema";

interface ProfileViewProps {
  user: User;
  onEdit: () => void;
}

export function ProfileView({ user, onEdit }: ProfileViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: profileData } = useQuery<{ user: User; profile: CandidateProfile | null }>({
    queryKey: ["/api/profile"],
  });

  const profile = profileData?.profile;
  const currentUser = profileData?.user || user;

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
        description: "Impossible de télécharger la photo.",
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
        description: "Veuillez sélectionner une image.",
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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const calculateProfileCompletion = () => {
    let score = 0;
    const total = 10;
    
    if (currentUser.fullName) score++;
    if (currentUser.phone) score++;
    if (currentUser.city) score++;
    if (profile?.title) score++;
    if (profile?.bio) score++;
    if (profile?.experience) score++;
    if (profile?.education) score++;
    if (profile?.whatsappNumber) score++;
    if (profile?.skills && profile.skills.length > 0) score++;
    if (profile?.voiceCvUrl) score++;
    
    return Math.round((score / total) * 100);
  };

  const profileCompletion = calculateProfileCompletion();

  return (
    <div className="space-y-4 pb-24">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        data-testid="input-avatar-upload"
      />

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4">
              <Avatar className="h-24 w-24 ring-4 ring-primary/20">
                <AvatarImage src={currentUser.avatarUrl || undefined} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
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
            
            <h2 className="text-xl font-bold" data-testid="text-profile-name">{currentUser.fullName}</h2>
            {profile?.title && (
              <p className="text-muted-foreground" data-testid="text-profile-title">{profile.title}</p>
            )}
            
            <div className="flex flex-wrap justify-center gap-2 mt-3">
              {currentUser.city && (
                <Badge variant="secondary" className="gap-1">
                  <MapPin className="h-3 w-3" />
                  {currentUser.city}
                </Badge>
              )}
              {currentUser.isVerified && (
                <Badge className="gap-1 bg-accent">
                  <CheckCircle2 className="h-3 w-3" />
                  Vérifié
                </Badge>
              )}
            </div>

            <div className="w-full mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Profil complété</span>
                <span className="font-medium">{profileCompletion}%</span>
              </div>
              <Progress value={profileCompletion} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Contact
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {currentUser.phone ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span data-testid="text-phone">{currentUser.phone}</span>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Aucun numéro de téléphone</p>
          )}
          
          {profile?.whatsappNumber ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/10">
              <MessageCircle className="h-4 w-4 text-accent" />
              <span data-testid="text-whatsapp">{profile.whatsappNumber}</span>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Aucun numéro WhatsApp</p>
          )}
        </CardContent>
      </Card>

      {profile?.bio && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">À propos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground" data-testid="text-bio">{profile.bio}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Expérience professionnelle
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {profile?.experience ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span data-testid="text-experience">
                {profile.experience === "0-1" && "0-1 an"}
                {profile.experience === "1-3" && "1-3 ans"}
                {profile.experience === "3-5" && "3-5 ans"}
                {profile.experience === "5-10" && "5-10 ans"}
                {profile.experience === "10+" && "10+ ans"}
                {!["0-1", "1-3", "3-5", "5-10", "10+"].includes(profile.experience) && profile.experience}
              </span>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Aucune expérience renseignée</p>
          )}

          {profile?.salaryExpectation && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/10">
              <DollarSign className="h-4 w-4 text-accent" />
              <span data-testid="text-salary">{profile.salaryExpectation} FCFA/mois</span>
            </div>
          )}

          {profile?.availableFrom && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10">
              <Calendar className="h-4 w-4 text-primary" />
              <span data-testid="text-available">Disponible à partir du {profile.availableFrom}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Formation
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profile?.education ? (
            <p className="text-sm" data-testid="text-education">{profile.education}</p>
          ) : (
            <p className="text-muted-foreground text-sm">Aucune formation renseignée</p>
          )}
        </CardContent>
      </Card>

      {profile?.skills && profile.skills.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Compétences</CardTitle>
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
      )}

      {profile?.voiceCvUrl && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Mic className="h-4 w-4" />
              CV Vocal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/10">
              <CheckCircle2 className="h-4 w-4 text-accent" />
              <span className="text-sm">CV vocal enregistré</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Button 
        size="lg" 
        className="w-full gap-2" 
        onClick={onEdit}
        data-testid="button-edit-profile"
      >
        <Edit className="h-4 w-4" />
        Modifier mon profil
      </Button>
    </div>
  );
}
