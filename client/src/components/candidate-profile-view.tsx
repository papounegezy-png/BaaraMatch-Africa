import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { SendMessageDialog } from "@/components/send-message-dialog";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Calendar,
  Globe,
  Mic,
  Play,
  Pause,
  Download,
  Edit,
  MessageSquare,
  CalendarPlus,
  Star,
  Clock,
  FileText,
  Award,
  Languages,
  DollarSign,
  User as UserIcon,
} from "lucide-react";
import { useState, useRef } from "react";
import type { User, CandidateProfile } from "@shared/schema";

interface CandidateProfileViewProps {
  candidateId: string;
  backHref?: string;
  backLabel?: string;
}

export function CandidateProfileView({ candidateId, backHref = "/agency/candidates", backLabel = "Retour aux candidats" }: CandidateProfileViewProps) {
  const [, setLocation] = useLocation();
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data: candidate, isLoading, error } = useQuery<User & { profile?: CandidateProfile }>({
    queryKey: ['/api/candidates', candidateId],
    queryFn: async () => {
      const response = await fetch(`/api/candidates/${candidateId}`);
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || "Candidat non trouvé");
      }
      return response.json();
    },
  });

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
  };

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "Non spécifié";
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const toggleAudio = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setAudioProgress(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[400px] lg:col-span-1" />
          <Skeleton className="h-[400px] lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground" role="alert">
          {error instanceof Error ? error.message : "Candidat non trouvé"}
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => setLocation(backHref)}
          data-testid="button-back-to-candidates"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {backLabel}
        </Button>
      </div>
    );
  }

  const profile = candidate.profile;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation(backHref)}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Profil du candidat</h1>
            <p className="text-muted-foreground">Détails complets et historique</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="button-edit-candidate">
            <Edit className="h-4 w-4 mr-2" />
            Modifier
          </Button>
          <Button onClick={() => setIsMessageOpen(true)} data-testid="button-contact-candidate-profile">
            <MessageSquare className="h-4 w-4 mr-2" />
            Contacter
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarImage src={candidate.avatarUrl || undefined} />
                  <AvatarFallback className="text-2xl">
                    {getInitials(candidate.fullName)}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold">{candidate.fullName}</h2>
                {profile?.title && (
                  <p className="text-muted-foreground">{profile.title}</p>
                )}
                <Badge className="mt-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Disponible
                </Badge>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <a href={`mailto:${candidate.email}`} className="text-primary hover:underline truncate">
                    {candidate.email}
                  </a>
                </div>
                {candidate.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <a href={`tel:${candidate.phone}`} className="hover:underline">
                      {candidate.phone}
                    </a>
                  </div>
                )}
                {(candidate.city || candidate.country) && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span>{[candidate.city, candidate.country].filter(Boolean).join(", ")}</span>
                  </div>
                )}
                {profile?.whatsappNumber && (
                  <div className="flex items-center gap-3 text-sm">
                    <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span>{profile.whatsappNumber}</span>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t">
                <div className="flex gap-2">
                  <Button 
                    className="flex-1" 
                    size="sm"
                    onClick={() => window.open(`mailto:${candidate.email}`, '_blank')}
                    data-testid="button-quick-email"
                  >
                    <Mail className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1" 
                    size="sm"
                    onClick={() => window.open(`tel:${candidate.phone}`, '_blank')}
                    data-testid="button-quick-phone"
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1" 
                    size="sm"
                    onClick={() => window.open(`https://wa.me/${(profile?.whatsappNumber || candidate.phone || '').replace(/\D/g, '')}`, '_blank')}
                    data-testid="button-quick-whatsapp"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {profile?.voiceCvUrl && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Mic className="h-4 w-4 text-primary" />
                  CV Vocal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <audio
                  ref={audioRef}
                  src={profile.voiceCvUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={() => setIsPlaying(false)}
                  className="hidden"
                />
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full h-12 w-12"
                      onClick={toggleAudio}
                      data-testid="button-play-voice-cv"
                    >
                      {isPlaying ? (
                        <Pause className="h-5 w-5" />
                      ) : (
                        <Play className="h-5 w-5 ml-0.5" />
                      )}
                    </Button>
                    <div className="flex-1">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-100"
                          style={{ 
                            width: audioDuration > 0 ? `${(audioProgress / audioDuration) * 100}%` : "0%" 
                          }}
                        />
                      </div>
                      <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                        <span>{formatTime(audioProgress)}</span>
                        <span>{formatTime(audioDuration)}</span>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => window.open(profile.voiceCvUrl!, '_blank')}
                    data-testid="button-download-voice-cv"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Informations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Inscrit le</span>
                <span>{formatDate(candidate.createdAt)}</span>
              </div>
              {profile?.availableFrom && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Disponible à partir</span>
                  <span>{formatDate(profile.availableFrom)}</span>
                </div>
              )}
              {profile?.preferredContact && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contact préféré</span>
                  <span className="capitalize">{profile.preferredContact}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {profile?.bio && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-primary" />
                  À propos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {profile.bio}
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" />
                Expérience professionnelle
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{profile?.experienceYears || 0} ans d'expérience</p>
                    <p className="text-sm text-muted-foreground">
                      {profile?.experience || "Aucune expérience renseignée"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary" />
                Formation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <GraduationCap className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{profile?.educationLevel || "Non spécifié"}</p>
                    <p className="text-sm text-muted-foreground">
                      {profile?.education || "Aucune formation renseignée"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                Compétences
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {profile?.skills && profile.skills.length > 0 ? (
                  profile.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-sm">
                      {skill}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Aucune compétence renseignée</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Languages className="h-4 w-4 text-primary" />
                Langues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {profile?.languages && profile.languages.length > 0 ? (
                  profile.languages.map((lang) => (
                    <Badge key={lang} variant="outline" className="text-sm">
                      <Globe className="h-3 w-3 mr-1" />
                      {lang}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Aucune langue renseignée</p>
                )}
              </div>
            </CardContent>
          </Card>

          {profile?.salaryExpectation && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  Prétentions salariales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{profile.salaryExpectation.toLocaleString()} FCFA / mois</p>
                    <p className="text-sm text-muted-foreground">Salaire mensuel souhaité</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarPlus className="h-4 w-4 text-primary" />
                Actions rapides
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Button 
                  variant="outline" 
                  className="flex flex-col h-auto py-4 gap-2"
                  data-testid="button-assign-mission"
                >
                  <Briefcase className="h-5 w-5" />
                  <span className="text-xs">Assigner mission</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="flex flex-col h-auto py-4 gap-2"
                  data-testid="button-schedule-interview"
                >
                  <Calendar className="h-5 w-5" />
                  <span className="text-xs">Planifier entretien</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="flex flex-col h-auto py-4 gap-2"
                  data-testid="button-add-notes"
                >
                  <FileText className="h-5 w-5" />
                  <span className="text-xs">Ajouter notes</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="flex flex-col h-auto py-4 gap-2"
                  data-testid="button-view-history"
                >
                  <Clock className="h-5 w-5" />
                  <span className="text-xs">Historique</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <SendMessageDialog
        candidateId={candidate.id}
        candidateName={candidate.fullName}
        open={isMessageOpen}
        onOpenChange={setIsMessageOpen}
      />
    </div>
  );
}
