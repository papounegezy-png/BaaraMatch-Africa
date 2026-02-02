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
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Shield,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle,
  Package,
  HardHat,
  Glasses,
  Footprints,
  Hand,
  Ear,
  Clock,
  User,
  BarChart3,
  Download,
  RefreshCw,
} from "lucide-react";

const epiCategories = [
  { id: "head", name: "Protection tête", icon: HardHat, color: "bg-yellow-500" },
  { id: "eyes", name: "Protection yeux", icon: Glasses, color: "bg-blue-500" },
  { id: "hands", name: "Protection mains", icon: Hand, color: "bg-green-500" },
  { id: "feet", name: "Protection pieds", icon: Footprints, color: "bg-orange-500" },
  { id: "ears", name: "Protection auditive", icon: Ear, color: "bg-purple-500" },
  { id: "body", name: "Protection corps", icon: Shield, color: "bg-red-500" },
];

const mockEPIInventory = [
  {
    id: "1",
    name: "Casque de chantier",
    category: "head",
    reference: "CSQ-001",
    stockTotal: 150,
    stockAvailable: 42,
    stockAllocated: 98,
    stockDamaged: 10,
    minStock: 30,
    unitPrice: 15000,
    supplier: "Safety First SARL",
    lastRestock: "2025-12-15",
  },
  {
    id: "2",
    name: "Lunettes de protection",
    category: "eyes",
    reference: "LUN-002",
    stockTotal: 200,
    stockAvailable: 85,
    stockAllocated: 110,
    stockDamaged: 5,
    minStock: 50,
    unitPrice: 8000,
    supplier: "Safety First SARL",
    lastRestock: "2025-11-20",
  },
  {
    id: "3",
    name: "Gants de manutention",
    category: "hands",
    reference: "GAN-003",
    stockTotal: 500,
    stockAvailable: 120,
    stockAllocated: 350,
    stockDamaged: 30,
    minStock: 100,
    unitPrice: 5000,
    supplier: "ProSafe Équipements",
    lastRestock: "2026-01-05",
  },
  {
    id: "4",
    name: "Chaussures de sécurité S3",
    category: "feet",
    reference: "CHS-004",
    stockTotal: 180,
    stockAvailable: 25,
    stockAllocated: 150,
    stockDamaged: 5,
    minStock: 40,
    unitPrice: 45000,
    supplier: "Caterpillar",
    lastRestock: "2025-10-10",
  },
  {
    id: "5",
    name: "Bouchons d'oreilles",
    category: "ears",
    reference: "BCH-005",
    stockTotal: 1000,
    stockAvailable: 450,
    stockAllocated: 520,
    stockDamaged: 30,
    minStock: 200,
    unitPrice: 500,
    supplier: "3M Sénégal",
    lastRestock: "2026-01-02",
  },
  {
    id: "6",
    name: "Gilet haute visibilité",
    category: "body",
    reference: "GIL-006",
    stockTotal: 250,
    stockAvailable: 60,
    stockAllocated: 180,
    stockDamaged: 10,
    minStock: 50,
    unitPrice: 12000,
    supplier: "Safety First SARL",
    lastRestock: "2025-12-01",
  },
];

const mockAllocations = [
  {
    id: "1",
    employeeId: "emp1",
    employeeName: "Ousmane Ba",
    employeeRole: "Opérateur Engin",
    epiId: "1",
    epiName: "Casque de chantier",
    size: "L",
    allocatedDate: "2025-11-01",
    returnDate: null,
    condition: "good",
    site: "Mine d'Or Kédougou",
  },
  {
    id: "2",
    employeeId: "emp1",
    employeeName: "Ousmane Ba",
    employeeRole: "Opérateur Engin",
    epiId: "4",
    epiName: "Chaussures de sécurité S3",
    size: "43",
    allocatedDate: "2025-11-01",
    returnDate: null,
    condition: "good",
    site: "Mine d'Or Kédougou",
  },
  {
    id: "3",
    employeeId: "emp2",
    employeeName: "Aminata Diop",
    employeeRole: "Ingénieur HSE",
    epiId: "1",
    epiName: "Casque de chantier",
    size: "M",
    allocatedDate: "2025-10-15",
    returnDate: null,
    condition: "good",
    site: "Mine d'Or Kédougou",
  },
  {
    id: "4",
    employeeId: "emp3",
    employeeName: "Moussa Fall",
    employeeRole: "Chef d'équipe",
    epiId: "6",
    epiName: "Gilet haute visibilité",
    size: "XL",
    allocatedDate: "2025-09-01",
    returnDate: "2025-12-15",
    condition: "damaged",
    site: "Chantier Autoroute Dakar-AIBD",
  },
];

