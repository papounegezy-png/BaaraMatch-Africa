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
  MapPin,
  Users,
  Search,
  Plus,
  Edit,
  Eye,
  Building,
  Home,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  HardHat,
} from "lucide-react";

interface Site {
  id: string;
  name: string;
  location: string;
  type: string;
  status: string;
  capacity: number;
  currentStaff: number;
  rotationType: string;
  manager: string;
  startDate: string;
  endDate: string | null;
  accommodation: boolean;
  accommodationCapacity: number;
}

interface Affectation {
  id: string;
  employeeId?: number;
  employeeName: string;
  employeeRole: string;
  siteId: string;
  siteName: string;
  startDate: string;
  endDate: string;
  status: string;
  accommodation: string | null;
}

interface Rotation {
  id: string;
  siteId: string;
  siteName: string;
  rotationType: string;
  currentCycle: string;
  nextRotation: string;
  employeesRotating: number;
  status: string;
}

interface Accommodation {
  id: string;
  siteId: string;
  name: string;
  type: string;
  capacity: number;
  occupied: number;
  blocks: number;
  amenities: string[];
}

interface SiteEmployee {
  id: number;
  name: string;
  position: string;
}

const emptySiteForm = {
  name: "",
  type: "",
  rotationType: "",
  location: "",
  capacity: "",
  manager: "",
};

const emptyAffectationForm = {
  employeeId: "",
  employeeName: "",
  employeeRole: "",
  siteId: "",
  startDate: "",
  endDate: "",
  accommodation: "",
};

const emptyAccommodationForm = {
  name: "",
  type: "",
  siteId: "",
  capacity: "",
  blocks: "",
  amenities: "",
};

