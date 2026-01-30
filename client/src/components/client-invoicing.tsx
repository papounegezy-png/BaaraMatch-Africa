import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Receipt,
  Search,
  Filter,
  Plus,
  Download,
  Send,
  Eye,
  Pencil,
  MoreHorizontal,
  Calendar,
  Building2,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Printer,
  Mail,
  Trash2,
  User,
  Save
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientType: "company" | "agency";
  issueDate: string;
  dueDate: string;
  amount: string;
  amountHT: string;
  tva: string;
  status: "paid" | "pending" | "overdue" | "cancelled" | "draft";
  placements: number;
  paymentMethod?: string;
  paidDate?: string;
}

const mockInvoices: Invoice[] = [
  {
    id: "1",
    invoiceNumber: "RHC-2026-0044",
    clientName: "TechCorp Africa",
    clientType: "company",
    issueDate: "2026-01-15",
    dueDate: "2026-02-14",
    amount: "1,250,000 XOF",
    amountHT: "1,059,322 XOF",
    tva: "190,678 XOF",
    status: "pending",
    placements: 3,
  },
  {
    id: "2",
    invoiceNumber: "RHC-2026-0043",
    clientName: "FinBank Sénégal",
    clientType: "company",
    issueDate: "2026-01-10",
    dueDate: "2026-02-09",
    amount: "2,450,000 XOF",
    amountHT: "2,076,271 XOF",
    tva: "373,729 XOF",
    status: "paid",
    placements: 5,
    paymentMethod: "Virement bancaire",
    paidDate: "2026-01-28",
  },
  {
    id: "3",
    invoiceNumber: "RHC-2026-0042",
    clientName: "Orange Digital Center",
    clientType: "company",
    issueDate: "2026-01-05",
    dueDate: "2026-02-04",
    amount: "875,000 XOF",
    amountHT: "741,525 XOF",
    tva: "133,475 XOF",
    status: "pending",
    placements: 2,
  },
  {
    id: "4",
    invoiceNumber: "RHC-2026-0041",
    clientName: "Wave Mobile Money",
    clientType: "company",
    issueDate: "2025-12-20",
    dueDate: "2026-01-19",
    amount: "1,680,000 XOF",
    amountHT: "1,423,729 XOF",
    tva: "256,271 XOF",
    status: "overdue",
    placements: 4,
  },
  {
    id: "5",
    invoiceNumber: "RHC-2026-0040",
    clientName: "Jumia Sénégal",
    clientType: "company",
    issueDate: "2025-12-15",
    dueDate: "2026-01-14",
    amount: "520,000 XOF",
    amountHT: "440,678 XOF",
    tva: "79,322 XOF",
    status: "paid",
    placements: 1,
    paymentMethod: "Orange Money",
    paidDate: "2026-01-10",
  },
  {
    id: "6",
    invoiceNumber: "RHC-2026-0039",
    clientName: "Sonatel Group",
    clientType: "company",
    issueDate: "2025-12-10",
    dueDate: "2026-01-09",
    amount: "3,200,000 XOF",
    amountHT: "2,711,864 XOF",
    tva: "488,136 XOF",
    status: "paid",
    placements: 6,
    paymentMethod: "Virement bancaire",
    paidDate: "2026-01-05",
  },
  {
    id: "7",
    invoiceNumber: "RHC-2026-0038",
    clientName: "Eiffage Sénégal",
    clientType: "company",
    issueDate: "2025-12-05",
    dueDate: "2026-01-04",
    amount: "950,000 XOF",
    amountHT: "805,085 XOF",
    tva: "144,915 XOF",
    status: "cancelled",
    placements: 2,
  },
];

const invoiceStats = {
  totalPending: "4,605,000 XOF",
  pendingCount: 3,
  totalOverdue: "1,680,000 XOF",
  overdueCount: 1,
  totalPaidThisMonth: "6,170,000 XOF",
  paidCount: 3,
  avgPaymentTime: 12,
};

const companyInfo = {
  name: "RH Connect SARL",
  address: "123 Avenue Cheikh Anta Diop",
  city: "Dakar, Sénégal",
  phone: "+221 33 123 45 67",
  email: "contact@rhconnect.sn",
  website: "www.rhconnect.sn",
  siret: "SN-2024-RH-00456",
  tva: "SN123456789",
};

