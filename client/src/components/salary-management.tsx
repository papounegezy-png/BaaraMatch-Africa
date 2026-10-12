import { useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Wallet,
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
  FileText,
  CreditCard,
  TrendingUp,
  Send,
  Plus,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Shapes returned by the real backend (see server/routes.ts).
// These are intentionally declared locally rather than imported from
// @shared/schema because the API enriches/joins the raw DB rows
// (e.g. candidateName/companyName are joined in on placements; salary
// payments are returned as-is).
type SalaryPaymentStatus = "pending" | "processing" | "paid" | "cancelled";

interface SalaryPaymentApi {
  id: string;
  agencyId: string;
  placementId: string;
  period: string;
  baseSalary: number;
  bonus: number | null;
  deductions: number | null;
  netSalary: number;
  status: SalaryPaymentStatus;
  paymentDate: string | null;
  paymentMethod: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AgencyPlacementApi {
  id: string;
  candidateId: string;
  candidateName: string;
  companyId: string | null;
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

interface PaymentMethodApi {
  id: string;
  agencyId: string;
  name: string;
  type: "bank" | "mobile";
  accountInfo: string;
  isDefault: boolean | null;
  isActive: boolean | null;
  createdAt: string;
  updatedAt: string;
}

// Display row: a salary payment joined with the candidate/company info
// from its placement. There is no real "job position" field on a
// placement in the schema, so we reuse the placement's contractType
// (e.g. "CDI", "CDD") as the secondary line under the candidate name
// instead of inventing a position that doesn't exist server-side.
interface SalaryRecord extends Omit<SalaryPaymentApi, "bonus" | "deductions"> {
  bonus: number;
  deductions: number;
  candidateName: string;
  companyName: string;
  contractType: string | null;
}

const emptyCreateForm = {
  placementId: "",
  period: "",
  baseSalary: "",
  bonus: "",
  deductions: "",
};

// Periods are stored as "AAAA-MM" (sortable, one salary per placement and
// month); older free-text values are shown as they are.
const currentPeriod = () => new Date().toISOString().slice(0, 7);
function formatPeriod(period: string) {
  const match = period.match(/^(\d{4})-(\d{2})$/);
  if (!match) return period;
  const label = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date(Number(match[1]), Number(match[2]) - 1, 1));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function SalaryManagement() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [selectedSalary, setSelectedSalary] = useState<SalaryRecord | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState(() => ({ ...emptyCreateForm, period: currentPeriod() }));

  const [showPayDialog, setShowPayDialog] = useState(false);
  const [salaryToPay, setSalaryToPay] = useState<SalaryRecord | null>(null);
  const [payPaymentMethod, setPayPaymentMethod] = useState("");

  const { data: payments = [], isLoading: isLoadingPayments } = useQuery<SalaryPaymentApi[]>({
    queryKey: ["/api/agency/salary-payments"],
  });

  const { data: placements = [], isLoading: isLoadingPlacements } = useQuery<AgencyPlacementApi[]>({
    queryKey: ["/api/agency/placements"],
  });

  const { data: paymentMethods = [] } = useQuery<PaymentMethodApi[]>({
    queryKey: ["/api/agency/payment-methods"],
  });

  const isLoading = isLoadingPayments || isLoadingPlacements;

  const placementsById = useMemo(() => {
    const map = new Map<string, AgencyPlacementApi>();
    placements.forEach((p) => map.set(p.id, p));
    return map;
  }, [placements]);

  const salaries: SalaryRecord[] = useMemo(() => {
    return payments.map((payment) => {
      const placement = placementsById.get(payment.placementId);
      return {
        ...payment,
        bonus: payment.bonus ?? 0,
        deductions: payment.deductions ?? 0,
        candidateName: placement?.candidateName ?? "Candidat inconnu",
        companyName: placement?.companyName ?? "Entreprise inconnue",
        contractType: placement?.contractType ?? null,
      };
    });
  }, [payments, placementsById]);

  const activePlacements = useMemo(
    () => placements.filter((p) => p.status === "active"),
    [placements]
  );

  const defaultPaymentMethodName = useMemo(() => {
    const active = paymentMethods.filter((m) => m.isActive !== false);
    return active.find((m) => m.isDefault)?.name ?? active[0]?.name ?? "";
  }, [paymentMethods]);

  const uniquePeriods = useMemo(
    () => Array.from(new Set(salaries.map((s) => s.period))).sort().reverse(),
    [salaries]
  );

  const isSameMonth = (dateString: string | null) => {
    if (!dateString) return false;
    const d = new Date(dateString);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  };

  const salaryStats = useMemo(() => {
    const pending = salaries.filter((s) => s.status === "pending");
    const paidThisMonth = salaries.filter((s) => s.status === "paid" && isSameMonth(s.paymentDate));
    const totalPending = pending.reduce((sum, s) => sum + s.netSalary, 0);
    const totalPaid = paidThisMonth.reduce((sum, s) => sum + s.netSalary, 0);
    const nonCancelled = salaries.filter((s) => s.status !== "cancelled");
    const avgSalary = nonCancelled.length > 0
      ? Math.round(nonCancelled.reduce((sum, s) => sum + s.netSalary, 0) / nonCancelled.length)
      : 0;
    return {
      totalPending,
      pendingCount: pending.length,
      totalPaid,
      paidCount: paidThisMonth.length,
      totalThisMonth: totalPending + totalPaid,
      avgSalary,
    };
  }, [salaries]);

  const getStatusBadge = (status: SalaryPaymentStatus) => {
    const variants = {
      paid: { label: "Payé", className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800", icon: CheckCircle },
      pending: { label: "En attente", className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800", icon: Clock },
      processing: { label: "En cours", className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800", icon: CreditCard },
      cancelled: { label: "Annulé", className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800", icon: AlertCircle },
    };
    return variants[status];
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

  const filteredSalaries = salaries.filter(salary => {
    const matchesSearch = salary.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         salary.companyName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || salary.status === statusFilter;
    const matchesPeriod = periodFilter === "all" || salary.period === periodFilter;
    return matchesSearch && matchesStatus && matchesPeriod;
  });

  // ---- Mutations ----

  const createPaymentMutation = useMutation({
    mutationFn: async (data: { placementId: string; period: string; baseSalary: number; bonus: number; deductions: number }) => {
      const res = await apiRequest('POST', '/api/agency/salary-payments', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agency/salary-payments"] });
      toast({
        title: "Paiement créé",
        description: "Le paiement de salaire a été créé avec succès.",
      });
      setCreateForm({ ...emptyCreateForm, period: currentPeriod() });
      setShowCreateDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le paiement de salaire.",
        variant: "destructive",
      });
    },
  });

  const processPaymentMutation = useMutation({
    mutationFn: async ({ id, paymentMethod }: { id: string; paymentMethod: string }) => {
      const res = await apiRequest('PATCH', `/api/agency/salary-payments/${id}`, {
        status: "paid",
        paymentDate: new Date().toISOString(),
        paymentMethod: paymentMethod || null,
      });
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/agency/salary-payments"] });
      toast({
        title: "Paiement effectué",
        description: "Le paiement a été marqué comme payé.",
      });
      setShowPayDialog(false);
      setSalaryToPay(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de traiter ce paiement.",
        variant: "destructive",
      });
    },
  });

  const bulkPaymentMutation = useMutation({
    mutationFn: async ({ ids, paymentMethod }: { ids: string[]; paymentMethod: string }) => {
      const paymentDate = new Date().toISOString();
      await Promise.all(
        ids.map((id) =>
          apiRequest('PATCH', `/api/agency/salary-payments/${id}`, {
            status: "paid",
            paymentDate,
            paymentMethod: paymentMethod || null,
          })
        )
      );
      return ids;
    },
    onSuccess: (ids) => {
      queryClient.invalidateQueries({ queryKey: ["/api/agency/salary-payments"] });
      toast({
        title: "Paiements groupés effectués",
        description: `${ids.length} paiement(s) ont été effectués.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Certains paiements n'ont pas pu être effectués.",
        variant: "destructive",
      });
    },
  });

  // ---- Handlers ----

  const handleProcessPayment = (salary: SalaryRecord) => {
    setSalaryToPay(salary);
    setPayPaymentMethod(defaultPaymentMethodName);
    setShowPayDialog(true);
  };

  const handleConfirmPayment = () => {
    if (!salaryToPay) return;
    processPaymentMutation.mutate({ id: salaryToPay.id, paymentMethod: payPaymentMethod });
  };

  const handleDownloadPayslip = (salary: SalaryRecord) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("BULLETIN DE PAIE", pageWidth / 2, 25, { align: "center" });

    y = 55;

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`Période: ${formatPeriod(salary.period)}`, pageWidth - 15, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(`Statut: ${getStatusBadge(salary.status).label}`, pageWidth - 15, y + 7, { align: "right" });

    y = 80;

    doc.setDrawColor(200, 200, 200);
    doc.line(15, y, pageWidth - 15, y);
    y += 15;

    doc.setFillColor(249, 250, 251);
    doc.roundedRect(15, y - 5, pageWidth - 30, 35, 3, 3, 'F');
    doc.setTextColor(59, 130, 246);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("CANDIDAT", 20, y + 5);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text(`Nom: ${salary.candidateName}`, 20, y + 15);
    doc.setFont("helvetica", "normal");
    doc.text(`Entreprise cliente: ${salary.companyName}`, 20, y + 23);

    y += 50;

    doc.setFillColor(239, 246, 255);
    doc.roundedRect(15, y - 5, pageWidth - 30, 65, 3, 3, 'F');
    doc.setTextColor(59, 130, 246);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("DETAIL DE LA REMUNERATION", 20, y + 5);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Salaire de base:", 20, y + 18);
    doc.text(formatCurrency(salary.baseSalary), pageWidth - 20, y + 18, { align: "right" });

    doc.text("Primes et bonus:", 20, y + 28);
    doc.text(formatCurrency(salary.bonus), pageWidth - 20, y + 28, { align: "right" });

    doc.text("Déductions:", 20, y + 38);
    doc.text(`-${formatCurrency(salary.deductions)}`, pageWidth - 20, y + 38, { align: "right" });

    doc.setDrawColor(59, 130, 246);
    doc.line(20, y + 45, pageWidth - 20, y + 45);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(34, 197, 94);
    doc.text("NET A PAYER:", 20, y + 58);
    doc.text(formatCurrency(salary.netSalary), pageWidth - 20, y + 58, { align: "right" });

    y += 80;

    if (salary.paymentDate) {
      doc.setFillColor(220, 252, 231);
      doc.roundedRect(15, y - 5, pageWidth - 30, 25, 3, 3, 'F');
      doc.setTextColor(22, 163, 74);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("PAIEMENT EFFECTUE", 20, y + 7);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Le ${formatDate(salary.paymentDate)}${salary.paymentMethod ? ` via ${salary.paymentMethod}` : ""}`,
        20,
        y + 15
      );
    }

    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Document généré le ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, footerY, { align: "center" });

    doc.save(`bulletin_paie_${salary.period.replace(/\s+/g, '_')}_${salary.candidateName.replace(/\s+/g, '_')}.pdf`);

    toast({
      title: "Bulletin téléchargé",
      description: `Bulletin de paie de ${salary.candidateName} téléchargé.`,
    });
  };

  const handleBulkPayment = () => {
    const pendingSalaries = filteredSalaries.filter(s => s.status === "pending");
    if (pendingSalaries.length === 0) {
      toast({
        title: "Aucun paiement en attente",
        description: "Il n'y a aucun paiement à traiter pour le moment.",
      });
      return;
    }
    bulkPaymentMutation.mutate({
      ids: pendingSalaries.map((s) => s.id),
      paymentMethod: defaultPaymentMethodName,
    });
  };

  const handlePlacementChange = (placementId: string) => {
    const placement = placementsById.get(placementId);
    setCreateForm((prev) => ({
      ...prev,
      placementId,
      baseSalary: placement?.salary != null ? String(placement.salary) : prev.baseSalary,
    }));
  };

  const handleCreateSubmit = () => {
    const baseSalary = Number(createForm.baseSalary);
    if (!createForm.placementId) {
      toast({ title: "Placement requis", description: "Veuillez sélectionner un placement.", variant: "destructive" });
      return;
    }
    if (!createForm.period.trim()) {
      toast({ title: "Période requise", description: "Veuillez indiquer une période.", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(baseSalary) || baseSalary < 0) {
      toast({ title: "Salaire invalide", description: "Le salaire de base doit être un nombre positif.", variant: "destructive" });
      return;
    }
    createPaymentMutation.mutate({
      placementId: createForm.placementId,
      period: createForm.period.trim(),
      baseSalary,
      bonus: createForm.bonus ? Math.max(0, Number(createForm.bonus)) : 0,
      deductions: createForm.deductions ? Math.max(0, Number(createForm.deductions)) : 0,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row flex-wrap justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Rémunérations
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Gestion des salaires et bulletins de paie des candidats placés
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => { setCreateForm({ ...emptyCreateForm, period: currentPeriod() }); setShowCreateDialog(true); }}
            data-testid="button-new-payment"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouveau paiement
          </Button>
          <Button
            onClick={handleBulkPayment}
            disabled={bulkPaymentMutation.isPending}
            data-testid="button-bulk-payment"
          >
            {bulkPaymentMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Payer tout
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-pending-salaries">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold text-amber-600">{formatCurrency(salaryStats.totalPending)}</p>
                <p className="text-xs text-muted-foreground mt-1">{salaryStats.pendingCount} salaires</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-paid-salaries">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Payés ce mois</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(salaryStats.totalPaid)}</p>
                <p className="text-xs text-muted-foreground mt-1">{salaryStats.paidCount} salaires</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-total-salaries">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total du mois</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(salaryStats.totalThisMonth)}</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-muted-foreground">En attente + payés ce mois</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-avg-salary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Salaire moyen</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(salaryStats.avgSalary)}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Net moyen (hors annulés)</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-salaries-list">
        <CardHeader>
          <div className="flex flex-col sm:flex-row flex-wrap justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Liste des Rémunérations</CardTitle>
              <CardDescription>Salaires des candidats placés</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-48"
                  data-testid="input-search-salaries"
                />
              </div>
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger className="w-40" data-testid="select-period-filter">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Période" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  {uniquePeriods.map((period) => (
                    <SelectItem key={period} value={period}>{formatPeriod(period)}</SelectItem>
                  ))}
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
                  <SelectItem value="processing">En cours</SelectItem>
                  <SelectItem value="paid">Payés</SelectItem>
                  <SelectItem value="cancelled">Annulés</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className={isLoading || filteredSalaries.length === 0 ? undefined : "p-0"}>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredSalaries.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium">Aucun paiement</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                {payments.length === 0
                  ? "Aucun paiement de salaire n'a encore été créé. Cliquez sur \"Nouveau paiement\" pour en créer un."
                  : "Aucun paiement ne correspond à votre recherche ou vos filtres."}
              </p>
            </div>
          ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidat</TableHead>
                  <TableHead>Entreprise</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead className="text-right">Brut</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSalaries.map((salary) => {
                  const statusBadge = getStatusBadge(salary.status);
                  const StatusIcon = statusBadge.icon;
                  return (
                    <TableRow key={salary.id} data-testid={`salary-row-${salary.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{salary.candidateName}</p>
                            {salary.contractType && (
                              <p className="text-sm text-muted-foreground">{salary.contractType}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span>{salary.companyName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatPeriod(salary.period)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(salary.baseSalary + salary.bonus)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(salary.netSalary)}</TableCell>
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
                            onClick={() => { setSelectedSalary(salary); setShowDetail(true); }}
                            data-testid={`button-view-${salary.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownloadPayslip(salary)}
                            data-testid={`button-download-${salary.id}`}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          {salary.status === "pending" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleProcessPayment(salary)}
                              data-testid={`button-pay-${salary.id}`}
                            >
                              Payer
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

      {/* Detail dialog (read-only) */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Détail de la Rémunération
            </DialogTitle>
            <DialogDescription>
              {selectedSalary ? formatPeriod(selectedSalary.period) : ""}
            </DialogDescription>
          </DialogHeader>
          {selectedSalary && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg">{selectedSalary.candidateName}</p>
                  {selectedSalary.contractType && (
                    <p className="text-sm text-muted-foreground">{selectedSalary.contractType}</p>
                  )}
                  <p className="text-sm text-muted-foreground">{selectedSalary.companyName}</p>
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Salaire de base</span>
                  <span>{formatCurrency(selectedSalary.baseSalary)}</span>
                </div>
                {selectedSalary.bonus > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Primes et bonus</span>
                    <span>+{formatCurrency(selectedSalary.bonus)}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium">
                  <span>Salaire brut</span>
                  <span>{formatCurrency(selectedSalary.baseSalary + selectedSalary.bonus)}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between text-red-600">
                    <span>Déductions</span>
                    <span>-{formatCurrency(selectedSalary.deductions)}</span>
                  </div>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Net à payer</span>
                    <span>{formatCurrency(selectedSalary.netSalary)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Statut</span>
                <Badge className={getStatusBadge(selectedSalary.status).className}>
                  {getStatusBadge(selectedSalary.status).label}
                </Badge>
              </div>

              {selectedSalary.paymentDate && (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Paiement effectué</span>
                  </div>
                  <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                    {selectedSalary.paymentMethod ? `Via ${selectedSalary.paymentMethod} ` : ""}
                    le {formatDate(selectedSalary.paymentDate)}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetail(false)}>
              Fermer
            </Button>
            <Button onClick={() => selectedSalary && handleDownloadPayslip(selectedSalary)}>
              <Download className="h-4 w-4 mr-2" />
              Bulletin de paie
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create payment dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Nouveau paiement de salaire
            </DialogTitle>
            <DialogDescription>
              Créez un paiement de salaire pour un placement actif.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-placement">Placement</Label>
              <Select value={createForm.placementId} onValueChange={handlePlacementChange}>
                <SelectTrigger id="create-placement" data-testid="select-create-placement">
                  <SelectValue placeholder="Sélectionner un placement actif" />
                </SelectTrigger>
                <SelectContent>
                  {activePlacements.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      Aucun placement actif disponible
                    </div>
                  ) : (
                    activePlacements.map((placement) => (
                      <SelectItem key={placement.id} value={placement.id}>
                        {placement.candidateName} — {placement.companyName}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-period">Période</Label>
              <Input
                id="create-period"
                type="month"
                value={createForm.period}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, period: e.target.value }))}
                data-testid="input-create-period"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="create-base-salary">Salaire de base</Label>
                <Input
                  id="create-base-salary"
                  type="number"
                  min={0}
                  value={createForm.baseSalary}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, baseSalary: e.target.value }))}
                  data-testid="input-create-base-salary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-bonus">Bonus</Label>
                <Input
                  id="create-bonus"
                  type="number"
                  min={0}
                  value={createForm.bonus}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, bonus: e.target.value }))}
                  data-testid="input-create-bonus"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-deductions">Déductions</Label>
                <Input
                  id="create-deductions"
                  type="number"
                  min={0}
                  value={createForm.deductions}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, deductions: e.target.value }))}
                  data-testid="input-create-deductions"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleCreateSubmit}
              disabled={createPaymentMutation.isPending}
              data-testid="button-submit-create-payment"
            >
              {createPaymentMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Créer le paiement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm payment dialog */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Confirmer le paiement
            </DialogTitle>
            <DialogDescription>
              {salaryToPay && `${salaryToPay.candidateName} — ${formatCurrency(salaryToPay.netSalary)}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="pay-method">Moyen de paiement</Label>
            {paymentMethods.length > 0 ? (
              <Select value={payPaymentMethod} onValueChange={setPayPaymentMethod}>
                <SelectTrigger id="pay-method" data-testid="select-pay-method">
                  <SelectValue placeholder="Sélectionner un moyen de paiement" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.filter((m) => m.isActive !== false).map((method) => (
                    <SelectItem key={method.id} value={method.name}>
                      {method.name}{method.isDefault ? " (par défaut)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="pay-method"
                placeholder="Ex: Virement bancaire"
                value={payPaymentMethod}
                onChange={(e) => setPayPaymentMethod(e.target.value)}
                data-testid="input-pay-method"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleConfirmPayment}
              disabled={processPaymentMutation.isPending}
              data-testid="button-confirm-payment"
            >
              {processPaymentMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmer le paiement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
