import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { 
  Briefcase, 
  Users, 
  Clock,
  CheckCircle2,
  TrendingUp,
  Plus,
  Eye,
  Edit,
  Trash2,
  Calendar,
  MapPin,
  DollarSign,
  FileText,
  UserCheck,
  XCircle,
  MessageSquare,
  ArrowRight,
  Building2,
  GraduationCap,
  Phone,
  Mail,
  Download,
  Upload,
  Search,
  Filter,
  MoreHorizontal,
  ChevronRight,
  AlertCircle,
  CalendarDays,
  Wallet,
  Network,
  Star,
  Send,
  ThumbsUp,
  ThumbsDown,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Percent,
  TimerIcon,
  UserPlus,
} from "lucide-react";
import { EmployeeManagement } from "@/components/employee-management";
import { LeaveManagement } from "@/components/leave-management";
import { PayrollManagement } from "@/components/payroll-management";
import { OrgChart } from "@/components/org-chart";
import { RecruitmentPipeline } from "@/components/recruitment-pipeline";
import { RecruitmentStatistics } from "@/components/recruitment-statistics";
import { DepartmentManagement } from "@/components/department-management";
import { PositionManagement } from "@/components/position-management";
import { SecurityManagement } from "@/components/security-management";
import { SitesManagement } from "@/components/sites-management";
import { CertificationsManagement } from "@/components/certifications-management";
import { EPIManagement } from "@/components/epi-management";
import { HSEManagement } from "@/components/hse-management";

const mockJobs = [
  { id: 1, title: "Développeur Full Stack", department: "Tech", location: "Dakar", type: "CDI", applications: 24, newApplications: 8, status: "active", postedAt: "2026-01-15", salary: "800K - 1.2M FCFA" },
  { id: 2, title: "Chef de Projet Digital", department: "Marketing", location: "Abidjan", type: "CDI", applications: 15, newApplications: 3, status: "active", postedAt: "2026-01-20", salary: "1M - 1.5M FCFA" },
  { id: 3, title: "Comptable Senior", department: "Finance", location: "Dakar", type: "CDI", applications: 12, newApplications: 2, status: "active", postedAt: "2026-01-22", salary: "600K - 900K FCFA" },
  { id: 4, title: "Assistant RH", department: "RH", location: "Casablanca", type: "CDD", applications: 31, newApplications: 12, status: "active", postedAt: "2026-01-10", salary: "400K - 600K FCFA" },
  { id: 5, title: "Commercial Terrain", department: "Ventes", location: "Lagos", type: "CDI", applications: 45, newApplications: 15, status: "paused", postedAt: "2026-01-05", salary: "500K - 800K FCFA" },
];

const mockApplications = [
  { id: 1, candidate: "Amadou Diallo", job: "Développeur Full Stack", stage: "interview", appliedAt: "2026-01-25", matchScore: 92, avatar: null, email: "amadou.d@email.com", phone: "+221 77 123 4567" },
  { id: 2, candidate: "Fatou Sow", job: "Chef de Projet Digital", stage: "review", appliedAt: "2026-01-24", matchScore: 88, avatar: null, email: "fatou.s@email.com", phone: "+225 07 234 5678" },
  { id: 3, candidate: "Oumar Kane", job: "Développeur Full Stack", stage: "new", appliedAt: "2026-01-28", matchScore: 85, avatar: null, email: "oumar.k@email.com", phone: "+221 78 345 6789" },
  { id: 4, candidate: "Aissatou Ba", job: "Assistant RH", stage: "offer", appliedAt: "2026-01-20", matchScore: 95, avatar: null, email: "aissatou.b@email.com", phone: "+212 6 456 7890" },
  { id: 5, candidate: "Moussa Traore", job: "Commercial Terrain", stage: "hired", appliedAt: "2026-01-15", matchScore: 90, avatar: null, email: "moussa.t@email.com", phone: "+234 80 567 8901" },
];

