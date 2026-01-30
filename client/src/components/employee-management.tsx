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

const mockEmployees = [
  { 
    id: 1, 
    name: "Amadou Diallo", 
    email: "amadou.d@company.com", 
    phone: "+221 77 123 4567",
    department: "Tech",
    position: "Développeur Senior",
    type: "CDI",
    startDate: "2024-03-15",
    status: "active",
    role: "employee",
    manager: "Fatou Sow",
    location: "Dakar"
  },
  { 
    id: 2, 
    name: "Fatou Sow", 
    email: "fatou.s@company.com", 
    phone: "+221 78 234 5678",
    department: "Tech",
    position: "Chef de Projet",
    type: "CDI",
    startDate: "2023-06-01",
    status: "active",
    role: "manager",
    manager: null,
    location: "Dakar"
  },
  { 
    id: 3, 
    name: "Oumar Kane", 
    email: "oumar.k@company.com", 
    phone: "+221 70 345 6789",
    department: "Marketing",
    position: "Responsable Marketing",
    type: "CDI",
    startDate: "2024-01-10",
    status: "active",
    role: "manager",
    manager: null,
    location: "Abidjan"
  },
  { 
    id: 4, 
    name: "Aissatou Ba", 
    email: "aissatou.b@company.com", 
    phone: "+221 76 456 7890",
    department: "RH",
    position: "Chargée RH",
    type: "CDI",
    startDate: "2025-02-01",
    status: "onboarding",
    role: "employee",
    manager: "Marie Dupont",
    location: "Dakar"
  },
  { 
    id: 5, 
    name: "Moussa Traore", 
    email: "moussa.t@company.com", 
    phone: "+221 77 567 8901",
    department: "Ventes",
    position: "Commercial",
    type: "CDD",
    startDate: "2025-06-15",
    status: "active",
    role: "employee",
    manager: "Jean Martin",
    location: "Casablanca"
  },
];

const mockDocuments = [
  { id: 1, employeeId: 1, name: "Contrat de travail", type: "contract", uploadedAt: "2024-03-15", status: "verified" },
  { id: 2, employeeId: 1, name: "Pièce d'identité", type: "identity", uploadedAt: "2024-03-15", status: "verified" },
  { id: 3, employeeId: 1, name: "RIB", type: "banking", uploadedAt: "2024-03-16", status: "verified" },
  { id: 4, employeeId: 2, name: "Contrat de travail", type: "contract", uploadedAt: "2023-06-01", status: "verified" },
  { id: 5, employeeId: 4, name: "Contrat de travail", type: "contract", uploadedAt: "2025-02-01", status: "pending" },
];

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

export function EmployeeManagement() {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<typeof mockEmployees[0] | null>(null);
  const [showDocumentsDialog, setShowDocumentsDialog] = useState(false);

  const filteredEmployees = mockEmployees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = [
    { title: "Total employés", value: mockEmployees.length, icon: Users, color: "text-blue-600" },
    { title: "En onboarding", value: mockEmployees.filter(e => e.status === "onboarding").length, icon: Clock, color: "text-amber-600" },
    { title: "Départements", value: new Set(mockEmployees.map(e => e.department)).size, icon: Building2, color: "text-purple-600" },
    { title: "Localisations", value: new Set(mockEmployees.map(e => e.location)).size, icon: MapPin, color: "text-green-600" },
  ];

  const handleAddEmployee = () => {
    toast({
      title: "Employé ajouté",
      description: "Le nouvel employé a été ajouté avec succès.",
    });
    setShowAddDialog(false);
  };

  const handleViewDocuments = (employee: typeof mockEmployees[0]) => {
    setSelectedEmployee(employee);
    setShowDocumentsDialog(true);
  };

  const employeeDocuments = selectedEmployee 
    ? mockDocuments.filter(d => d.employeeId === selectedEmployee.id)
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
                  <Input id="firstName" placeholder="Prénom" data-testid="input-first-name" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input id="lastName" placeholder="Nom" data-testid="input-last-name" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="email@company.com" data-testid="input-email" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input id="phone" placeholder="+221 77 XXX XXXX" data-testid="input-phone" />
                </div>
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
                  <Label htmlFor="position">Poste</Label>
                  <Input id="position" placeholder="Titre du poste" data-testid="input-position" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="contractType">Type de contrat</Label>
                  <Select>
                    <SelectTrigger data-testid="select-contract">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cdi">CDI</SelectItem>
                      <SelectItem value="cdd">CDD</SelectItem>
                      <SelectItem value="stage">Stage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="startDate">Date d'entrée</Label>
                  <Input id="startDate" type="date" data-testid="input-start-date" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="manager">Manager</Label>
                  <Select>
                    <SelectTrigger data-testid="select-manager">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockEmployees.filter(e => e.role === "manager").map(m => (
                        <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="location">Localisation</Label>
                  <Input id="location" placeholder="Ville" data-testid="input-location" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Annuler</Button>
              <Button onClick={handleAddEmployee} data-testid="button-submit-employee">Ajouter</Button>
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
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filtres
            </Button>
            <Button variant="outline" className="gap-2">
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
                        <Button variant="ghost" size="icon" title="Voir profil">
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
                        <Button variant="ghost" size="icon" title="Modifier">
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
                  {mockEmployees.map((employee) => {
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
                          <Button variant="outline" size="sm">Modifier le rôle</Button>
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
              {mockEmployees.filter(e => e.status === "onboarding").length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucun employé en cours d'onboarding</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {mockEmployees.filter(e => e.status === "onboarding").map((employee) => (
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
                          <Button variant="outline" size="sm">Voir le parcours</Button>
                        </div>
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span>Progression onboarding</span>
                            <span>60%</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full w-[60%] bg-gradient-to-r from-violet-500 to-pink-500 rounded-full" />
                          </div>
                          <div className="flex gap-4 mt-4">
                            <div className="flex items-center gap-2 text-sm">
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              <span>Contrat signé</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              <span>Documents RH</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4 text-amber-500" />
                              <span>Formation en cours</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <AlertCircle className="h-4 w-4" />
                              <span>Accès IT</span>
                            </div>
                          </div>
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
              <Button className="gap-2">
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
