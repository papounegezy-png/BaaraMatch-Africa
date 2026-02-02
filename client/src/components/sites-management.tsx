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
  MapPin,
  Users,
  Calendar,
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
  Truck,
  HardHat,
} from "lucide-react";

const mockSites = [
  {
    id: "1",
    name: "Mine d'Or Kédougou",
    location: "Kédougou, Sénégal",
    type: "Mine",
    status: "active",
    capacity: 250,
    currentStaff: 218,
    rotationType: "14/14",
    manager: "Mamadou Diallo",
    startDate: "2024-03-15",
    endDate: null,
    accommodation: true,
    accommodationCapacity: 300,
  },
  {
    id: "2",
    name: "Chantier Autoroute Dakar-AIBD",
    location: "Diamniadio, Sénégal",
    type: "BTP",
    status: "active",
    capacity: 180,
    currentStaff: 156,
    rotationType: "21/7",
    manager: "Fatou Sarr",
    startDate: "2025-01-10",
    endDate: "2026-12-31",
    accommodation: false,
    accommodationCapacity: 0,
  },
  {
    id: "3",
    name: "Mine de Bauxite Sangarédi",
    location: "Boké, Guinée",
    type: "Mine",
    status: "active",
    capacity: 400,
    currentStaff: 385,
    rotationType: "28/14",
    manager: "Alpha Condé",
    startDate: "2023-06-01",
    endDate: null,
    accommodation: true,
    accommodationCapacity: 450,
  },
  {
    id: "4",
    name: "Construction Port Ndayane",
    location: "Ndayane, Sénégal",
    type: "BTP",
    status: "planning",
    capacity: 300,
    currentStaff: 45,
    rotationType: "14/7",
    manager: "Ibrahima Ndiaye",
    startDate: "2026-03-01",
    endDate: "2028-06-30",
    accommodation: true,
    accommodationCapacity: 200,
  },
];

const mockAffectations = [
  {
    id: "1",
    employeeName: "Ousmane Ba",
    employeeRole: "Opérateur Engin",
    siteId: "1",
    siteName: "Mine d'Or Kédougou",
    startDate: "2026-01-15",
    endDate: "2026-01-29",
    status: "on_site",
    accommodation: "Camp A - Bloc 3",
  },
  {
    id: "2",
    employeeName: "Aminata Diop",
    employeeRole: "Ingénieur HSE",
    siteId: "1",
    siteName: "Mine d'Or Kédougou",
    startDate: "2026-01-20",
    endDate: "2026-02-03",
    status: "on_site",
    accommodation: "Camp B - Bloc 1",
  },
  {
    id: "3",
    employeeName: "Moussa Fall",
    employeeRole: "Chef d'équipe",
    siteId: "2",
    siteName: "Chantier Autoroute Dakar-AIBD",
    startDate: "2026-01-10",
    endDate: "2026-01-31",
    status: "on_site",
    accommodation: null,
  },
  {
    id: "4",
    employeeName: "Cheikh Sy",
    employeeRole: "Soudeur",
    siteId: "3",
    siteName: "Mine de Bauxite Sangarédi",
    startDate: "2026-02-01",
    endDate: "2026-03-01",
    status: "scheduled",
    accommodation: "Camp Principal - Bloc 5",
  },
  {
    id: "5",
    employeeName: "Aissatou Bah",
    employeeRole: "Géologue",
    siteId: "1",
    siteName: "Mine d'Or Kédougou",
    startDate: "2025-12-15",
    endDate: "2025-12-29",
    status: "completed",
    accommodation: "Camp A - Bloc 2",
  },
];

const mockRotations = [
  {
    id: "1",
    siteId: "1",
    siteName: "Mine d'Or Kédougou",
    rotationType: "14/14",
    currentCycle: "Cycle A",
    nextRotation: "2026-02-01",
    employeesRotating: 85,
    status: "upcoming",
  },
  {
    id: "2",
    siteId: "3",
    siteName: "Mine de Bauxite Sangarédi",
    rotationType: "28/14",
    currentCycle: "Cycle B",
    nextRotation: "2026-02-15",
    employeesRotating: 120,
    status: "upcoming",
  },
  {
    id: "3",
    siteId: "2",
    siteName: "Chantier Autoroute Dakar-AIBD",
    rotationType: "21/7",
    currentCycle: "Cycle A",
    nextRotation: "2026-01-31",
    employeesRotating: 52,
    status: "in_progress",
  },
];

