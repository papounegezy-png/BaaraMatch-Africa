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
  FileCheck,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  Shield,
  Car,
  Zap,
  HeartPulse,
  Filter,
  Download,
  Bell,
  XCircle,
} from "lucide-react";

interface Certification {
  id: string;
  employeeId: string;
  employeeName: string;
  type: string;
  category: string;
  issueDate: string;
  expiryDate: string;
  status: "valid" | "expiring_soon" | "expired";
  issuedBy: string;
  documentUrl: string;
}

type MedicalVisit = {
  id: string;
  employeeId: string;
  employeeName: string;
  type: string;
  aptitude: string;
  restrictions: string | null;
  visitDate: string | null;
  nextVisit: string;
  doctor: string | null;
  status: string;
};

interface CertEmployee {
  id: number;
  name: string;
}

// Compliance alerts (expiring/expired certifications, pending medical
// visits) are derived live from real certifications/medicalVisits data
// rather than stored as their own separately-editable list — a compliance
// alert should disappear because the underlying record was actually
// renewed, not because someone dismissed a notification.
interface DerivedAlert {
  id: string;
  title: string;
  employee: string;
  date: string;
  daysRemaining: number;
  severity: "warning" | "error";
}

const certificationTypes = [
  { id: "caces", name: "CACES", icon: Car, color: "bg-blue-500" },
  { id: "electric", name: "Habilitation électrique", icon: Zap, color: "bg-yellow-500" },
  { id: "driving", name: "Permis de conduire", icon: Car, color: "bg-green-500" },
  { id: "safety", name: "Sécurité", icon: Shield, color: "bg-red-500" },
  { id: "medical", name: "Médical", icon: HeartPulse, color: "bg-pink-500" },
];

const emptyCertificationForm = {
  employeeId: "",
  certType: "",
  issueDate: "",
  expiryDate: "",
  issuedBy: "",
};

const emptyMedicalVisitForm = {
  employeeId: "",
  type: "",
  nextVisit: "",
  doctor: "",
};

function computeCertificationStatus(expiryDate: string): "valid" | "expiring_soon" | "expired" {
  if (!expiryDate) return "valid";
  const expiry = new Date(expiryDate);
  const now = new Date();
  const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "expired";
  if (diffDays <= 30) return "expiring_soon";
  return "valid";
}

