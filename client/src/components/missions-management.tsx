import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { 
  Search, 
  Plus,
  Briefcase,
  MapPin,
  Calendar,
  Eye,
  Users,
  Clock,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Building2,
  Banknote,
  GraduationCap,
  Globe,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { JobPosting } from "@shared/schema";
import { useAuth } from "@/lib/auth";

const jobTypes = [
  { value: "full-time", label: "Temps plein" },
  { value: "part-time", label: "Temps partiel" },
  { value: "contract", label: "Contrat" },
  { value: "internship", label: "Stage" },
  { value: "temporary", label: "Intérim" },
];

const categories = [
  "Informatique & Tech",
  "Finance & Comptabilité",
  "Marketing & Communication",
  "Ressources Humaines",
  "Commercial & Vente",
  "Administration",
  "Santé",
  "Éducation",
  "Industrie",
  "BTP & Construction",
  "Hôtellerie & Restauration",
  "Transport & Logistique",
  "Agriculture",
  "Autre"
];

const educationLevels = [
  { value: "none", label: "Sans diplôme" },
  { value: "bac", label: "Baccalauréat" },
  { value: "bac+2", label: "Bac+2 (BTS, DUT)" },
  { value: "bac+3", label: "Bac+3 (Licence)" },
  { value: "bac+5", label: "Bac+5 (Master)" },
  { value: "bac+8", label: "Doctorat" },
];

export function MissionsManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const itemsPerPage = 8;

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    jobType: "full-time",
    category: "",
    salaryMin: "",
    salaryMax: "",
    salaryCurrency: "XOF",
    experienceMin: "",
    experienceMax: "",
    educationLevel: "",
    requirements: "",
    requiredSkills: "",
    benefits: "",
    isRemote: false,
    isUrgent: false,
    applicationDeadline: "",
    startDate: "",
  });

  // Fetch all jobs
  const { data: jobs = [], isLoading } = useQuery<JobPosting[]>({
    queryKey: ['/api/jobs'],
  });

  // Create job mutation
  const createJobMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/jobs', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      toast({
        title: "Offre créée",
        description: "L'offre d'emploi a été créée avec succès",
      });
      resetForm();
      setShowCreateDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer l'offre",
        variant: "destructive",
      });
    },
  });

  // Update job mutation
  const updateJobMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest('PATCH', `/api/jobs/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      toast({
        title: "Offre mise à jour",
        description: "L'offre d'emploi a été modifiée avec succès",
      });
      resetForm();
      setShowCreateDialog(false);
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de modifier l'offre",
        variant: "destructive",
      });
    },
  });

  // Delete job mutation
  const deleteJobMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/jobs/${id}`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      toast({
        title: "Offre supprimée",
        description: "L'offre d'emploi a été supprimée",
      });
      setSelectedJob(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer l'offre",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      location: "",
      jobType: "full-time",
      category: "",
      salaryMin: "",
      salaryMax: "",
      salaryCurrency: "XOF",
      experienceMin: "",
      experienceMax: "",
      educationLevel: "",
      requirements: "",
      requiredSkills: "",
      benefits: "",
      isRemote: false,
      isUrgent: false,
      applicationDeadline: "",
      startDate: "",
    });
  };

  const handleEdit = (job: JobPosting) => {
    setFormData({
      title: job.title,
      description: job.description,
      location: job.location,
      jobType: job.jobType,
      category: job.category || "",
      salaryMin: job.salaryMin?.toString() || "",
      salaryMax: job.salaryMax?.toString() || "",
      salaryCurrency: job.salaryCurrency || "XOF",
      experienceMin: job.experienceMin?.toString() || "",
      experienceMax: job.experienceMax?.toString() || "",
      educationLevel: job.educationLevel || "",
      requirements: job.requirements?.join("\n") || "",
      requiredSkills: job.requiredSkills?.join(", ") || "",
      benefits: job.benefits?.join("\n") || "",
      isRemote: job.isRemote || false,
      isUrgent: job.isUrgent || false,
      applicationDeadline: job.applicationDeadline ? new Date(job.applicationDeadline).toISOString().split('T')[0] : "",
      startDate: job.startDate ? new Date(job.startDate).toISOString().split('T')[0] : "",
    });
    setIsEditing(true);
    setSelectedJob(job);
    setShowCreateDialog(true);
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.description || !formData.location) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir le titre, la description et la localisation",
        variant: "destructive",
      });
      return;
    }

    const jobData = {
      companyId: user?.id || "",
      agencyId: user?.id,
      title: formData.title,
      description: formData.description,
      location: formData.location,
      jobType: formData.jobType,
      category: formData.category || null,
      salaryMin: formData.salaryMin ? parseInt(formData.salaryMin) : null,
      salaryMax: formData.salaryMax ? parseInt(formData.salaryMax) : null,
      salaryCurrency: formData.salaryCurrency,
      experienceMin: formData.experienceMin ? parseInt(formData.experienceMin) : null,
      experienceMax: formData.experienceMax ? parseInt(formData.experienceMax) : null,
      educationLevel: formData.educationLevel || null,
      requirements: formData.requirements ? formData.requirements.split("\n").filter(r => r.trim()) : null,
      requiredSkills: formData.requiredSkills ? formData.requiredSkills.split(",").map(s => s.trim()).filter(s => s) : null,
      benefits: formData.benefits ? formData.benefits.split("\n").filter(b => b.trim()) : null,
      isRemote: formData.isRemote,
      isUrgent: formData.isUrgent,
      applicationDeadline: formData.applicationDeadline ? new Date(formData.applicationDeadline) : null,
      startDate: formData.startDate ? new Date(formData.startDate) : null,
      isActive: true,
    };

    if (isEditing && selectedJob) {
      updateJobMutation.mutate({ id: selectedJob.id, data: jobData });
    } else {
      createJobMutation.mutate(jobData);
    }
  };

  // Filter jobs
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch = 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = !statusFilter || statusFilter === "all" || 
      (statusFilter === "active" && job.isActive) ||
      (statusFilter === "inactive" && !job.isActive) ||
      (statusFilter === "urgent" && job.isUrgent);
    
    const matchesCategory = !categoryFilter || categoryFilter === "all" || job.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
  const paginatedJobs = filteredJobs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getJobTypeBadge = (type: string) => {
    const typeMap: Record<string, { label: string; className: string }> = {
      "full-time": { label: "Temps plein", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
      "part-time": { label: "Temps partiel", className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
      "contract": { label: "Contrat", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
      "internship": { label: "Stage", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
      "temporary": { label: "Intérim", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
    };
    return typeMap[type] || { label: type, className: "bg-gray-100 text-gray-800" };
  };

  const formatSalary = (min?: number | null, max?: number | null, currency?: string | null) => {
    if (!min && !max) return "Non spécifié";
    const curr = currency || "XOF";
    if (min && max) return `${min.toLocaleString()} - ${max.toLocaleString()} ${curr}`;
    if (min) return `À partir de ${min.toLocaleString()} ${curr}`;
    if (max) return `Jusqu'à ${max.toLocaleString()} ${curr}`;
    return "Non spécifié";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Offres & Missions
          </h1>
          <p className="text-sm text-muted-foreground">
            Gérez vos offres d'emploi et missions de recrutement
          </p>
        </div>
        <Button 
          onClick={() => {
            resetForm();
            setIsEditing(false);
            setShowCreateDialog(true);
          }}
          data-testid="button-create-job"
        >
          <Plus className="h-4 w-4 mr-2" />
          Créer une offre
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <p className="text-2xl font-bold">{jobs.length}</p>
                <p className="text-xs text-muted-foreground">Total offres</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-300" />
              </div>
              <div>
                <p className="text-2xl font-bold">{jobs.filter(j => j.isActive).length}</p>
                <p className="text-xs text-muted-foreground">Actives</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-300" />
              </div>
              <div>
                <p className="text-2xl font-bold">{jobs.filter(j => j.isUrgent).length}</p>
                <p className="text-xs text-muted-foreground">Urgentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                <Users className="h-5 w-5 text-purple-600 dark:text-purple-300" />
              </div>
              <div>
                <p className="text-2xl font-bold">{jobs.reduce((acc, j) => acc + (j.applicationCount || 0), 0)}</p>
                <p className="text-xs text-muted-foreground">Candidatures</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une offre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-jobs"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px]" data-testid="select-status-filter">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="active">Actives</SelectItem>
                <SelectItem value="inactive">Inactives</SelectItem>
                <SelectItem value="urgent">Urgentes</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-category-filter">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Jobs Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : paginatedJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium">Aucune offre trouvée</h3>
              <p className="text-sm text-muted-foreground">
                Créez votre première offre d'emploi
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Offre</TableHead>
                    <TableHead className="hidden md:table-cell">Localisation</TableHead>
                    <TableHead className="hidden lg:table-cell">Type</TableHead>
                    <TableHead className="hidden sm:table-cell">Candidatures</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedJobs.map((job) => {
                    const typeBadge = getJobTypeBadge(job.jobType);
                    return (
                      <TableRow 
                        key={job.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedJob(job)}
                        data-testid={`job-row-${job.id}`}
                      >
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">{job.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {job.category || "Non catégorisé"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {job.location}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge className={typeBadge.className}>
                            {typeBadge.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <span>{job.applicationCount || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {job.isActive ? (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                            {job.isUrgent && (
                              <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                Urgent
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleEdit(job)}
                              data-testid={`button-edit-${job.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => deleteJobMutation.mutate(job.id)}
                              data-testid={`button-delete-${job.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredJobs.length} offre(s) trouvée(s)
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

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Modifier l'offre" : "Créer une nouvelle offre"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Informations générales
              </h3>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titre du poste *</Label>
                  <Input
                    id="title"
                    placeholder="Ex: Développeur Full Stack"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    data-testid="input-job-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Décrivez le poste, les responsabilités..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    data-testid="input-job-description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Localisation *</Label>
                    <Input
                      id="location"
                      placeholder="Ex: Dakar, Sénégal"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      data-testid="input-job-location"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Catégorie</Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(v) => setFormData({ ...formData, category: v })}
                    >
                      <SelectTrigger data-testid="select-job-category">
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="jobType">Type de contrat</Label>
                    <Select 
                      value={formData.jobType} 
                      onValueChange={(v) => setFormData({ ...formData, jobType: v })}
                    >
                      <SelectTrigger data-testid="select-job-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {jobTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="educationLevel">Niveau d'études</Label>
                    <Select 
                      value={formData.educationLevel} 
                      onValueChange={(v) => setFormData({ ...formData, educationLevel: v })}
                    >
                      <SelectTrigger data-testid="select-education-level">
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
              </div>
            </div>

            {/* Salary & Experience */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Rémunération & Expérience
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Salaire minimum</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 300000"
                    value={formData.salaryMin}
                    onChange={(e) => setFormData({ ...formData, salaryMin: e.target.value })}
                    data-testid="input-salary-min"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Salaire maximum</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 500000"
                    value={formData.salaryMax}
                    onChange={(e) => setFormData({ ...formData, salaryMax: e.target.value })}
                    data-testid="input-salary-max"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Expérience min (années)</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 2"
                    value={formData.experienceMin}
                    onChange={(e) => setFormData({ ...formData, experienceMin: e.target.value })}
                    data-testid="input-exp-min"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expérience max (années)</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 5"
                    value={formData.experienceMax}
                    onChange={(e) => setFormData({ ...formData, experienceMax: e.target.value })}
                    data-testid="input-exp-max"
                  />
                </div>
              </div>
            </div>

            {/* Skills & Requirements */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Compétences & Prérequis
              </h3>
              <div className="space-y-2">
                <Label>Compétences requises (séparées par des virgules)</Label>
                <Input
                  placeholder="Ex: React, Node.js, PostgreSQL"
                  value={formData.requiredSkills}
                  onChange={(e) => setFormData({ ...formData, requiredSkills: e.target.value })}
                  data-testid="input-required-skills"
                />
              </div>
              <div className="space-y-2">
                <Label>Exigences (une par ligne)</Label>
                <Textarea
                  placeholder="Ex: Bac+5 en informatique&#10;3 ans d'expérience minimum"
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  rows={3}
                  data-testid="input-requirements"
                />
              </div>
              <div className="space-y-2">
                <Label>Avantages (un par ligne)</Label>
                <Textarea
                  placeholder="Ex: Assurance santé&#10;Télétravail possible&#10;Prime annuelle"
                  value={formData.benefits}
                  onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                  rows={3}
                  data-testid="input-benefits"
                />
              </div>
            </div>

            {/* Dates */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Dates & Options
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date limite de candidature</Label>
                  <Input
                    type="date"
                    value={formData.applicationDeadline}
                    onChange={(e) => setFormData({ ...formData, applicationDeadline: e.target.value })}
                    data-testid="input-deadline"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date de début souhaitée</Label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    data-testid="input-start-date"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Télétravail possible</Label>
                    <p className="text-xs text-muted-foreground">Le poste peut être exercé à distance</p>
                  </div>
                  <Switch
                    checked={formData.isRemote}
                    onCheckedChange={(checked) => setFormData({ ...formData, isRemote: checked })}
                    data-testid="switch-remote"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Recrutement urgent</Label>
                    <p className="text-xs text-muted-foreground">Marquer comme prioritaire</p>
                  </div>
                  <Switch
                    checked={formData.isUrgent}
                    onCheckedChange={(checked) => setFormData({ ...formData, isUrgent: checked })}
                    data-testid="switch-urgent"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  setShowCreateDialog(false);
                  resetForm();
                  setIsEditing(false);
                }}
              >
                Annuler
              </Button>
              <Button 
                className="flex-1"
                onClick={handleSubmit}
                disabled={createJobMutation.isPending || updateJobMutation.isPending}
                data-testid="button-submit-job"
              >
                {(createJobMutation.isPending || updateJobMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {isEditing ? "Enregistrer" : "Créer l'offre"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Job Details Sheet */}
      <Sheet open={!!selectedJob && !showCreateDialog} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="space-y-4 pb-4 border-b">
            <div className="flex items-start justify-between">
              <div>
                <SheetTitle className="text-xl">{selectedJob?.title}</SheetTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={selectedJob ? getJobTypeBadge(selectedJob.jobType).className : ""}>
                    {selectedJob ? getJobTypeBadge(selectedJob.jobType).label : ""}
                  </Badge>
                  {selectedJob?.isUrgent && (
                    <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                      Urgent
                    </Badge>
                  )}
                  {selectedJob?.isRemote && (
                    <Badge variant="outline">
                      <Globe className="h-3 w-3 mr-1" />
                      Télétravail
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </SheetHeader>

          {selectedJob && (
            <div className="space-y-6 pt-6">
              {/* Location & Category */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedJob.location}</span>
                </div>
                {selectedJob.category && (
                  <div className="flex items-center gap-3 text-sm">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedJob.category}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Description
                </h3>
                <p className="text-sm whitespace-pre-wrap">{selectedJob.description}</p>
              </div>

              {/* Salary */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Rémunération
                </h3>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Banknote className="h-5 w-5 text-primary" />
                  <span className="font-medium">
                    {formatSalary(selectedJob.salaryMin, selectedJob.salaryMax, selectedJob.salaryCurrency)}
                  </span>
                </div>
              </div>

              {/* Experience */}
              {(selectedJob.experienceMin || selectedJob.experienceMax) && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Expérience requise
                  </h3>
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {selectedJob.experienceMin && selectedJob.experienceMax
                        ? `${selectedJob.experienceMin} - ${selectedJob.experienceMax} ans`
                        : selectedJob.experienceMin
                        ? `Minimum ${selectedJob.experienceMin} ans`
                        : `Maximum ${selectedJob.experienceMax} ans`}
                    </span>
                  </div>
                </div>
              )}

              {/* Education */}
              {selectedJob.educationLevel && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Niveau d'études
                  </h3>
                  <div className="flex items-center gap-3 text-sm">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {educationLevels.find(e => e.value === selectedJob.educationLevel)?.label || selectedJob.educationLevel}
                    </span>
                  </div>
                </div>
              )}

              {/* Skills */}
              {selectedJob.requiredSkills && selectedJob.requiredSkills.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Compétences requises
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.requiredSkills.map((skill) => (
                      <Badge key={skill} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Requirements */}
              {selectedJob.requirements && selectedJob.requirements.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Exigences
                  </h3>
                  <ul className="space-y-1 text-sm list-disc list-inside">
                    {selectedJob.requirements.map((req, idx) => (
                      <li key={idx}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Benefits */}
              {selectedJob.benefits && selectedJob.benefits.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Avantages
                  </h3>
                  <ul className="space-y-1 text-sm list-disc list-inside">
                    {selectedJob.benefits.map((benefit, idx) => (
                      <li key={idx}>{benefit}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Stats */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Statistiques
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{selectedJob.viewCount || 0}</p>
                      <p className="text-xs text-muted-foreground">Vues</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{selectedJob.applicationCount || 0}</p>
                      <p className="text-xs text-muted-foreground">Candidatures</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Dates
                </h3>
                <div className="space-y-2 text-sm">
                  {selectedJob.applicationDeadline && (
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Date limite: {new Date(selectedJob.applicationDeadline).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  )}
                  {selectedJob.startDate && (
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Début: {new Date(selectedJob.startDate).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Publiée le {selectedJob.createdAt ? new Date(selectedJob.createdAt).toLocaleDateString('fr-FR') : "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => handleEdit(selectedJob)}
                  data-testid="button-edit-job-detail"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier
                </Button>
                <Button 
                  variant="destructive" 
                  className="flex-1"
                  onClick={() => {
                    deleteJobMutation.mutate(selectedJob.id);
                  }}
                  data-testid="button-delete-job-detail"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
