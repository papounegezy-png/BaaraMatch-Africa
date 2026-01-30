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
import { 
  CalendarDays,
  CalendarCheck,
  CalendarX,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Filter,
  AlertCircle,
  Briefcase,
  Heart,
  Baby,
  Plane,
  GraduationCap,
  Calendar,
} from "lucide-react";

const mockLeaveRequests = [
  { 
    id: 1, 
    employee: "Amadou Diallo",
    department: "Tech",
    type: "annual",
    startDate: "2026-02-15",
    endDate: "2026-02-22",
    days: 6,
    status: "pending",
    reason: "Vacances familiales",
    requestedAt: "2026-01-25"
  },
  { 
    id: 2, 
    employee: "Fatou Sow",
    department: "Tech",
    type: "sick",
    startDate: "2026-01-28",
    endDate: "2026-01-30",
    days: 3,
    status: "approved",
    reason: "Maladie",
    requestedAt: "2026-01-28",
    approvedBy: "Marie Dupont"
  },
  { 
    id: 3, 
    employee: "Oumar Kane",
    department: "Marketing",
    type: "annual",
    startDate: "2026-03-01",
    endDate: "2026-03-10",
    days: 8,
    status: "pending",
    reason: "Voyage personnel",
    requestedAt: "2026-01-20"
  },
  { 
    id: 4, 
    employee: "Aissatou Ba",
    department: "RH",
    type: "training",
    startDate: "2026-02-05",
    endDate: "2026-02-07",
    days: 3,
    status: "approved",
    reason: "Formation Excel avancé",
    requestedAt: "2026-01-15",
    approvedBy: "Jean Martin"
  },
  { 
    id: 5, 
    employee: "Moussa Traore",
    department: "Ventes",
    type: "annual",
    startDate: "2026-02-01",
    endDate: "2026-02-03",
    days: 3,
    status: "rejected",
    reason: "Déplacement personnel",
    requestedAt: "2026-01-18",
    rejectedReason: "Période critique pour l'équipe commerciale"
  },
];

const mockBalances = [
  { employee: "Amadou Diallo", department: "Tech", annual: 22, sick: 10, taken: 5, remaining: 17 },
  { employee: "Fatou Sow", department: "Tech", annual: 25, sick: 10, taken: 8, remaining: 17 },
  { employee: "Oumar Kane", department: "Marketing", annual: 22, sick: 10, taken: 3, remaining: 19 },
  { employee: "Aissatou Ba", department: "RH", annual: 22, sick: 10, taken: 0, remaining: 22 },
  { employee: "Moussa Traore", department: "Ventes", annual: 18, sick: 10, taken: 2, remaining: 16 },
];

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

export function LeaveManagement() {
  const { toast } = useToast();
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<typeof mockLeaveRequests[0] | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);

  const pendingRequests = mockLeaveRequests.filter(r => r.status === "pending");

  const stats = [
    { title: "Demandes en attente", value: pendingRequests.length, icon: Clock, color: "text-amber-600" },
    { title: "Approuvées ce mois", value: 8, icon: CheckCircle2, color: "text-green-600" },
    { title: "Employés en congé", value: 2, icon: CalendarDays, color: "text-blue-600" },
    { title: "Jours pris (équipe)", value: 45, icon: Calendar, color: "text-purple-600" },
  ];

  const handleApprove = () => {
    toast({
      title: "Demande approuvée",
      description: `La demande de ${selectedRequest?.employee} a été approuvée.`,
    });
    setShowApprovalDialog(false);
    setSelectedRequest(null);
  };

  const handleReject = () => {
    toast({
      title: "Demande refusée",
      description: `La demande de ${selectedRequest?.employee} a été refusée.`,
      variant: "destructive",
    });
    setShowApprovalDialog(false);
    setSelectedRequest(null);
  };

  const openApprovalDialog = (request: typeof mockLeaveRequests[0]) => {
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
                <Select>
                  <SelectTrigger data-testid="select-employee">
                    <SelectValue placeholder="Sélectionner un employé" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockBalances.map(b => (
                      <SelectItem key={b.employee} value={b.employee}>{b.employee}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">Type de congé</Label>
                <Select>
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
                  <Input id="startDate" type="date" data-testid="input-start-date" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endDate">Date de fin</Label>
                  <Input id="endDate" type="date" data-testid="input-end-date" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reason">Motif</Label>
                <Textarea id="reason" placeholder="Raison de la demande..." data-testid="textarea-reason" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRequestDialog(false)}>Annuler</Button>
              <Button onClick={() => {
                toast({ title: "Demande soumise", description: "La demande a été envoyée pour validation." });
                setShowRequestDialog(false);
              }} data-testid="button-submit-request">Soumettre</Button>
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
          <TabsTrigger value="requests">Demandes ({mockLeaveRequests.length})</TabsTrigger>
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
                  {mockLeaveRequests.map((request) => {
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employé</TableHead>
                    <TableHead>Département</TableHead>
                    <TableHead className="text-center">Droits annuels</TableHead>
                    <TableHead className="text-center">Maladie</TableHead>
                    <TableHead className="text-center">Pris</TableHead>
                    <TableHead className="text-center">Restant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockBalances.map((balance, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-pink-500 text-white text-xs">
                              {balance.employee.split(" ").map(n => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{balance.employee}</span>
                        </div>
                      </TableCell>
                      <TableCell>{balance.department}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{balance.annual}j</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{balance.sick}j</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-amber-600 font-medium">{balance.taken}j</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-green-600 font-bold">{balance.remaining}j</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
                  {mockLeaveRequests.filter(r => r.status !== "pending").map((request) => (
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