export function CertificationsManagement() {
  const { toast } = useToast();
  const { moduleState, saveModuleState, isSavingModuleState } = useOperationalModuleState("certifications", {
    certifications: [] as Certification[],
    medicalVisits: [] as MedicalVisit[],
  });
  const certifications = moduleState.certifications ?? [];
  const medicalVisits = moduleState.medicalVisits ?? [];
  // Read-only: sources the "Employé" picker from the real employee
  // directory (see employee-management.tsx) instead of a hardcoded list.
  const { moduleState: employeeModuleState } = useOperationalModuleState("employee", {
    employees: [] as CertEmployee[],
  });
  const rosterEmployees = employeeModuleState.employees ?? [];

  const derivedAlerts: DerivedAlert[] = [
    ...certifications
      .filter((c) => c.status === "expiring_soon" || c.status === "expired")
      .map((c): DerivedAlert => {
        const daysRemaining = Math.ceil((new Date(c.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return {
          id: `cert-${c.id}`,
          title: c.status === "expired" ? `${c.type} expiré` : `${c.type} expire bientôt`,
          employee: c.employeeName,
          date: c.expiryDate,
          daysRemaining,
          severity: c.status === "expired" ? "error" : "warning",
        };
      }),
    ...medicalVisits
      .filter((v) => v.status === "pending")
      .map((v): DerivedAlert => {
        const daysRemaining = Math.ceil((new Date(v.nextVisit).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return {
          id: `medical-${v.id}`,
          title: `Visite médicale à planifier : ${v.type}`,
          employee: v.employeeName,
          date: v.nextVisit,
          daysRemaining,
          severity: "warning",
        };
      }),
  ].sort((a, b) => a.daysRemaining - b.daysRemaining);

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("certifications");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddCertDialog, setShowAddCertDialog] = useState(false);
  const [certificationForm, setCertificationForm] = useState(emptyCertificationForm);
  const [showAddMedicalDialog, setShowAddMedicalDialog] = useState(false);
  const [medicalVisitForm, setMedicalVisitForm] = useState(emptyMedicalVisitForm);

  const filteredCertifications = certifications.filter((cert) => {
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
    total: certifications.length,
    valid: certifications.filter((c) => c.status === "valid").length,
    expiringSoon: certifications.filter((c) => c.status === "expiring_soon").length,
    expired: certifications.filter((c) => c.status === "expired").length,
  };

  const handleAddCertification = async () => {
    if (
      !certificationForm.employeeId ||
      !certificationForm.certType ||
      !certificationForm.issueDate ||
      !certificationForm.expiryDate
    ) {
      toast({
        title: "Champs requis",
        description: "L'employé, le type, la date d'émission et la date d'expiration sont obligatoires.",
        variant: "destructive",
      });
      return;
    }

    const employee = rosterEmployees.find((e) => e.id.toString() === certificationForm.employeeId);
    const certTypeInfo = certificationTypes.find((t) => t.id === certificationForm.certType);
    const nextId = (
      certifications.reduce((max, c) => Math.max(max, parseInt(c.id, 10) || 0), 0) + 1
    ).toString();

    const newCertification: Certification = {
      id: nextId,
      employeeId: certificationForm.employeeId,
      employeeName: employee?.name ?? "",
      type: certTypeInfo?.name ?? certificationForm.certType,
      category: certTypeInfo?.name ?? certificationForm.certType,
      issueDate: certificationForm.issueDate,
      expiryDate: certificationForm.expiryDate,
      status: computeCertificationStatus(certificationForm.expiryDate),
      issuedBy: certificationForm.issuedBy.trim(),
      documentUrl: "",
    };

    try {
      await saveModuleState({
        certifications: [...certifications, newCertification],
        medicalVisits,
      });
      toast({
        title: "Certification ajoutée",
        description: "La nouvelle certification a été enregistrée avec succès.",
      });
      setCertificationForm(emptyCertificationForm);
      setShowAddCertDialog(false);
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer la certification.",
        variant: "destructive",
      });
    }
  };

  const handleAddMedicalVisit = async () => {
    if (!medicalVisitForm.employeeId || !medicalVisitForm.type.trim() || !medicalVisitForm.nextVisit) {
      toast({
        title: "Champs requis",
        description: "L'employé, le type de visite et la prochaine visite sont obligatoires.",
        variant: "destructive",
      });
      return;
    }

    const employee = rosterEmployees.find((e) => e.id.toString() === medicalVisitForm.employeeId);
    const nextId = (
      medicalVisits.reduce((max, v) => Math.max(max, parseInt(v.id, 10) || 0), 0) + 1
    ).toString();

    const newVisit: MedicalVisit = {
      id: nextId,
      employeeId: medicalVisitForm.employeeId,
      employeeName: employee?.name ?? "",
      type: medicalVisitForm.type.trim(),
      aptitude: "En attente",
      restrictions: null,
      visitDate: null,
      nextVisit: medicalVisitForm.nextVisit,
      doctor: medicalVisitForm.doctor.trim() || null,
      status: "pending",
    };

    try {
      await saveModuleState({
        certifications,
        medicalVisits: [...medicalVisits, newVisit],
      });
      toast({
        title: "Visite planifiée",
        description: "La visite médicale a été planifiée avec succès.",
      });
      setMedicalVisitForm(emptyMedicalVisitForm);
      setShowAddMedicalDialog(false);
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de planifier la visite médicale.",
        variant: "destructive",
      });
    }
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
          <Dialog open={showAddCertDialog} onOpenChange={setShowAddCertDialog}>
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
                  <Select
                    value={certificationForm.employeeId}
                    onValueChange={(v) => setCertificationForm({ ...certificationForm, employeeId: v })}
                    disabled={rosterEmployees.length === 0}
                  >
                    <SelectTrigger id="employee" data-testid="select-certification-employee">
                      <SelectValue placeholder={rosterEmployees.length === 0 ? "Aucun employé enregistré" : "Sélectionner un employé"} />
                    </SelectTrigger>
                    <SelectContent>
                      {rosterEmployees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id.toString()}>{emp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cert-type">Type de certification</Label>
                  <Select
                    value={certificationForm.certType}
                    onValueChange={(v) => setCertificationForm({ ...certificationForm, certType: v })}
                  >
                    <SelectTrigger id="cert-type" data-testid="select-certification-type">
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
                    <Input
                      id="issue-date"
                      type="date"
                      value={certificationForm.issueDate}
                      onChange={(e) => setCertificationForm({ ...certificationForm, issueDate: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="expiry-date">Date d'expiration</Label>
                    <Input
                      id="expiry-date"
                      type="date"
                      value={certificationForm.expiryDate}
                      onChange={(e) => setCertificationForm({ ...certificationForm, expiryDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="issuer">Organisme émetteur</Label>
                  <Input
                    id="issuer"
                    placeholder="Ex: AFPA, Bureau Veritas..."
                    value={certificationForm.issuedBy}
                    onChange={(e) => setCertificationForm({ ...certificationForm, issuedBy: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddCertDialog(false)}>Annuler</Button>
                <Button
                  onClick={handleAddCertification}
                  disabled={isSavingModuleState}
                  data-testid="button-save-certification"
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
            <Progress value={stats.total > 0 ? (stats.valid / stats.total) * 100 : 0} className="h-1.5 mt-2" />
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
            {derivedAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {derivedAlerts.length}
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
                <Button variant="outline" disabled title="Bientôt disponible" data-testid="button-export-certifications">
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
                  {filteredCertifications.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                        {certifications.length === 0
                          ? "Aucune certification pour le moment. Ajoutez la première."
                          : "Aucune certification ne correspond à ce filtre."}
                      </TableCell>
                    </TableRow>
                  )}
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
              <Dialog open={showAddMedicalDialog} onOpenChange={setShowAddMedicalDialog}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-medical-visit">
                    <Plus className="w-4 h-4 mr-2" />
                    Planifier visite
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Planifier une visite médicale</DialogTitle>
                    <DialogDescription>Programmez une nouvelle visite médicale pour un employé</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="medical-employee">Employé</Label>
                      <Select
                        value={medicalVisitForm.employeeId}
                        onValueChange={(v) => setMedicalVisitForm({ ...medicalVisitForm, employeeId: v })}
                        disabled={rosterEmployees.length === 0}
                      >
                        <SelectTrigger id="medical-employee" data-testid="select-medical-employee">
                          <SelectValue placeholder={rosterEmployees.length === 0 ? "Aucun employé enregistré" : "Sélectionner un employé"} />
                        </SelectTrigger>
                        <SelectContent>
                          {rosterEmployees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id.toString()}>{emp.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="medical-type">Type de visite</Label>
                      <Input
                        id="medical-type"
                        placeholder="Ex: Visite annuelle, Aptitude travail en hauteur..."
                        value={medicalVisitForm.type}
                        onChange={(e) => setMedicalVisitForm({ ...medicalVisitForm, type: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="medical-next-visit">Prochaine visite</Label>
                        <Input
                          id="medical-next-visit"
                          type="date"
                          value={medicalVisitForm.nextVisit}
                          onChange={(e) => setMedicalVisitForm({ ...medicalVisitForm, nextVisit: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="medical-doctor">Médecin</Label>
                        <Input
                          id="medical-doctor"
                          placeholder="Dr. ..."
                          value={medicalVisitForm.doctor}
                          onChange={(e) => setMedicalVisitForm({ ...medicalVisitForm, doctor: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddMedicalDialog(false)}>Annuler</Button>
                    <Button
                      onClick={handleAddMedicalVisit}
                      disabled={isSavingModuleState}
                      data-testid="button-save-medical-visit"
                    >
                      {isSavingModuleState ? "Enregistrement..." : "Planifier"}
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
                    <TableHead>Type de visite</TableHead>
                    <TableHead>Aptitude</TableHead>
                    <TableHead>Restrictions</TableHead>
                    <TableHead>Dernière visite</TableHead>
                    <TableHead>Prochaine visite</TableHead>
                    <TableHead>Médecin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {medicalVisits.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                        Aucune visite médicale planifiée pour le moment.
                      </TableCell>
                    </TableRow>
                  )}
                  {medicalVisits.map((visit) => (
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
          {derivedAlerts.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p>Aucune alerte — toutes les certifications et visites médicales sont à jour.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {derivedAlerts.map((alert) => (
                <Card
                  key={alert.id}
                  className={`border-l-4 ${alert.severity === "error" ? "border-l-red-500" : "border-l-yellow-500"}`}
                  data-testid={`card-alert-${alert.id}`}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${alert.severity === "error" ? "bg-red-100" : "bg-yellow-100"}`}>
                        {alert.severity === "error" ? (
                          <XCircle className="w-5 h-5 text-red-600" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-yellow-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{alert.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {alert.employee} - {new Date(alert.date).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                    </div>
                    <Badge variant={alert.daysRemaining < 0 ? "destructive" : "secondary"}>
                      {alert.daysRemaining < 0
                        ? `Expiré depuis ${Math.abs(alert.daysRemaining)} jours`
                        : `${alert.daysRemaining} jours restants`}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
