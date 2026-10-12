import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useOperationalModuleState } from "@/hooks/use-operational-module-state";
import {
  AlertTriangle,
  Search,
  Plus,
  CheckCircle,
  Clock,
  Calendar,
  FileText,
  BarChart3,
  Shield,
  Activity,
  Users,
  TrendingUp,
  XCircle,
  BookOpen,
  AlertCircle,
  Flame,
} from "lucide-react";

type Incident = {
  id: string;
  date: string;
  time: string;
  site: string;
  type: string;
  severity: string;
  description: string;
  injured: string | null;
  injuries: string | null;
  daysLost: number;
  status: string;
  rootCause: string | null;
  correctiveActions: string | null;
};

interface Training {
  id: string;
  title: string;
  type: string;
  duration: string;
  participants: number;
  completedBy: number;
  nextSession: string;
  site: string;
  instructor: string;
}

interface HseSite {
  id: string;
  name: string;
}

const incidentTypeLabels: Record<string, string> = {
  accident: "Accident de travail",
  near_miss: "Presqu'accident",
  environmental: "Incident environnemental",
  property: "Dommage matériel",
};

const emptyIncidentForm = {
  date: "",
  time: "",
  type: "",
  severity: "",
  site: "",
  description: "",
};

const emptyTrainingForm = {
  title: "",
  type: "",
  duration: "",
  participants: "",
  nextSession: "",
  site: "",
  instructor: "",
};

