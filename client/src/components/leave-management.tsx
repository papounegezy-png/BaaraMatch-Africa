import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useOperationalModuleState } from "@/hooks/use-operational-module-state";
import {
  CalendarDays,
  CalendarCheck,
  CalendarX,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  AlertCircle,
  Briefcase,
  Heart,
  Baby,
  Plane,
  GraduationCap,
  Calendar,
} from "lucide-react";

type LeaveRequest = {
  id: number;
  employee: string;
  department: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  status: "pending" | "approved" | "rejected";
  reason: string;
  requestedAt: string;
  approvedBy?: string;
  rejectedReason?: string;
};

interface LeaveEmployee {
  id: number;
  name: string;
  department: string;
}

const leaveTypes: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  annual: { label: "Congés payés", icon: Plane, color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  sick: { label: "Maladie", icon: Heart, color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
  maternity: { label: "Maternité", icon: Baby, color: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300" },
  training: { label: "Formation", icon: GraduationCap, color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300" },
  unpaid: { label: "Sans solde", icon: Briefcase, color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300" },
};

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300" },
  approved: { label: "Approuvé", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  rejected: { label: "Refusé", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
};

const emptyRequestForm = {
  employeeName: "",
  department: "",
  type: "",
  startDate: "",
  endDate: "",
  reason: "",
};

function countDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return diff > 0 ? diff : 0;
}

export function LeaveManagement() {
  const { toast } = useToast();
  const { moduleState, saveModuleState } = useOperationalModuleState("leave", {
    leaveRequests: [] as LeaveRequest[],
  });
  // Read-only: sources the "Employé" picker from the real employee directory
  // (a separate module) instead of duplicating a fake employee list here.
  const { moduleState: employeeModuleState } = useOperationalModuleState("employee", {
    employees: [] as LeaveEmployee[],
  });
  const employees = employeeModuleState.employees ?? [];

  const leaveRequests = moduleState.leaveRequests ?? [];
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [requestForm, setRequestForm] = useState(emptyRequestForm);

  const pendingRequests = leaveRequests.filter(r => r.status === "pending");
  const now = new Date();
  const approvedThisMonth = leaveRequests.filter((r) => {
    if (r.status !== "approved") return false;
    const requested = new Date(r.requestedAt);
    return requested.getMonth() === now.getMonth() && requested.getFullYear() === now.getFullYear();
  }).length;
  const employeesOnLeave = new Set(
    leaveRequests
      .filter((r) => r.status === "approved" && new Date(r.startDate) <= now && new Date(r.endDate) >= now)
      .map((r) => r.employee),
  ).size;
  const daysTakenTeam = leaveRequests
    .filter((r) => r.status === "approved")
    .reduce((sum, r) => sum + r.days, 0);

  const stats = [
    { title: "Demandes en attente", value: pendingRequests.length, icon: Clock, color: "text-amber-600" },
    { title: "Approuvées ce mois", value: approvedThisMonth, icon: CheckCircle2, color: "text-green-600" },
    { title: "Employés en congé", value: employeesOnLeave, icon: CalendarDays, color: "text-blue-600" },
    { title: "Jours pris (équipe)", value: daysTakenTeam, icon: Calendar, color: "text-purple-600" },
  ];

  const handleSubmitRequest = async () => {
    if (!requestForm.employeeName || !requestForm.type || !requestForm.startDate || !requestForm.endDate) {
      toast({ title: "Champs requis", description: "Employé, type et dates sont obligatoires.", variant: "destructive" });
      return;
    }
    const days = countDays(requestForm.startDate, requestForm.endDate);
    const nextId = leaveRequests.reduce((max, r) => Math.max(max, r.id), 0) + 1;
    const newRequest: LeaveRequest = {
      id: nextId,
      employee: requestForm.employeeName,
      department: requestForm.department,
      type: requestForm.type,
      startDate: requestForm.startDate,
      endDate: requestForm.endDate,
      days,
      status: "pending",
      reason: requestForm.reason,
      requestedAt: new Date().toISOString().split("T")[0],
    };

    try {
      await saveModuleState({ leaveRequests: [...leaveRequests, newRequest] });
      toast({ title: "Demande soumise", description: "La demande a été envoyée pour validation." });
      setRequestForm(emptyRequestForm);
      setShowRequestDialog(false);
    } catch {
      toast({ title: "Erreur", description: "Impossible d'enregistrer la demande.", variant: "destructive" });
    }
  };

  const handleApprove = () => {
    if (selectedRequest) {
      const nextRequests = leaveRequests.map<LeaveRequest>((request) =>
        request.id === selectedRequest.id
          ? { ...request, status: "approved" as const, approvedBy: "Manager" }
          : request,
      );
      void saveModuleState({ leaveRequests: nextRequests });
    }

    toast({
      title: "Demande approuvée",
      description: `La demande de ${selectedRequest?.employee} a été approuvée.`,
    });
    setShowApprovalDialog(false);
    setSelectedRequest(null);
  };

  const handleReject = () => {
    if (selectedRequest) {
      const nextRequests = leaveRequests.map<LeaveRequest>((request) =>
        request.id === selectedRequest.id
          ? { ...request, status: "rejected" as const, rejectedReason: "Refusé par le manager" }
          : request,
      );
      void saveModuleState({ leaveRequests: nextRequests });
    }

    toast({
      title: "Demande refusée",
      description: `La demande de ${selectedRequest?.employee} a été refusée.`,
      variant: "destructive",
    });
    setShowApprovalDialog(false);
    setSelectedRequest(null);
  };

  const openApprovalDialog = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setShowApprovalDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Congés & Absences</h1>
          <p className="text-muted-foreground">Gérez les demandes de congés et suivez les absences</p>
        </div>
        <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-new-request">
              <Plus className="h-4 w-4" />
              Nouvelle demande
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Soumettre une demande de congé</DialogTitle>
              <DialogDescription>Créez une demande de congé pour un employé</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="employee">Employé</Label>
                <Select
                  value={requestForm.employeeName}
                  onValueChange={(value) => {
                    const employee = employees.find((e) => e.name === value);
                    setRequestForm({ ...requestForm, employeeName: value, department: employee?.department ?? "" });
                  }}
                  disabled={employees.length === 0}
                >
                  <SelectTrigger data-testid="select-employee">
                    <SelectValue placeholder={employees.length === 0 ? "Aucun employé enregistré" : "Sélectionner un employé"} />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(e => (
                      <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">Type de congé</Label>
                <Select value={requestForm.type} onValueChange={(value) => setRequestForm({ ...requestForm, type: value })}>
                  <SelectTrigger data-testid="select-leave-type">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(leaveTypes).map(([key, value]) => (
                      <SelectItem key={key} value={key}>{value.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="startDate">Date de début</Label>
                  <Input
                    id="startDate"
                    type="date"
                    data-testid="input-start-date"
                    value={requestForm.startDate}
                    onChange={(e) => setRequestForm({ ...requestForm, startDate: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endDate">Date de fin</Label>
                  <Input
                    id="endDate"
                    type="date"
                    data-testid="input-end-date"
                    value={requestForm.endDate}
                    onChange={(e) => setRequestForm({ ...requestForm, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reason">Motif</Label>
                <Textarea
                  id="reason"
                  placeholder="Raison de la demande..."
                  data-testid="textarea-reason"
                  value={requestForm.reason}
                  onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setRequestForm(emptyRequestForm); setShowRequestDialog(false); }}>Annuler</Button>
              <Button onClick={handleSubmitRequest} data-testid="button-submit-request">Soumettre</Button>
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

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests">Demandes ({leaveRequests.length})</TabsTrigger>
          <TabsTrigger value="calendar">Calendrier</TabsTrigger>
          <TabsTrigger value="balances">Soldes</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-6">
          {pendingRequests.length > 0 && (
            <Card className="mb-6 border-amber-200 dark:border-amber-800">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <CardTitle className="text-lg">Demandes en attente de validation</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pendingRequests.map((request) => {
                    const LeaveIcon = leaveTypes[request.type].icon;
                    return (
                      <div 
                        key={request.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-pink-500 text-white">
                              {request.employee.split(" ").map(n => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{request.employee}</p>
                            <p className="text-sm text-muted-foreground">{request.department}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <Badge className={leaveTypes[request.type].color}>
                              <LeaveIcon className="h-3 w-3 mr-1" />
                              {leaveTypes[request.type].label}
                            </Badge>
                            <p className="text-sm text-muted-foreground mt-1">
                              {new Date(request.startDate).toLocaleDateString('fr-FR')} - {new Date(request.endDate).toLocaleDateString('fr-FR')} ({request.days}j)
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => openApprovalDialog(request)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Refuser
                            </Button>
                            <Button 
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => openApprovalDialog(request)}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Approuver
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Toutes les demandes</CardTitle>
            </CardHeader>
            <CardContent>
              <Table data-testid="table-leave-requests">
                <TableHeader>
                  <TableRow>
                    <TableHead>Employé</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead>Jours</TableHead>
                    <TableHead>Motif</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveRequests.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                        Aucune demande de congé pour le moment.
                      </TableCell>
                    </TableRow>
                  )}
                  {leaveRequests.map((request) => {
                    const LeaveIcon = leaveTypes[request.type].icon;
                    return (
                      <TableRow key={request.id} data-testid={`leave-row-${request.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-gradient-to-br from-violet-500 to-pink-500 text-white text-xs">
                                {request.employee.split(" ").map(n => n[0]).join("")}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{request.employee}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={leaveTypes[request.type].color}>
                            <LeaveIcon className="h-3 w-3 mr-1" />
                            {leaveTypes[request.type].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(request.startDate).toLocaleDateString('fr-FR')} - {new Date(request.endDate).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell>{request.days}j</TableCell>
                        <TableCell className="max-w-[200px] truncate">{request.reason}</TableCell>
                        <TableCell>
                          <Badge className={statusLabels[request.status].color}>
                            {statusLabels[request.status].label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Calendrier des absences</CardTitle>
              <CardDescription>Vue mensuelle des congés et absences</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <CalendarDays className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Le calendrier interactif sera bientôt disponible</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balances" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Soldes de congés</CardTitle>
              <CardDescription>Droits et soldes en temps réel par employé</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <CalendarCheck className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Le suivi des droits et soldes de congés sera bientôt disponible</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Historique des absences</CardTitle>
              <CardDescription>Historique complet des congés par employé</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employé</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead>Jours</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Validé par</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveRequests.filter(r => r.status !== "pending").length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                        Aucun historique pour le moment.
                      </TableCell>
                    </TableRow>
                  )}
                  {leaveRequests.filter(r => r.status !== "pending").map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{request.employee}</TableCell>
                      <TableCell>
                        <Badge className={leaveTypes[request.type].color}>
                          {leaveTypes[request.type].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(request.startDate).toLocaleDateString('fr-FR')} - {new Date(request.endDate).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell>{request.days}j</TableCell>
                      <TableCell>
                        <Badge className={statusLabels[request.status].color}>
                          {statusLabels[request.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {request.approvedBy || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Validation de la demande</DialogTitle>
            <DialogDescription>
              Demande de {selectedRequest?.employee} pour {selectedRequest?.days} jours
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <p className="font-medium">{leaveTypes[selectedRequest.type].label}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Durée</Label>
                  <p className="font-medium">{selectedRequest.days} jours</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Période</Label>
                <p className="font-medium">
                  {new Date(selectedRequest.startDate).toLocaleDateString('fr-FR')} au {new Date(selectedRequest.endDate).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Motif</Label>
                <p className="font-medium">{selectedRequest.reason}</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="comment">Commentaire (optionnel)</Label>
                <Textarea id="comment" placeholder="Ajouter un commentaire..." />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleReject}>Refuser</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleApprove}>Approuver</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
