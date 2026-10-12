import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useOperationalModuleState } from "@/hooks/use-operational-module-state";
import { 
  Users, 
  UserPlus,
  Search,
  Filter,
  Eye,
  Edit,
  FileText,
  Mail,
  Phone,
  MapPin,
  Building2,
  Calendar,
  MoreHorizontal,
  Download,
  Upload,
  Shield,
  Key,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";

interface Employee {
  id: number;
  // Present when this fiche was created automatically from a hired job
  // application (see PATCH /api/applications/:id in server/routes.ts)
  // rather than added manually — lets that endpoint avoid creating a
  // duplicate fiche for the same person.
  candidateId?: string;
  applicationId?: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  type: string;
  startDate: string;
  status: string;
  role: "admin" | "manager" | "employee";
  manager: string | null;
  location: string;
}

interface EmployeeDocument {
  id: number;
  employeeId: number;
  name: string;
  type: string;
  uploadedAt: string;
  status: string;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  active: { label: "Actif", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  onboarding: { label: "Onboarding", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  leave: { label: "Congé", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300" },
  terminated: { label: "Terminé", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
};

const roleLabels: Record<string, { label: string; icon: React.ElementType }> = {
  admin: { label: "Administrateur", icon: Shield },
  manager: { label: "Manager", icon: Key },
  employee: { label: "Employé", icon: Users },
};

const emptyEmployeeForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  department: "",
  position: "",
  contractType: "",
  startDate: "",
  manager: "",
  location: "",
};

export function EmployeeManagement() {
  const { toast } = useToast();
  const { moduleState, saveModuleState, isSavingModuleState } = useOperationalModuleState("employee", {
    employees: [] as Employee[],
    documents: [] as EmployeeDocument[],
  });

  const employees = moduleState.employees ?? [];
  const documents = moduleState.documents ?? [];
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showDocumentsDialog, setShowDocumentsDialog] = useState(false);
  const [employeeForm, setEmployeeForm] = useState(emptyEmployeeForm);

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = [
    { title: "Total employés", value: employees.length, icon: Users, color: "text-blue-600" },
    { title: "En onboarding", value: employees.filter(e => e.status === "onboarding").length, icon: Clock, color: "text-amber-600" },
    { title: "Départements", value: new Set(employees.map(e => e.department)).size, icon: Building2, color: "text-purple-600" },
    { title: "Localisations", value: new Set(employees.map(e => e.location)).size, icon: MapPin, color: "text-green-600" },
  ];

  const handleAddEmployee = async () => {
    if (!employeeForm.firstName.trim() || !employeeForm.lastName.trim()) {
      toast({
        title: "Champs requis",
        description: "Le prénom et le nom sont obligatoires.",
        variant: "destructive",
      });
      return;
    }

    const nextId = employees.reduce((max, e) => Math.max(max, e.id), 0) + 1;
    const newEmployee: Employee = {
      id: nextId,
      name: `${employeeForm.firstName.trim()} ${employeeForm.lastName.trim()}`,
      email: employeeForm.email.trim(),
      phone: employeeForm.phone.trim(),
      department: employeeForm.department,
      position: employeeForm.position.trim(),
      type: employeeForm.contractType,
      startDate: employeeForm.startDate,
      status: "onboarding",
      role: "employee",
      manager: employeeForm.manager
        ? employees.find((e) => e.id.toString() === employeeForm.manager)?.name ?? null
        : null,
      location: employeeForm.location.trim(),
    };

    try {
      await saveModuleState({ employees: [...employees, newEmployee], documents });
      toast({
        title: "Employé ajouté",
        description: "Le nouvel employé a été ajouté avec succès.",
      });
      setEmployeeForm(emptyEmployeeForm);
      setShowAddDialog(false);
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer le nouvel employé.",
        variant: "destructive",
      });
    }
  };

  const handleViewDocuments = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowDocumentsDialog(true);
  };

  const employeeDocuments = selectedEmployee 
    ? documents.filter(d => d.employeeId === selectedEmployee.id)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Gestion des employés</h1>
          <p className="text-muted-foreground">Gérez l'annuaire et les dossiers de vos employés</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-add-employee">
              <UserPlus className="h-4 w-4" />
              Ajouter un employé
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Ajouter un employé</DialogTitle>
              <DialogDescription>Remplissez les informations du nouvel employé</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input
                    id="firstName"
                    placeholder="Prénom"
                    value={employeeForm.firstName}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, firstName: e.target.value })}
                    data-testid="input-first-name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input
                    id="lastName"
                    placeholder="Nom"
                    value={employeeForm.lastName}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, lastName: e.target.value })}
                    data-testid="input-last-name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@company.com"
                    value={employeeForm.email}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                    data-testid="input-email"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    placeholder="+221 77 XXX XXXX"
                    value={employeeForm.phone}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                    data-testid="input-phone"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="department">Département</Label>
                  <Select value={employeeForm.department} onValueChange={(v) => setEmployeeForm({ ...employeeForm, department: v })}>
                    <SelectTrigger data-testid="select-department">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tech">Tech</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="RH">RH</SelectItem>
                      <SelectItem value="Ventes">Ventes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="position">Poste</Label>
                  <Input
                    id="position"
                    placeholder="Titre du poste"
                    value={employeeForm.position}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, position: e.target.value })}
                    data-testid="input-position"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="contractType">Type de contrat</Label>
                  <Select value={employeeForm.contractType} onValueChange={(v) => setEmployeeForm({ ...employeeForm, contractType: v })}>
                    <SelectTrigger data-testid="select-contract">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CDI">CDI</SelectItem>
                      <SelectItem value="CDD">CDD</SelectItem>
                      <SelectItem value="Stage">Stage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="startDate">Date d'entrée</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={employeeForm.startDate}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, startDate: e.target.value })}
                    data-testid="input-start-date"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="manager">Manager</Label>
                  <Select value={employeeForm.manager} onValueChange={(v) => setEmployeeForm({ ...employeeForm, manager: v })}>
                    <SelectTrigger data-testid="select-manager">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.filter(e => e.role === "manager").map(m => (
                        <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="location">Localisation</Label>
                  <Input
                    id="location"
                    placeholder="Ville"
                    value={employeeForm.location}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, location: e.target.value })}
                    data-testid="input-location"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Annuler</Button>
              <Button onClick={handleAddEmployee} disabled={isSavingModuleState} data-testid="button-submit-employee">
                {isSavingModuleState ? "Ajout..." : "Ajouter"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
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
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="directory">
        <TabsList>
          <TabsTrigger value="directory">Annuaire</TabsTrigger>
          <TabsTrigger value="roles">Rôles & Accès</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="mt-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un employé..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-employees"
              />
            </div>
            <Button variant="outline" className="gap-2" disabled title="Bientôt disponible">
              <Filter className="h-4 w-4" />
              Filtres
            </Button>
            <Button variant="outline" className="gap-2" disabled title="Bientôt disponible">
              <Download className="h-4 w-4" />
              Exporter
            </Button>
          </div>

          <Card>
            <Table data-testid="table-employees">
              <TableHeader>
                <TableRow>
                  <TableHead>Employé</TableHead>
                  <TableHead>Département</TableHead>
                  <TableHead>Poste</TableHead>
                  <TableHead>Contrat</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Localisation</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                      {employees.length === 0
                        ? "Aucun employé pour le moment. Ajoutez votre premier employé."
                        : "Aucun employé ne correspond à cette recherche."}
                    </TableCell>
                  </TableRow>
                )}
                {filteredEmployees.map((employee) => (
                  <TableRow key={employee.id} data-testid={`employee-row-${employee.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-gradient-to-br from-violet-500 to-pink-500 text-white">
                            {employee.name.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{employee.name}</p>
                          <p className="text-sm text-muted-foreground">{employee.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{employee.department}</TableCell>
                    <TableCell>{employee.position}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{employee.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusLabels[employee.status].color}>
                        {statusLabels[employee.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3" />
                        {employee.location}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" disabled title="Bientôt disponible">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Documents"
                          onClick={() => handleViewDocuments(employee)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" disabled title="Bientôt disponible">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Gestion des rôles et accès</CardTitle>
              <CardDescription>Configurez les permissions pour chaque employé</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employé</TableHead>
                    <TableHead>Rôle actuel</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                        Aucun employé pour le moment.
                      </TableCell>
                    </TableRow>
                  )}
                  {employees.map((employee) => {
                    const RoleIcon = roleLabels[employee.role].icon;
                    return (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-gradient-to-br from-violet-500 to-pink-500 text-white">
                                {employee.name.split(" ").map(n => n[0]).join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{employee.name}</p>
                              <p className="text-sm text-muted-foreground">{employee.position}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <RoleIcon className="h-4 w-4 text-muted-foreground" />
                            <span>{roleLabels[employee.role].label}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {employee.role === "admin" && (
                              <>
                                <Badge variant="outline" className="text-xs">Tous</Badge>
                              </>
                            )}
                            {employee.role === "manager" && (
                              <>
                                <Badge variant="outline" className="text-xs">Équipe</Badge>
                                <Badge variant="outline" className="text-xs">Rapports</Badge>
                                <Badge variant="outline" className="text-xs">Congés</Badge>
                              </>
                            )}
                            {employee.role === "employee" && (
                              <>
                                <Badge variant="outline" className="text-xs">Profil</Badge>
                                <Badge variant="outline" className="text-xs">Congés</Badge>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" disabled title="Bientôt disponible">Modifier le rôle</Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="onboarding" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Employés en onboarding</CardTitle>
              <CardDescription>Suivez l'intégration des nouveaux employés</CardDescription>
            </CardHeader>
            <CardContent>
              {employees.filter(e => e.status === "onboarding").length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucun employé en cours d'onboarding</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {employees.filter(e => e.status === "onboarding").map((employee) => (
                    <Card key={employee.id} className="bg-muted/50">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12">
                              <AvatarFallback className="bg-gradient-to-br from-violet-500 to-pink-500 text-white">
                                {employee.name.split(" ").map(n => n[0]).join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{employee.name}</p>
                              <p className="text-sm text-muted-foreground">{employee.position} - {employee.department}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Date d'entrée: {new Date(employee.startDate).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                          <AlertCircle className="h-4 w-4" />
                          <span>Le suivi détaillé du parcours d'intégration n'est pas encore disponible.</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showDocumentsDialog} onOpenChange={setShowDocumentsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Documents de {selectedEmployee?.name}</DialogTitle>
            <DialogDescription>Gérez les documents administratifs de l'employé</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex justify-end mb-4">
              <Button className="gap-2" disabled title="Bientôt disponible">
                <Upload className="h-4 w-4" />
                Ajouter un document
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeDocuments.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {doc.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{doc.type}</Badge>
                    </TableCell>
                    <TableCell>{new Date(doc.uploadedAt).toLocaleDateString('fr-FR')}</TableCell>
                    <TableCell>
                      <Badge 
                        className={doc.status === "verified" 
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300"
                        }
                      >
                        {doc.status === "verified" ? "Vérifié" : "En attente"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {employeeDocuments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Aucun document disponible
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
