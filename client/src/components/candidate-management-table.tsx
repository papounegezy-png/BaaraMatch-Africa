import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { 
  Search, 
  Filter, 
  Mic, 
  Play, 
  Pause,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  MapPin,
  Briefcase,
  Star,
  MoreHorizontal,
  Loader2,
  Brain,
  RefreshCw,
  Mail,
  Phone,
  Calendar,
  X,
  User as UserIcon,
  FileText,
  Award,
  Clock,
  MessageSquare,
  Send,
  CalendarPlus,
  CheckCircle
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { JobPosting, CandidateProfile, User } from "@shared/schema";

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  skills: string[];
  experience: number;
  matchScore: number;
  status: "available" | "interviewing" | "placed" | "inactive";
  hasVoiceCV: boolean;
  voiceCVUrl?: string;
  avatarUrl?: string;
  appliedDate: string;
}

const mockCandidates: Candidate[] = [
  {
    id: "1",
    name: "Amadou Diallo",
    email: "amadou@example.com",
    phone: "+221 77 123 4567",
    city: "Dakar",
    skills: ["JavaScript", "React", "Node.js"],
    experience: 5,
    matchScore: 92,
    status: "available",
    hasVoiceCV: true,
    appliedDate: "2026-01-25",
  },
  {
    id: "2",
    name: "Fatou Sow",
    email: "fatou@example.com",
    phone: "+223 66 789 0123",
    city: "Bamako",
    skills: ["Python", "Data Analysis", "SQL"],
    experience: 3,
    matchScore: 88,
    status: "interviewing",
    hasVoiceCV: true,
    appliedDate: "2026-01-24",
  },
  {
    id: "3",
    name: "Ibrahim Koné",
    email: "ibrahim@example.com",
    phone: "+225 07 456 7890",
    city: "Abidjan",
    skills: ["Java", "Spring Boot", "AWS"],
    experience: 7,
    matchScore: 95,
    status: "available",
    hasVoiceCV: false,
    appliedDate: "2026-01-23",
  },
  {
    id: "4",
    name: "Mariam Traoré",
    email: "mariam@example.com",
    phone: "+221 78 234 5678",
    city: "Dakar",
    skills: ["UI/UX", "Figma", "Adobe XD"],
    experience: 4,
    matchScore: 85,
    status: "placed",
    hasVoiceCV: true,
    appliedDate: "2026-01-22",
  },
  {
    id: "5",
    name: "Oumar Cissé",
    email: "oumar@example.com",
    phone: "+223 65 345 6789",
    city: "Bamako",
    skills: ["DevOps", "Docker", "Kubernetes"],
    experience: 6,
    matchScore: 90,
    status: "available",
    hasVoiceCV: true,
    appliedDate: "2026-01-21",
  },
];

const skillOptions = [
  "JavaScript", "React", "Node.js", "Python", "Java", 
  "SQL", "AWS", "Docker", "Kubernetes", "UI/UX"
];

interface MatchedCandidate {
  id: string;
  user: Omit<User, 'password'>;
  profile?: CandidateProfile;
  matchScore: number;
}

interface MatchingResponse {
  jobId: string;
  jobTitle: string;
  candidates: MatchedCandidate[];
  totalMatches: number;
  filtersApplied: Record<string, string>;
}