const bankInfo = {
  bankName: "BICIS Sénégal",
  accountName: "RH Connect SARL",
  iban: "SN08 SN00 0000 0000 0000 0000 4521",
  bic: "BICISNDAXXX",
  orangeMoney: "+221 77 123 45 67",
  wave: "+221 76 987 65 43",
};

interface Client {
  id: string;
  name: string;
  type: "company" | "agency";
}

interface PlacementItem {
  id: string;
  candidateName: string;
  position: string;
  monthlyRate: number;
  startDate: string;
  clientId: string;
}

const availableClients: Client[] = [
  { id: "1", name: "TechCorp Africa", type: "company" },
  { id: "2", name: "FinBank Sénégal", type: "company" },
  { id: "3", name: "Orange Digital Center", type: "company" },
  { id: "4", name: "Wave Mobile Money", type: "company" },
  { id: "5", name: "Jumia Sénégal", type: "company" },
  { id: "6", name: "Sonatel Group", type: "company" },
  { id: "7", name: "Eiffage Sénégal", type: "company" },
];

const availablePlacements: PlacementItem[] = [
  { id: "p1", candidateName: "Sophie Marchand", position: "Développeur Full Stack", monthlyRate: 850000, startDate: "2026-01-15", clientId: "1" },
  { id: "p2", candidateName: "Amadou Diallo", position: "Ingénieur DevOps", monthlyRate: 720000, startDate: "2026-01-10", clientId: "2" },
  { id: "p3", candidateName: "Fatou Sow", position: "UX Designer", monthlyRate: 550000, startDate: "2026-01-08", clientId: "3" },
  { id: "p4", candidateName: "Ibrahim Koné", position: "Backend Engineer", monthlyRate: 780000, startDate: "2025-12-01", clientId: "4" },
  { id: "p5", candidateName: "Marie Laurent", position: "Product Manager", monthlyRate: 680000, startDate: "2025-11-15", clientId: "5" },
  { id: "p6", candidateName: "Jean-Pierre Ndiaye", position: "Data Analyst", monthlyRate: 620000, startDate: "2026-01-20", clientId: "1" },
  { id: "p7", candidateName: "Aissatou Bâ", position: "QA Engineer", monthlyRate: 480000, startDate: "2026-01-18", clientId: "2" },
];

