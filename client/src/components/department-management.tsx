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
  Building2,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
  Search,
} from "lucide-react";

interface Department {
  id: number;
  name: string;
  code: string;
  description: string;
  manager: string;
  employeeCount: number;
  status: "active" | "inactive";
  createdAt: string;
}

const mockDepartments: Department[] = [
  {
    id: 1,
    name: "Ressources Humaines",
    code: "RH",
    description: "Gestion du personnel et des recrutements",
    manager: "Marie Dupont",
    employeeCount: 8,
    status: "active",
    createdAt: "2024-01-15",
  },
  {
    id: 2,
    name: "Informatique",
    code: "IT",
    description: "Développement et infrastructure technologique",
    manager: "Jean Martin",
    employeeCount: 15,
    status: "active",
    createdAt: "2024-01-15",
  },
  {
    id: 3,
    name: "Finance",
    code: "FIN",
    description: "Comptabilité et gestion financière",
    manager: "Sophie Leroy",
    employeeCount: 6,
    status: "active",
    createdAt: "2024-02-01",
  },
  {
    id: 4,
    name: "Commercial",
    code: "COM",
    description: "Ventes et développement commercial",
    manager: "Pierre Durand",
    employeeCount: 12,
    status: "active",
    createdAt: "2024-02-15",
  },
  {
    id: 5,
    name: "Marketing",
    code: "MKT",
    description: "Communication et stratégie marketing",
    manager: "Isabelle Moreau",
    employeeCount: 5,
    status: "active",
    createdAt: "2024-03-01",
  },
  {
    id: 6,
    name: "Production",
    code: "PROD",
    description: "Fabrication et contrôle qualité",
    manager: "Non assigné",
    employeeCount: 0,
    status: "inactive",
    createdAt: "2024-03-15",
  },
];

export function DepartmentManagement() {
  const [departments, setDepartments] = useState<Department[]>(mockDepartments);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    manager: "",
    status: "active" as "active" | "inactive",
  });

  const filteredDepartments = departments.filter(
    (dept) =>
      dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dept.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalEmployees = departments.reduce((sum, d) => sum + d.employeeCount, 0);
  const activeDepartments = departments.filter((d) => d.status === "active").length;

  const handleSubmit = () => {
    if (editingDepartment) {
      setDepartments(
        departments.map((d) =>
          d.id === editingDepartment.id
            ? { ...d, ...formData }
            : d
        )
      );
    } else {
      const maxId = departments.length > 0 ? Math.max(...departments.map((d) => d.id)) : 0;
      const newDept: Department = {
        id: maxId + 1,
        ...formData,
        employeeCount: 0,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setDepartments([...departments, newDept]);
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      description: "",
      manager: "",
      status: "active",
    });
    setEditingDepartment(null);
    setIsAddDialogOpen(false);
  };

  const handleEdit = (dept: Department) => {
    setEditingDepartment(dept);
    setFormData({
      name: dept.name,
      code: dept.code,
      description: dept.description,
      manager: dept.manager,
      status: dept.status,
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    setDepartments(departments.filter((d) => d.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Gestion des Départements</h1>
          <p className="text-muted-foreground">
            Définissez et gérez les départements de votre entreprise
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-department">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un département
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingDepartment ? "Modifier le département" : "Nouveau département"}
              </DialogTitle>
              <DialogDescription>
                {editingDepartment
                  ? "Modifiez les informations du département"
                  : "Créez un nouveau département pour votre entreprise"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nom du département</Label>
                <Input
                  id="name"
                  data-testid="input-department-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Ressources Humaines"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  data-testid="input-department-code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="Ex: RH"
                  maxLength={10}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  data-testid="input-department-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description des responsabilités du département"
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="manager">Responsable</Label>
                <Input
                  id="manager"
                  data-testid="input-department-manager"
                  value={formData.manager}
                  onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                  placeholder="Nom du responsable"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Statut</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: "active" | "inactive") =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger data-testid="select-department-status">
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
              <Button variant="outline" onClick={resetForm} data-testid="button-cancel-department">
                Annuler
              </Button>
              <Button onClick={handleSubmit} data-testid="button-save-department">
                {editingDepartment ? "Enregistrer" : "Créer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Total Départements</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departments.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeDepartments} actifs
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Total Employés</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployees}</div>
            <p className="text-xs text-muted-foreground">
              Répartis dans {activeDepartments} départements
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Moyenne par Dept.</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeDepartments > 0 ? Math.round(totalEmployees / activeDepartments) : 0}
            </div>
            <p className="text-xs text-muted-foreground">employés</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Liste des Départements</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                data-testid="input-search-departments"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table data-testid="table-departments">
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead className="text-center">Employés</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDepartments.map((dept) => (
                <TableRow key={dept.id} data-testid={`department-row-${dept.id}`}>
                  <TableCell>
                    <Badge variant="outline">{dept.code}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{dept.name}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">
                    {dept.description}
                  </TableCell>
                  <TableCell>{dept.manager}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{dept.employeeCount}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={dept.status === "active" ? "default" : "secondary"}
                    >
                      {dept.status === "active" ? "Actif" : "Inactif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-actions-dept-${dept.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(dept)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(dept.id)}
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