export function CandidateManagementTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [playingVoiceCV, setPlayingVoiceCV] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [useSemanticSearch, setUseSemanticSearch] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [showMissionDialog, setShowMissionDialog] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [selectedMissionId, setSelectedMissionId] = useState<string>("");
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewTime, setInterviewTime] = useState("");
  const [interviewNotes, setInterviewNotes] = useState("");
  const { toast } = useToast();
  const itemsPerPage = 5;

  // Fetch all candidates from the database
  const { data: allCandidatesData = [], isLoading: isLoadingAllCandidates } = useQuery<(User & { profile?: CandidateProfile })[]>({
    queryKey: ['/api/candidates'],
  });

  // Fetch jobs for the selector
  const { data: jobs = [], isLoading: isLoadingJobs } = useQuery<JobPosting[]>({
    queryKey: ['/api/jobs'],
  });

  // Fetch matched candidates when a job is selected
  const { data: matchingData, isLoading: isLoadingMatches, refetch: refetchMatches } = useQuery<MatchingResponse>({
    queryKey: ['/api/matching/job', selectedJobId, 'candidates', { skill: selectedSkill }],
    queryFn: async () => {
      if (!selectedJobId || selectedJobId === "none") return { jobId: "", jobTitle: "", candidates: [], totalMatches: 0, filtersApplied: {} };
      const params = new URLSearchParams();
      if (selectedSkill && selectedSkill !== "all") params.append("skills", selectedSkill);
      const response = await fetch(`/api/matching/job/${selectedJobId}/candidates?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch matches");
      return response.json();
    },
    enabled: useSemanticSearch && !!selectedJobId && selectedJobId !== "none",
  });

  // Convert API candidates to our Candidate interface
  const dbCandidates: Candidate[] = allCandidatesData.map((c) => ({
    id: c.id,
    name: c.fullName,
    email: c.email,
    phone: c.phone || "",
    city: c.city || "",
    skills: c.profile?.skills || [],
    experience: c.profile?.experienceYears || 0,
    matchScore: 0,
    status: "available" as const,
    hasVoiceCV: !!c.profile?.voiceCvUrl,
    voiceCVUrl: c.profile?.voiceCvUrl || undefined,
    avatarUrl: c.avatarUrl || undefined,
    appliedDate: c.createdAt?.toString() || new Date().toISOString(),
  }));

  // Use API data for semantic search or fallback to all DB candidates
  const matchedCandidates: Candidate[] = matchingData?.candidates?.map((c) => ({
    id: c.id,
    name: c.user.fullName,
    email: c.user.email,
    phone: c.user.phone || "",
    city: c.user.city || "",
    skills: c.profile?.skills || [],
    experience: c.profile?.experienceYears || 0,
    matchScore: c.matchScore,
    status: "available" as const,
    hasVoiceCV: !!c.profile?.voiceCvUrl,
    voiceCVUrl: c.profile?.voiceCvUrl || undefined,
    avatarUrl: c.user.avatarUrl || undefined,
    appliedDate: c.profile?.createdAt?.toString() || new Date().toISOString(),
  })) || [];

  // Use matched candidates if semantic search is enabled and job selected, otherwise use all DB candidates
  const candidates = useSemanticSearch && selectedJobId && selectedJobId !== "none" 
    ? matchedCandidates 
    : (dbCandidates.length > 0 ? dbCandidates : mockCandidates);

  const filteredCandidates = candidates.filter((candidate) => {
    const matchesSearch = 
      candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesSkill = !selectedSkill || selectedSkill === "all" || candidate.skills.includes(selectedSkill);
    const matchesStatus = !statusFilter || statusFilter === "all" || candidate.status === statusFilter;
    
    return matchesSearch && matchesSkill && matchesStatus;
  });

  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);
  const paginatedCandidates = filteredCandidates.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusBadge = (status: Candidate["status"]) => {
    const variants: Record<Candidate["status"], { label: string; className: string }> = {
      available: { label: "Disponible", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
      interviewing: { label: "En entretien", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
      placed: { label: "Placé", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
      inactive: { label: "Inactif", className: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400" },
    };
    return variants[status];
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
  };

  const toggleVoiceCV = (candidateId: string) => {
    if (playingVoiceCV === candidateId) {
      setPlayingVoiceCV(null);
    } else {
      setPlayingVoiceCV(candidateId);
    }
  };

  const isLoading = isLoadingJobs || isLoadingMatches;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg">Gestion des Candidatures</CardTitle>
            <CardDescription>
              Matching sémantique IA pour trouver les meilleurs candidats
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={useSemanticSearch ? "default" : "outline"}
              size="sm"
              onClick={() => setUseSemanticSearch(!useSemanticSearch)}
              data-testid="button-toggle-semantic"
            >
              <Brain className="h-4 w-4 mr-2" />
              {useSemanticSearch ? "IA Active" : "IA Inactive"}
            </Button>
            {useSemanticSearch && selectedJobId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchMatches()}
                disabled={isLoadingMatches}
                data-testid="button-refresh-matches"
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingMatches ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {useSemanticSearch && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Matching IA pour:</span>
              </div>
              <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                <SelectTrigger className="w-full sm:w-[300px]" data-testid="select-job-matching">
                  <SelectValue placeholder="Sélectionner une offre d'emploi..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune (données de démo)</SelectItem>
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.title} - {job.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isLoadingMatches && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Calcul des scores...
                </div>
              )}
            </div>
            {matchingData?.totalMatches !== undefined && selectedJobId && selectedJobId !== "none" && (
              <p className="text-xs text-muted-foreground mt-2">
                {matchingData.totalMatches} candidat(s) analysés par le moteur de matching sémantique
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Recherche sémantique (nom, compétences, localisation)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-candidates"
            />
          </div>
          
          <Select value={selectedSkill} onValueChange={setSelectedSkill}>
            <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-skill-filter">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Compétences" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {skillOptions.map((skill) => (
                <SelectItem key={skill} value={skill}>{skill}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[160px]" data-testid="select-status-filter">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="available">Disponible</SelectItem>
              <SelectItem value="interviewing">En entretien</SelectItem>
              <SelectItem value="placed">Placé</SelectItem>
              <SelectItem value="inactive">Inactif</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidat</TableHead>
                <TableHead className="hidden md:table-cell">Localisation</TableHead>
                <TableHead className="hidden lg:table-cell">Compétences</TableHead>
                <TableHead className="hidden sm:table-cell">Match IA</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>CV Vocal</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCandidates.map((candidate) => {
                const statusBadge = getStatusBadge(candidate.status);
                return (
                  <TableRow 
                    key={candidate.id} 
                    data-testid={`candidate-row-${candidate.id}`}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedCandidate(candidate)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={candidate.avatarUrl} />
                          <AvatarFallback className="text-xs">
                            {getInitials(candidate.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{candidate.name}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Briefcase className="h-3 w-3" />
                            <span>{candidate.experience} ans</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {candidate.city}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {candidate.skills.slice(0, 2).map((skill) => (
                          <Badge key={skill} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {candidate.skills.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{candidate.skills.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                        <span className="font-medium text-sm">{candidate.matchScore}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusBadge.className}>
                        {statusBadge.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {candidate.hasVoiceCV ? (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              data-testid={`button-voice-cv-${candidate.id}`}
                            >
                              <Mic className="h-4 w-4 text-primary" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>CV Vocal - {candidate.name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="p-4 rounded-lg bg-muted/50">
                                <div className="flex items-center justify-center gap-4">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="rounded-full"
                                    onClick={() => toggleVoiceCV(candidate.id)}
                                    data-testid={`button-play-voice-cv-${candidate.id}`}
                                  >
                                    {playingVoiceCV === candidate.id ? (
                                      <Pause className="h-4 w-4" />
                                    ) : (
                                      <Play className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <div className="flex-1">
                                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-primary transition-all duration-300"
                                        style={{ 
                                          width: playingVoiceCV === candidate.id ? "45%" : "0%" 
                                        }}
                                      />
                                    </div>
                                    <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                                      <span>0:45</span>
                                      <span>1:30</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <p className="text-sm font-medium">Transcription</p>
                                <p className="text-sm text-muted-foreground">
                                  "Bonjour, je suis {candidate.name}. J'ai {candidate.experience} ans 
                                  d'expérience en {candidate.skills.join(", ")}. Je suis basé à {candidate.city} 
                                  et je recherche de nouvelles opportunités..."
                                </p>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredCandidates.length} candidat(s) trouvé(s)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {currentPage} / {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              data-testid="button-next-page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Candidate Details Sheet */}
      <Sheet open={!!selectedCandidate} onOpenChange={(open) => !open && setSelectedCandidate(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="space-y-4 pb-4 border-b">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={selectedCandidate?.avatarUrl} />
                <AvatarFallback className="text-lg">
                  {selectedCandidate ? getInitials(selectedCandidate.name) : ""}
                </AvatarFallback>
              </Avatar>
              <div>
                <SheetTitle className="text-xl">{selectedCandidate?.name}</SheetTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={selectedCandidate ? getStatusBadge(selectedCandidate.status).className : ""}>
                    {selectedCandidate ? getStatusBadge(selectedCandidate.status).label : ""}
                  </Badge>
                  {selectedCandidate && selectedCandidate.matchScore > 0 && (
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                      <span className="font-medium">{selectedCandidate.matchScore}% match</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </SheetHeader>

          {selectedCandidate && (
            <div className="space-y-6 pt-6">
              {/* Contact Information */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Informations de contact
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${selectedCandidate.email}`} className="text-primary hover:underline">
                      {selectedCandidate.email}
                    </a>
                  </div>
                  {selectedCandidate.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${selectedCandidate.phone}`} className="hover:underline">
                        {selectedCandidate.phone}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedCandidate.city || "Non spécifié"}</span>
                  </div>
                </div>
              </div>

              {/* Experience */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Expérience
                </h3>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Briefcase className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{selectedCandidate.experience} ans d'expérience</p>
                    <p className="text-xs text-muted-foreground">Expérience professionnelle</p>
                  </div>
                </div>
              </div>

              {/* Skills */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Compétences
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedCandidate.skills.length > 0 ? (
                    selectedCandidate.skills.map((skill) => (
                      <Badge key={skill} variant="secondary">
                        {skill}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucune compétence renseignée</p>
                  )}
                </div>
              </div>

              {/* Voice CV */}
              {selectedCandidate.hasVoiceCV && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    CV Vocal
                  </h3>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="outline"
                        size="icon"
                        className="rounded-full"
                        onClick={() => toggleVoiceCV(selectedCandidate.id)}
                        data-testid={`button-play-voice-cv-detail-${selectedCandidate.id}`}
                      >
                        {playingVoiceCV === selectedCandidate.id ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <div className="flex-1">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-300"
                            style={{ 
                              width: playingVoiceCV === selectedCandidate.id ? "45%" : "0%" 
                            }}
                          />
                        </div>
                        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                          <span>0:45</span>
                          <span>1:30</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Registration Date */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Inscription
                </h3>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Inscrit le {new Date(selectedCandidate.appliedDate).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  className="flex-1" 
                  data-testid="button-contact-candidate"
                  onClick={() => setShowContactDialog(true)}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Contacter
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  data-testid="button-add-to-mission"
                  onClick={() => setShowMissionDialog(true)}
                >
                  <CalendarPlus className="h-4 w-4 mr-2" />
                  Planifier
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Contact Dialog */}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Contacter {selectedCandidate?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  if (selectedCandidate?.email) {
                    window.open(`mailto:${selectedCandidate.email}`, '_blank');
                    toast({
                      title: "Email ouvert",
                      description: `Ouverture du client mail pour ${selectedCandidate.email}`,
                    });
                  }
                }}
                data-testid="button-email-candidate"
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  if (selectedCandidate?.phone) {
                    window.open(`tel:${selectedCandidate.phone}`, '_blank');
                    toast({
                      title: "Appel initié",
                      description: `Appel vers ${selectedCandidate.phone}`,
                    });
                  }
                }}
                data-testid="button-call-candidate"
              >
                <Phone className="h-4 w-4 mr-2" />
                Appeler
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                onClick={() => {
                  if (selectedCandidate?.phone) {
                    const phone = selectedCandidate.phone.replace(/[^0-9]/g, '');
                    window.open(`https://wa.me/${phone}`, '_blank');
                    toast({
                      title: "WhatsApp ouvert",
                      description: `Ouverture de WhatsApp pour ${selectedCandidate.phone}`,
                    });
                  }
                }}
                data-testid="button-whatsapp-candidate"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                WhatsApp
              </Button>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="message">Message personnalisé</Label>
              <Textarea
                id="message"
                placeholder="Bonjour, nous avons une opportunité intéressante pour vous..."
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                rows={4}
                data-testid="input-contact-message"
              />
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  setShowContactDialog(false);
                  setContactMessage("");
                }}
              >
                Annuler
              </Button>
              <Button 
                className="flex-1"
                onClick={() => {
                  if (selectedCandidate?.email && contactMessage) {
                    const subject = encodeURIComponent("Opportunité professionnelle - WorkMatch Africa");
                    const body = encodeURIComponent(contactMessage);
                    window.open(`mailto:${selectedCandidate.email}?subject=${subject}&body=${body}`, '_blank');
                    toast({
                      title: "Message envoyé",
                      description: `Email envoyé à ${selectedCandidate.name}`,
                    });
                    setShowContactDialog(false);
                    setContactMessage("");
                  } else {
                    toast({
                      title: "Message requis",
                      description: "Veuillez saisir un message avant d'envoyer",
                      variant: "destructive",
                    });
                  }
                }}
                data-testid="button-send-message"
              >
                <Send className="h-4 w-4 mr-2" />
                Envoyer par email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mission Planning Dialog */}
      <Dialog open={showMissionDialog} onOpenChange={setShowMissionDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5 text-primary" />
              Planifier {selectedCandidate?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="mission">Sélectionner une mission</Label>
              <Select value={selectedMissionId} onValueChange={setSelectedMissionId}>
                <SelectTrigger data-testid="select-mission">
                  <SelectValue placeholder="Choisir une mission..." />
                </SelectTrigger>
                <SelectContent>
                  {jobs.length > 0 ? (
                    jobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title} - {job.location || "Non spécifié"}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>Aucune mission disponible</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date d'entretien</Label>
                <Input
                  id="date"
                  type="date"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  data-testid="input-interview-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Heure</Label>
                <Input
                  id="time"
                  type="time"
                  value={interviewTime}
                  onChange={(e) => setInterviewTime(e.target.value)}
                  data-testid="input-interview-time"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Notes sur l'entretien ou le placement..."
                value={interviewNotes}
                onChange={(e) => setInterviewNotes(e.target.value)}
                rows={3}
                data-testid="input-interview-notes"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  setShowMissionDialog(false);
                  setSelectedMissionId("");
                  setInterviewDate("");
                  setInterviewTime("");
                  setInterviewNotes("");
                }}
              >
                Annuler
              </Button>
              <Button 
                className="flex-1"
                disabled={!selectedMissionId || selectedMissionId === "none"}
                onClick={() => {
                  const selectedJob = jobs.find(j => j.id === selectedMissionId);
                  toast({
                    title: "Entretien planifié",
                    description: `${selectedCandidate?.name} a été ajouté à la mission "${selectedJob?.title || 'Mission'}"${interviewDate ? ` pour le ${new Date(interviewDate).toLocaleDateString('fr-FR')}` : ''}`,
                  });
                  setShowMissionDialog(false);
                  setSelectedCandidate(null);
                  setSelectedMissionId("");
                  setInterviewDate("");
                  setInterviewTime("");
                  setInterviewNotes("");
                }}
                data-testid="button-confirm-planning"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirmer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
