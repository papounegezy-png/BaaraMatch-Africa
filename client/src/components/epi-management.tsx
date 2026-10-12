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
import { useToast } from "@/hooks/use-toast";
import { useOperationalModuleState } from "@/hooks/use-operational-module-state";
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
  User,
  BarChart3,
  Download,
} from "lucide-react";

const epiCategories = [
  { id: "head", name: "Protection tête", icon: HardHat, color: "bg-yellow-500" },
  { id: "eyes", name: "Protection yeux", icon: Glasses, color: "bg-blue-500" },
  { id: "hands", name: "Protection mains", icon: Hand, color: "bg-green-500" },
  { id: "feet", name: "Protection pieds", icon: Footprints, color: "bg-orange-500" },
  { id: "ears", name: "Protection auditive", icon: Ear, color: "bg-purple-500" },
  { id: "body", name: "Protection corps", icon: Shield, color: "bg-red-500" },
];

interface EpiItem {
  id: string;
  name: string;
  category: string;
  reference: string;
  stockTotal: number;
  stockAvailable: number;
  stockAllocated: number;
  stockDamaged: number;
  minStock: number;
  unitPrice: number;
  supplier: string;
  lastRestock: string;
}

interface EpiAllocation {
  id: string;
  employeeId?: number;
  employeeName: string;
  employeeRole: string;
  epiId: string;
  epiName: string;
  size: string;
  allocatedDate: string;
  returnDate: string | null;
  condition: "good" | "damaged" | "returned";
  site: string;
}

interface NonConformity {
  id: string;
  date: string;
  employee: string;
  site: string;
  type: string;
  description: string;
  severity: "high" | "medium" | "low";
  status: "pending" | "in_progress" | "resolved";
  action: string | null;
}

interface EpiEmployee {
  id: number;
  name: string;
  position: string;
}

const emptyEpiForm = {
  name: "",
  category: "",
  reference: "",
  stock: "",
  minStock: "",
  supplier: "",
};

const emptyAllocationForm = {
  employeeId: "",
  employeeName: "",
  employeeRole: "",
  epiId: "",
  size: "",
  site: "",
  allocatedDate: "",
};