const mockAccommodations = [
  {
    id: "1",
    siteId: "1",
    name: "Camp A",
    type: "Permanent",
    capacity: 150,
    occupied: 138,
    blocks: 6,
    amenities: ["Cantine", "Infirmerie", "Salle de sport", "WiFi"],
  },
  {
    id: "2",
    siteId: "1",
    name: "Camp B",
    type: "Permanent",
    capacity: 100,
    occupied: 80,
    blocks: 4,
    amenities: ["Cantine", "Infirmerie"],
  },
  {
    id: "3",
    siteId: "3",
    name: "Camp Principal",
    type: "Permanent",
    capacity: 350,
    occupied: 320,
    blocks: 12,
    amenities: ["Cantine", "Infirmerie", "Salle de sport", "WiFi", "Piscine"],
  },
  {
    id: "4",
    siteId: "4",
    name: "Camp Temporaire",
    type: "Modulaire",
    capacity: 100,
    occupied: 45,
    blocks: 5,
    amenities: ["Cantine"],
  },
];

export function SitesManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("sites");

  const filteredSites = mockSites.filter(
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
          <Dialog>
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
                  <Input id="site-name" placeholder="Ex: Mine d'Or Kédougou" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="site-type">Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mine">Mine</SelectItem>
                        <SelectItem value="btp">BTP</SelectItem>
                        <SelectItem value="oil_gas">Pétrole & Gaz</SelectItem>
                        <SelectItem value="other">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="rotation">Rotation</Label>
                    <Select>
                      <SelectTrigger>
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
                  <Input id="location" placeholder="Ville, Pays" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="capacity">Capacité</Label>
                    <Input id="capacity" type="number" placeholder="250" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="manager">Responsable</Label>
                    <Input id="manager" placeholder="Nom du responsable" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" data-testid="button-save-site">Créer le site</Button>
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
            <div className="text-2xl font-bold">{mockSites.filter(s => s.status === "active").length}</div>
            <p className="text-xs text-muted-foreground">sur {mockSites.length} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Personnel sur site</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockSites.reduce((acc, s) => acc + s.currentStaff, 0)}</div>
            <p className="text-xs text-muted-foreground">employés affectés</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rotations à venir</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockRotations.filter(r => r.status === "upcoming").length}</div>
            <p className="text-xs text-muted-foreground">cette semaine</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hébergements</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockAccommodations.reduce((acc, a) => acc + a.occupied, 0)}</div>
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
                          <Progress value={(site.currentStaff / site.capacity) * 100} className="h-1.5" />
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(site.status)}</TableCell>
                      <TableCell>{site.manager}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="icon" variant="ghost" data-testid={`button-view-site-${site.id}`}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" data-testid={`button-edit-site-${site.id}`}>
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
              <Button data-testid="button-add-affectation">
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle affectation
              </Button>
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
                  {mockAffectations.map((affectation) => (
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
                        <Button size="icon" variant="ghost">
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
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Site</TableHead>
                    <TableHead>Type de rotation</TableHead>
                    <TableHead>Cycle actuel</TableHead>
                    <TableHead>Prochaine rotation</TableHead>
                    <TableHead>Employés concernés</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockRotations.map((rotation) => (
                    <TableRow key={rotation.id} data-testid={`row-rotation-${rotation.id}`}>
                      <TableCell className="font-medium">{rotation.siteName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{rotation.rotationType}</Badge>
                      </TableCell>
                      <TableCell>{rotation.currentCycle}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {new Date(rotation.nextRotation).toLocaleDateString("fr-FR")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          <Users className="w-3 h-3 mr-1" />
                          {rotation.employeesRotating}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {rotation.status === "upcoming" ? (
                          <Badge variant="secondary">
                            <Clock className="w-3 h-3 mr-1" />
                            À venir
                          </Badge>
                        ) : (
                          <Badge className="bg-green-500">
                            <Truck className="w-3 h-3 mr-1" />
                            En cours
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accommodations" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {mockAccommodations.map((accommodation) => {
              const site = mockSites.find((s) => s.id === accommodation.siteId);
              const occupancyRate = Math.round((accommodation.occupied / accommodation.capacity) * 100);
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
