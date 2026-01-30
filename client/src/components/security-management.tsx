import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  History, 
  Database, 
  UserX, 
  Search, 
  Download, 
  RefreshCw, 
  Shield, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  FileText,
  Settings,
  Trash2,
  Edit,
  Eye,
  Plus,
  Calendar,
  HardDrive,
  Cloud,
  Lock,
  Unlock,
  Mail,
  Filter,
} from "lucide-react";

interface ActionLog {
  id: number;
  timestamp: string;
  user: string;
  action: string;
  category: string;
  target: string;
  ip: string;
  status: "success" | "warning" | "error";
}

interface Backup {
  id: number;
  name: string;
  date: string;
  size: string;
  type: "auto" | "manual";
  status: "completed" | "in_progress" | "failed";
}

interface GDPRRequest {
  id: number;
  requestDate: string;
  requester: string;
  email: string;
  type: "access" | "deletion" | "rectification" | "portability";
  status: "pending" | "processing" | "completed" | "rejected";
  dueDate: string;
}

const mockActionLogs: ActionLog[] = [
  { id: 1, timestamp: "2026-01-30 14:32:15", user: "Marie Dupont", action: "Connexion", category: "Authentification", target: "Système", ip: "192.168.1.45", status: "success" },
  { id: 2, timestamp: "2026-01-30 14:28:00", user: "Jean Martin", action: "Modification profil", category: "Employé", target: "Employé #234", ip: "192.168.1.67", status: "success" },
  { id: 3, timestamp: "2026-01-30 14:15:42", user: "Admin", action: "Suppression candidature", category: "Recrutement", target: "Candidature #567", ip: "192.168.1.1", status: "warning" },
  { id: 4, timestamp: "2026-01-30 13:58:20", user: "Sophie Leroy", action: "Export paie", category: "Paie", target: "Janvier 2026", ip: "192.168.1.89", status: "success" },
  { id: 5, timestamp: "2026-01-30 13:45:10", user: "Système", action: "Sauvegarde auto", category: "Système", target: "Base de données", ip: "127.0.0.1", status: "success" },
  { id: 6, timestamp: "2026-01-30 13:30:05", user: "Pierre Bernard", action: "Tentative connexion", category: "Authentification", target: "Système", ip: "185.234.12.45", status: "error" },
  { id: 7, timestamp: "2026-01-30 12:45:33", user: "Marie Dupont", action: "Création offre", category: "Recrutement", target: "Offre #89", ip: "192.168.1.45", status: "success" },
  { id: 8, timestamp: "2026-01-30 12:20:18", user: "Admin", action: "Modification permissions", category: "Sécurité", target: "Rôle Manager", ip: "192.168.1.1", status: "warning" },
];

const mockBackups: Backup[] = [
  { id: 1, name: "backup_2026-01-30_14h00", date: "30/01/2026 14:00", size: "2.4 GB", type: "auto", status: "completed" },
  { id: 2, name: "backup_2026-01-30_08h00", date: "30/01/2026 08:00", size: "2.3 GB", type: "auto", status: "completed" },
  { id: 3, name: "backup_manual_2026-01-29", date: "29/01/2026 17:30", size: "2.3 GB", type: "manual", status: "completed" },
  { id: 4, name: "backup_2026-01-29_14h00", date: "29/01/2026 14:00", size: "2.2 GB", type: "auto", status: "completed" },
  { id: 5, name: "backup_2026-01-29_08h00", date: "29/01/2026 08:00", size: "2.2 GB", type: "auto", status: "completed" },
];

const mockGDPRRequests: GDPRRequest[] = [
  { id: 1, requestDate: "28/01/2026", requester: "Jean Dubois", email: "jean.dubois@email.com", type: "access", status: "pending", dueDate: "28/02/2026" },
  { id: 2, requestDate: "25/01/2026", requester: "Marie Martin", email: "m.martin@email.com", type: "deletion", status: "processing", dueDate: "25/02/2026" },
  { id: 3, requestDate: "20/01/2026", requester: "Pierre Durand", email: "p.durand@email.com", type: "portability", status: "completed", dueDate: "20/02/2026" },
  { id: 4, requestDate: "15/01/2026", requester: "Sophie Leroy", email: "s.leroy@email.com", type: "rectification", status: "completed", dueDate: "15/02/2026" },
  { id: 5, requestDate: "10/01/2026", requester: "Paul Bernard", email: "paul.b@email.com", type: "deletion", status: "rejected", dueDate: "10/02/2026" },
];

function ActionHistoryTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const filteredLogs = mockActionLogs.filter(log => {
    const matchesSearch = log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.target.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || log.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(mockActionLogs.map(log => log.category)));

  const getStatusBadge = (status: ActionLog["status"]) => {
    switch (status) {
      case "success":
        return <Badge variant="default" data-testid={`badge-status-${status}`}><CheckCircle2 className="h-3 w-3 mr-1" />Succès</Badge>;
      case "warning":
        return <Badge variant="secondary" data-testid={`badge-status-${status}`}><AlertTriangle className="h-3 w-3 mr-1" />Attention</Badge>;
      case "error":
        return <Badge variant="destructive" data-testid={`badge-status-${status}`}><AlertTriangle className="h-3 w-3 mr-1" />Erreur</Badge>;
    }
  };

  const getActionIcon = (category: string) => {
    switch (category) {
      case "Authentification": return <Lock className="h-4 w-4 text-blue-500" />;
      case "Employé": return <User className="h-4 w-4 text-green-500" />;
      case "Recrutement": return <FileText className="h-4 w-4 text-purple-500" />;
      case "Paie": return <Settings className="h-4 w-4 text-orange-500" />;
      case "Système": return <HardDrive className="h-4 w-4 text-gray-500" />;
      case "Sécurité": return <Shield className="h-4 w-4 text-red-500" />;
      default: return <History className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                <History className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-actions">{mockActionLogs.length}</p>
                <p className="text-sm text-muted-foreground">Actions aujourd'hui</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-success-actions">{mockActionLogs.filter(l => l.status === "success").length}</p>
                <p className="text-sm text-muted-foreground">Réussies</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-warning-actions">{mockActionLogs.filter(l => l.status === "warning").length}</p>
                <p className="text-sm text-muted-foreground">Avertissements</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-error-actions">{mockActionLogs.filter(l => l.status === "error").length}</p>
                <p className="text-sm text-muted-foreground">Erreurs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Journal des actions
              </CardTitle>
              <CardDescription>Historique complet des actions effectuées dans le système</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" data-testid="button-export-logs">
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par utilisateur, action, cible..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-logs"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-category-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table data-testid="table-action-logs">
              <TableHeader>
                <TableRow>
                  <TableHead>Date/Heure</TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Cible</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id} data-testid={`row-log-${log.id}`}>
                    <TableCell className="font-mono text-sm">{log.timestamp}</TableCell>
                    <TableCell className="font-medium">{log.user}</TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.category)}
                        <span>{log.category}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{log.target}</TableCell>
                    <TableCell className="font-mono text-sm">{log.ip}</TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BackupTab() {
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);

  const getStatusBadge = (status: Backup["status"]) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" data-testid={`badge-backup-${status}`}><CheckCircle2 className="h-3 w-3 mr-1" />Terminé</Badge>;
      case "in_progress":
        return <Badge variant="secondary" data-testid={`badge-backup-${status}`}><RefreshCw className="h-3 w-3 mr-1 animate-spin" />En cours</Badge>;
      case "failed":
        return <Badge variant="destructive" data-testid={`badge-backup-${status}`}><AlertTriangle className="h-3 w-3 mr-1" />Échoué</Badge>;
    }
  };

  const handleCreateBackup = () => {
    setIsCreatingBackup(true);
    setTimeout(() => setIsCreatingBackup(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                <Database className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-backups">{mockBackups.length}</p>
                <p className="text-sm text-muted-foreground">Sauvegardes disponibles</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                <HardDrive className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-storage">11.4 GB</p>
                <p className="text-sm text-muted-foreground">Espace utilisé</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-last-backup">14:00</p>
                <p className="text-sm text-muted-foreground">Dernière sauvegarde</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Sauvegardes des données
              </CardTitle>
              <CardDescription>Gérez les sauvegardes automatiques et manuelles de vos données</CardDescription>
            </div>
            <Button onClick={handleCreateBackup} disabled={isCreatingBackup} data-testid="button-create-backup">
              {isCreatingBackup ? (
                <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Création...</>
              ) : (
                <><Plus className="h-4 w-4 mr-2" />Nouvelle sauvegarde</>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table data-testid="table-backups">
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Taille</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockBackups.map((backup) => (
                  <TableRow key={backup.id} data-testid={`row-backup-${backup.id}`}>
                    <TableCell className="font-mono text-sm">{backup.name}</TableCell>
                    <TableCell>{backup.date}</TableCell>
                    <TableCell>{backup.size}</TableCell>
                    <TableCell>
                      <Badge variant={backup.type === "auto" ? "outline" : "secondary"}>
                        {backup.type === "auto" ? "Automatique" : "Manuel"}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(backup.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" data-testid={`button-download-backup-${backup.id}`}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" data-testid={`button-restore-backup-${backup.id}`}>
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" data-testid={`button-delete-backup-${backup.id}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuration des sauvegardes automatiques
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <Label>Fréquence</Label>
                <Select defaultValue="6h">
                  <SelectTrigger className="mt-1" data-testid="select-backup-frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">Toutes les heures</SelectItem>
                    <SelectItem value="6h">Toutes les 6 heures</SelectItem>
                    <SelectItem value="12h">Toutes les 12 heures</SelectItem>
                    <SelectItem value="24h">Quotidien</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Rétention</Label>
                <Select defaultValue="30">
                  <SelectTrigger className="mt-1" data-testid="select-backup-retention">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 jours</SelectItem>
                    <SelectItem value="14">14 jours</SelectItem>
                    <SelectItem value="30">30 jours</SelectItem>
                    <SelectItem value="90">90 jours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Stockage</Label>
                <Select defaultValue="cloud">
                  <SelectTrigger className="mt-1" data-testid="select-backup-storage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">Local uniquement</SelectItem>
                    <SelectItem value="cloud">Cloud (recommandé)</SelectItem>
                    <SelectItem value="both">Local + Cloud</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function GDPRTab() {
  const [dialogOpen, setDialogOpen] = useState(false);

  const getTypeBadge = (type: GDPRRequest["type"]) => {
    switch (type) {
      case "access":
        return <Badge variant="outline"><Eye className="h-3 w-3 mr-1" />Accès</Badge>;
      case "deletion":
        return <Badge variant="destructive"><Trash2 className="h-3 w-3 mr-1" />Suppression</Badge>;
      case "rectification":
        return <Badge variant="secondary"><Edit className="h-3 w-3 mr-1" />Rectification</Badge>;
      case "portability":
        return <Badge variant="default"><Download className="h-3 w-3 mr-1" />Portabilité</Badge>;
    }
  };

  const getStatusBadge = (status: GDPRRequest["status"]) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
      case "processing":
        return <Badge variant="secondary"><RefreshCw className="h-3 w-3 mr-1" />En cours</Badge>;
      case "completed":
        return <Badge variant="default"><CheckCircle2 className="h-3 w-3 mr-1" />Traité</Badge>;
      case "rejected":
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Refusé</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-requests">{mockGDPRRequests.length}</p>
                <p className="text-sm text-muted-foreground">Demandes totales</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900">
                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-pending-requests">{mockGDPRRequests.filter(r => r.status === "pending").length}</p>
                <p className="text-sm text-muted-foreground">En attente</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-completed-requests">{mockGDPRRequests.filter(r => r.status === "completed").length}</p>
                <p className="text-sm text-muted-foreground">Traitées</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-compliance-rate">100%</p>
                <p className="text-sm text-muted-foreground">Taux conformité</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserX className="h-5 w-5" />
                Demandes RGPD
              </CardTitle>
              <CardDescription>Gérez les demandes de droits des personnes concernées</CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-gdpr-request">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle demande
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Enregistrer une demande RGPD</DialogTitle>
                  <DialogDescription>
                    Enregistrez une nouvelle demande d'exercice de droits
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="requester-name">Nom du demandeur</Label>
                    <Input id="requester-name" placeholder="Jean Dupont" data-testid="input-requester-name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="requester-email">Email</Label>
                    <Input id="requester-email" type="email" placeholder="jean.dupont@email.com" data-testid="input-requester-email" />
                  </div>
                  <div className="space-y-2">
                    <Label>Type de demande</Label>
                    <Select>
                      <SelectTrigger data-testid="select-request-type">
                        <SelectValue placeholder="Sélectionner le type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="access">Droit d'accès</SelectItem>
                        <SelectItem value="deletion">Droit à l'effacement</SelectItem>
                        <SelectItem value="rectification">Droit de rectification</SelectItem>
                        <SelectItem value="portability">Droit à la portabilité</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
                  <Button onClick={() => setDialogOpen(false)} data-testid="button-submit-gdpr-request">Enregistrer</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table data-testid="table-gdpr-requests">
              <TableHeader>
                <TableRow>
                  <TableHead>Date demande</TableHead>
                  <TableHead>Demandeur</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Échéance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockGDPRRequests.map((request) => (
                  <TableRow key={request.id} data-testid={`row-gdpr-${request.id}`}>
                    <TableCell>{request.requestDate}</TableCell>
                    <TableCell className="font-medium">{request.requester}</TableCell>
                    <TableCell className="text-muted-foreground">{request.email}</TableCell>
                    <TableCell>{getTypeBadge(request.type)}</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>{request.dueDate}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" data-testid={`button-view-gdpr-${request.id}`}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" data-testid={`button-process-gdpr-${request.id}`}>
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Conformité RGPD
          </CardTitle>
          <CardDescription>Checklist de conformité au Règlement Général sur la Protection des Données</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
              <Checkbox id="consent" defaultChecked data-testid="checkbox-consent" />
              <div className="flex-1">
                <Label htmlFor="consent" className="font-medium">Gestion des consentements</Label>
                <p className="text-sm text-muted-foreground">Recueil et traçabilité des consentements utilisateurs</p>
              </div>
              <Badge variant="default">Actif</Badge>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
              <Checkbox id="retention" defaultChecked data-testid="checkbox-retention" />
              <div className="flex-1">
                <Label htmlFor="retention" className="font-medium">Politique de rétention</Label>
                <p className="text-sm text-muted-foreground">Durées de conservation des données définies</p>
              </div>
              <Badge variant="default">Actif</Badge>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
              <Checkbox id="encryption" defaultChecked data-testid="checkbox-encryption" />
              <div className="flex-1">
                <Label htmlFor="encryption" className="font-medium">Chiffrement des données</Label>
                <p className="text-sm text-muted-foreground">Données sensibles chiffrées au repos et en transit</p>
              </div>
              <Badge variant="default">Actif</Badge>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
              <Checkbox id="access-log" defaultChecked data-testid="checkbox-access-log" />
              <div className="flex-1">
                <Label htmlFor="access-log" className="font-medium">Journalisation des accès</Label>
                <p className="text-sm text-muted-foreground">Traçabilité des accès aux données personnelles</p>
              </div>
              <Badge variant="default">Actif</Badge>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
              <Checkbox id="dpo" defaultChecked data-testid="checkbox-dpo" />
              <div className="flex-1">
                <Label htmlFor="dpo" className="font-medium">Délégué à la Protection des Données</Label>
                <p className="text-sm text-muted-foreground">DPO désigné et coordonnées accessibles</p>
              </div>
              <Badge variant="default">Actif</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function SecurityManagement() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Sécurité & Traçabilité</h1>
        <p className="text-muted-foreground">Gérez la sécurité, les sauvegardes et la conformité RGPD</p>
      </div>

      <Tabs defaultValue="history" className="space-y-4">
        <TabsList data-testid="tabs-security">
          <TabsTrigger value="history" data-testid="tab-history">
            <History className="h-4 w-4 mr-2" />
            Historique des actions
          </TabsTrigger>
          <TabsTrigger value="backup" data-testid="tab-backup">
            <Database className="h-4 w-4 mr-2" />
            Sauvegarde
          </TabsTrigger>
          <TabsTrigger value="gdpr" data-testid="tab-gdpr">
            <UserX className="h-4 w-4 mr-2" />
            Conformité RGPD
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <ActionHistoryTab />
        </TabsContent>

        <TabsContent value="backup">
          <BackupTab />
        </TabsContent>

        <TabsContent value="gdpr">
          <GDPRTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
