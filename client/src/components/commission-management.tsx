import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Percent,
  Search,
  Filter,
  Download,
  Eye,
  Calendar,
  Building2,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowUpRight,
  TrendingUp,
  Briefcase,
  FileText,
  DollarSign
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CommissionRecord {
  id: string;
  candidateName: string;
  candidatePosition: string;
  companyName: string;
  contractType: "CDI" | "CDD" | "Interim" | "Mission" | "Stage";
  placementDate: string;
  contractValue: number;
  commissionRate: number;
  commissionAmount: number;
  status: "paid" | "pending" | "invoiced" | "cancelled";
  invoiceNumber?: string;
  paymentDate?: string;
}

const mockCommissions: CommissionRecord[] = [
  {
    id: "1",
    candidateName: "Sophie Marchand",
    candidatePosition: "Développeur Full Stack",
    companyName: "TechCorp Africa",
    contractType: "CDI",
    placementDate: "2026-01-15",
    contractValue: 10200000,
    commissionRate: 15,
    commissionAmount: 1530000,
    status: "paid",
    invoiceNumber: "FAC-2026-001",
    paymentDate: "2026-01-25"
  },
  {
    id: "2",
    candidateName: "Amadou Diallo",
    candidatePosition: "Ingénieur DevOps",
    companyName: "FinBank Sénégal",
    contractType: "CDI",
    placementDate: "2026-01-10",
    contractValue: 8640000,
    commissionRate: 15,
    commissionAmount: 1296000,
    status: "invoiced",
    invoiceNumber: "FAC-2026-002"
  },
  {
    id: "3",
    candidateName: "Fatou Sow",
    candidatePosition: "UX Designer",
    companyName: "Orange Digital Center",
    contractType: "CDD",
    placementDate: "2026-01-20",
    contractValue: 3300000,
    commissionRate: 12,
    commissionAmount: 396000,
    status: "pending",
  },
  {
    id: "4",
    candidateName: "Ibrahim Koné",
    candidatePosition: "Backend Engineer",
    companyName: "Wave Mobile Money",
    contractType: "CDI",
    placementDate: "2026-01-05",
    contractValue: 9360000,
    commissionRate: 15,
    commissionAmount: 1404000,
    status: "paid",
    invoiceNumber: "FAC-2026-003",
    paymentDate: "2026-01-20"
  },
  {
    id: "5",
    candidateName: "Marie Laurent",
    candidatePosition: "Product Manager",
    companyName: "Jumia Sénégal",
    contractType: "Mission",
    placementDate: "2026-01-18",
    contractValue: 2040000,
    commissionRate: 18,
    commissionAmount: 367200,
    status: "pending",
  },
  {
    id: "6",
    candidateName: "Jean-Pierre Ndiaye",
    candidatePosition: "Data Analyst",
    companyName: "TechCorp Africa",
    contractType: "Interim",
    placementDate: "2025-12-15",
    contractValue: 1860000,
    commissionRate: 20,
    commissionAmount: 372000,
    status: "paid",
    invoiceNumber: "FAC-2025-089",
    paymentDate: "2025-12-28"
  },
  {
    id: "7",
    candidateName: "Aissatou Bâ",
    candidatePosition: "QA Engineer",
    companyName: "FinBank Sénégal",
    contractType: "Stage",
    placementDate: "2026-01-22",
    contractValue: 720000,
    commissionRate: 8,
    commissionAmount: 57600,
    status: "pending",
  },
];

const commissionStats = {
  totalEarned: 4602000,
  totalPending: 820800,
  totalInvoiced: 1296000,
  avgCommissionRate: 14.7,
  placementsThisMonth: 6,
  growthPercent: 12
};

