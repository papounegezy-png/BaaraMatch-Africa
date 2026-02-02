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
  TrendingDown,
  TrendingUp,
  XCircle,
  BookOpen,
  AlertCircle,
  Flame,
} from "lucide-react";

const mockIncidents = [
  {
    id: "1",
    date: "2026-01-28",
    time: "14:30",
    site: "Mine d'Or Kédougou",
    type: "Accident de travail",
    severity: "serious",
    description: "Chute de plain-pied dans la zone de stockage",
    injured: "Ousmane Ba",
    injuries: "Entorse cheville gauche",
    daysLost: 5,
    status: "investigating",
    rootCause: null,
    correctiveActions: null,
  },
  {
    id: "2",
    date: "2026-01-25",
    time: "09:15",
    site: "Chantier Autoroute Dakar-AIBD",
    type: "Presqu'accident",
    severity: "minor",
    description: "Chute d'outil depuis un échafaudage",
    injured: null,
    injuries: null,
    daysLost: 0,
    status: "closed",
    rootCause: "Mauvaise fixation des outils",
    correctiveActions: "Formation rappel sécurité + inspection échafaudages",
  },
  {
    id: "3",
    date: "2026-01-20",
    time: "16:45",
    site: "Mine de Bauxite Sangarédi",
    type: "Accident de travail",
    severity: "minor",
    description: "Coupure superficielle lors de manipulation d'équipement",
    injured: "Alpha Condé",
    injuries: "Coupure main droite",
    daysLost: 1,
    status: "closed",
    rootCause: "Port de gants inadapté",
    correctiveActions: "Remplacement gants + sensibilisation",
  },
  {
    id: "4",
    date: "2026-01-15",
    time: "11:00",
    site: "Mine d'Or Kédougou",
    type: "Incident environnemental",
    severity: "moderate",
    description: "Fuite mineure de carburant sur zone de ravitaillement",
    injured: null,
    injuries: null,
    daysLost: 0,
    status: "closed",
    rootCause: "Joint défectueux sur pompe",
    correctiveActions: "Remplacement pompe + bac de rétention installé",
  },
];

const mockTrainings = [
  {
    id: "1",
    title: "Formation SST (Sauveteur Secouriste)",
    type: "Obligatoire",
    duration: "14h",
    participants: 25,
    completedBy: 22,
    nextSession: "2026-02-15",
    site: "Tous sites",
    instructor: "Croix Rouge",
  },
  {
    id: "2",
    title: "Travail en hauteur",
    type: "Obligatoire",
    duration: "8h",
    participants: 40,
    completedBy: 38,
    nextSession: "2026-03-01",
    site: "BTP uniquement",
    instructor: "APAVE",
  },
  {
    id: "3",
    title: "Manipulation extincteurs",
    type: "Obligatoire",
    duration: "4h",
    participants: 150,
    completedBy: 145,
    nextSession: "2026-02-20",
    site: "Tous sites",
    instructor: "Pompiers de Dakar",
  },
  {
    id: "4",
    title: "Risques chimiques",
    type: "Spécifique",
    duration: "8h",
    participants: 30,
    completedBy: 28,
    nextSession: "2026-04-10",
    site: "Mines",
    instructor: "Bureau Veritas",
  },
  {
    id: "5",
    title: "Conduite défensive",
    type: "Recommandée",
    duration: "4h",
    participants: 60,
    completedBy: 45,
    nextSession: "2026-02-28",
    site: "Tous sites",
    instructor: "Auto-école Pro",
  },
];

const mockStats = {
  accidentsThisYear: 8,
  accidentsLastYear: 12,
  daysLostThisYear: 45,
  daysLostLastYear: 78,
  frequencyRate: 12.5,
  gravityRate: 0.35,
  nearMisses: 15,
  trainingsCompleted: 420,
  complianceRate: 94,
};

const monthlySafetyData = [
  { month: "Jan", accidents: 2, nearMisses: 3 },
  { month: "Fév", accidents: 1, nearMisses: 2 },
  { month: "Mar", accidents: 0, nearMisses: 4 },
  { month: "Avr", accidents: 1, nearMisses: 2 },
  { month: "Mai", accidents: 0, nearMisses: 1 },
  { month: "Jun", accidents: 2, nearMisses: 3 },
];

export function HSEManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("incidents");

  const filteredIncidents = mockIncidents.filter(
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
          <Dialog>
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
                    <Input id="incident-date" type="date" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="incident-time">Heure</Label>
                    <Input id="incident-time" type="time" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="incident-type">Type</Label>
                    <Select>
                      <SelectTrigger>
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
                    <Select>
                      <SelectTrigger>
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
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner le site" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="site1">Mine d'Or Kédougou</SelectItem>
                      <SelectItem value="site2">Chantier Autoroute Dakar-AIBD</SelectItem>
                      <SelectItem value="site3">Mine de Bauxite Sangarédi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" placeholder="Décrivez l'incident en détail..." />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" variant="destructive" data-testid="button-save-incident">
                  Enregistrer l'incident
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accidents 2026</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.accidentsThisYear}</div>
            <div className="flex items-center text-xs">
              <TrendingDown className="w-3 h-3 mr-1 text-green-500" />
              <span className="text-green-600">-33% vs 2025</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jours perdus</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.daysLostThisYear}</div>
            <div className="flex items-center text-xs">
              <TrendingDown className="w-3 h-3 mr-1 text-green-500" />
              <span className="text-green-600">-42% vs 2025</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de fréquence</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.frequencyRate}</div>
            <p className="text-xs text-muted-foreground">Accidents / million h</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conformité formations</CardTitle>
            <BookOpen className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{mockStats.complianceRate}%</div>
            <Progress value={mockStats.complianceRate} className="h-1.5 mt-2" />
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
              <Button data-testid="button-add-training">
                <Plus className="w-4 h-4 mr-2" />
                Planifier formation
              </Button>
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
                  {mockTrainings.map((training) => {
                    const completionRate = Math.round((training.completedBy / training.participants) * 100);
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
                  {monthlySafetyData.map((data) => (
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
                    <span className="text-sm font-medium">Taux de fréquence (TF)</span>
                    <Badge variant="outline">{mockStats.frequencyRate}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Nombre d'accidents avec arrêt × 1 000 000 / Heures travaillées
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Taux de gravité (TG)</span>
                    <Badge variant="outline">{mockStats.gravityRate}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Jours perdus × 1 000 / Heures travaillées
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Jours sans accident</span>
                    <Badge className="bg-green-500">28 jours</Badge>
                  </div>
                  <Progress value={70} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Objectif: 40 jours consécutifs
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Formations à jour</span>
                    <Badge className="bg-green-500">{mockStats.trainingsCompleted}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Employés formés cette année
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
