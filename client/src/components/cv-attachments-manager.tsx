import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Search,
  FileText,
  Upload,
  Download,
  Eye,
  Mic,
  File,
  Image,
  ChevronLeft,
  ChevronRight,
  Filter,
  Play,
  Pause,
  Clock,
  Calendar,
  User,
  FileCheck,
  FileX,
  Loader2
} from "lucide-react";
import { useRef } from "react";

interface CandidateWithDocs {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  title?: string;
  resumeUrl?: string;
  voiceCvUrl?: string;
  voiceCvDuration?: number;
  documents?: {
    id: string;
    type: string;
    name: string;
    url: string;
    uploadedAt: string;
  }[];
  createdAt: string;
}

const mockCandidatesWithDocs: CandidateWithDocs[] = [
  {
    id: "1",
    fullName: "Fatou Sow",
    email: "fatou.sow@email.com",
    title: "Développeuse Frontend",
    resumeUrl: "/uploads/cv-fatou-sow.pdf",
    voiceCvUrl: "/uploads/voice-fatou.webm",
    voiceCvDuration: 45,
    documents: [
      { id: "d1", type: "cv", name: "CV_Fatou_Sow_2024.pdf", url: "#", uploadedAt: "2024-01-15" },
      { id: "d2", type: "diploma", name: "Diplome_Master.pdf", url: "#", uploadedAt: "2024-01-15" },
      { id: "d3", type: "id", name: "CNI.jpg", url: "#", uploadedAt: "2024-01-15" },
    ],
    createdAt: "2024-01-10",
  },
  {
    id: "2",
    fullName: "Mamadou Diallo",
    email: "mamadou.diallo@email.com",
    title: "Chef de projet",
    resumeUrl: "/uploads/cv-mamadou.pdf",
    voiceCvDuration: 60,
    documents: [
      { id: "d4", type: "cv", name: "CV_Mamadou_Diallo.pdf", url: "#", uploadedAt: "2024-01-12" },
    ],
    createdAt: "2024-01-08",
  },
  {
    id: "3",
    fullName: "Aissatou Ba",
    email: "aissatou.ba@email.com",
    title: "Comptable Senior",
    documents: [
      { id: "d5", type: "cv", name: "CV_Aissatou.pdf", url: "#", uploadedAt: "2024-01-18" },
      { id: "d6", type: "certificate", name: "Certificat_Comptabilité.pdf", url: "#", uploadedAt: "2024-01-18" },
    ],
    createdAt: "2024-01-05",
  },
  {
    id: "4",
    fullName: "Ousmane Ndiaye",
    email: "ousmane.ndiaye@email.com",
    title: "Technicien Maintenance",
    voiceCvUrl: "/uploads/voice-ousmane.webm",
    voiceCvDuration: 38,
    createdAt: "2024-01-20",
  },
  {
    id: "5",
    fullName: "Mariama Fall",
    email: "mariama.fall@email.com",
    title: "Assistante RH",
    resumeUrl: "/uploads/cv-mariama.pdf",
    voiceCvUrl: "/uploads/voice-mariama.webm",
    voiceCvDuration: 52,
    documents: [
      { id: "d7", type: "cv", name: "CV_Mariama_Fall.pdf", url: "#", uploadedAt: "2024-01-22" },
      { id: "d8", type: "diploma", name: "Licence_RH.pdf", url: "#", uploadedAt: "2024-01-22" },
      { id: "d9", type: "reference", name: "Lettre_Recommandation.pdf", url: "#", uploadedAt: "2024-01-22" },
    ],
    createdAt: "2024-01-03",
  },
];

const documentTypes = [
  { value: "all", label: "Tous les types" },
  { value: "cv", label: "CV" },
  { value: "diploma", label: "Diplômes" },
  { value: "certificate", label: "Certificats" },
  { value: "id", label: "Pièces d'identité" },
  { value: "reference", label: "Références" },
  { value: "other", label: "Autres" },
];

