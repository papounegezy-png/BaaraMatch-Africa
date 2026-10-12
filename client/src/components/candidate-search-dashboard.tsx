import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
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
  SlidersHorizontal,
  MapPin,
  Briefcase,
  Banknote,
  Clock,
  Sparkles,
  Play,
  Pause,
  Mic,
  CheckCircle,
  Bell,
  ChevronDown,
  Loader2,
  Eye,
  RefreshCw
} from "lucide-react";
import type { JobPosting, CandidateProfile, User } from "@shared/schema";

interface CandidateCardData {
  id: string;
  name: string;
  title: string;
  location: string;
  experience: number;
  salaryRange: string;
  availability: "immediate" | "1_month" | "2_3_months";
  matchScore: number;
  aiSummary: string;
  skills: string[];
  hasVoiceCV: boolean;
  voiceCVUrl?: string;
  avatarUrl?: string;
  lastActive: string;
  initials: string;
}

const skillOptions = [
  "React", "Node.js", "TypeScript", "Python", "Java",
  "AWS", "Docker", "Kubernetes", "Machine Learning",
  "Product Strategy", "Agile/Scrum", "Figma", "Design System"
];

const experienceOptions = [
  { value: "3-5", label: "3-5 ans" },
  { value: "5-7", label: "5-7 ans" },
  { value: "7-10", label: "7-10 ans" },
  { value: "10+", label: "10+ ans" },
];

const availabilityOptions = [
  { value: "immediate", label: "Immédiate" },
  { value: "1_month", label: "1 mois" },
  { value: "2_3_months", label: "2-3 mois" },
];

