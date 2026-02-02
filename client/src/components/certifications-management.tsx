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
  FileCheck,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  User,
  Shield,
  Car,
  Zap,
  HeartPulse,
  Filter,
  Download,
  Bell,
  XCircle,
} from "lucide-react";

const mockCertifications = [
  {
    id: "1",
    employeeId: "emp1",
    employeeName: "Ousmane Ba",
    type: "CACES R489",
    category: "Engins de chantier",
    issueDate: "2024-03-15",
    expiryDate: "2026-03-15",
    status: "valid",
    issuedBy: "AFPA Sénégal",
    documentUrl: "/docs/caces_oba.pdf",
  },
  {
    id: "2",
    employeeId: "emp2",
    employeeName: "Aminata Diop",
    type: "Habilitation électrique B2V",
    category: "Électrique",
    issueDate: "2025-01-10",
    expiryDate: "2026-01-10",
    status: "expiring_soon",
    issuedBy: "APAVE",
    documentUrl: "/docs/hab_elec_adiop.pdf",
  },
  {
    id: "3",
    employeeId: "emp3",
    employeeName: "Moussa Fall",
    type: "Permis C",
    category: "Conduite",
    issueDate: "2020-06-20",
    expiryDate: "2025-06-20",
    status: "expired",
    issuedBy: "Préfecture de Dakar",
    documentUrl: "/docs/permis_mfall.pdf",
  },
  {
    id: "4",
    employeeId: "emp4",
    employeeName: "Cheikh Sy",
    type: "Soudeur TIG/MIG",
    category: "Soudure",
    issueDate: "2024-09-01",
    expiryDate: "2027-09-01",
    status: "valid",
    issuedBy: "Bureau Veritas",
    documentUrl: "/docs/soudeur_csy.pdf",
  },
  {
    id: "5",
    employeeId: "emp5",
    employeeName: "Aissatou Bah",
    type: "SST (Sauveteur Secouriste)",
    category: "Sécurité",
    issueDate: "2025-06-15",
    expiryDate: "2027-06-15",
    status: "valid",
    issuedBy: "Croix Rouge",
    documentUrl: "/docs/sst_abah.pdf",
  },
];

const mockMedicalVisits = [
  {
    id: "1",
    employeeId: "emp1",
    employeeName: "Ousmane Ba",
    type: "Visite annuelle",
    aptitude: "Apte",
    restrictions: null,
    visitDate: "2025-11-20",
    nextVisit: "2026-11-20",
    doctor: "Dr. Ndiaye",
    status: "valid",
  },
  {
    id: "2",
    employeeId: "emp2",
    employeeName: "Aminata Diop",
    type: "Visite annuelle",
    aptitude: "Apte avec restrictions",
    restrictions: "Port de charges < 15kg",
    visitDate: "2025-10-05",
    nextVisit: "2026-04-05",
    doctor: "Dr. Sarr",
    status: "valid",
  },
  {
    id: "3",
    employeeId: "emp3",
    employeeName: "Moussa Fall",
    type: "Visite annuelle",
    aptitude: "En attente",
    restrictions: null,
    visitDate: null,
    nextVisit: "2026-01-15",
    doctor: null,
    status: "pending",
  },
  {
    id: "4",
    employeeId: "emp6",
    employeeName: "Ibrahim Diallo",
    type: "Aptitude travail en hauteur",
    aptitude: "Apte",
    restrictions: null,
    visitDate: "2025-12-10",
    nextVisit: "2026-12-10",
    doctor: "Dr. Ndiaye",
    status: "valid",
  },
];