export function CvAttachmentsManager() {
  const [searchQuery, setSearchQuery] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateWithDocs | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const itemsPerPage = 10;

  const { data: apiCandidates = [] } = useQuery<any[]>({
    queryKey: ['/api/candidates'],
  });

  const candidates: CandidateWithDocs[] = apiCandidates.length > 0 
    ? apiCandidates.map((c: any) => ({
        id: c.id,
        fullName: c.fullName || c.user?.fullName,
        email: c.email || c.user?.email,
        avatarUrl: c.avatarUrl || c.user?.avatarUrl,
        title: c.title,
        resumeUrl: c.resumeUrl,
        voiceCvUrl: c.voiceCvUrl,
        voiceCvDuration: c.voiceCvDuration,
        documents: [],
        createdAt: c.createdAt,
      }))
    : mockCandidatesWithDocs;

  const filteredCandidates = candidates.filter((candidate) => {
    const matchesSearch = 
      candidate.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (candidate.title?.toLowerCase().includes(searchQuery.toLowerCase()));

    const hasCV = candidate.resumeUrl || candidate.documents?.some(d => d.type === "cv");
    const hasVoiceCV = !!candidate.voiceCvUrl;
    const hasDocs = (candidate.documents?.length || 0) > 0;

    if (statusFilter === "complete") {
      return matchesSearch && hasCV && hasVoiceCV;
    } else if (statusFilter === "incomplete") {
      return matchesSearch && (!hasCV || !hasVoiceCV);
    } else if (statusFilter === "no_cv") {
      return matchesSearch && !hasCV;
    } else if (statusFilter === "no_voice") {
      return matchesSearch && !hasVoiceCV;
    }

    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);
  const paginatedCandidates = filteredCandidates.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const stats = {
    total: candidates.length,
    withCV: candidates.filter(c => c.resumeUrl || c.documents?.some(d => d.type === "cv")).length,
    withVoiceCV: candidates.filter(c => c.voiceCvUrl).length,
    complete: candidates.filter(c => 
      (c.resumeUrl || c.documents?.some(d => d.type === "cv")) && c.voiceCvUrl
    ).length,
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getDocIcon = (type: string) => {
    switch (type) {
      case "cv": return <FileText className="h-4 w-4 text-blue-500" />;
      case "diploma": return <FileCheck className="h-4 w-4 text-green-500" />;
      case "certificate": return <FileCheck className="h-4 w-4 text-purple-500" />;
      case "id": return <Image className="h-4 w-4 text-orange-500" />;
      case "reference": return <File className="h-4 w-4 text-gray-500" />;
      default: return <File className="h-4 w-4 text-gray-500" />;
    }
  };

  const playVoiceCV = (candidate: CandidateWithDocs) => {
    if (candidate.voiceCvUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(candidate.voiceCvUrl);
      audioRef.current.play();
      setIsPlaying(true);
      audioRef.current.onended = () => setIsPlaying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          CV & Pièces jointes
        </h1>
        <p className="text-sm text-muted-foreground">
          Gérez les CV, CV vocaux et documents des candidats
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                <User className="h-5 w-5 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total candidats</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                <FileText className="h-5 w-5 text-green-600 dark:text-green-300" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.withCV}</p>
                <p className="text-xs text-muted-foreground">Avec CV</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                <Mic className="h-5 w-5 text-purple-600 dark:text-purple-300" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.withVoiceCV}</p>
                <p className="text-xs text-muted-foreground">Avec CV vocal</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900">
                <FileCheck className="h-5 w-5 text-amber-600 dark:text-amber-300" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.complete}</p>
                <p className="text-xs text-muted-foreground">Dossiers complets</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un candidat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-cv"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-status-filter">
                <SelectValue placeholder="Statut dossier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="complete">Dossier complet</SelectItem>
                <SelectItem value="incomplete">Incomplet</SelectItem>
                <SelectItem value="no_cv">Sans CV</SelectItem>
                <SelectItem value="no_voice">Sans CV vocal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {paginatedCandidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <FileX className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium">Aucun candidat trouvé</h3>
              <p className="text-sm text-muted-foreground">
                Modifiez vos critères de recherche
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidat</TableHead>
                    <TableHead className="hidden md:table-cell">Poste</TableHead>
                    <TableHead>CV</TableHead>
                    <TableHead>CV Vocal</TableHead>
                    <TableHead className="hidden sm:table-cell">Documents</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCandidates.map((candidate) => {
                    const hasCV = candidate.resumeUrl || candidate.documents?.some(d => d.type === "cv");
                    const hasVoiceCV = !!candidate.voiceCvUrl;
                    const docCount = candidate.documents?.length || 0;

                    return (
                      <TableRow 
                        key={candidate.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedCandidate(candidate)}
                        data-testid={`row-candidate-${candidate.id}`}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={candidate.avatarUrl} />
                              <AvatarFallback>{getInitials(candidate.fullName)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{candidate.fullName}</p>
                              <p className="text-xs text-muted-foreground">{candidate.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-sm">{candidate.title || "-"}</span>
                        </TableCell>
                        <TableCell>
                          {hasCV ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              <FileText className="h-3 w-3 mr-1" />
                              Oui
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              <FileX className="h-3 w-3 mr-1" />
                              Non
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {hasVoiceCV ? (
                            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                              <Mic className="h-3 w-3 mr-1" />
                              {candidate.voiceCvDuration ? formatDuration(candidate.voiceCvDuration) : "Oui"}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              <Mic className="h-3 w-3 mr-1" />
                              Non
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="secondary">
                            {docCount} fichier{docCount !== 1 ? 's' : ''}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => setSelectedCandidate(candidate)}
                              data-testid={`button-view-${candidate.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {hasVoiceCV && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => playVoiceCV(candidate)}
                                data-testid={`button-play-voice-${candidate.id}`}
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
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
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!selectedCandidate} onOpenChange={(open) => !open && setSelectedCandidate(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedCandidate?.avatarUrl} />
                <AvatarFallback>
                  {selectedCandidate ? getInitials(selectedCandidate.fullName) : ""}
                </AvatarFallback>
              </Avatar>
              <div>
                <p>{selectedCandidate?.fullName}</p>
                <p className="text-sm font-normal text-muted-foreground">
                  {selectedCandidate?.title || "Candidat"}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedCandidate && (
            <div className="space-y-6 pt-4">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  CV Document
                </h3>
                {selectedCandidate.resumeUrl ? (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-blue-500" />
                      <span className="text-sm">CV_{selectedCandidate.fullName.replace(' ', '_')}.pdf</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-4 rounded-lg border-2 border-dashed">
                    <div className="text-center">
                      <FileX className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Aucun CV téléchargé</p>
                      <Button variant="outline" size="sm" className="mt-2">
                        <Upload className="h-4 w-4 mr-2" />
                        Télécharger un CV
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  CV Vocal
                </h3>
                {selectedCandidate.voiceCvUrl ? (
                  <div className="p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-purple-500 text-white">
                          <Mic className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">CV Vocal</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {selectedCandidate.voiceCvDuration ? formatDuration(selectedCandidate.voiceCvDuration) : "Durée inconnue"}
                          </p>
                        </div>
                      </div>
                      <Button 
                        size="icon"
                        onClick={() => playVoiceCV(selectedCandidate)}
                        data-testid="button-play-voice-dialog"
                      >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-4 rounded-lg border-2 border-dashed">
                    <div className="text-center">
                      <Mic className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Aucun CV vocal enregistré</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Autres documents ({selectedCandidate.documents?.length || 0})
                </h3>
                {selectedCandidate.documents && selectedCandidate.documents.length > 0 ? (
                  <div className="space-y-2">
                    {selectedCandidate.documents.map((doc) => (
                      <div 
                        key={doc.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          {getDocIcon(doc.type)}
                          <div>
                            <p className="text-sm font-medium">{doc.name}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(doc.uploadedAt).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-4 rounded-lg border-2 border-dashed">
                    <div className="text-center">
                      <File className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Aucun document supplémentaire</p>
                      <Button variant="outline" size="sm" className="mt-2">
                        <Upload className="h-4 w-4 mr-2" />
                        Ajouter un document
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" className="flex-1">
                  <Upload className="h-4 w-4 mr-2" />
                  Ajouter fichier
                </Button>
                <Button className="flex-1" onClick={() => setSelectedCandidate(null)}>
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
