import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { jsPDF } from "jspdf";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User, AgencyProfile, AgencyFinancialSettings, Invoice } from "@shared/schema";
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
  Building2,
  User as UserIcon,
  Clock,
  CheckCircle,
  AlertCircle,
  Briefcase,
  FileText,
  DollarSign,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Raw shape returned by GET /api/agency/placements - a commission IS a placement,
// there is no separate "commission" table in the backend.
interface AgencyPlacement {
  id: string;
  candidateId: string;
  candidateName: string;
  companyId: string | null;
  agencyClientId: string | null;
  companyName: string;
  contractType: string | null;
  status: "active" | "completed" | "terminated" | "on_leave";
  salary: number | null;
  salaryCurrency: string | null;
  commissionRate: number | null;
  commissionAmount: number | null;
  startDate: string;
  endDate: string | null;
  invoiceNumber: string | null;
  invoiceStatus: string | null;
}

// Display shape derived from a placement. Notes on mapping decisions:
// - candidatePosition: there is no "position" field on a placement record, so it has
//   been dropped rather than fabricated (contractType is already shown separately).
// - contractValue: placements only persist a `salary` field. Elsewhere in this codebase
//   (server/routes.ts, the salary/payroll mapping) that same field is treated as a
//   MONTHLY rate, so it is annualized here (salary * 12) to preserve the existing
//   "valeur annuelle du contrat" copy. This is an assumption - if it's wrong, the
//   fix is a one-line change below.
// - status: derived from invoiceStatus/invoiceNumber per the rules in deriveStatus().
interface CommissionRecord {
  id: string;
  candidateName: string;
  agencyClientId: string | null;
  companyName: string;
  contractType: string;
  placementDate: string;
  contractValue: number | null;
  commissionRate: number | null;
  commissionAmount: number | null;
  status: "paid" | "pending" | "invoiced" | "cancelled";
  invoiceNumber: string | null;
}

function deriveStatus(placement: AgencyPlacement): CommissionRecord["status"] {
  if (placement.invoiceStatus === "paid") return "paid";
  if (placement.invoiceStatus === "cancelled") return "cancelled";
  if (placement.invoiceNumber) return "invoiced";
  return "pending";
}

function mapPlacementToCommission(placement: AgencyPlacement): CommissionRecord {
  return {
    id: placement.id,
    candidateName: placement.candidateName,
    agencyClientId: placement.agencyClientId,
    companyName: placement.companyName,
    contractType: placement.contractType || "N/A",
    placementDate: placement.startDate,
    contractValue: placement.salary != null ? placement.salary * 12 : null,
    commissionRate: placement.commissionRate,
    commissionAmount: placement.commissionAmount,
    status: deriveStatus(placement),
    invoiceNumber: placement.invoiceNumber,
  };
}