const mockAlerts = [
  {
    id: "1",
    type: "expiry",
    title: "Habilitation électrique B2V expire bientôt",
    employee: "Aminata Diop",
    date: "2026-01-10",
    daysRemaining: 8,
    severity: "warning",
  },
  {
    id: "2",
    type: "expired",
    title: "Permis C expiré",
    employee: "Moussa Fall",
    date: "2025-06-20",
    daysRemaining: -220,
    severity: "error",
  },
  {
    id: "3",
    type: "medical",
    title: "Visite médicale à planifier",
    employee: "Moussa Fall",
    date: "2026-01-15",
    daysRemaining: 13,
    severity: "warning",
  },
  {
    id: "4",
    type: "renewal",
    title: "Renouvellement SST recommandé",
    employee: "Aissatou Bah",
    date: "2027-06-15",
    daysRemaining: 530,
    severity: "info",
  },
];

const certificationTypes = [
  { id: "caces", name: "CACES", icon: Car, color: "bg-blue-500" },
  { id: "electric", name: "Habilitation électrique", icon: Zap, color: "bg-yellow-500" },
  { id: "driving", name: "Permis de conduire", icon: Car, color: "bg-green-500" },
  { id: "safety", name: "Sécurité", icon: Shield, color: "bg-red-500" },
  { id: "medical", name: "Médical", icon: HeartPulse, color: "bg-pink-500" },
];

