import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Users,
  FileText,
  MessageSquare,
  Send,
  UserCheck,
  Calendar,
  Clock,
  Star,
  Phone,
  Mail,
  MapPin,
  MoreHorizontal,
  Plus,
  ArrowRight,
  GripVertical,
  Eye,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";

interface Candidate {
  id: number;
  name: string;
  email: string;
  phone: string;
  job: string;
  stage: string;
  matchScore: number;
  appliedAt: string;
  notes?: string;
  interviewDate?: string;
}

const stages = [
  { id: "new", label: "CV reçus", icon: FileText, color: "bg-blue-500" },
  { id: "review", label: "Présélection", icon: Star, color: "bg-amber-500" },
  { id: "interview", label: "Entretien", icon: MessageSquare, color: "bg-purple-500" },
  { id: "offer", label: "Offre", icon: Send, color: "bg-green-500" },
  { id: "hired", label: "Recrutés", icon: UserCheck, color: "bg-emerald-500" },
];

const mockCandidates: Candidate[] = [
  { id: 1, name: "Amadou Diallo", email: "amadou.d@email.com", phone: "+221 77 123 4567", job: "Développeur Full Stack", stage: "interview", matchScore: 92, appliedAt: "2026-01-25", interviewDate: "2026-02-05" },
  { id: 2, name: "Fatou Sow", email: "fatou.s@email.com", phone: "+225 07 234 5678", job: "Chef de Projet Digital", stage: "review", matchScore: 88, appliedAt: "2026-01-24" },
  { id: 3, name: "Oumar Kane", email: "oumar.k@email.com", phone: "+221 78 345 6789", job: "Développeur Full Stack", stage: "new", matchScore: 85, appliedAt: "2026-01-28" },
  { id: 4, name: "Aissatou Ba", email: "aissatou.b@email.com", phone: "+212 6 456 7890", job: "Assistant RH", stage: "offer", matchScore: 95, appliedAt: "2026-01-20" },
  { id: 5, name: "Moussa Traore", email: "moussa.t@email.com", phone: "+234 80 567 8901", job: "Commercial Terrain", stage: "hired", matchScore: 90, appliedAt: "2026-01-15" },
  { id: 6, name: "Ibrahima Ndiaye", email: "ibrahima.n@email.com", phone: "+221 77 678 9012", job: "Développeur Full Stack", stage: "new", matchScore: 78, appliedAt: "2026-01-29" },
  { id: 7, name: "Mariama Fall", email: "mariama.f@email.com", phone: "+221 76 789 0123", job: "Chef de Projet Digital", stage: "interview", matchScore: 91, appliedAt: "2026-01-22", interviewDate: "2026-02-03" },
  { id: 8, name: "Cheikh Mbaye", email: "cheikh.m@email.com", phone: "+221 70 890 1234", job: "Comptable Senior", stage: "review", matchScore: 82, appliedAt: "2026-01-26" },
];