// Groups real incidents by calendar month, for the last 6 months, instead
// of a hand-typed fake bar chart — "accident" = anything whose type label
// contains "Accident", "near miss" = exactly "Presqu'accident".
function computeMonthlySafetySeries(incidents: Incident[]) {
  const months: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString("fr-FR", { month: "short" }),
    });
  }
  return months.map(({ key, label }) => {
    const [year, month] = key.split("-").map(Number);
    const monthIncidents = incidents.filter((i) => {
      const d = new Date(i.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    return {
      month: label,
      accidents: monthIncidents.filter((i) => i.type.includes("Accident")).length,
      nearMisses: monthIncidents.filter((i) => i.type === "Presqu'accident").length,
    };
  });
}

export function HSEManagement() {
  const { toast } = useToast();
  const { moduleState, saveModuleState, isSavingModuleState } = useOperationalModuleState("hse", {
    incidents: [] as Incident[],
    trainings: [] as Training[],
  });
  const incidents = moduleState.incidents ?? [];
  const trainings = moduleState.trainings ?? [];
  // Read-only: sources the incident "Site" picker from the real sites
  // directory (see sites-management.tsx) instead of a hardcoded 3-site list.
  const { moduleState: sitesModuleState } = useOperationalModuleState("sites", {
    sites: [] as HseSite[],
  });
  const realSites = sitesModuleState.sites ?? [];

  const currentYear = new Date().getFullYear();
  const incidentsThisYear = incidents.filter((i) => new Date(i.date).getFullYear() === currentYear);
  const accidentsThisYear = incidentsThisYear.length;
  const daysLostThisYear = incidentsThisYear.reduce((sum, i) => sum + i.daysLost, 0);
  const totalParticipants = trainings.reduce((sum, t) => sum + t.participants, 0);
  const totalCompleted = trainings.reduce((sum, t) => sum + t.completedBy, 0);
  const complianceRate = totalParticipants > 0 ? Math.round((totalCompleted / totalParticipants) * 100) : 0;
  const mostRecentIncidentDate = incidents.length > 0
    ? incidents.reduce((latest, i) => (new Date(i.date) > new Date(latest) ? i.date : latest), incidents[0].date)
    : null;
  const daysSinceLastIncident = mostRecentIncidentDate
    ? Math.floor((Date.now() - new Date(mostRecentIncidentDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const safetySeries = computeMonthlySafetySeries(incidents);

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("incidents");
  const [showIncidentDialog, setShowIncidentDialog] = useState(false);
  const [incidentForm, setIncidentForm] = useState(emptyIncidentForm);
  const [showTrainingDialog, setShowTrainingDialog] = useState(false);
  const [trainingForm, setTrainingForm] = useState(emptyTrainingForm);

  const filteredIncidents = incidents.filter(
    (incident) =>
      incident.site.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "serious":
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Grave</Badge>;
      case "moderate":
        return <Badge className="bg-orange-500"><AlertCircle className="w-3 h-3 mr-1" />Modéré</Badge>;
      case "minor":
        return <Badge className="bg-yellow-500"><AlertCircle className="w-3 h-3 mr-1" />Mineur</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "investigating":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />En cours</Badge>;
      case "pending_actions":
        return <Badge className="bg-blue-500"><Clock className="w-3 h-3 mr-1" />Actions en cours</Badge>;
      case "closed":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Clôturé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleAddIncident = async () => {
    if (!incidentForm.date || !incidentForm.type || !incidentForm.severity || !incidentForm.site || !incidentForm.description.trim()) {
      toast({
        title: "Champs requis",
        description: "Date, type, gravité, site et description sont obligatoires.",
        variant: "destructive",
      });
      return;
    }

    const nextId = (incidents.reduce((max, i) => Math.max(max, Number(i.id) || 0), 0) + 1).toString();
    const site = realSites.find((s) => s.id === incidentForm.site);
    const newIncident: Incident = {
      id: nextId,
      date: incidentForm.date,
      time: incidentForm.time,
      site: site?.name ?? incidentForm.site,
      type: incidentTypeLabels[incidentForm.type] ?? incidentForm.type,
      severity: incidentForm.severity,
      description: incidentForm.description.trim(),
      injured: null,
      injuries: null,
      daysLost: 0,
      status: "investigating",
      rootCause: null,
      correctiveActions: null,
    };

    try {
      await saveModuleState({
        incidents: [newIncident, ...incidents],
        trainings,
      });
      toast({
        title: "Incident déclaré",
        description: "L'incident a été enregistré avec succès.",
      });
      setIncidentForm(emptyIncidentForm);
      setShowIncidentDialog(false);
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer l'incident.",
        variant: "destructive",
      });
    }
  };

  const handleAddTraining = async () => {
    if (!trainingForm.title.trim() || !trainingForm.type || !trainingForm.duration.trim() || !trainingForm.nextSession) {
      toast({
        title: "Champs requis",
        description: "Titre, type, durée et date de session sont obligatoires.",
        variant: "destructive",
      });
      return;
    }

    const nextId = (trainings.reduce((max, t) => Math.max(max, Number(t.id) || 0), 0) + 1).toString();
    const newTraining: Training = {
      id: nextId,
      title: trainingForm.title.trim(),
      type: trainingForm.type,
      duration: trainingForm.duration.trim(),
      participants: Number(trainingForm.participants) || 0,
      completedBy: 0,
      nextSession: trainingForm.nextSession,
      site: trainingForm.site.trim(),
      instructor: trainingForm.instructor.trim(),
    };

    try {
      await saveModuleState({
        incidents,
        trainings: [...trainings, newTraining],
      });
      toast({
        title: "Formation planifiée",
        description: "La formation a été ajoutée avec succès.",
      });
      setTrainingForm(emptyTrainingForm);
      setShowTrainingDialog(false);
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de planifier la formation.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-hse-title">HSE - Hygiène, Sécurité, Environnement</h1>
          <p className="text-muted-foreground">Gestion des incidents, formations et statistiques sécurité</p>
        </div>
        <div className="flex gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-hse"
            />
          </div>
          <Dialog open={showIncidentDialog} onOpenChange={setShowIncidentDialog}>
            <DialogTrigger asChild>
              <Button variant="destructive" data-testid="button-report-incident">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Déclarer incident
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Déclarer un incident</DialogTitle>
                <DialogDescription>Enregistrez un accident, presqu'accident ou incident</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="incident-date">Date</Label>
                    <Input
                      id="incident-date"
                      type="date"
                      value={incidentForm.date}
                      onChange={(e) => setIncidentForm({ ...incidentForm, date: e.target.value })}
                      data-testid="input-incident-date"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="incident-time">Heure</Label>
                    <Input
                      id="incident-time"
                      type="time"
                      value={incidentForm.time}
                      onChange={(e) => setIncidentForm({ ...incidentForm, time: e.target.value })}
                      data-testid="input-incident-time"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="incident-type">Type</Label>
                    <Select value={incidentForm.type} onValueChange={(v) => setIncidentForm({ ...incidentForm, type: v })}>
                      <SelectTrigger data-testid="select-incident-type">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="accident">Accident de travail</SelectItem>
                        <SelectItem value="near_miss">Presqu'accident</SelectItem>
                        <SelectItem value="environmental">Incident environnemental</SelectItem>
                        <SelectItem value="property">Dommage matériel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="severity">Gravité</Label>
                    <Select value={incidentForm.severity} onValueChange={(v) => setIncidentForm({ ...incidentForm, severity: v })}>
                      <SelectTrigger data-testid="select-incident-severity">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minor">Mineur</SelectItem>
                        <SelectItem value="moderate">Modéré</SelectItem>
                        <SelectItem value="serious">Grave</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="site">Site</Label>
                  <Select
                    value={incidentForm.site}
                    onValueChange={(v) => setIncidentForm({ ...incidentForm, site: v })}
                    disabled={realSites.length === 0}
                  >
                    <SelectTrigger data-testid="select-incident-site">
                      <SelectValue placeholder={realSites.length === 0 ? "Aucun site enregistré" : "Sélectionner le site"} />
                    </SelectTrigger>
                    <SelectContent>
                      {realSites.map((site) => (
                        <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Décrivez l'incident en détail..."
                    value={incidentForm.description}
                    onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })}
                    data-testid="input-incident-description"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  variant="destructive"
                  onClick={handleAddIncident}
                  disabled={isSavingModuleState}
                  data-testid="button-save-incident"
                >
                  {isSavingModuleState ? "Enregistrement..." : "Enregistrer l'incident"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accidents {currentYear}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accidentsThisYear}</div>
            <p className="text-xs text-muted-foreground">incidents déclarés cette année</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jours perdus</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{daysLostThisYear}</div>
            <p className="text-xs text-muted-foreground">jours d'arrêt cette année</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jours sans accident</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{daysSinceLastIncident ?? "-"}</div>
            <p className="text-xs text-muted-foreground">
              {daysSinceLastIncident !== null ? "depuis le dernier incident" : "aucun incident déclaré"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conformité formations</CardTitle>
            <BookOpen className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{complianceRate}%</div>
            <Progress value={complianceRate} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="tabs-hse">
        <TabsList>
          <TabsTrigger value="incidents" data-testid="tab-incidents">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Incidents
          </TabsTrigger>
          <TabsTrigger value="trainings" data-testid="tab-trainings">
            <BookOpen className="w-4 h-4 mr-2" />
            Formations
          </TabsTrigger>
          <TabsTrigger value="statistics" data-testid="tab-statistics">
            <BarChart3 className="w-4 h-4 mr-2" />
            Statistiques
          </TabsTrigger>
        </TabsList>

        <TabsContent value="incidents" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Registre des incidents</CardTitle>
              <CardDescription>Historique des accidents et incidents déclarés</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Blessé</TableHead>
                    <TableHead>Gravité</TableHead>
                    <TableHead>Jours perdus</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIncidents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                        {incidents.length === 0
                          ? "Aucun incident déclaré pour le moment."
                          : "Aucun incident ne correspond à cette recherche."}
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredIncidents.map((incident) => (
                    <TableRow key={incident.id} data-testid={`row-incident-${incident.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{new Date(incident.date).toLocaleDateString("fr-FR")}</p>
                          <p className="text-xs text-muted-foreground">{incident.time}</p>
                        </div>
                      </TableCell>
                      <TableCell>{incident.site}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{incident.type}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{incident.description}</TableCell>
                      <TableCell>
                        {incident.injured ? (
                          <span className="font-medium">{incident.injured}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getSeverityBadge(incident.severity)}</TableCell>
                      <TableCell>
                        {incident.daysLost > 0 ? (
                          <Badge variant="destructive">{incident.daysLost} jours</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(incident.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trainings" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Formations sécurité</CardTitle>
                <CardDescription>Suivi des formations obligatoires et recommandées</CardDescription>
              </div>
              <Dialog open={showTrainingDialog} onOpenChange={setShowTrainingDialog}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-training">
                    <Plus className="w-4 h-4 mr-2" />
                    Planifier formation
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Planifier une formation</DialogTitle>
                    <DialogDescription>Ajoutez une nouvelle formation sécurité au programme</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="training-title">Titre</Label>
                      <Input
                        id="training-title"
                        placeholder="Titre de la formation"
                        value={trainingForm.title}
                        onChange={(e) => setTrainingForm({ ...trainingForm, title: e.target.value })}
                        data-testid="input-training-title"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="training-type">Type</Label>
                        <Select value={trainingForm.type} onValueChange={(v) => setTrainingForm({ ...trainingForm, type: v })}>
                          <SelectTrigger data-testid="select-training-type">
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Obligatoire">Obligatoire</SelectItem>
                            <SelectItem value="Spécifique">Spécifique</SelectItem>
                            <SelectItem value="Recommandée">Recommandée</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="training-duration">Durée</Label>
                        <Input
                          id="training-duration"
                          placeholder="ex: 8h"
                          value={trainingForm.duration}
                          onChange={(e) => setTrainingForm({ ...trainingForm, duration: e.target.value })}
                          data-testid="input-training-duration"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="training-participants">Participants</Label>
                        <Input
                          id="training-participants"
                          type="number"
                          placeholder="0"
                          value={trainingForm.participants}
                          onChange={(e) => setTrainingForm({ ...trainingForm, participants: e.target.value })}
                          data-testid="input-training-participants"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="training-next-session">Prochaine session</Label>
                        <Input
                          id="training-next-session"
                          type="date"
                          value={trainingForm.nextSession}
                          onChange={(e) => setTrainingForm({ ...trainingForm, nextSession: e.target.value })}
                          data-testid="input-training-next-session"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="training-site">Sites</Label>
                        <Input
                          id="training-site"
                          placeholder="ex: Tous sites"
                          value={trainingForm.site}
                          onChange={(e) => setTrainingForm({ ...trainingForm, site: e.target.value })}
                          data-testid="input-training-site"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="training-instructor">Formateur</Label>
                        <Input
                          id="training-instructor"
                          placeholder="Nom du formateur"
                          value={trainingForm.instructor}
                          onChange={(e) => setTrainingForm({ ...trainingForm, instructor: e.target.value })}
                          data-testid="input-training-instructor"
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleAddTraining}
                      disabled={isSavingModuleState}
                      data-testid="button-save-training"
                    >
                      {isSavingModuleState ? "Enregistrement..." : "Planifier"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Formation</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Durée</TableHead>
                    <TableHead>Progression</TableHead>
                    <TableHead>Prochaine session</TableHead>
                    <TableHead>Sites</TableHead>
                    <TableHead>Formateur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trainings.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                        Aucune formation planifiée pour le moment.
                      </TableCell>
                    </TableRow>
                  )}
                  {trainings.map((training) => {
                    const completionRate = training.participants > 0
                      ? Math.round((training.completedBy / training.participants) * 100)
                      : 0;
                    return (
                      <TableRow key={training.id} data-testid={`row-training-${training.id}`}>
                        <TableCell className="font-medium">{training.title}</TableCell>
                        <TableCell>
                          <Badge
                            variant={training.type === "Obligatoire" ? "default" : training.type === "Spécifique" ? "secondary" : "outline"}
                          >
                            {training.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{training.duration}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span>{training.completedBy}/{training.participants}</span>
                              <span className={completionRate >= 90 ? "text-green-600" : "text-yellow-600"}>
                                {completionRate}%
                              </span>
                            </div>
                            <Progress value={completionRate} className="h-1.5" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            {new Date(training.nextSession).toLocaleDateString("fr-FR")}
                          </div>
                        </TableCell>
                        <TableCell>{training.site}</TableCell>
                        <TableCell className="text-muted-foreground">{training.instructor}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statistics" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Évolution mensuelle</CardTitle>
                <CardDescription>Accidents et presqu'accidents par mois</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {safetySeries.map((data) => (
                    <div key={data.month} className="flex items-center gap-4">
                      <span className="w-12 text-sm font-medium">{data.month}</span>
                      <div className="flex-1 flex gap-2">
                        <div className="flex items-center gap-1">
                          <div className="h-4 bg-red-500 rounded" style={{ width: `${data.accidents * 30}px` }} />
                          <span className="text-xs text-muted-foreground">{data.accidents}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="h-4 bg-yellow-500 rounded" style={{ width: `${data.nearMisses * 20}px` }} />
                          <span className="text-xs text-muted-foreground">{data.nearMisses}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-4 text-sm pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded" />
                      <span>Accidents</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded" />
                      <span>Presqu'accidents</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Indicateurs clés</CardTitle>
                <CardDescription>Comparaison annuelle</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Taux de fréquence / Taux de gravité</span>
                    <Badge variant="outline">Bientôt disponible</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ces indicateurs nécessitent le suivi des heures travaillées, pas encore disponible dans BaaraMatch.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Jours sans accident</span>
                    <Badge className="bg-green-500">{daysSinceLastIncident ?? "-"}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {daysSinceLastIncident !== null ? "Depuis le dernier incident déclaré" : "Aucun incident déclaré pour le moment"}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Formations complétées</span>
                    <Badge className="bg-green-500">{totalCompleted}/{totalParticipants}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Employés formés sur le total inscrit
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