export function SitesManagement() {
  const { toast } = useToast();
  const { moduleState, saveModuleState, isSavingModuleState } = useOperationalModuleState("sites", {
    sites: [] as Site[],
    affectations: [] as Affectation[],
    rotations: [] as Rotation[],
    accommodations: [] as Accommodation[],
  });
  const sites = moduleState.sites ?? [];
  const affectations = moduleState.affectations ?? [];
  const rotations = moduleState.rotations ?? [];
  const accommodations = moduleState.accommodations ?? [];
  // Read-only: sources the "Employé" picker from the real employee
  // directory (see employee-management.tsx) instead of free-text entry.
  const { moduleState: employeeModuleState } = useOperationalModuleState("employee", {
    employees: [] as SiteEmployee[],
  });
  const rosterEmployees = employeeModuleState.employees ?? [];
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("sites");
  const [showAddSiteDialog, setShowAddSiteDialog] = useState(false);
  const [siteForm, setSiteForm] = useState(emptySiteForm);
  const [showAddAffectationDialog, setShowAddAffectationDialog] = useState(false);
  const [affectationForm, setAffectationForm] = useState(emptyAffectationForm);
  const [showAddAccommodationDialog, setShowAddAccommodationDialog] = useState(false);
  const [accommodationForm, setAccommodationForm] = useState(emptyAccommodationForm);

  const handleAddSite = async () => {
    if (!siteForm.name.trim() || !siteForm.location.trim()) {
      toast({
        title: "Champs requis",
        description: "Le nom et la localisation sont obligatoires.",
        variant: "destructive",
      });
      return;
    }

    const nextId = (sites.reduce((max, s) => Math.max(max, Number(s.id) || 0), 0) + 1).toString();
    const newSite: Site = {
      id: nextId,
      name: siteForm.name.trim(),
      location: siteForm.location.trim(),
      type: siteForm.type || "Autre",
      status: "planning",
      capacity: Number(siteForm.capacity) || 0,
      currentStaff: 0,
      rotationType: siteForm.rotationType || "14/14",
      manager: siteForm.manager.trim(),
      startDate: new Date().toISOString().split("T")[0],
      endDate: null,
      accommodation: false,
      accommodationCapacity: 0,
    };

    try {
      await saveModuleState({ sites: [...sites, newSite], affectations, rotations, accommodations });
      toast({
        title: "Site créé",
        description: "Le nouveau site a été ajouté avec succès.",
      });
      setSiteForm(emptySiteForm);
      setShowAddSiteDialog(false);
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer le nouveau site.",
        variant: "destructive",
      });
    }
  };

  const handleAddAffectation = async () => {
    if (!affectationForm.employeeId || !affectationForm.siteId || !affectationForm.startDate || !affectationForm.endDate) {
      toast({
        title: "Champs requis",
        description: "L'employé, le site et les dates sont obligatoires.",
        variant: "destructive",
      });
      return;
    }

    const site = sites.find((s) => s.id === affectationForm.siteId);
    const employee = rosterEmployees.find((e) => e.id.toString() === affectationForm.employeeId);
    const nextId = (affectations.reduce((max, a) => Math.max(max, Number(a.id) || 0), 0) + 1).toString();
    const newAffectation: Affectation = {
      id: nextId,
      employeeId: employee?.id,
      employeeName: employee?.name ?? affectationForm.employeeName,
      employeeRole: affectationForm.employeeRole.trim(),
      siteId: affectationForm.siteId,
      siteName: site?.name ?? "",
      startDate: affectationForm.startDate,
      endDate: affectationForm.endDate,
      status: "scheduled",
      accommodation: affectationForm.accommodation.trim() || null,
    };

    try {
      await saveModuleState({ sites, affectations: [...affectations, newAffectation], rotations, accommodations });
      toast({
        title: "Affectation créée",
        description: "La nouvelle affectation a été ajoutée avec succès.",
      });
      setAffectationForm(emptyAffectationForm);
      setShowAddAffectationDialog(false);
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer la nouvelle affectation.",
        variant: "destructive",
      });
    }
  };

  const handleAddAccommodation = async () => {
    if (!accommodationForm.name.trim() || !accommodationForm.siteId || !accommodationForm.capacity) {
      toast({
        title: "Champs requis",
        description: "Le nom, le site et la capacité sont obligatoires.",
        variant: "destructive",
      });
      return;
    }

    const nextId = (accommodations.reduce((max, a) => Math.max(max, Number(a.id) || 0), 0) + 1).toString();
    const newAccommodation: Accommodation = {
      id: nextId,
      siteId: accommodationForm.siteId,
      name: accommodationForm.name.trim(),
      type: accommodationForm.type || "Permanent",
      capacity: Number(accommodationForm.capacity) || 0,
      occupied: 0,
      blocks: Number(accommodationForm.blocks) || 0,
      amenities: accommodationForm.amenities
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
    };

    try {
      await saveModuleState({ sites, affectations, rotations, accommodations: [...accommodations, newAccommodation] });
      toast({
        title: "Hébergement créé",
        description: "Le nouvel hébergement a été ajouté avec succès.",
      });
      setAccommodationForm(emptyAccommodationForm);
      setShowAddAccommodationDialog(false);
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer le nouvel hébergement.",
        variant: "destructive",
      });
    }
  };

  const filteredSites = sites.filter(
    (site) =>
      site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Actif</Badge>;
      case "planning":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Planification</Badge>;
      case "on_hold":
        return <Badge variant="outline"><AlertTriangle className="w-3 h-3 mr-1" />Suspendu</Badge>;
      case "completed":
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Terminé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getAffectationStatusBadge = (status: string) => {
    switch (status) {
      case "on_site":
        return <Badge className="bg-green-500">Sur site</Badge>;
      case "scheduled":
        return <Badge variant="secondary">Planifié</Badge>;
      case "completed":
        return <Badge variant="outline">Terminé</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Annulé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-sites-title">Gestion des Chantiers & Sites</h1>
          <p className="text-muted-foreground">Gérez vos sites, affectations et rotations d'équipes</p>
        </div>
        <div className="flex gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-sites"
            />
          </div>
          <Dialog open={showAddSiteDialog} onOpenChange={setShowAddSiteDialog}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-site">
                <Plus className="w-4 h-4 mr-2" />
                Nouveau site
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Ajouter un site</DialogTitle>
                <DialogDescription>Créez un nouveau chantier ou site minier</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="site-name">Nom du site</Label>
                  <Input
                    id="site-name"
                    placeholder="Ex: Mine d'Or Kédougou"
                    value={siteForm.name}
                    onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })}
                    data-testid="input-site-name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="site-type">Type</Label>
                    <Select value={siteForm.type} onValueChange={(v) => setSiteForm({ ...siteForm, type: v })}>
                      <SelectTrigger data-testid="select-site-type">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mine">Mine</SelectItem>
                        <SelectItem value="BTP">BTP</SelectItem>
                        <SelectItem value="Pétrole & Gaz">Pétrole & Gaz</SelectItem>
                        <SelectItem value="Autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="rotation">Rotation</Label>
                    <Select value={siteForm.rotationType} onValueChange={(v) => setSiteForm({ ...siteForm, rotationType: v })}>
                      <SelectTrigger data-testid="select-site-rotation">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="14/14">14/14</SelectItem>
                        <SelectItem value="21/7">21/7</SelectItem>
                        <SelectItem value="28/14">28/14</SelectItem>
                        <SelectItem value="custom">Personnalisé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="location">Localisation</Label>
                  <Input
                    id="location"
                    placeholder="Ville, Pays"
                    value={siteForm.location}
                    onChange={(e) => setSiteForm({ ...siteForm, location: e.target.value })}
                    data-testid="input-site-location"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="capacity">Capacité</Label>
                    <Input
                      id="capacity"
                      type="number"
                      placeholder="250"
                      value={siteForm.capacity}
                      onChange={(e) => setSiteForm({ ...siteForm, capacity: e.target.value })}
                      data-testid="input-site-capacity"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="manager">Responsable</Label>
                    <Input
                      id="manager"
                      placeholder="Nom du responsable"
                      value={siteForm.manager}
                      onChange={(e) => setSiteForm({ ...siteForm, manager: e.target.value })}
                      data-testid="input-site-manager"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleAddSite}
                  disabled={isSavingModuleState}
                  data-testid="button-save-site"
                >
                  {isSavingModuleState ? "Création..." : "Créer le site"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sites actifs</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sites.filter(s => s.status === "active").length}</div>
            <p className="text-xs text-muted-foreground">sur {sites.length} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Personnel sur site</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sites.reduce((acc, s) => acc + s.currentStaff, 0)}</div>
            <p className="text-xs text-muted-foreground">employés affectés</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rotations à venir</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rotations.filter(r => r.status === "upcoming").length}</div>
            <p className="text-xs text-muted-foreground">cette semaine</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hébergements</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accommodations.reduce((acc, a) => acc + a.occupied, 0)}</div>
            <p className="text-xs text-muted-foreground">lits occupés</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="tabs-sites">
        <TabsList>
          <TabsTrigger value="sites" data-testid="tab-sites">
            <MapPin className="w-4 h-4 mr-2" />
            Sites
          </TabsTrigger>
          <TabsTrigger value="affectations" data-testid="tab-affectations">
            <Users className="w-4 h-4 mr-2" />
            Affectations
          </TabsTrigger>
          <TabsTrigger value="rotations" data-testid="tab-rotations">
            <RefreshCw className="w-4 h-4 mr-2" />
            Rotations
          </TabsTrigger>
          <TabsTrigger value="accommodations" data-testid="tab-accommodations">
            <Home className="w-4 h-4 mr-2" />
            Hébergements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sites" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Site</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Rotation</TableHead>
                    <TableHead>Capacité</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Responsable</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSites.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                        {sites.length === 0
                          ? "Aucun site pour le moment. Ajoutez votre premier site."
                          : "Aucun site ne correspond à cette recherche."}
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredSites.map((site) => (
                    <TableRow key={site.id} data-testid={`row-site-${site.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${site.type === "Mine" ? "bg-amber-100" : "bg-blue-100"}`}>
                            {site.type === "Mine" ? (
                              <HardHat className={`w-5 h-5 ${site.type === "Mine" ? "text-amber-600" : "text-blue-600"}`} />
                            ) : (
                              <Building className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{site.name}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {site.location}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={site.type === "Mine" ? "default" : "secondary"}>{site.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{site.rotationType}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">{site.currentStaff}/{site.capacity}</div>
                          <Progress value={site.capacity > 0 ? (site.currentStaff / site.capacity) * 100 : 0} className="h-1.5" />
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(site.status)}</TableCell>
                      <TableCell>{site.manager}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="icon" variant="ghost" disabled title="Bientôt disponible" data-testid={`button-view-site-${site.id}`}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" disabled title="Bientôt disponible" data-testid={`button-edit-site-${site.id}`}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="affectations" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Affectations du personnel</CardTitle>
                <CardDescription>Gérez les affectations des employés sur les sites</CardDescription>
              </div>
              <Dialog open={showAddAffectationDialog} onOpenChange={setShowAddAffectationDialog}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-affectation">
                    <Plus className="w-4 h-4 mr-2" />
                    Nouvelle affectation
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Ajouter une affectation</DialogTitle>
                    <DialogDescription>Affectez un employé à un site</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="affectation-employee">Employé</Label>
                        <Select
                          value={affectationForm.employeeId}
                          onValueChange={(v) => {
                            const employee = rosterEmployees.find((e) => e.id.toString() === v);
                            setAffectationForm({
                              ...affectationForm,
                              employeeId: v,
                              employeeName: employee?.name ?? "",
                              employeeRole: employee?.position ?? affectationForm.employeeRole,
                            });
                          }}
                          disabled={rosterEmployees.length === 0}
                        >
                          <SelectTrigger id="affectation-employee" data-testid="select-affectation-employee">
                            <SelectValue placeholder={rosterEmployees.length === 0 ? "Aucun employé enregistré" : "Sélectionner un employé"} />
                          </SelectTrigger>
                          <SelectContent>
                            {rosterEmployees.map((employee) => (
                              <SelectItem key={employee.id} value={employee.id.toString()}>{employee.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="affectation-role">Poste</Label>
                        <Input
                          id="affectation-role"
                          placeholder="Ex: Opérateur Engin"
                          value={affectationForm.employeeRole}
                          onChange={(e) => setAffectationForm({ ...affectationForm, employeeRole: e.target.value })}
                          data-testid="input-affectation-role"
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="affectation-site">Site</Label>
                      <Select value={affectationForm.siteId} onValueChange={(v) => setAffectationForm({ ...affectationForm, siteId: v })}>
                        <SelectTrigger data-testid="select-affectation-site">
                          <SelectValue placeholder="Sélectionner un site" />
                        </SelectTrigger>
                        <SelectContent>
                          {sites.map((site) => (
                            <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="affectation-start">Date de début</Label>
                        <Input
                          id="affectation-start"
                          type="date"
                          value={affectationForm.startDate}
                          onChange={(e) => setAffectationForm({ ...affectationForm, startDate: e.target.value })}
                          data-testid="input-affectation-start"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="affectation-end">Date de fin</Label>
                        <Input
                          id="affectation-end"
                          type="date"
                          value={affectationForm.endDate}
                          onChange={(e) => setAffectationForm({ ...affectationForm, endDate: e.target.value })}
                          data-testid="input-affectation-end"
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="affectation-accommodation">Hébergement (optionnel)</Label>
                      <Input
                        id="affectation-accommodation"
                        placeholder="Ex: Camp A - Bloc 3"
                        value={affectationForm.accommodation}
                        onChange={(e) => setAffectationForm({ ...affectationForm, accommodation: e.target.value })}
                        data-testid="input-affectation-accommodation"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleAddAffectation}
                      disabled={isSavingModuleState}
                      data-testid="button-save-affectation"
                    >
                      {isSavingModuleState ? "Création..." : "Créer l'affectation"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employé</TableHead>
                    <TableHead>Poste</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead>Hébergement</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {affectations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                        Aucune affectation pour le moment.
                      </TableCell>
                    </TableRow>
                  )}
                  {affectations.map((affectation) => (
                    <TableRow key={affectation.id} data-testid={`row-affectation-${affectation.id}`}>
                      <TableCell className="font-medium">{affectation.employeeName}</TableCell>
                      <TableCell>{affectation.employeeRole}</TableCell>
                      <TableCell>{affectation.siteName}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(affectation.startDate).toLocaleDateString("fr-FR")} -
                          {new Date(affectation.endDate).toLocaleDateString("fr-FR")}
                        </div>
                      </TableCell>
                      <TableCell>
                        {affectation.accommodation ? (
                          <Badge variant="outline">
                            <Home className="w-3 h-3 mr-1" />
                            {affectation.accommodation}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getAffectationStatusBadge(affectation.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" disabled title="Bientôt disponible">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rotations" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Planning des rotations</CardTitle>
              <CardDescription>Suivi des cycles de rotation par site</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <RefreshCw className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Le suivi des cycles de rotation sera bientôt disponible</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accommodations" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Dialog open={showAddAccommodationDialog} onOpenChange={setShowAddAccommodationDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-accommodation">
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvel hébergement
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Ajouter un hébergement</DialogTitle>
                  <DialogDescription>Créez un camp ou un logement pour un site</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="accommodation-name">Nom</Label>
                    <Input
                      id="accommodation-name"
                      placeholder="Ex: Camp A"
                      value={accommodationForm.name}
                      onChange={(e) => setAccommodationForm({ ...accommodationForm, name: e.target.value })}
                      data-testid="input-accommodation-name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="accommodation-site">Site</Label>
                    <Select value={accommodationForm.siteId} onValueChange={(v) => setAccommodationForm({ ...accommodationForm, siteId: v })}>
                      <SelectTrigger id="accommodation-site" data-testid="select-accommodation-site">
                        <SelectValue placeholder={sites.length === 0 ? "Aucun site enregistré" : "Sélectionner un site"} />
                      </SelectTrigger>
                      <SelectContent>
                        {sites.map((site) => (
                          <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="accommodation-type">Type</Label>
                      <Select value={accommodationForm.type} onValueChange={(v) => setAccommodationForm({ ...accommodationForm, type: v })}>
                        <SelectTrigger id="accommodation-type" data-testid="select-accommodation-type">
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Permanent">Permanent</SelectItem>
                          <SelectItem value="Modulaire">Modulaire</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="accommodation-capacity">Capacité (lits)</Label>
                      <Input
                        id="accommodation-capacity"
                        type="number"
                        placeholder="150"
                        value={accommodationForm.capacity}
                        onChange={(e) => setAccommodationForm({ ...accommodationForm, capacity: e.target.value })}
                        data-testid="input-accommodation-capacity"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="accommodation-blocks">Nombre de blocs</Label>
                    <Input
                      id="accommodation-blocks"
                      type="number"
                      placeholder="6"
                      value={accommodationForm.blocks}
                      onChange={(e) => setAccommodationForm({ ...accommodationForm, blocks: e.target.value })}
                      data-testid="input-accommodation-blocks"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="accommodation-amenities">Équipements (séparés par des virgules)</Label>
                    <Input
                      id="accommodation-amenities"
                      placeholder="Ex: Cantine, Infirmerie, WiFi"
                      value={accommodationForm.amenities}
                      onChange={(e) => setAccommodationForm({ ...accommodationForm, amenities: e.target.value })}
                      data-testid="input-accommodation-amenities"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleAddAccommodation}
                    disabled={isSavingModuleState}
                    data-testid="button-save-accommodation"
                  >
                    {isSavingModuleState ? "Création..." : "Créer l'hébergement"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          {accommodations.length === 0 && (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                Aucun hébergement pour le moment. Ajoutez votre premier hébergement.
              </CardContent>
            </Card>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {accommodations.map((accommodation) => {
              const site = sites.find((s) => s.id === accommodation.siteId);
              const occupancyRate = accommodation.capacity > 0
                ? Math.round((accommodation.occupied / accommodation.capacity) * 100)
                : 0;
              return (
                <Card key={accommodation.id} data-testid={`card-accommodation-${accommodation.id}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Home className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{accommodation.name}</CardTitle>
                          <CardDescription>{site?.name}</CardDescription>
                        </div>
                      </div>
                      <Badge variant={accommodation.type === "Permanent" ? "default" : "secondary"}>
                        {accommodation.type}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Occupation</span>
                      <span className="font-medium">{accommodation.occupied}/{accommodation.capacity} lits</span>
                    </div>
                    <Progress value={occupancyRate} className="h-2" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Blocs</span>
                      <Badge variant="outline">{accommodation.blocks} blocs</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {accommodation.amenities.map((amenity) => (
                        <Badge key={amenity} variant="secondary" className="text-xs">
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