export function EPIManagement() {
  const { toast } = useToast();
  const { moduleState, saveModuleState, isSavingModuleState } = useOperationalModuleState("epi", {
    inventory: [] as EpiItem[],
    allocations: [] as EpiAllocation[],
    nonConformities: [] as NonConformity[],
  });
  const inventory = moduleState.inventory ?? [];
  const allocations = moduleState.allocations ?? [];
  const nonConformities = moduleState.nonConformities ?? [];
  // Read-only: sources the "Employé" picker from the real employee
  // directory (see employee-management.tsx) instead of free-text entry.
  const { moduleState: employeeModuleState } = useOperationalModuleState("employee", {
    employees: [] as EpiEmployee[],
  });
  const rosterEmployees = employeeModuleState.employees ?? [];
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("inventory");
  const [showAddEpiDialog, setShowAddEpiDialog] = useState(false);
  const [epiForm, setEpiForm] = useState(emptyEpiForm);
  const [showAllocationDialog, setShowAllocationDialog] = useState(false);
  const [allocationForm, setAllocationForm] = useState(emptyAllocationForm);

  const filteredInventory = inventory.filter(
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

  const stats = {
    totalItems: inventory.reduce((acc, e) => acc + e.stockTotal, 0),
    available: inventory.reduce((acc, e) => acc + e.stockAvailable, 0),
    allocated: inventory.reduce((acc, e) => acc + e.stockAllocated, 0),
    lowStock: inventory.filter((e) => e.stockAvailable <= e.minStock).length,
  };

  const handleAddEpi = async () => {
    if (!epiForm.name.trim() || !epiForm.category || !epiForm.reference.trim()) {
      toast({
        title: "Champs requis",
        description: "Le nom, la catégorie et la référence sont obligatoires.",
        variant: "destructive",
      });
      return;
    }

    const stockTotal = parseInt(epiForm.stock, 10) || 0;
    const minStock = parseInt(epiForm.minStock, 10) || 0;
    const nextId = (
      inventory.reduce((max, e) => Math.max(max, parseInt(e.id, 10) || 0), 0) + 1
    ).toString();
    const newEpi: EpiItem = {
      id: nextId,
      name: epiForm.name.trim(),
      category: epiForm.category,
      reference: epiForm.reference.trim(),
      stockTotal,
      stockAvailable: stockTotal,
      stockAllocated: 0,
      stockDamaged: 0,
      minStock,
      unitPrice: 0,
      supplier: epiForm.supplier.trim(),
      lastRestock: new Date().toISOString().slice(0, 10),
    };

    try {
      await saveModuleState({ inventory: [...inventory, newEpi], allocations, nonConformities });
      toast({
        title: "EPI ajouté",
        description: "Le nouvel équipement a été ajouté avec succès.",
      });
      setEpiForm(emptyEpiForm);
      setShowAddEpiDialog(false);
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer l'équipement.",
        variant: "destructive",
      });
    }
  };

  const handleAddAllocation = async () => {
    if (!allocationForm.employeeId || !allocationForm.epiId) {
      toast({
        title: "Champs requis",
        description: "L'employé et l'équipement sont obligatoires.",
        variant: "destructive",
      });
      return;
    }

    const selectedEpi = inventory.find((e) => e.id === allocationForm.epiId);
    if (selectedEpi && selectedEpi.stockAvailable <= 0) {
      toast({
        title: "Stock épuisé",
        description: "Aucune unité disponible pour cet équipement.",
        variant: "destructive",
      });
      return;
    }
    const employee = rosterEmployees.find((e) => e.id.toString() === allocationForm.employeeId);
    const nextId = (
      allocations.reduce((max, a) => Math.max(max, parseInt(a.id, 10) || 0), 0) + 1
    ).toString();
    const newAllocation: EpiAllocation = {
      id: nextId,
      employeeId: employee?.id,
      employeeName: employee?.name ?? allocationForm.employeeName,
      employeeRole: allocationForm.employeeRole.trim(),
      epiId: allocationForm.epiId,
      epiName: selectedEpi?.name ?? "",
      size: allocationForm.size.trim(),
      allocatedDate: allocationForm.allocatedDate || new Date().toISOString().slice(0, 10),
      returnDate: null,
      condition: "good",
      site: allocationForm.site.trim(),
    };
    // Attributing a unit moves it from available to allocated stock —
    // otherwise the inventory counts would silently drift from the real
    // allocations as soon as anyone used this dialog.
    const updatedInventory = selectedEpi
      ? inventory.map((e) =>
          e.id === selectedEpi.id
            ? { ...e, stockAvailable: Math.max(0, e.stockAvailable - 1), stockAllocated: e.stockAllocated + 1 }
            : e,
        )
      : inventory;

    try {
      await saveModuleState({ inventory: updatedInventory, allocations: [...allocations, newAllocation], nonConformities });
      toast({
        title: "Attribution créée",
        description: "L'équipement a été attribué avec succès.",
      });
      setAllocationForm(emptyAllocationForm);
      setShowAllocationDialog(false);
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer l'attribution.",
        variant: "destructive",
      });
    }
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
          <Dialog
            open={showAddEpiDialog}
            onOpenChange={(open) => {
              setShowAddEpiDialog(open);
              if (!open) setEpiForm(emptyEpiForm);
            }}
          >
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
                  <Input
                    id="epi-name"
                    placeholder="Ex: Casque de chantier"
                    value={epiForm.name}
                    onChange={(e) => setEpiForm({ ...epiForm, name: e.target.value })}
                    data-testid="input-epi-name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="category">Catégorie</Label>
                    <Select
                      value={epiForm.category}
                      onValueChange={(v) => setEpiForm({ ...epiForm, category: v })}
                    >
                      <SelectTrigger data-testid="select-epi-category">
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
                    <Input
                      id="reference"
                      placeholder="Ex: CSQ-001"
                      value={epiForm.reference}
                      onChange={(e) => setEpiForm({ ...epiForm, reference: e.target.value })}
                      data-testid="input-epi-reference"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="stock">Stock initial</Label>
                    <Input
                      id="stock"
                      type="number"
                      placeholder="100"
                      value={epiForm.stock}
                      onChange={(e) => setEpiForm({ ...epiForm, stock: e.target.value })}
                      data-testid="input-epi-stock"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="min-stock">Stock minimum</Label>
                    <Input
                      id="min-stock"
                      type="number"
                      placeholder="30"
                      value={epiForm.minStock}
                      onChange={(e) => setEpiForm({ ...epiForm, minStock: e.target.value })}
                      data-testid="input-epi-min-stock"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="supplier">Fournisseur</Label>
                  <Input
                    id="supplier"
                    placeholder="Nom du fournisseur"
                    value={epiForm.supplier}
                    onChange={(e) => setEpiForm({ ...epiForm, supplier: e.target.value })}
                    data-testid="input-epi-supplier"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddEpiDialog(false)}>Annuler</Button>
                <Button
                  onClick={handleAddEpi}
                  disabled={isSavingModuleState}
                  data-testid="button-save-epi"
                >
                  {isSavingModuleState ? "Enregistrement..." : "Enregistrer"}
                </Button>
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
              <Button variant="outline" disabled title="Bientôt disponible" data-testid="button-export-inventory">
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
                  {filteredInventory.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                        {inventory.length === 0
                          ? "Aucun EPI pour le moment. Ajoutez le premier équipement."
                          : "Aucun EPI ne correspond à cette recherche."}
                      </TableCell>
                    </TableRow>
                  )}
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
              <Dialog
                open={showAllocationDialog}
                onOpenChange={(open) => {
                  setShowAllocationDialog(open);
                  if (!open) setAllocationForm(emptyAllocationForm);
                }}
              >
                <DialogTrigger asChild>
                  <Button data-testid="button-new-allocation">
                    <Plus className="w-4 h-4 mr-2" />
                    Nouvelle attribution
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Nouvelle attribution</DialogTitle>
                    <DialogDescription>Attribuez un équipement de protection à un employé</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="allocation-employee">Employé</Label>
                        <Select
                          value={allocationForm.employeeId}
                          onValueChange={(v) => {
                            const employee = rosterEmployees.find((e) => e.id.toString() === v);
                            setAllocationForm({
                              ...allocationForm,
                              employeeId: v,
                              employeeName: employee?.name ?? "",
                              employeeRole: employee?.position ?? allocationForm.employeeRole,
                            });
                          }}
                          disabled={rosterEmployees.length === 0}
                        >
                          <SelectTrigger id="allocation-employee" data-testid="select-allocation-employee">
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
                        <Label htmlFor="allocation-role">Poste</Label>
                        <Input
                          id="allocation-role"
                          placeholder="Ex: Opérateur Engin"
                          value={allocationForm.employeeRole}
                          onChange={(e) => setAllocationForm({ ...allocationForm, employeeRole: e.target.value })}
                          data-testid="input-allocation-role"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="allocation-epi">Équipement</Label>
                        <Select
                          value={allocationForm.epiId}
                          onValueChange={(v) => setAllocationForm({ ...allocationForm, epiId: v })}
                        >
                          <SelectTrigger data-testid="select-allocation-epi">
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent>
                            {inventory.map((epi) => (
                              <SelectItem key={epi.id} value={epi.id}>{epi.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="allocation-size">Taille</Label>
                        <Input
                          id="allocation-size"
                          placeholder="Ex: L, 43, XL"
                          value={allocationForm.size}
                          onChange={(e) => setAllocationForm({ ...allocationForm, size: e.target.value })}
                          data-testid="input-allocation-size"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="allocation-site">Site</Label>
                        <Input
                          id="allocation-site"
                          placeholder="Nom du site"
                          value={allocationForm.site}
                          onChange={(e) => setAllocationForm({ ...allocationForm, site: e.target.value })}
                          data-testid="input-allocation-site"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="allocation-date">Date d'attribution</Label>
                        <Input
                          id="allocation-date"
                          type="date"
                          value={allocationForm.allocatedDate}
                          onChange={(e) => setAllocationForm({ ...allocationForm, allocatedDate: e.target.value })}
                          data-testid="input-allocation-date"
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAllocationDialog(false)}>Annuler</Button>
                    <Button
                      onClick={handleAddAllocation}
                      disabled={isSavingModuleState}
                      data-testid="button-save-allocation"
                    >
                      {isSavingModuleState ? "Enregistrement..." : "Attribuer"}
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
                    <TableHead>Équipement</TableHead>
                    <TableHead>Taille</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Date attribution</TableHead>
                    <TableHead>État</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                        Aucune attribution pour le moment.
                      </TableCell>
                    </TableRow>
                  )}
                  {allocations.map((allocation) => (
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
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <AlertTriangle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Le signalement des non-conformités sera bientôt disponible</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
