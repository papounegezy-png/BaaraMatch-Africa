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
  Send
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SalaryRecord {
  id: string;
  candidateName: string;
  candidatePosition: string;
  companyName: string;
  period: string;
  baseSalary: number;
  bonus: number;
  deductions: number;
  netSalary: number;
  status: "paid" | "pending" | "processing" | "cancelled";
  paymentDate?: string;
  paymentMethod?: string;
}

const mockSalaries: SalaryRecord[] = [
  {
    id: "1",
    candidateName: "Sophie Marchand",
    candidatePosition: "Développeur Full Stack",
    companyName: "TechCorp Africa",
    period: "Janvier 2026",
    baseSalary: 850000,
    bonus: 50000,
    deductions: 127500,
    netSalary: 772500,
    status: "paid",
    paymentDate: "2026-01-28",
    paymentMethod: "Virement bancaire"
  },
  {
    id: "2",
    candidateName: "Amadou Diallo",
    candidatePosition: "Ingénieur DevOps",
    companyName: "FinBank Sénégal",
    period: "Janvier 2026",
    baseSalary: 720000,
    bonus: 0,
    deductions: 108000,
    netSalary: 612000,
    status: "paid",
    paymentDate: "2026-01-28",
    paymentMethod: "Virement bancaire"
  },
  {
    id: "3",
    candidateName: "Fatou Sow",
    candidatePosition: "UX Designer",
    companyName: "Orange Digital Center",
    period: "Janvier 2026",
    baseSalary: 550000,
    bonus: 25000,
    deductions: 86250,
    netSalary: 488750,
    status: "processing",
  },
  {
    id: "4",
    candidateName: "Ibrahim Koné",
    candidatePosition: "Backend Engineer",
    companyName: "Wave Mobile Money",
    period: "Janvier 2026",
    baseSalary: 780000,
    bonus: 100000,
    deductions: 132000,
    netSalary: 748000,
    status: "pending",
  },
  {
    id: "5",
    candidateName: "Marie Laurent",
    candidatePosition: "Product Manager",
    companyName: "Jumia Sénégal",
    period: "Janvier 2026",
    baseSalary: 680000,
    bonus: 0,
    deductions: 102000,
    netSalary: 578000,
    status: "pending",
  },
  {
    id: "6",
    candidateName: "Jean-Pierre Ndiaye",
    candidatePosition: "Data Analyst",
    companyName: "TechCorp Africa",
    period: "Janvier 2026",
    baseSalary: 620000,
    bonus: 30000,
    deductions: 97500,
    netSalary: 552500,
    status: "paid",
    paymentDate: "2026-01-28",
    paymentMethod: "Virement bancaire"
  },
  {
    id: "7",
    candidateName: "Aissatou Bâ",
    candidatePosition: "QA Engineer",
    companyName: "FinBank Sénégal",
    period: "Décembre 2025",
    baseSalary: 480000,
    bonus: 0,
    deductions: 72000,
    netSalary: 408000,
    status: "paid",
    paymentDate: "2025-12-28",
    paymentMethod: "Virement bancaire"
  },
];

const salaryStats = {
  totalPending: 2914750,
  pendingCount: 3,
  totalPaid: 2345000,
  paidCount: 4,
  totalThisMonth: 5259750,
  avgSalary: 656219,
};

export function SalaryManagement() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [selectedSalary, setSelectedSalary] = useState<SalaryRecord | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const getStatusBadge = (status: SalaryRecord["status"]) => {
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

  const filteredSalaries = mockSalaries.filter(salary => {
    const matchesSearch = salary.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         salary.companyName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || salary.status === statusFilter;
    const matchesPeriod = periodFilter === "all" || salary.period.includes(periodFilter);
    return matchesSearch && matchesStatus && matchesPeriod;
  });

  const handleProcessPayment = (salary: SalaryRecord) => {
    toast({
      title: "Paiement initié",
      description: `Le paiement de ${formatCurrency(salary.netSalary)} pour ${salary.candidateName} a été initié.`,
    });
  };

  const handleDownloadPayslip = (salary: SalaryRecord) => {
    toast({
      title: "Téléchargement",
      description: `Bulletin de paie de ${salary.candidateName} téléchargé.`,
    });
  };

  const handleBulkPayment = () => {
    const pendingSalaries = filteredSalaries.filter(s => s.status === "pending");
    toast({
      title: "Paiements groupés initiés",
      description: `${pendingSalaries.length} paiements ont été initiés pour un total de ${formatCurrency(pendingSalaries.reduce((sum, s) => sum + s.netSalary, 0))}.`,
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
          <Button variant="outline" data-testid="button-export-salaries">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
          <Button onClick={handleBulkPayment} data-testid="button-bulk-payment">
            <Send className="h-4 w-4 mr-2" />
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
                  <span className="text-xs text-green-600">+8% vs mois dernier</span>
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
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-green-600">+3% vs mois dernier</span>
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
                  <SelectItem value="Janvier 2026">Janvier 2026</SelectItem>
                  <SelectItem value="Décembre 2025">Décembre 2025</SelectItem>
                  <SelectItem value="Novembre 2025">Novembre 2025</SelectItem>
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
        <CardContent>
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
                            <p className="text-sm text-muted-foreground">{salary.candidatePosition}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span>{salary.companyName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{salary.period}</TableCell>
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
        </CardContent>
      </Card>

      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Détail de la Rémunération
            </DialogTitle>
            <DialogDescription>
              {selectedSalary?.period}
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
                  <p className="text-sm text-muted-foreground">{selectedSalary.candidatePosition}</p>
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
                    <span>Cotisations sociales (15%)</span>
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
                    Via {selectedSalary.paymentMethod} le {formatDate(selectedSalary.paymentDate)}
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
    </div>
  );
}
