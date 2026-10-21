import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Briefcase,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
  Search,
  Building2,
  TrendingUp,
} from "lucide-react";
import { useOperationalModuleState } from "@/hooks/use-operational-module-state";
import { useToast } from "@/hooks/use-toast";

interface Position {
  id: number;
  title: string;
  code: string;
  department: string;
  level: "junior" | "intermediate" | "senior" | "lead" | "manager" | "director";
  description: string;
  salaryMin: number;
  salaryMax: number;
  employeeCount: number;
  status: "active" | "inactive";
  createdAt: string;
}

const levels: { value: Position["level"]; label: string }[] = [
  { value: "junior", label: "Junior" },
  { value: "intermediate", label: "Intermédiaire" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead" },
  { value: "manager", label: "Manager" },
  { value: "director", label: "Directeur" },
];

const levelVariants: Record<Position["level"], "default" | "secondary" | "outline" | "destructive"> = {
  junior: "secondary",
  intermediate: "outline",
  senior: "default",
  lead: "default",
  manager: "default",
  director: "destructive",
};

export function PositionManagement() {
  const { toast } = useToast();
  const { moduleState, saveModuleState, isSavingModuleState } = useOperationalModuleState("positions", {
    positions: [] as Position[],
  });
  const positions = moduleState.positions ?? [];
  // Départements de l'entreprise (module Départements), plus ceux déjà
  // utilisés par des postes : plus de liste fictive codée en dur.
  const { moduleState: etatDepartements } = useOperationalModuleState("departments", {
    departments: [] as { name: string; status?: string }[],
  });
  const departments = Array.from(new Set([
    ...(etatDepartements.departments ?? []).filter((d) => d.status !== "inactive").map((d) => d.name.trim()),
    ...positions.map((p) => p.department?.trim()),
  ].filter(Boolean))).sort((a, b) => a.localeCompare(b, "fr"));
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    code: "",
    department: "",
    level: "intermediate" as Position["level"],
    description: "",
    salaryMin: 0,
    salaryMax: 0,
    status: "active" as "active" | "inactive",
  });

  const filteredPositions = positions.filter((pos) => {
    const matchesSearch =
      pos.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pos.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment =
      filterDepartment === "all" || pos.department === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  const totalEmployees = positions.reduce((sum, p) => sum + p.employeeCount, 0);
  const activePositions = positions.filter((p) => p.status === "active").length;
  const avgSalary = positions.length
    ? Math.round(positions.reduce((sum, p) => sum + (p.salaryMin + p.salaryMax) / 2, 0) / positions.length)
    : 0;

  const handleSubmit = async () => {
    const nextPositions = editingPosition
      ? positions.map((p) => (p.id === editingPosition.id ? { ...p, ...formData } : p))
      : [
          ...positions,
          {
            id: (positions.length > 0 ? Math.max(...positions.map((p) => p.id)) : 0) + 1,
            ...formData,
            employeeCount: 0,
            createdAt: new Date().toISOString().split("T")[0],
          },
        ];

    try {
      await saveModuleState({ positions: nextPositions });
      toast({
        title: editingPosition ? "Poste modifié" : "Poste créé",
        description: editingPosition
          ? "Les informations ont été mises à jour."
          : "Le nouveau poste a été créé.",
      });
      resetForm();
    } catch {
      toast({ title: "Erreur", description: "Impossible d'enregistrer le poste.", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      code: "",
      department: "",
      level: "intermediate",
      description: "",
      salaryMin: 0,
      salaryMax: 0,
      status: "active",
    });
    setEditingPosition(null);
    setIsAddDialogOpen(false);
  };

  const handleEdit = (pos: Position) => {
    setEditingPosition(pos);
    setFormData({
      title: pos.title,
      code: pos.code,
      department: pos.department,
      level: pos.level,
      description: pos.description,
      salaryMin: pos.salaryMin,
      salaryMax: pos.salaryMax,
      status: pos.status,
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await saveModuleState({ positions: positions.filter((p) => p.id !== id) });
      toast({ title: "Poste supprimé" });
    } catch {
      toast({ title: "Erreur", description: "Impossible de supprimer le poste.", variant: "destructive" });
    }
  };

  const formatSalary = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "XOF",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Gestion des Postes</h1>
          <p className="text-muted-foreground">
            Définissez et gérez les postes de votre entreprise
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-position">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un poste
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingPosition ? "Modifier le poste" : "Nouveau poste"}
              </DialogTitle>
              <DialogDescription>
                {editingPosition
                  ? "Modifiez les informations du poste"
                  : "Créez un nouveau poste pour votre entreprise"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Intitulé du poste</Label>
                  <Input
                    id="title"
                    data-testid="input-position-title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Développeur Full Stack"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="code">Code</Label>
                  <Input
                    id="code"
                    data-testid="input-position-code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    placeholder="Ex: DEV-FS"
                    maxLength={10}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="department">Département</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) =>
                      setFormData({ ...formData, department: value })
                    }
                  >
                    <SelectTrigger data-testid="select-position-department">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.length === 0 && (
                        <SelectItem value="__aucun" disabled>Créez d'abord un département</SelectItem>
                      )}
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="level">Niveau</Label>
                  <Select
                    value={formData.level}
                    onValueChange={(value: Position["level"]) =>
                      setFormData({ ...formData, level: value })
                    }
                  >
                    <SelectTrigger data-testid="select-position-level">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {levels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  data-testid="input-position-description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Description des responsabilités du poste"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="salaryMin">Salaire minimum (XOF)</Label>
                  <Input
                    id="salaryMin"
                    type="number"
                    data-testid="input-position-salary-min"
                    value={formData.salaryMin || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, salaryMin: parseInt(e.target.value) || 0 })
                    }
                    placeholder="Ex: 45000"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="salaryMax">Salaire maximum (XOF)</Label>
                  <Input
                    id="salaryMax"
                    type="number"
                    data-testid="input-position-salary-max"
                    value={formData.salaryMax || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, salaryMax: parseInt(e.target.value) || 0 })
                    }
                    placeholder="Ex: 65000"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Statut</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: "active" | "inactive") =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger data-testid="select-position-status">
                    <SelectValue placeholder="Sélectionner un statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="inactive">Inactif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetForm} data-testid="button-cancel-position">
                Annuler
              </Button>
              <Button onClick={handleSubmit} disabled={isSavingModuleState} data-testid="button-save-position">
                {isSavingModuleState ? "Enregistrement..." : editingPosition ? "Enregistrer" : "Créer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Total Postes</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{positions.length}</div>
            <p className="text-xs text-muted-foreground">{activePositions} actifs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Employés</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployees}</div>
            <p className="text-xs text-muted-foreground">sur tous les postes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Départements</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(positions.map((p) => p.department)).size}
            </div>
            <p className="text-xs text-muted-foreground">avec des postes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Salaire Moyen</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatSalary(avgSalary)}</div>
            <p className="text-xs text-muted-foreground">annuel</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>Liste des Postes</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  data-testid="input-search-positions"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger className="w-full sm:w-48" data-testid="select-filter-department">
                  <SelectValue placeholder="Département" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les départements</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table data-testid="table-positions">
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Intitulé</TableHead>
                <TableHead>Département</TableHead>
                <TableHead>Niveau</TableHead>
                <TableHead>Salaire</TableHead>
                <TableHead className="text-center">Employés</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPositions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                    {positions.length === 0
                      ? "Aucun poste pour le moment. Ajoutez votre premier poste."
                      : "Aucun poste ne correspond à cette recherche."}
                  </TableCell>
                </TableRow>
              )}
              {filteredPositions.map((pos) => (
                <TableRow key={pos.id} data-testid={`position-row-${pos.id}`}>
                  <TableCell>
                    <Badge variant="outline">{pos.code}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{pos.title}</TableCell>
                  <TableCell>{pos.department}</TableCell>
                  <TableCell>
                    <Badge variant={levelVariants[pos.level]}>
                      {levels.find((l) => l.value === pos.level)?.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatSalary(pos.salaryMin)} - {formatSalary(pos.salaryMax)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{pos.employeeCount}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={pos.status === "active" ? "default" : "secondary"}
                    >
                      {pos.status === "active" ? "Actif" : "Inactif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-actions-pos-${pos.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(pos)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(pos.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