interface InvoiceLine {
  id: string;
  placementId: string;
  candidateName: string;
  position: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export function ClientInvoicing() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showInvoiceDetail, setShowInvoiceDetail] = useState(false);
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  
  const [newInvoiceClient, setNewInvoiceClient] = useState("");
  const [newInvoiceDate, setNewInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [newInvoiceDueDate, setNewInvoiceDueDate] = useState("");
  const [newInvoicePaymentTerms, setNewInvoicePaymentTerms] = useState("30");
  const [newInvoiceNotes, setNewInvoiceNotes] = useState("");
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLine[]>([]);
  const [selectedPlacement, setSelectedPlacement] = useState("");

  const getStatusBadge = (status: Invoice["status"]) => {
    const variants = {
      paid: { label: "Payée", className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800", icon: CheckCircle },
      pending: { label: "En attente", className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800", icon: Clock },
      overdue: { label: "En retard", className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800", icon: AlertCircle },
      cancelled: { label: "Annulée", className: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700", icon: XCircle },
      draft: { label: "Brouillon", className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800", icon: FileText },
    };
    return variants[status];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  const filteredInvoices = mockInvoices.filter(invoice => {
    const matchesSearch = invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         invoice.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSendReminder = (invoice: Invoice) => {
    toast({
      title: "Rappel envoyé",
      description: `Un rappel de paiement a été envoyé à ${invoice.clientName}.`,
    });
  };

  const handleDownloadPDF = (invoice: Invoice) => {
    toast({
      title: "Téléchargement",
      description: `Facture ${invoice.invoiceNumber} téléchargée.`,
    });
  };

  const handleMarkAsPaid = (invoice: Invoice) => {
    toast({
      title: "Facture mise à jour",
      description: `Facture ${invoice.invoiceNumber} marquée comme payée.`,
    });
  };

  const filteredPlacements = availablePlacements.filter(p => 
    p.clientId === newInvoiceClient && !invoiceLines.some(line => line.placementId === p.id)
  );

  const addInvoiceLine = () => {
    if (!selectedPlacement) return;
    const placement = availablePlacements.find(p => p.id === selectedPlacement);
    if (!placement) return;
    
    const newLine: InvoiceLine = {
      id: `line-${Date.now()}`,
      placementId: placement.id,
      candidateName: placement.candidateName,
      position: placement.position,
      quantity: 1,
      unitPrice: placement.monthlyRate,
      total: placement.monthlyRate,
    };
    
    setInvoiceLines([...invoiceLines, newLine]);
    setSelectedPlacement("");
  };

  const removeInvoiceLine = (lineId: string) => {
    setInvoiceLines(invoiceLines.filter(line => line.id !== lineId));
  };

  const updateLineQuantity = (lineId: string, quantity: number) => {
    setInvoiceLines(invoiceLines.map(line => 
      line.id === lineId 
        ? { ...line, quantity, total: line.unitPrice * quantity }
        : line
    ));
  };

  const calculateTotals = () => {
    const subtotal = invoiceLines.reduce((sum, line) => sum + line.total, 0);
    const tva = subtotal * 0.18;
    const total = subtotal + tva;
    return { subtotal, tva, total };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' XOF';
  };

  const resetNewInvoiceForm = () => {
    setNewInvoiceClient("");
    setNewInvoiceDate(new Date().toISOString().split('T')[0]);
    setNewInvoiceDueDate("");
    setNewInvoicePaymentTerms("30");
    setNewInvoiceNotes("");
    setInvoiceLines([]);
    setSelectedPlacement("");
  };

  const handleCreateInvoice = (asDraft: boolean = false) => {
    if (!newInvoiceClient || invoiceLines.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un client et ajouter au moins une ligne.",
        variant: "destructive",
      });
      return;
    }
    
    const client = availableClients.find(c => c.id === newInvoiceClient);
    const totals = calculateTotals();
    
    toast({
      title: asDraft ? "Brouillon enregistré" : "Facture créée",
      description: `Facture pour ${client?.name} de ${formatCurrency(totals.total)} ${asDraft ? "enregistrée comme brouillon" : "créée avec succès"}.`,
    });
    
    setShowNewInvoice(false);
    resetNewInvoiceForm();
  };

  const handleClientChange = (clientId: string) => {
    setNewInvoiceClient(clientId);
    setInvoiceLines([]);
    setSelectedPlacement("");
  };

  const handlePaymentTermsChange = (terms: string) => {
    setNewInvoicePaymentTerms(terms);
    if (newInvoiceDate && terms !== "custom") {
      const date = new Date(newInvoiceDate);
      date.setDate(date.getDate() + parseInt(terms));
      setNewInvoiceDueDate(date.toISOString().split('T')[0]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row flex-wrap justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Facturation Clients
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Gestion des factures et suivi des paiements
          </p>
        </div>
        <Button onClick={() => setShowNewInvoice(true)} data-testid="button-new-invoice">
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle facture
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-pending-invoices">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold text-amber-600">{invoiceStats.totalPending}</p>
                <p className="text-xs text-muted-foreground mt-1">{invoiceStats.pendingCount} factures</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-overdue-invoices">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">En retard</p>
                <p className="text-2xl font-bold text-red-600">{invoiceStats.totalOverdue}</p>
                <p className="text-xs text-muted-foreground mt-1">{invoiceStats.overdueCount} facture(s)</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-paid-invoices">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Payées ce mois</p>
                <p className="text-2xl font-bold text-green-600">{invoiceStats.totalPaidThisMonth}</p>
                <p className="text-xs text-muted-foreground mt-1">{invoiceStats.paidCount} factures</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-avg-payment">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Délai moyen</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{invoiceStats.avgPaymentTime} jours</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowDownRight className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-green-600">-3j vs mois dernier</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-invoices-list">
        <CardHeader>
          <div className="flex flex-col sm:flex-row flex-wrap justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Liste des Factures</CardTitle>
              <CardDescription>Toutes les factures émises</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                  data-testid="input-search-invoices"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="select-status-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="paid">Payées</SelectItem>
                  <SelectItem value="overdue">En retard</SelectItem>
                  <SelectItem value="cancelled">Annulées</SelectItem>
                  <SelectItem value="draft">Brouillons</SelectItem>
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
                  <TableHead>N° Facture</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date émission</TableHead>
                  <TableHead>Échéance</TableHead>
                  <TableHead>Montant TTC</TableHead>
                  <TableHead>Placements</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => {
                  const statusBadge = getStatusBadge(invoice.status);
                  const StatusIcon = statusBadge.icon;
                  return (
                    <TableRow key={invoice.id} data-testid={`invoice-row-${invoice.id}`}>
                      <TableCell>
                        <span className="font-mono font-medium">{invoice.invoiceNumber}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span>{invoice.clientName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(invoice.issueDate)}</TableCell>
                      <TableCell>
                        <span className={invoice.status === "overdue" ? "text-red-600 font-medium" : ""}>
                          {formatDate(invoice.dueDate)}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{invoice.amount}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{invoice.placements}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusBadge.className}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-actions-${invoice.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setSelectedInvoice(invoice); setShowInvoiceDetail(true); }}>
                              <Eye className="h-4 w-4 mr-2" />
                              Voir détails
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownloadPDF(invoice)}>
                              <Download className="h-4 w-4 mr-2" />
                              Télécharger PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Printer className="h-4 w-4 mr-2" />
                              Imprimer
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {(invoice.status === "pending" || invoice.status === "overdue") && (
                              <>
                                <DropdownMenuItem onClick={() => handleSendReminder(invoice)}>
                                  <Mail className="h-4 w-4 mr-2" />
                                  Envoyer rappel
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleMarkAsPaid(invoice)}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Marquer payée
                                </DropdownMenuItem>
                              </>
                            )}
                            {invoice.status === "draft" && (
                              <DropdownMenuItem>
                                <Send className="h-4 w-4 mr-2" />
                                Envoyer au client
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>
                              <Pencil className="h-4 w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showInvoiceDetail} onOpenChange={setShowInvoiceDetail}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Facture {selectedInvoice?.invoiceNumber}
            </DialogTitle>
            <DialogDescription>
              Détails de la facture
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Client</p>
                    <p className="font-medium">{selectedInvoice.clientName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date d'émission</p>
                    <p className="font-medium">{formatDate(selectedInvoice.issueDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date d'échéance</p>
                    <p className="font-medium">{formatDate(selectedInvoice.dueDate)}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Statut</p>
                    <Badge className={getStatusBadge(selectedInvoice.status).className}>
                      {getStatusBadge(selectedInvoice.status).label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Nombre de placements</p>
                    <p className="font-medium">{selectedInvoice.placements}</p>
                  </div>
                  {selectedInvoice.paidDate && (
                    <div>
                      <p className="text-sm text-muted-foreground">Date de paiement</p>
                      <p className="font-medium">{formatDate(selectedInvoice.paidDate)}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Montant HT</span>
                  <span>{selectedInvoice.amountHT}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">TVA (18%)</span>
                  <span>{selectedInvoice.tva}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total TTC</span>
                  <span>{selectedInvoice.amount}</span>
                </div>
              </div>

              {selectedInvoice.paymentMethod && (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Paiement reçu</span>
                  </div>
                  <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                    Via {selectedInvoice.paymentMethod} le {formatDate(selectedInvoice.paidDate!)}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvoiceDetail(false)}>
              Fermer
            </Button>
            <Button onClick={() => selectedInvoice && handleDownloadPDF(selectedInvoice)}>
              <Download className="h-4 w-4 mr-2" />
              Télécharger PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewInvoice} onOpenChange={(open) => { setShowNewInvoice(open); if (!open) resetNewInvoiceForm(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Nouvelle Facture
            </DialogTitle>
            <DialogDescription>
              Créer une nouvelle facture pour un client
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Émetteur</h4>
                <div className="space-y-1">
                  <p className="font-bold text-lg">{companyInfo.name}</p>
                  <p className="text-sm">{companyInfo.address}</p>
                  <p className="text-sm">{companyInfo.city}</p>
                  <p className="text-sm">{companyInfo.phone}</p>
                  <p className="text-sm">{companyInfo.email}</p>
                  <div className="pt-2 space-y-1">
                    <p className="text-xs text-muted-foreground">NINEA: {companyInfo.siret}</p>
                    <p className="text-xs text-muted-foreground">N° TVA: {companyInfo.tva}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client">Client destinataire *</Label>
                  <Select value={newInvoiceClient} onValueChange={handleClientChange}>
                    <SelectTrigger id="client" data-testid="select-invoice-client">
                      <Building2 className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Sélectionner un client" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableClients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {newInvoiceClient && (
                  <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 text-sm">
                    <p className="font-medium">{availableClients.find(c => c.id === newInvoiceClient)?.name}</p>
                    <p className="text-muted-foreground">Dakar, Sénégal</p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="issueDate">Date d'émission</Label>
                <Input 
                  id="issueDate"
                  type="date"
                  value={newInvoiceDate}
                  onChange={(e) => setNewInvoiceDate(e.target.value)}
                  data-testid="input-invoice-date"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="paymentTerms">Délai de paiement</Label>
                <Select value={newInvoicePaymentTerms} onValueChange={handlePaymentTermsChange}>
                  <SelectTrigger id="paymentTerms" data-testid="select-payment-terms">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Paiement immédiat</SelectItem>
                    <SelectItem value="15">15 jours</SelectItem>
                    <SelectItem value="30">30 jours</SelectItem>
                    <SelectItem value="45">45 jours</SelectItem>
                    <SelectItem value="60">60 jours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dueDate">Date d'échéance</Label>
                <Input 
                  id="dueDate"
                  type="date"
                  value={newInvoiceDueDate}
                  onChange={(e) => setNewInvoiceDueDate(e.target.value)}
                  data-testid="input-due-date"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Lignes de facturation</h4>
                {newInvoiceClient && (
                  <div className="flex items-center gap-2">
                    <Select value={selectedPlacement} onValueChange={setSelectedPlacement}>
                      <SelectTrigger className="w-64" data-testid="select-placement">
                        <User className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Ajouter un placement" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredPlacements.length === 0 ? (
                          <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                            Aucun placement disponible
                          </div>
                        ) : (
                          filteredPlacements.map(placement => (
                            <SelectItem key={placement.id} value={placement.id}>
                              {placement.candidateName} - {placement.position}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="outline" 
                      onClick={addInvoiceLine}
                      disabled={!selectedPlacement}
                      data-testid="button-add-line"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {!newInvoiceClient && (
                <div className="border border-dashed rounded-lg p-8 text-center text-muted-foreground">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Sélectionnez d'abord un client pour voir les placements disponibles</p>
                </div>
              )}

              {newInvoiceClient && invoiceLines.length === 0 && (
                <div className="border border-dashed rounded-lg p-8 text-center text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Ajoutez des placements à facturer</p>
                </div>
              )}

              {invoiceLines.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Candidat / Prestation</TableHead>
                        <TableHead className="w-24">Quantité</TableHead>
                        <TableHead className="text-right">Prix unitaire</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoiceLines.map(line => (
                        <TableRow key={line.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{line.candidateName}</p>
                              <p className="text-sm text-muted-foreground">{line.position}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number"
                              min="1"
                              value={line.quantity}
                              onChange={(e) => updateLineQuantity(line.id, parseInt(e.target.value) || 1)}
                              className="w-20"
                              data-testid={`input-quantity-${line.id}`}
                            />
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(line.unitPrice)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(line.total)}</TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => removeInvoiceLine(line.id)}
                              className="text-destructive"
                              data-testid={`button-remove-line-${line.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {invoiceLines.length > 0 && (
                <div className="flex justify-end">
                  <div className="w-72 space-y-2 border rounded-lg p-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Sous-total HT</span>
                      <span>{formatCurrency(calculateTotals().subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">TVA (18%)</span>
                      <span>{formatCurrency(calculateTotals().tva)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total TTC</span>
                      <span>{formatCurrency(calculateTotals().total)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Informations de Paiement
              </h4>
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  Coordonnées Bancaires
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Banque</span>
                      <span className="font-medium">{bankInfo.bankName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Titulaire</span>
                      <span className="font-medium">{bankInfo.accountName}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">IBAN</span>
                      <span className="font-mono text-xs">{bankInfo.iban}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">BIC/SWIFT</span>
                      <span className="font-mono">{bankInfo.bic}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes / Conditions particulières</Label>
              <Textarea 
                id="notes"
                placeholder="Conditions de paiement, remarques..."
                value={newInvoiceNotes}
                onChange={(e) => setNewInvoiceNotes(e.target.value)}
                rows={3}
                data-testid="textarea-notes"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowNewInvoice(false); resetNewInvoiceForm(); }}>
              Annuler
            </Button>
            <Button variant="outline" onClick={() => handleCreateInvoice(true)} data-testid="button-save-draft">
              <Save className="h-4 w-4 mr-2" />
              Enregistrer brouillon
            </Button>
            <Button onClick={() => handleCreateInvoice(false)} data-testid="button-create-invoice">
              <Send className="h-4 w-4 mr-2" />
              Créer et envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