export function CandidateSearchDashboard() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedExperience, setSelectedExperience] = useState<string>("");
  const [selectedAvailability, setSelectedAvailability] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("score_desc");
  const [skillSearch, setSkillSearch] = useState("");
  const [playingVoiceCV, setPlayingVoiceCV] = useState<string | null>(null);

  const { data: candidatesData = [] } = useQuery<(User & { profile?: CandidateProfile })[]>({
    queryKey: ["/api/candidates"],
  });

  const liveCandidates: CandidateCardData[] = candidatesData.map((candidate) => {
    const availableFrom = candidate.profile?.availableFrom?.toLowerCase() ?? "";
    const availability: CandidateCardData["availability"] = availableFrom.includes("1")
      ? "1_month"
      : availableFrom.includes("2") || availableFrom.includes("3")
      ? "2_3_months"
      : "immediate";

    return {
      id: candidate.id,
      name: candidate.fullName,
      title: candidate.profile?.title ?? "Profil candidat",
      location: [candidate.city, candidate.country].filter(Boolean).join(", ") || "Non renseigné",
      experience: candidate.profile?.experienceYears ?? 0,
      salaryRange: candidate.profile?.salaryExpectation ?? "À définir",
      availability,
      matchScore: Math.min(100, 60 + (candidate.profile?.experienceYears ?? 0) * 5),
      aiSummary: candidate.profile?.bio ?? "Profil disponible dans la base candidats de l'agence.",
      skills: candidate.profile?.skills ?? [],
      hasVoiceCV: !!candidate.profile?.voiceCvUrl,
      voiceCVUrl: candidate.profile?.voiceCvUrl ?? undefined,
      avatarUrl: candidate.avatarUrl ?? undefined,
      lastActive: candidate.updatedAt ? `Mis à jour le ${new Date(candidate.updatedAt).toLocaleDateString("fr-FR")}` : "Activité récente",
      initials: candidate.fullName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join(""),
    };
  });

  const sourceCandidates = liveCandidates;

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill)
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  const filteredSkillOptions = skillOptions.filter(skill =>
    skill.toLowerCase().includes(skillSearch.toLowerCase())
  );

  const filteredCandidates = sourceCandidates
    .filter(c => {
      if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !c.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !c.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))) {
        return false;
      }
      if (minScore > 0 && c.matchScore < minScore) return false;
      if (selectedSkills.length > 0 && !selectedSkills.some(s => c.skills.includes(s))) return false;
      if (selectedExperience) {
        const [min, max] = selectedExperience.split("-").map(n => parseInt(n.replace("+", "")));
        if (selectedExperience === "10+" && c.experience < 10) return false;
        else if (max && (c.experience < min || c.experience > max)) return false;
      }
      if (selectedAvailability && c.availability !== selectedAvailability) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "score_desc") return b.matchScore - a.matchScore;
      if (sortBy === "score_asc") return a.matchScore - b.matchScore;
      if (sortBy === "recent") return a.lastActive.localeCompare(b.lastActive);
      return 0;
    });

  const resetFilters = () => {
    setMinScore(0);
    setSelectedSkills([]);
    setSelectedExperience("");
    setSelectedAvailability("");
  };

  const getAvailabilityBadge = (availability: CandidateCardData["availability"]) => {
    const variants = {
      immediate: { label: "Immédiate", className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800" },
      "1_month": { label: "1 mois", className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800" },
      "2_3_months": { label: "2-3 mois", className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800" },
    };
    return variants[availability];
  };

  const getScoreGradient = (score: number) => {
    if (score >= 90) return "from-green-500 to-emerald-500";
    if (score >= 80) return "from-blue-500 to-cyan-500";
    if (score >= 70) return "from-amber-500 to-yellow-500";
    return "from-gray-500 to-slate-500";
  };

  return (
    <div className="flex flex-col lg:flex-row gap-0 bg-gray-50 dark:bg-gray-900 min-h-[600px] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <aside className="w-full lg:w-80 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-gray-900 dark:text-white" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filtres</h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="space-y-3">
            <Label className="text-sm font-bold text-gray-900 dark:text-white">
              Score de Matching IA minimum
            </Label>
            <div className="space-y-2">
              <Slider
                value={[minScore]}
                onValueChange={([val]) => setMinScore(val)}
                max={100}
                step={5}
                className="w-full"
                data-testid="slider-min-score"
              />
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">0%</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{minScore}%</span>
                <span className="text-gray-500">100%</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-bold text-gray-900 dark:text-white">
              Compétences
            </Label>
            <Input
              placeholder="Rechercher une compétence..."
              value={skillSearch}
              onChange={(e) => setSkillSearch(e.target.value)}
              className="text-sm"
              data-testid="input-skill-search"
            />
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filteredSkillOptions.map((skill) => (
                <div
                  key={skill}
                  className="flex items-center gap-2 p-2 rounded-lg hover-elevate cursor-pointer"
                  onClick={() => toggleSkill(skill)}
                  data-testid={`checkbox-skill-${skill.toLowerCase().replace(/\//g, "-")}`}
                >
                  <Checkbox
                    checked={selectedSkills.includes(skill)}
                    onCheckedChange={() => toggleSkill(skill)}
                    data-testid={`input-skill-checkbox-${skill.toLowerCase().replace(/\//g, "-")}`}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{skill}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-bold text-gray-900 dark:text-white">
              Expérience
            </Label>
            <RadioGroup value={selectedExperience} onValueChange={setSelectedExperience}>
              {experienceOptions.map((opt) => (
                <div
                  key={opt.value}
                  className="flex items-center gap-2 p-2 rounded-lg hover-elevate cursor-pointer"
                >
                  <RadioGroupItem value={opt.value} id={`exp-${opt.value}`} data-testid={`radio-exp-${opt.value}`} />
                  <Label htmlFor={`exp-${opt.value}`} className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    {opt.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-bold text-gray-900 dark:text-white">
              Disponibilité
            </Label>
            <RadioGroup value={selectedAvailability} onValueChange={setSelectedAvailability}>
              {availabilityOptions.map((opt) => (
                <div
                  key={opt.value}
                  className="flex items-center gap-2 p-2 rounded-lg hover-elevate cursor-pointer"
                >
                  <RadioGroupItem value={opt.value} id={`avail-${opt.value}`} data-testid={`radio-avail-${opt.value}`} />
                  <Label htmlFor={`avail-${opt.value}`} className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    {opt.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
          <Button 
            className="w-full"
            data-testid="button-apply-filters"
          >
            Appliquer les filtres
          </Button>
          <Button 
            variant="ghost" 
            className="w-full text-gray-500"
            onClick={resetFilters}
            data-testid="button-reset-filters"
          >
            Réinitialiser
          </Button>
        </div>
      </aside>

      <main className="flex-1 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
        <div className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row flex-wrap justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Candidats qualifiés
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Triés par score de matching IA • {filteredCandidates.length} profils
              </p>
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-44" data-testid="select-sort">
                <SelectValue placeholder="Trier par..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score_desc">Score le plus élevé</SelectItem>
                <SelectItem value="score_asc">Score le plus bas</SelectItem>
                <SelectItem value="recent">Activité récente</SelectItem>
                <SelectItem value="availability">Disponibilité</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            {filteredCandidates.map((candidate) => {
              const availBadge = getAvailabilityBadge(candidate.availability);
              return (
                <div
                  key={candidate.id}
                  className="bg-white dark:bg-gray-950 border-2 border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-4"
                  data-testid={`candidate-card-${candidate.id}`}
                >
                  <div className="flex flex-wrap gap-4">
                    <Avatar className="h-16 w-16 rounded-xl shrink-0" style={{ backgroundImage: "linear-gradient(135deg, rgb(43, 127, 255) 0%, rgb(79, 57, 246) 100%)" }}>
                      <AvatarImage src={candidate.avatarUrl} className="rounded-xl" />
                      <AvatarFallback className="rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg font-bold">
                        {candidate.initials}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap justify-between items-start gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {candidate.name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {candidate.title}
                          </p>
                        </div>
                        
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r ${getScoreGradient(candidate.matchScore)} shadow-lg`}>
                          <Sparkles className="h-4 w-4 text-white" />
                          <span className="text-base font-bold text-white">
                            {candidate.matchScore}%
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-3">
                        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                          <MapPin className="h-4 w-4" />
                          <span>{candidate.location}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                          <Briefcase className="h-4 w-4" />
                          <span>{candidate.experience} ans</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                          <Banknote className="h-4 w-4" />
                          <span>{candidate.salaryRange}</span>
                        </div>
                        <Badge className={`${availBadge.className} border text-xs font-bold`}>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {availBadge.label}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-lg p-3 space-y-1">
                    <div className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-blue-700 dark:text-blue-400" />
                      <span className="text-xs font-bold text-blue-800 dark:text-blue-300">Résumé IA</span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                      {candidate.aiSummary}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {candidate.skills.slice(0, 4).map((skill) => (
                      <Badge 
                        key={skill} 
                        variant="secondary" 
                        className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 text-xs"
                      >
                        {skill}
                      </Badge>
                    ))}
                    {candidate.skills.length > 4 && (
                      <Badge variant="outline" className="text-xs text-gray-500">
                        +{candidate.skills.length - 4} compétences
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      <span>{candidate.lastActive}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {candidate.hasVoiceCV && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" data-testid={`button-voice-cv-${candidate.id}`}>
                              <Mic className="h-4 w-4 mr-1" />
                              CV Vocal
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
                                    onClick={() => setPlayingVoiceCV(playingVoiceCV === candidate.id ? null : candidate.id)}
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
                                        style={{ width: playingVoiceCV === candidate.id ? "45%" : "0%" }}
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
                                  "{candidate.aiSummary}"
                                </p>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                      <Button 
                        size="sm"
                        className="bg-orange-500 hover:bg-orange-600 text-white border-orange-600"
                        onClick={() => setLocation(`/agency/candidates/${candidate.id}`)}
                        data-testid={`button-view-profile-${candidate.id}`}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Voir le profil complet
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredCandidates.length === 0 && (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                <Search className="h-12 w-12" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Aucun candidat trouvé
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Essayez d'ajuster vos filtres pour voir plus de résultats.
              </p>
              <Button variant="outline" className="mt-4" onClick={resetFilters} data-testid="button-reset-empty-state">
                Réinitialiser les filtres
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