export function CommissionManagement() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [contractFilter, setContractFilter] = useState("all");
  const [selectedCommission, setSelectedCommission] = useState<CommissionRecord | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const getStatusBadge = (status: CommissionRecord["status"]) => {
    const variants = {
      paid: { label: "Payé", className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800", icon: CheckCircle },
      pending: { label: "En attente", className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800", icon: Clock },
      invoiced: { label: "Facturé", className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800", icon: FileText },
      cancelled: { label: "Annulé", className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800", icon: AlertCircle },
    };
    return variants[status];
  };

  const getContractBadge = (type: CommissionRecord["contractType"]) => {
    const variants = {
      CDI: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400",
      CDD: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400",
      Interim: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400",
      Mission: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400",
      Stage: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400",
    };
    return variants[type];
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' XOF';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  const filteredCommissions = mockCommissions.filter(commission => {
    const matchesSearch = commission.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         commission.companyName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || commission.status === statusFilter;
    const matchesContract = contractFilter === "all" || commission.contractType === contractFilter;
    return matchesSearch && matchesStatus && matchesContract;
  });

  const handleGenerateInvoice = (commission: CommissionRecord) => {
    toast({
      title: "Facture générée",
      description: `Facture créée pour la commission de ${formatCurrency(commission.commissionAmount)}.`,
    });
  };

  const handleDownload = (commission: CommissionRecord) => {
    toast({
      title: "Téléchargement",
      description: `Détail de commission téléchargé.`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row flex-wrap justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Commissions
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Suivi des commissions de placement et revenus agence
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" data-testid="button-export-commissions">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-total-earned">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Commissions perçues</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(commissionStats.totalEarned)}</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-green-600">+{commissionStats.growthPercent}% vs mois dernier</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-pending-commissions">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold text-amber-600">{formatCurrency(commissionStats.totalPending)}</p>
                <p className="text-xs text-muted-foreground mt-1">À facturer</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-invoiced-commissions">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Facturées</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(commissionStats.totalInvoiced)}</p>
                <p className="text-xs text-muted-foreground mt-1">En attente de paiement</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-avg-rate">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taux moyen</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{commissionStats.avgCommissionRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">{commissionStats.placementsThisMonth} placements ce mois</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Percent className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-commissions-list">
        <CardHeader>
          <div className="flex flex-col sm:flex-row flex-wrap justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Liste des Commissions</CardTitle>
              <CardDescription>Revenus générés par les placements</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-48"
                  data-testid="input-search-commissions"
                />
              </div>
              <Select value={contractFilter} onValueChange={setContractFilter}>
                <SelectTrigger className="w-36" data-testid="select-contract-filter">
                  <Briefcase className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Contrat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="CDI">CDI</SelectItem>
                  <SelectItem value="CDD">CDD</SelectItem>
                  <SelectItem value="Interim">Intérim</SelectItem>
                  <SelectItem value="Mission">Mission</SelectItem>
                  <SelectItem value="Stage">Stage</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36" data-testid="select-status-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="invoiced">Facturés</SelectItem>
                  <SelectItem value="paid">Payés</SelectItem>
                  <SelectItem value="cancelled">Annulés</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidat</TableHead>
                  <TableHead>Entreprise</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Valeur contrat</TableHead>
                  <TableHead className="text-center">Taux</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCommissions.map((commission) => {
                  const statusBadge = getStatusBadge(commission.status);
                  const StatusIcon = statusBadge.icon;
                  return (
                    <TableRow key={commission.id} data-testid={`commission-row-${commission.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{commission.candidateName}</p>
                            <p className="text-sm text-muted-foreground">{commission.candidatePosition}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span>{commission.companyName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getContractBadge(commission.contractType)}>
                          {commission.contractType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(commission.contractValue)}</TableCell>
                      <TableCell className="text-center">{commission.commissionRate}%</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {formatCurrency(commission.commissionAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusBadge.className}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => { setSelectedCommission(commission); setShowDetail(true); }}
                            data-testid={`button-view-${commission.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {commission.status === "pending" && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleGenerateInvoice(commission)}
                              data-testid={`button-invoice-${commission.id}`}
                            >
                              Facturer
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Détail de la Commission
            </DialogTitle>
            <DialogDescription>
              Placement du {selectedCommission && formatDate(selectedCommission.placementDate)}
            </DialogDescription>
          </DialogHeader>
          {selectedCommission && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg">{selectedCommission.candidateName}</p>
                  <p className="text-sm text-muted-foreground">{selectedCommission.candidatePosition}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-lg p-3">
                  <p className="text-sm text-muted-foreground">Entreprise</p>
                  <p className="font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {selectedCommission.companyName}
                  </p>
                </div>
                <div className="border rounded-lg p-3">
                  <p className="text-sm text-muted-foreground">Type de contrat</p>
                  <Badge className={getContractBadge(selectedCommission.contractType)}>
                    {selectedCommission.contractType}
                  </Badge>
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valeur annuelle du contrat</span>
                  <span>{formatCurrency(selectedCommission.contractValue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taux de commission</span>
                  <span className="font-medium">{selectedCommission.commissionRate}%</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Commission</span>
                    <span className="text-green-600">{formatCurrency(selectedCommission.commissionAmount)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Statut</span>
                <Badge className={getStatusBadge(selectedCommission.status).className}>
                  {getStatusBadge(selectedCommission.status).label}
                </Badge>
              </div>

              {selectedCommission.invoiceNumber && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">N° Facture</span>
                  <span className="font-mono">{selectedCommission.invoiceNumber}</span>
                </div>
              )}

              {selectedCommission.paymentDate && (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Commission perçue</span>
                  </div>
                  <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                    Paiement reçu le {formatDate(selectedCommission.paymentDate)}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetail(false)}>
              Fermer
            </Button>
            {selectedCommission?.status === "pending" && (
              <Button onClick={() => { handleGenerateInvoice(selectedCommission); setShowDetail(false); }}>
                <FileText className="h-4 w-4 mr-2" />
                Générer facture
              </Button>
            )}
            {selectedCommission?.invoiceNumber && (
              <Button onClick={() => handleDownload(selectedCommission)}>
                <Download className="h-4 w-4 mr-2" />
                Télécharger
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
