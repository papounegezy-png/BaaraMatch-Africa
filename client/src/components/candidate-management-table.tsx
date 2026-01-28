import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  RefreshCw
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
  const itemsPerPage = 5;

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

  // Use API data or fallback to mock
  const apiCandidates: Candidate[] = matchingData?.candidates?.map((c) => ({
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

  const candidates = useSemanticSearch && selectedJobId && selectedJobId !== "none" 
    ? apiCandidates 
    : mockCandidates;

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
                  <TableRow key={candidate.id} data-testid={`candidate-row-${candidate.id}`}>
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
    </Card>
  );
}