function CandidateCard({ 
  candidate, 
  onView 
}: { 
  candidate: Candidate;
  onView: (candidate: Candidate) => void;
}) {
  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onView(candidate)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-pink-500 text-white text-sm">
              {candidate.name.split(" ").map(n => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{candidate.name}</p>
            <p className="text-xs text-muted-foreground truncate">{candidate.job}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {candidate.matchScore}% match
              </Badge>
              {candidate.interviewDate && (
                <Badge className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                  <Calendar className="h-3 w-3 mr-1" />
                  {new Date(candidate.interviewDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </Badge>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="shrink-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PipelineColumn({ 
  stage, 
  candidates, 
  onViewCandidate 
}: { 
  stage: typeof stages[0]; 
  candidates: Candidate[];
  onViewCandidate: (candidate: Candidate) => void;
}) {
  const StageIcon = stage.icon;
  
  return (
    <div className="flex-1 min-w-[280px] max-w-[320px]">
      <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-muted">
        <div className={`p-2 rounded-lg ${stage.color}`}>
          <StageIcon className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-sm">{stage.label}</p>
          <p className="text-xs text-muted-foreground">{candidates.length} candidat(s)</p>
        </div>
        <Badge variant="outline">{candidates.length}</Badge>
      </div>
      <div className="space-y-3">
        {candidates.map((candidate) => (
          <CandidateCard 
            key={candidate.id} 
            candidate={candidate}
            onView={onViewCandidate}
          />
        ))}
        {candidates.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm border-2 border-dashed rounded-lg">
            Aucun candidat
          </div>
        )}
      </div>
    </div>
  );
}

export function RecruitmentPipeline() {
  const { toast } = useToast();
  const [candidates, setCandidates] = useState(mockCandidates);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showCandidateDialog, setShowCandidateDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);

  const handleViewCandidate = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setShowCandidateDialog(true);
  };

  const handleMoveToNextStage = () => {
    if (!selectedCandidate) return;
    
    const currentIndex = stages.findIndex(s => s.id === selectedCandidate.stage);
    if (currentIndex < stages.length - 1) {
      const newStage = stages[currentIndex + 1].id;
      setCandidates(prev => 
        prev.map(c => 
          c.id === selectedCandidate.id ? { ...c, stage: newStage } : c
        )
      );
      setSelectedCandidate({ ...selectedCandidate, stage: newStage });
      toast({
        title: "Candidat déplacé",
        description: `${selectedCandidate.name} est maintenant en "${stages[currentIndex + 1].label}"`,
      });
    }
  };

  const handleReject = () => {
    toast({
      title: "Candidature refusée",
      description: `${selectedCandidate?.name} a été refusé(e).`,
      variant: "destructive",
    });
    setShowCandidateDialog(false);
  };

  const handleScheduleInterview = () => {
    toast({
      title: "Entretien planifié",
      description: `Un email de confirmation a été envoyé à ${selectedCandidate?.name}.`,
    });
    setShowScheduleDialog(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Pipeline de recrutement</h1>
          <p className="text-muted-foreground">Suivez vos candidats à travers le processus de recrutement</p>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue="all">
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrer par poste" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les postes</SelectItem>
              <SelectItem value="dev">Développeur Full Stack</SelectItem>
              <SelectItem value="pm">Chef de Projet Digital</SelectItem>
              <SelectItem value="hr">Assistant RH</SelectItem>
              <SelectItem value="sales">Commercial Terrain</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2 mb-4">
        {stages.map((stage, index) => {
          const count = candidates.filter(c => c.stage === stage.id).length;
          return (
            <div key={stage.id} className="flex items-center">
              <div className={`flex-1 h-2 rounded-full ${stage.color}`}>
                <div className="h-full rounded-full bg-white/30" style={{ width: `${(count / candidates.length) * 100}%` }} />
              </div>
              {index < stages.length - 1 && (
                <ArrowRight className="h-4 w-4 mx-1 text-muted-foreground shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <PipelineColumn
            key={stage.id}
            stage={stage}
            candidates={candidates.filter(c => c.stage === stage.id)}
            onViewCandidate={handleViewCandidate}
          />
        ))}
      </div>

      <Dialog open={showCandidateDialog} onOpenChange={setShowCandidateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Profil du candidat</DialogTitle>
            <DialogDescription>
              {stages.find(s => s.id === selectedCandidate?.stage)?.label}
            </DialogDescription>
          </DialogHeader>
          {selectedCandidate && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-pink-500 text-white text-xl">
                    {selectedCandidate.name.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-lg">{selectedCandidate.name}</p>
                  <p className="text-muted-foreground">{selectedCandidate.job}</p>
                  <Badge className="mt-2 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                    {selectedCandidate.matchScore}% compatibilité
                  </Badge>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedCandidate.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedCandidate.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Candidature reçue le {new Date(selectedCandidate.appliedAt).toLocaleDateString('fr-FR')}</span>
                </div>
                {selectedCandidate.interviewDate && (
                  <div className="flex items-center gap-3 text-sm">
                    <MessageSquare className="h-4 w-4 text-purple-600" />
                    <span>Entretien le {new Date(selectedCandidate.interviewDate).toLocaleDateString('fr-FR')}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" className="gap-2 flex-1">
                  <Eye className="h-4 w-4" />
                  Voir CV
                </Button>
                {selectedCandidate.stage === "review" && (
                  <Button 
                    variant="outline" 
                    className="gap-2 flex-1"
                    onClick={() => {
                      setShowCandidateDialog(false);
                      setShowScheduleDialog(true);
                    }}
                  >
                    <Calendar className="h-4 w-4" />
                    Planifier entretien
                  </Button>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="flex-row gap-2">
            <Button 
              variant="destructive" 
              className="gap-2"
              onClick={handleReject}
            >
              <ThumbsDown className="h-4 w-4" />
              Refuser
            </Button>
            <Button 
              className="gap-2"
              onClick={handleMoveToNextStage}
              disabled={selectedCandidate?.stage === "hired"}
            >
              <ThumbsUp className="h-4 w-4" />
              Étape suivante
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Planifier un entretien</DialogTitle>
            <DialogDescription>
              Programmer un entretien avec {selectedCandidate?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="time">Heure</Label>
                <Input id="time" type="time" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Type d'entretien</Label>
              <Select defaultValue="video">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">Visioconférence</SelectItem>
                  <SelectItem value="phone">Téléphone</SelectItem>
                  <SelectItem value="onsite">Présentiel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="interviewers">Intervieweurs</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="marie">Marie Dupont (DG)</SelectItem>
                  <SelectItem value="fatou">Fatou Sow (Tech Lead)</SelectItem>
                  <SelectItem value="jean">Jean Martin (RH)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" placeholder="Instructions pour l'entretien..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>Annuler</Button>
            <Button onClick={handleScheduleInterview}>Confirmer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