const stageLabels: Record<string, { label: string; color: string }> = {
  new: { label: "Nouveau", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  review: { label: "En revue", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300" },
  interview: { label: "Entretien", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300" },
  offer: { label: "Offre", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  hired: { label: "Recruté", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300" },
  rejected: { label: "Refusé", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
};

function DashboardOverview() {
  const { toast } = useToast();
  
  const stats = [
    { title: "Postes ouverts", value: 12, change: +3, icon: Briefcase, color: "text-blue-600" },
    { title: "Candidatures totales", value: 127, change: +18, icon: Users, color: "text-green-600" },
    { title: "Entretiens planifiés", value: 8, change: +2, icon: Calendar, color: "text-purple-600" },
    { title: "Taux de conversion", value: "24%", change: +5, icon: TrendingUp, color: "text-amber-600" },
  ];

  const recentApplications = mockApplications.slice(0, 5);
  const activeJobs = mockJobs.filter(j => j.status === "active").slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Tableau de bord</h1>
          <p className="text-muted-foreground">Vue d'ensemble de vos activités de recrutement</p>
        </div>
        <Button className="gap-2" data-testid="button-create-job">
          <Plus className="h-4 w-4" />
          Nouvelle offre
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} data-testid={`card-stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full bg-muted ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1 text-sm">
                {stat.change > 0 ? (
                  <>
                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">+{stat.change}</span>
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="h-4 w-4 text-red-600" />
                    <span className="text-red-600">{stat.change}</span>
                  </>
                )}
                <span className="text-muted-foreground">ce mois</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg">Candidatures récentes</CardTitle>
              <CardDescription>Les 5 dernières candidatures reçues</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="gap-1">
              Voir tout <ChevronRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentApplications.map((app) => (
                <div 
                  key={app.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover-elevate"
                  data-testid={`application-row-${app.id}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-violet-500 to-pink-500 text-white">
                        {app.candidate.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{app.candidate}</p>
                      <p className="text-sm text-muted-foreground">{app.job}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <Badge className={stageLabels[app.stage].color}>
                        {stageLabels[app.stage].label}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">Score: {app.matchScore}%</p>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg">Postes actifs</CardTitle>
              <CardDescription>Vos offres d'emploi en cours</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="gap-1">
              Voir tout <ChevronRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeJobs.map((job) => (
                <div 
                  key={job.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover-elevate"
                  data-testid={`job-row-${job.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{job.title}</p>
                      <Badge variant="outline" className="text-xs">{job.type}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {job.department}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-medium">{job.applications}</p>
                      <p className="text-xs text-muted-foreground">candidatures</p>
                    </div>
                    {job.newApplications > 0 && (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                        +{job.newApplications} new
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pipeline de recrutement</CardTitle>
          <CardDescription>Répartition des candidats par étape</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            {[
              { stage: "CV reçus", count: 45, color: "bg-blue-500" },
              { stage: "Présélection", count: 28, color: "bg-amber-500" },
              { stage: "Entretien", count: 12, color: "bg-purple-500" },
              { stage: "Offre", count: 5, color: "bg-green-500" },
              { stage: "Recrutés", count: 3, color: "bg-emerald-500" },
            ].map((step, index) => (
              <div key={step.stage} className="text-center">
                <div className={`h-24 rounded-lg ${step.color} flex items-center justify-center mb-2`}>
                  <span className="text-2xl font-bold text-white">{step.count}</span>
                </div>
                <p className="text-sm font-medium">{step.stage}</p>
                {index < 4 && (
                  <div className="hidden md:flex justify-center mt-2">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function JobListings() {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredJobs = mockJobs.filter(job => 
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateJob = () => {
    toast({
      title: "Offre créée",
      description: "Votre nouvelle offre d'emploi a été publiée.",
    });
    setShowCreateDialog(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Offres d'emploi</h1>
          <p className="text-muted-foreground">Gérez vos offres de recrutement</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-create-job">
              <Plus className="h-4 w-4" />
              Nouvelle offre
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Créer une offre d'emploi</DialogTitle>
              <DialogDescription>Remplissez les informations pour publier une nouvelle offre</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Titre du poste</Label>
                <Input id="title" placeholder="Ex: Développeur Full Stack" data-testid="input-job-title" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="department">Département</Label>
                  <Select>
                    <SelectTrigger data-testid="select-department">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tech">Tech</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="rh">RH</SelectItem>
                      <SelectItem value="ventes">Ventes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="location">Localisation</Label>
                  <Input id="location" placeholder="Ex: Dakar, Sénégal" data-testid="input-location" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="type">Type de contrat</Label>
                  <Select>
                    <SelectTrigger data-testid="select-contract-type">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cdi">CDI</SelectItem>
                      <SelectItem value="cdd">CDD</SelectItem>
                      <SelectItem value="stage">Stage</SelectItem>
                      <SelectItem value="freelance">Freelance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="salary">Salaire (FCFA/mois)</Label>
                  <Input id="salary" placeholder="Ex: 800K - 1.2M" data-testid="input-salary" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description du poste</Label>
                <Textarea 
                  id="description" 
                  rows={5}
                  placeholder="Décrivez les responsabilités, qualifications requises..."
                  data-testid="textarea-description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Annuler</Button>
              <Button onClick={handleCreateJob} data-testid="button-submit-job">Publier l'offre</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une offre..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search-jobs"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filtres
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Poste</TableHead>
              <TableHead>Département</TableHead>
              <TableHead>Localisation</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Candidatures</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredJobs.map((job) => (
              <TableRow key={job.id} data-testid={`job-row-${job.id}`}>
                <TableCell>
                  <div>
                    <p className="font-medium">{job.title}</p>
                    <p className="text-sm text-muted-foreground">{job.salary}</p>
                  </div>
                </TableCell>
                <TableCell>{job.department}</TableCell>
                <TableCell>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {job.location}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{job.type}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span>{job.applications}</span>
                    {job.newApplications > 0 && (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                        +{job.newApplications}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    className={job.status === "active" 
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300"
                    }
                  >
                    {job.status === "active" ? "Active" : "En pause"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function ApplicationsPage() {
  const [selectedApplication, setSelectedApplication] = useState<typeof mockApplications[0] | null>(null);
  const { toast } = useToast();

  const handleStageChange = (appId: number, newStage: string) => {
    toast({
      title: "Statut mis à jour",
      description: `Le candidat a été déplacé vers "${stageLabels[newStage].label}"`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Candidatures</h1>
          <p className="text-muted-foreground">Gérez toutes les candidatures reçues</p>
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Toutes ({mockApplications.length})</TabsTrigger>
          <TabsTrigger value="new">Nouvelles (2)</TabsTrigger>
          <TabsTrigger value="shortlist">Présélection (3)</TabsTrigger>
          <TabsTrigger value="interview">Entretien (2)</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidat</TableHead>
                  <TableHead>Poste</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Étape</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockApplications.map((app) => (
                  <TableRow key={app.id} data-testid={`application-row-${app.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-gradient-to-br from-violet-500 to-pink-500 text-white">
                            {app.candidate.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{app.candidate}</p>
                          <p className="text-sm text-muted-foreground">{app.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{app.job}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={app.matchScore} className="w-16 h-2" />
                        <span className="text-sm font-medium">{app.matchScore}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select 
                        defaultValue={app.stage}
                        onValueChange={(value) => handleStageChange(app.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">Nouveau</SelectItem>
                          <SelectItem value="review">En revue</SelectItem>
                          <SelectItem value="interview">Entretien</SelectItem>
                          <SelectItem value="offer">Offre</SelectItem>
                          <SelectItem value="hired">Recruté</SelectItem>
                          <SelectItem value="rejected">Refusé</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{app.appliedAt}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" title="Voir profil">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Planifier entretien">
                          <Calendar className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Envoyer message">
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ComingSoonPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="p-6 rounded-full bg-muted mb-6">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-bold mb-2">{title}</h1>
      <p className="text-muted-foreground max-w-md">{description}</p>
    </div>
  );
}

export default function CompanyDashboardPage() {
  const [location] = useLocation();

  const renderContent = () => {
    if (location === "/company/dashboard" || location === "/company") {
      return <DashboardOverview />;
    }
    
    if (location.startsWith("/company/jobs")) {
      return <JobListings />;
    }
    
    if (location.startsWith("/company/applications")) {
      return <ApplicationsPage />;
    }
    
    if (location.startsWith("/company/pipeline")) {
      return <RecruitmentPipeline />;
    }
    
    if (location.startsWith("/company/statistics")) {
      return <RecruitmentStatistics />;
    }
    
    if (location.startsWith("/company/employees")) {
      return <EmployeeManagement />;
    }
    
    if (location.startsWith("/company/leaves")) {
      return <LeaveManagement />;
    }
    
    if (location.startsWith("/company/payroll")) {
      return <PayrollManagement />;
    }
    
    if (location.startsWith("/company/orgchart")) {
      return <OrgChart />;
    }
    
    if (location.startsWith("/company/departments")) {
      return <DepartmentManagement />;
    }
    
    if (location.startsWith("/company/positions")) {
      return <PositionManagement />;
    }
    
    if (location.startsWith("/company/security")) {
      return <SecurityManagement />;
    }
    
    if (location.startsWith("/company/sites")) {
      return <SitesManagement />;
    }
    
    if (location.startsWith("/company/certifications")) {
      return <CertificationsManagement />;
    }
    
    if (location.startsWith("/company/epi")) {
      return <EPIManagement />;
    }
    
    if (location.startsWith("/company/hse")) {
      return <HSEManagement />;
    }
    
    if (location.startsWith("/company/settings")) {
      return <ComingSoonPage title="Paramètres" description="La configuration de l'entreprise sera bientôt disponible." />;
    }
    
    if (location.startsWith("/company/support")) {
      return <ComingSoonPage title="Support" description="Le centre d'aide sera bientôt disponible." />;
    }

    return <DashboardOverview />;
  };

  return renderContent();
}