export function CertificationsManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("certifications");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredCertifications = mockCertifications.filter((cert) => {
    const matchesSearch =
      cert.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || cert.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "valid":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Valide</Badge>;
      case "expiring_soon":
        return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" />Expire bientôt</Badge>;
      case "expired":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Expiré</Badge>;
      case "pending":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getAptitudeBadge = (aptitude: string | null) => {
    switch (aptitude) {
      case "Apte":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Apte</Badge>;
      case "Apte avec restrictions":
        return <Badge className="bg-yellow-500"><AlertTriangle className="w-3 h-3 mr-1" />Apte avec restrictions</Badge>;
      case "Inapte":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Inapte</Badge>;
      case "En attente":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  const stats = {
    total: mockCertifications.length,
    valid: mockCertifications.filter((c) => c.status === "valid").length,
    expiringSoon: mockCertifications.filter((c) => c.status === "expiring_soon").length,
    expired: mockCertifications.filter((c) => c.status === "expired").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-certifications-title">Habilitations & Certifications</h1>
          <p className="text-muted-foreground">Suivi des permis, habilitations et visites médicales</p>
        </div>
        <div className="flex gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-certifications"
            />
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button data-testid="button-add-certification">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Ajouter une certification</DialogTitle>
                <DialogDescription>Enregistrez une nouvelle habilitation ou certification</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="employee">Employé</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un employé" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="emp1">Ousmane Ba</SelectItem>
                      <SelectItem value="emp2">Aminata Diop</SelectItem>
                      <SelectItem value="emp3">Moussa Fall</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cert-type">Type de certification</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="caces">CACES</SelectItem>
                      <SelectItem value="electric">Habilitation électrique</SelectItem>
                      <SelectItem value="driving">Permis de conduire</SelectItem>
                      <SelectItem value="safety">Formation sécurité</SelectItem>
                      <SelectItem value="welding">Certification soudure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="issue-date">Date d'émission</Label>
                    <Input id="issue-date" type="date" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="expiry-date">Date d'expiration</Label>
                    <Input id="expiry-date" type="date" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="issuer">Organisme émetteur</Label>
                  <Input id="issuer" placeholder="Ex: AFPA, Bureau Veritas..." />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" data-testid="button-save-certification">Enregistrer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total certifications</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">documents enregistrés</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valides</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.valid}</div>
            <Progress value={(stats.valid / stats.total) * 100} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expirent bientôt</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.expiringSoon}</div>
            <p className="text-xs text-muted-foreground">dans les 30 jours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expirées</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
            <p className="text-xs text-muted-foreground">à renouveler</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="tabs-certifications">
        <TabsList>
          <TabsTrigger value="certifications" data-testid="tab-certifications">
            <FileCheck className="w-4 h-4 mr-2" />
            Certifications
          </TabsTrigger>
          <TabsTrigger value="medical" data-testid="tab-medical">
            <HeartPulse className="w-4 h-4 mr-2" />
            Visites médicales
          </TabsTrigger>
          <TabsTrigger value="alerts" data-testid="tab-alerts">
            <Bell className="w-4 h-4 mr-2" />
            Alertes
            {mockAlerts.filter((a) => a.severity !== "info").length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {mockAlerts.filter((a) => a.severity !== "info").length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="certifications" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Liste des certifications</CardTitle>
                <CardDescription>Toutes les habilitations et certifications enregistrées</CardDescription>
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filtrer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="valid">Valides</SelectItem>
                    <SelectItem value="expiring_soon">Expire bientôt</SelectItem>
                    <SelectItem value="expired">Expirées</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" data-testid="button-export-certifications">
                  <Download className="w-4 h-4 mr-2" />
                  Exporter
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employé</TableHead>
                    <TableHead>Certification</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Date émission</TableHead>
                    <TableHead>Expiration</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Organisme</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCertifications.map((cert) => (
                    <TableRow key={cert.id} data-testid={`row-certification-${cert.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{cert.employeeName.split(" ").map((n) => n[0]).join("")}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{cert.employeeName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{cert.type}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{cert.category}</Badge>
                      </TableCell>
                      <TableCell>{new Date(cert.issueDate).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell>{new Date(cert.expiryDate).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell>{getStatusBadge(cert.status)}</TableCell>
                      <TableCell className="text-muted-foreground">{cert.issuedBy}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="medical" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Visites médicales</CardTitle>
                <CardDescription>Suivi des aptitudes et visites médicales obligatoires</CardDescription>
              </div>
              <Button data-testid="button-add-medical-visit">
                <Plus className="w-4 h-4 mr-2" />
                Planifier visite
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employé</TableHead>
                    <TableHead>Type de visite</TableHead>
                    <TableHead>Aptitude</TableHead>
                    <TableHead>Restrictions</TableHead>
                    <TableHead>Dernière visite</TableHead>
                    <TableHead>Prochaine visite</TableHead>
                    <TableHead>Médecin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockMedicalVisits.map((visit) => (
                    <TableRow key={visit.id} data-testid={`row-medical-${visit.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{visit.employeeName.split(" ").map((n) => n[0]).join("")}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{visit.employeeName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{visit.type}</TableCell>
                      <TableCell>{getAptitudeBadge(visit.aptitude)}</TableCell>
                      <TableCell>
                        {visit.restrictions ? (
                          <span className="text-sm text-yellow-600">{visit.restrictions}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {visit.visitDate ? new Date(visit.visitDate).toLocaleDateString("fr-FR") : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          {new Date(visit.nextVisit).toLocaleDateString("fr-FR")}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{visit.doctor || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="mt-4">
          <div className="space-y-4">
            {mockAlerts.map((alert) => (
              <Card
                key={alert.id}
                className={`border-l-4 ${
                  alert.severity === "error"
                    ? "border-l-red-500"
                    : alert.severity === "warning"
                    ? "border-l-yellow-500"
                    : "border-l-blue-500"
                }`}
                data-testid={`card-alert-${alert.id}`}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        alert.severity === "error"
                          ? "bg-red-100"
                          : alert.severity === "warning"
                          ? "bg-yellow-100"
                          : "bg-blue-100"
                      }`}
                    >
                      {alert.severity === "error" ? (
                        <XCircle className="w-5 h-5 text-red-600" />
                      ) : alert.severity === "warning" ? (
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      ) : (
                        <Bell className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{alert.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {alert.employee} - {new Date(alert.date).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge
                      variant={
                        alert.daysRemaining < 0
                          ? "destructive"
                          : alert.daysRemaining < 30
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {alert.daysRemaining < 0
                        ? `Expiré depuis ${Math.abs(alert.daysRemaining)} jours`
                        : `${alert.daysRemaining} jours restants`}
                    </Badge>
                    <Button size="sm" variant="outline">
                      Traiter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