export function CommissionManagement() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [contractFilter, setContractFilter] = useState("all");
  const [selectedCommission, setSelectedCommission] = useState<CommissionRecord | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showInvoiceConfirm, setShowInvoiceConfirm] = useState(false);
  const [commissionToInvoice, setCommissionToInvoice] = useState<CommissionRecord | null>(null);

  const { data: placements = [], isLoading } = useQuery<AgencyPlacement[]>({
    queryKey: ["/api/agency/placements"],
  });

  const { data: financialSettings } = useQuery<AgencyFinancialSettings>({
    queryKey: ["/api/agency/financial-settings"],
  });

  const { data: profileData } = useQuery<{ user: User; profile: AgencyProfile | null }>({
    queryKey: ["/api/profile"],
  });

  const commissions: CommissionRecord[] = placements.map(mapPlacementToCommission);

  // No historical baseline exists to compute a real month-over-month growth figure,
  // so that stat is dropped from the UI entirely rather than showing a fabricated number.
  const commissionStats = (() => {
    const totalEarned = commissions
      .filter(c => c.status === "paid")
      .reduce((sum, c) => sum + (c.commissionAmount ?? 0), 0);
    const totalPending = commissions
      .filter(c => c.status === "pending")
      .reduce((sum, c) => sum + (c.commissionAmount ?? 0), 0);
    const totalInvoiced = commissions
      .filter(c => c.status === "invoiced")
      .reduce((sum, c) => sum + (c.commissionAmount ?? 0), 0);
    const ratesKnown = commissions.filter(c => c.commissionRate != null);
    const avgCommissionRate = ratesKnown.length > 0
      ? ratesKnown.reduce((sum, c) => sum + (c.commissionRate ?? 0), 0) / ratesKnown.length
      : 0;
    const now = new Date();
    const placementsThisMonth = commissions.filter(c => {
      const d = new Date(c.placementDate);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    return { totalEarned, totalPending, totalInvoiced, avgCommissionRate, placementsThisMonth };
  })();

  const generateInvoiceMutation = useMutation({
    mutationFn: async (commission: CommissionRecord) => {
      const issueDate = new Date();
      const paymentTerms = financialSettings?.defaultPaymentTerms ?? 30;
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + paymentTerms);

      const res = await apiRequest("POST", "/api/agency/invoices", {
        agencyClientId: commission.agencyClientId,
        issueDate: issueDate.toISOString(),
        dueDate: dueDate.toISOString(),
        lineItems: [
          {
            placementId: commission.id,
            description: `Commission - ${commission.candidateName} - ${commission.companyName}`,
            quantity: 1,
            unitPrice: commission.commissionAmount ?? 0,
          },
        ],
      });
      return res.json() as Promise<Invoice>;
    },
    onSuccess: (invoice, commission) => {
      queryClient.invalidateQueries({ queryKey: ["/api/agency/placements"] });
      setShowInvoiceConfirm(false);
      setCommissionToInvoice(null);
      setShowDetail(false);
      toast({
        title: "Facture générée avec succès",
        description: `Facture ${invoice.invoiceNumber} créée pour ${commission.candidateName} - ${formatCurrency(commission.commissionAmount ?? 0)}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de générer la facture",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: CommissionRecord["status"]) => {
    const variants = {
      paid: { label: "Payé", className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800", icon: CheckCircle },
      pending: { label: "En attente", className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800", icon: Clock },
      invoiced: { label: "Facturé", className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800", icon: FileText },
      cancelled: { label: "Annulé", className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800", icon: AlertCircle },
    };
    return variants[status];
  };

  const getContractBadge = (type: string) => {
    const variants: Record<string, string> = {
      CDI: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400",
      CDD: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400",
      Interim: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400",
      Mission: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400",
      Stage: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400",
    };
    return variants[type] || "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400";
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

  const filteredCommissions = commissions.filter(commission => {
    const matchesSearch = commission.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         commission.companyName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || commission.status === statusFilter;
    const matchesContract = contractFilter === "all" || commission.contractType === contractFilter;
    return matchesSearch && matchesStatus && matchesContract;
  });

  const openInvoiceConfirm = (commission: CommissionRecord) => {
    setCommissionToInvoice(commission);
    setShowInvoiceConfirm(true);
  };

  const handleGenerateInvoice = () => {
    if (!commissionToInvoice) return;
    generateInvoiceMutation.mutate(commissionToInvoice);
  };

  const handleDownload = (commission: CommissionRecord) => {
    const agencyProfile = profileData?.profile;
    const agencyUser = profileData?.user;
    const companyInfo = {
      name: agencyProfile?.agencyName || agencyUser?.fullName || "Agence",
      city: [agencyUser?.city, agencyUser?.country].filter(Boolean).join(", "),
      phone: agencyUser?.phone || "",
      email: agencyUser?.email || "",
    };

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Header with gradient effect (using rectangles)
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("DETAIL DE COMMISSION", pageWidth / 2, 25, { align: "center" });

    y = 55;

    // Company info - only real fields are included (no fabricated address/NINEA/TVA)
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    let issuerY = y;
    doc.text(companyInfo.name, 15, issuerY);
    if (companyInfo.city) {
      issuerY += 5;
      doc.text(companyInfo.city, 15, issuerY);
    }
    if (companyInfo.phone) {
      issuerY += 5;
      doc.text(`Tel: ${companyInfo.phone}`, 15, issuerY);
    }
    if (companyInfo.email) {
      issuerY += 5;
      doc.text(`Email: ${companyInfo.email}`, 15, issuerY);
    }

    // Right side - Invoice info
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text(`N° Facture: ${commission.invoiceNumber || 'N/A'}`, pageWidth - 15, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${formatDate(commission.placementDate)}`, pageWidth - 15, y + 7, { align: "right" });
    doc.text(`Statut: ${getStatusBadge(commission.status).label}`, pageWidth - 15, y + 14, { align: "right" });

    y = 95;

    // Separator line
    doc.setDrawColor(200, 200, 200);
    doc.line(15, y, pageWidth - 15, y);

    y += 15;

    // Candidate section
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(15, y - 5, pageWidth - 30, 25, 3, 3, 'F');

    doc.setTextColor(59, 130, 246);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("CANDIDAT PLACE", 20, y + 5);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text(`Nom: ${commission.candidateName}`, 20, y + 15);

    y += 35;

    // Company client section
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(15, y - 5, pageWidth - 30, 35, 3, 3, 'F');

    doc.setTextColor(59, 130, 246);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("ENTREPRISE CLIENTE", 20, y + 5);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text(`Nom: ${commission.companyName}`, 20, y + 15);
    doc.setFont("helvetica", "normal");
    doc.text(`Type de contrat: ${commission.contractType}`, 20, y + 23);

    y += 50;

    // Financial details
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(15, y - 5, pageWidth - 30, 60, 3, 3, 'F');

    doc.setTextColor(59, 130, 246);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("DETAIL FINANCIER", 20, y + 5);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");

    doc.text("Valeur annuelle du contrat:", 20, y + 18);
    doc.text(commission.contractValue != null ? formatCurrency(commission.contractValue) : "N/A", pageWidth - 20, y + 18, { align: "right" });

    doc.text("Taux de commission:", 20, y + 28);
    doc.text(commission.commissionRate != null ? `${commission.commissionRate}%` : "N/A", pageWidth - 20, y + 28, { align: "right" });

    doc.setDrawColor(59, 130, 246);
    doc.line(20, y + 35, pageWidth - 20, y + 35);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(34, 197, 94);
    doc.text("MONTANT DE LA COMMISSION:", 20, y + 48);
    doc.text(formatCurrency(commission.commissionAmount ?? 0), pageWidth - 20, y + 48, { align: "right" });

    y += 70;

    // Payment status if paid (no exact payment date is available from this endpoint,
    // so only the fact of payment is shown, not a fabricated date)
    if (commission.status === "paid") {
      doc.setFillColor(220, 252, 231);
      doc.roundedRect(15, y - 5, pageWidth - 30, 18, 3, 3, 'F');

      doc.setTextColor(22, 163, 74);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("PAIEMENT RECU", 20, y + 7);
    }

    // Footer
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.text(`Document genere le ${new Date().toLocaleDateString('fr-FR')} - ${companyInfo.name}`, pageWidth / 2, footerY, { align: "center" });

    // Save the PDF
    doc.save(`commission_${commission.invoiceNumber || commission.id}_${commission.candidateName.replace(/\s+/g, '_')}.pdf`);

    toast({
      title: "PDF telecharge",
      description: `Detail de commission pour ${commission.candidateName} telecharge.`,
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
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{commissionStats.avgCommissionRate.toFixed(1)}%</p>
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
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredCommissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Percent className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium">Aucune commission trouvée</h3>
              <p className="text-sm text-muted-foreground">
                Les commissions apparaissent ici dès qu'un placement est enregistré
              </p>
            </div>
          ) : (
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
                            <UserIcon className="h-4 w-4 text-primary" />
                          </div>
                          <p className="font-medium">{commission.candidateName}</p>
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
                      <TableCell className="text-right">{commission.contractValue != null ? formatCurrency(commission.contractValue) : "-"}</TableCell>
                      <TableCell className="text-center">{commission.commissionRate != null ? `${commission.commissionRate}%` : "-"}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {commission.commissionAmount != null ? formatCurrency(commission.commissionAmount) : "-"}
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
                              disabled={!commission.commissionAmount}
                              onClick={() => openInvoiceConfirm(commission)}
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
          )}
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
                  <UserIcon className="h-6 w-6 text-primary" />
                </div>
                <p className="font-semibold text-lg">{selectedCommission.candidateName}</p>
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
                  <span>{selectedCommission.contractValue != null ? formatCurrency(selectedCommission.contractValue) : "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taux de commission</span>
                  <span className="font-medium">{selectedCommission.commissionRate != null ? `${selectedCommission.commissionRate}%` : "N/A"}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Commission</span>
                    <span className="text-green-600">{formatCurrency(selectedCommission.commissionAmount ?? 0)}</span>
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

              {selectedCommission.status === "paid" && (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Commission perçue</span>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetail(false)}>
              Fermer
            </Button>
            {selectedCommission?.status === "pending" && (
              <Button
                disabled={!selectedCommission.commissionAmount}
                onClick={() => selectedCommission && openInvoiceConfirm(selectedCommission)}
              >
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

      <Dialog open={showInvoiceConfirm} onOpenChange={setShowInvoiceConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Confirmer la facturation
            </DialogTitle>
            <DialogDescription>
              Vous êtes sur le point de générer une facture pour cette commission.
            </DialogDescription>
          </DialogHeader>
          {commissionToInvoice && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Candidat</span>
                  <span className="font-medium">{commissionToInvoice.candidateName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entreprise</span>
                  <span>{commissionToInvoice.companyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type de contrat</span>
                  <Badge className={getContractBadge(commissionToInvoice.contractType)}>
                    {commissionToInvoice.contractType}
                  </Badge>
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <span className="text-muted-foreground">Montant à facturer</span>
                  <span className="font-bold text-lg text-green-600">
                    {formatCurrency(commissionToInvoice.commissionAmount ?? 0)}
                  </span>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  Une facture sera générée et son numéro sera attribué automatiquement à la création.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvoiceConfirm(false)} disabled={generateInvoiceMutation.isPending}>
              Annuler
            </Button>
            <Button onClick={handleGenerateInvoice} disabled={generateInvoiceMutation.isPending} data-testid="button-confirm-invoice">
              {generateInvoiceMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Confirmer et générer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