const mockNonConformities = [
  {
    id: "1",
    date: "2026-01-28",
    employee: "Ibrahim Diallo",
    site: "Mine de Bauxite Sangarédi",
    type: "Absence d'EPI",
    description: "Port du casque non respecté en zone de travail",
    severity: "high",
    status: "pending",
    action: null,
  },
  {
    id: "2",
    date: "2026-01-25",
    employee: "Fatou Sarr",
    site: "Chantier Autoroute Dakar-AIBD",
    type: "EPI endommagé",
    description: "Gants de protection déchirés",
    severity: "medium",
    status: "resolved",
    action: "Remplacement effectué",
  },
  {
    id: "3",
    date: "2026-01-20",
    employee: "Alpha Condé",
    site: "Mine de Bauxite Sangarédi",
    type: "Taille inadaptée",
    description: "Chaussures de sécurité trop petites",
    severity: "low",
    status: "in_progress",
    action: "Commande de remplacement en cours",
  },
];

export function EPIManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("inventory");

  const filteredInventory = mockEPIInventory.filter(
    (epi) =>
      epi.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      epi.reference.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStockStatus = (available: number, minStock: number) => {
    const ratio = available / minStock;
    if (ratio <= 0.5) return { status: "critical", label: "Critique", color: "text-red-600" };
    if (ratio <= 1) return { status: "low", label: "Bas", color: "text-yellow-600" };
    return { status: "ok", label: "OK", color: "text-green-600" };
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "high":
        return <Badge variant="destructive">Élevée</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500">Moyenne</Badge>;
      case "low":
        return <Badge variant="secondary">Faible</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-500"><RefreshCw className="w-3 h-3 mr-1" />En cours</Badge>;
      case "resolved":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Résolu</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const stats = {
    totalItems: mockEPIInventory.reduce((acc, e) => acc + e.stockTotal, 0),
    available: mockEPIInventory.reduce((acc, e) => acc + e.stockAvailable, 0),
    allocated: mockEPIInventory.reduce((acc, e) => acc + e.stockAllocated, 0),
    lowStock: mockEPIInventory.filter((e) => e.stockAvailable <= e.minStock).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-epi-title">EPI & Équipements</h1>
          <p className="text-muted-foreground">Gestion des équipements de protection individuelle</p>
        </div>
        <div className="flex gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-epi"
            />
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button data-testid="button-add-epi">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter EPI
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Ajouter un EPI</DialogTitle>
                <DialogDescription>Enregistrez un nouvel équipement de protection</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="epi-name">Nom de l'équipement</Label>
                  <Input id="epi-name" placeholder="Ex: Casque de chantier" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="category">Catégorie</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        {epiCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="reference">Référence</Label>
                    <Input id="reference" placeholder="Ex: CSQ-001" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="stock">Stock initial</Label>
                    <Input id="stock" type="number" placeholder="100" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="min-stock">Stock minimum</Label>
                    <Input id="min-stock" type="number" placeholder="30" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="supplier">Fournisseur</Label>
                  <Input id="supplier" placeholder="Nom du fournisseur" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" data-testid="button-save-epi">Enregistrer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total EPI</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
            <p className="text-xs text-muted-foreground">équipements en inventaire</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disponibles</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.available}</div>
            <p className="text-xs text-muted-foreground">en stock</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attribués</CardTitle>
            <User className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.allocated}</div>
            <p className="text-xs text-muted-foreground">aux employés</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock bas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.lowStock}</div>
            <p className="text-xs text-muted-foreground">à réapprovisionner</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="tabs-epi">
        <TabsList>
          <TabsTrigger value="inventory" data-testid="tab-inventory">
            <Package className="w-4 h-4 mr-2" />
            Inventaire
          </TabsTrigger>
          <TabsTrigger value="allocations" data-testid="tab-allocations">
            <User className="w-4 h-4 mr-2" />
            Attributions
          </TabsTrigger>
          <TabsTrigger value="conformity" data-testid="tab-conformity">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Non-conformités
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Inventaire EPI</CardTitle>
                <CardDescription>Suivi des stocks d'équipements de protection</CardDescription>
              </div>
              <Button variant="outline" data-testid="button-export-inventory">
                <Download className="w-4 h-4 mr-2" />
                Exporter
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Équipement</TableHead>
                    <TableHead>Référence</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Stock disponible</TableHead>
                    <TableHead>Attribués</TableHead>
                    <TableHead>Stock min.</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Fournisseur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.map((epi) => {
                    const stockStatus = getStockStatus(epi.stockAvailable, epi.minStock);
                    const category = epiCategories.find((c) => c.id === epi.category);
                    return (
                      <TableRow key={epi.id} data-testid={`row-epi-${epi.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg ${category?.color || "bg-gray-500"} flex items-center justify-center`}>
                              {category?.icon && <category.icon className="w-4 h-4 text-white" />}
                            </div>
                            <span className="font-medium">{epi.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{epi.reference}</Badge>
                        </TableCell>
                        <TableCell>{category?.name}</TableCell>
                        <TableCell>
                          <span className={`font-medium ${stockStatus.color}`}>{epi.stockAvailable}</span>
                        </TableCell>
                        <TableCell>{epi.stockAllocated}</TableCell>
                        <TableCell>{epi.minStock}</TableCell>
                        <TableCell>
                          <Badge
                            variant={stockStatus.status === "critical" ? "destructive" : stockStatus.status === "low" ? "secondary" : "outline"}
                          >
                            {stockStatus.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{epi.supplier}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allocations" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Attributions EPI</CardTitle>
                <CardDescription>Équipements attribués aux employés</CardDescription>
              </div>
              <Button data-testid="button-new-allocation">
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle attribution
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employé</TableHead>
                    <TableHead>Poste</TableHead>
                    <TableHead>Équipement</TableHead>
                    <TableHead>Taille</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Date attribution</TableHead>
                    <TableHead>État</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockAllocations.map((allocation) => (
                    <TableRow key={allocation.id} data-testid={`row-allocation-${allocation.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{allocation.employeeName.split(" ").map((n) => n[0]).join("")}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{allocation.employeeName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{allocation.employeeRole}</TableCell>
                      <TableCell>{allocation.epiName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{allocation.size}</Badge>
                      </TableCell>
                      <TableCell>{allocation.site}</TableCell>
                      <TableCell>{new Date(allocation.allocatedDate).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell>
                        {allocation.condition === "good" ? (
                          <Badge className="bg-green-500">Bon état</Badge>
                        ) : allocation.condition === "damaged" ? (
                          <Badge variant="destructive">Endommagé</Badge>
                        ) : (
                          <Badge variant="secondary">Retourné</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conformity" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Non-conformités EPI</CardTitle>
              <CardDescription>Suivi des incidents liés aux équipements de protection</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Employé</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Sévérité</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockNonConformities.map((nc) => (
                    <TableRow key={nc.id} data-testid={`row-nc-${nc.id}`}>
                      <TableCell>{new Date(nc.date).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell className="font-medium">{nc.employee}</TableCell>
                      <TableCell>{nc.site}</TableCell>
                      <TableCell>{nc.type}</TableCell>
                      <TableCell className="max-w-xs truncate">{nc.description}</TableCell>
                      <TableCell>{getSeverityBadge(nc.severity)}</TableCell>
                      <TableCell>{getStatusBadge(nc.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
