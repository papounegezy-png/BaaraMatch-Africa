import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { jsPDF } from "jspdf";
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
  MoreHorizontal,
  Calendar,
  Building2,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Mail,
  Trash2,
  User as UserIcon,
  Save,
  Loader2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { LoadingState } from "@/components/loading-state";
import { useClients } from "@/components/agency-crm/shared";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User, AgencyProfile, CompanyProfile } from "@shared/schema";

type InvoiceStatus = "draft" | "pending" | "paid" | "overdue" | "cancelled";

interface Invoice {
  id: string;
  agencyId: string;
  invoiceNumber: string;
  clientId: string | null;
  agencyClientId: string | null;
  clientType: "company" | "agency";
  // Resolved server-side from the agency's fiche (or the registered account
  // for older invoices) — the client may not be on BaaraMatch.
  clientName: string;
  clientAddress: string | null;
  clientCity: string | null;
  clientRegistrationNumber: string | null;
  clientEmail: string | null;
  sentAt: string | null;
  sentTo: string | null;
  lastReminderAt: string | null;
  reminderCount: number;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  status: InvoiceStatus;
  paymentMethod: string | null;
  paidDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface InvoiceLineItemRecord {
  id: string;
  invoiceId: string;
  placementId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoiceDetail extends Invoice {
  lineItems: InvoiceLineItemRecord[];
}

interface FinancialSettings {
  id: string;
  agencyId: string;
  currency: string | null;
  invoicePrefix: string | null;
  invoiceNextNumber: number | null;
  defaultPaymentTerms: number | null;
  vatRate: number | null;
  autoInvoice: boolean | null;
  reminderEnabled: boolean | null;
  reminderDays: number | null;
  bankName: string | null;
  accountName: string | null;
  iban: string | null;
  bic: string | null;
  updatedAt: string | null;
}

interface ProfileResponse {
  user: Omit<User, "password">;
  profile: AgencyProfile | null;
}


interface AgencyPlacementForInvoicing {
  id: string;
  candidateId: string;
  candidateName: string;
  companyId: string | null;
  agencyClientId: string | null;
  companyName: string;
  contractType: string;
  status: string;
  salary: number;
  salaryCurrency: string;
  commissionRate: number;
  commissionAmount: number;
  startDate: string;
  endDate: string | null;
  invoiceNumber: string | null;
  invoiceStatus: string | null;
}

interface InvoiceLine {
  id: string;
  placementId: string | null;
  description: string;
  subtitle?: string;
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
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null);

  const [showMarkPaidDialog, setShowMarkPaidDialog] = useState(false);
  const [invoiceToMarkPaid, setInvoiceToMarkPaid] = useState<Invoice | null>(null);
  const [markPaidMethod, setMarkPaidMethod] = useState("Virement bancaire");
  const [markPaidDate, setMarkPaidDate] = useState(new Date().toISOString().split('T')[0]);

  const [newInvoiceClient, setNewInvoiceClient] = useState("");
  const [newInvoiceDate, setNewInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [newInvoiceDueDate, setNewInvoiceDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [newInvoicePaymentTerms, setNewInvoicePaymentTerms] = useState("30");
  const [newInvoiceNotes, setNewInvoiceNotes] = useState("");
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLine[]>([]);
  const [selectedPlacement, setSelectedPlacement] = useState("");

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/agency/invoices"],
  });

  const { data: placements = [] } = useQuery<AgencyPlacementForInvoicing[]>({
    queryKey: ["/api/agency/placements"],
  });

  // Clients = the agency's own fiches (registered on BaaraMatch or not) —
  // never the platform-wide company directory.
  const { data: clients = [] } = useClients();

  const { data: financialSettings } = useQuery<FinancialSettings>({
    queryKey: ["/api/agency/financial-settings"],
  });

  const { data: profileData } = useQuery<ProfileResponse>({
    queryKey: ["/api/profile"],
  });

  const { data: selectedInvoiceDetail, isLoading: isLoadingInvoiceDetail } = useQuery<InvoiceDetail>({
    queryKey: ["/api/agency/invoices", selectedInvoice?.id],
    enabled: showInvoiceDetail && !!selectedInvoice?.id,
  });

  const getStatusBadge = (status: InvoiceStatus) => {
    const variants = {
      paid: { label: "Payée", className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800", icon: CheckCircle },
      pending: { label: "En attente", className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800", icon: Clock },
      overdue: { label: "En retard", className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800", icon: AlertCircle },
      cancelled: { label: "Annulée", className: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700", icon: XCircle },
      draft: { label: "Brouillon", className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800", icon: FileText },
    };
    return variants[status];
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  const formatCurrency = (amount: number, currency?: string | null) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' ' + (currency || financialSettings?.currency || 'XOF');
  };

  const getClientDisplayName = (invoice: Pick<Invoice, "clientName">) => invoice.clientName || "Client";

  const filteredInvoices = invoices.filter(invoice => {
    const clientName = getClientDisplayName(invoice).toLowerCase();
    const matchesSearch = invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         clientName.includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const invoiceStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const pending = invoices.filter(i => i.status === "pending");
    const overdue = invoices.filter(i => i.status === "overdue");
    const paidThisMonth = invoices.filter(i => {
      if (i.status !== "paid" || !i.paidDate) return false;
      const paidDate = new Date(i.paidDate);
      return paidDate.getMonth() === currentMonth && paidDate.getFullYear() === currentYear;
    });
    const paidWithDates = invoices.filter(i => i.status === "paid" && i.paidDate);
    const avgPaymentTime = paidWithDates.length > 0
      ? Math.round(
          paidWithDates.reduce((sum, i) => {
            const days = (new Date(i.paidDate as string).getTime() - new Date(i.issueDate).getTime()) / (1000 * 60 * 60 * 24);
            return sum + days;
          }, 0) / paidWithDates.length
        )
      : 0;

    return {
      totalPending: pending.reduce((sum, i) => sum + i.totalAmount, 0),
      pendingCount: pending.length,
      totalOverdue: overdue.reduce((sum, i) => sum + i.totalAmount, 0),
      overdueCount: overdue.length,
      totalPaidThisMonth: paidThisMonth.reduce((sum, i) => sum + i.totalAmount, 0),
      paidCount: paidThisMonth.length,
      avgPaymentTime,
      hasPaidData: paidWithDates.length > 0,
    };
  }, [invoices]);

  const createInvoiceMutation = useMutation({
    mutationFn: async (payload: {
      agencyClientId: string;
      issueDate: string;
      dueDate: string;
      notes: string | null;
      status: "draft" | "pending";
      lineItems: { placementId: string | null; description: string; quantity: number; unitPrice: number }[];
    }) => {
      const res = await apiRequest("POST", "/api/agency/invoices", payload);
      return res.json() as Promise<Invoice>;
    },
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ["/api/agency/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agency/placements"] });
      toast({
        title: invoice.status === "draft" ? "Brouillon enregistré" : "Facture créée",
        description: `Facture ${invoice.invoiceNumber} ${invoice.status === "draft" ? "enregistrée comme brouillon" : "créée avec succès"}.`,
      });
      setShowNewInvoice(false);
      resetNewInvoiceForm();
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la facture.",
        variant: "destructive",
      });
    },
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async ({ id, paymentMethod, paidDate }: { id: string; paymentMethod: string; paidDate: string }) => {
      const res = await apiRequest("PATCH", `/api/agency/invoices/${id}`, {
        status: "paid",
        paymentMethod,
        paidDate,
      });
      return res.json() as Promise<Invoice>;
    },
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ["/api/agency/invoices"] });
      toast({
        title: "Facture mise à jour",
        description: `Facture ${invoice.invoiceNumber} marquée comme payée.`,
      });
      setShowMarkPaidDialog(false);
      setInvoiceToMarkPaid(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de marquer la facture comme payée.",
        variant: "destructive",
      });
    },
  });

  const updateInvoiceStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "pending" | "cancelled" }) => {
      const res = await apiRequest("PATCH", `/api/agency/invoices/${id}`, { status });
      return res.json() as Promise<Invoice>;
    },
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ["/api/agency/invoices"] });
      toast({
        title: invoice.status === "cancelled" ? "Facture annulée" : "Facture envoyée",
        description: invoice.status === "cancelled"
          ? `Facture ${invoice.invoiceNumber} a été annulée.`
          : `Facture ${invoice.invoiceNumber} a été envoyée au client.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour la facture.",
        variant: "destructive",
      });
    },
  });

  const [sendState, setSendState] = useState<{ invoice: Invoice; kind: "send" | "reminder" } | null>(null);
  const [sendTo, setSendTo] = useState("");
  const [sendMessage, setSendMessage] = useState("");

  const openSend = (invoice: Invoice, kind: "send" | "reminder") => {
    setSendState({ invoice, kind });
    setSendTo(invoice.clientEmail ?? "");
    setSendMessage("");
  };
  const handleSendReminder = (invoice: Invoice) => openSend(invoice, "reminder");

  const sendInvoiceMutation = useMutation({
    mutationFn: async () => {
      const { invoice, kind } = sendState!;
      // The attachment is the very same PDF as "Télécharger PDF".
      const detail = (await (await apiRequest("GET", `/api/agency/invoices/${invoice.id}`)).json()) as InvoiceDetail;
      const pdfBase64 = generateInvoicePdf(detail, "base64");
      const res = await apiRequest("POST", `/api/agency/invoices/${invoice.id}/send`, {
        kind,
        to: sendTo.trim() || undefined,
        message: sendMessage.trim() || undefined,
        pdfBase64,
      });
      return res.json() as Promise<{ sentTo: string }>;
    },
    onSuccess: ({ sentTo }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/agency/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agency/payment-statement"] });
      toast({
        title: sendState!.kind === "reminder" ? "Rappel envoyé" : "Facture envoyée",
        description: `Facture ${sendState!.invoice.invoiceNumber} envoyée à ${sentTo} avec le PDF en pièce jointe.`,
      });
      setSendState(null);
    },
    onError: (error: Error) => toast({ title: "Envoi impossible", description: error.message, variant: "destructive" }),
  });

  const handleDownloadPDF = async (invoice: Invoice) => {
    setDownloadingInvoiceId(invoice.id);
    try {
      let detail: InvoiceDetail;
      if (selectedInvoiceDetail && selectedInvoiceDetail.id === invoice.id) {
        detail = selectedInvoiceDetail;
      } else {
        const res = await apiRequest("GET", `/api/agency/invoices/${invoice.id}`);
        detail = await res.json();
      }
      generateInvoicePdf(detail);
      toast({
        title: "PDF téléchargé",
        description: `Facture ${invoice.invoiceNumber} téléchargée.`,
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de générer le PDF de la facture.",
        variant: "destructive",
      });
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  function generateInvoicePdf(invoice: InvoiceDetail, output: "save" | "base64" = "save"): string | undefined {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    const agencyName = profileData?.profile?.agencyName || profileData?.user?.fullName || "Agence";
    const issuerLines = [
      profileData?.user?.email,
      profileData?.user?.phone,
      [profileData?.user?.city, profileData?.user?.country].filter(Boolean).join(", ") || undefined,
      profileData?.profile?.website,
    ].filter((line): line is string => Boolean(line));

    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("FACTURE", pageWidth / 2, 25, { align: "center" });

    y = 55;
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(agencyName, 15, y);
    doc.setFont("helvetica", "normal");
    issuerLines.forEach((line, idx) => doc.text(line, 15, y + 5 + idx * 5));

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text(`N° Facture: ${invoice.invoiceNumber}`, pageWidth - 15, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(`Date d'émission: ${formatDate(invoice.issueDate)}`, pageWidth - 15, y + 7, { align: "right" });
    doc.text(`Échéance: ${formatDate(invoice.dueDate)}`, pageWidth - 15, y + 14, { align: "right" });
    doc.text(`Statut: ${getStatusBadge(invoice.status).label}`, pageWidth - 15, y + 21, { align: "right" });

    y = 95;
    doc.setDrawColor(200, 200, 200);
    doc.line(15, y, pageWidth - 15, y);
    y += 12;

    const clientName = getClientDisplayName(invoice);
    const clientDetailLines = [
      invoice.clientAddress,
      invoice.clientCity,
      invoice.clientRegistrationNumber ? `RCCM / NIF : ${invoice.clientRegistrationNumber}` : null,
    ].filter((line): line is string => !!line);
    const clientBoxHeight = 22 + clientDetailLines.length * 6;
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(15, y - 5, pageWidth - 30, clientBoxHeight, 3, 3, 'F');
    doc.setTextColor(59, 130, 246);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("FACTURÉ À", 20, y + 5);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text(clientName, 20, y + 15);
    doc.setFont("helvetica", "normal");
    clientDetailLines.forEach((line, index) => doc.text(line, 20, y + 21 + index * 6));

    y += clientBoxHeight + 15;

    doc.setFillColor(239, 246, 255);
    doc.rect(15, y, pageWidth - 30, 8, 'F');
    doc.setTextColor(59, 130, 246);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Description", 20, y + 5.5);
    doc.text("Qté", pageWidth - 90, y + 5.5, { align: "right" });
    doc.text("Prix unitaire", pageWidth - 55, y + 5.5, { align: "right" });
    doc.text("Total", pageWidth - 20, y + 5.5, { align: "right" });
    y += 12;

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    invoice.lineItems.forEach((item) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      doc.text(item.description, 20, y, { maxWidth: pageWidth - 130 });
      doc.text(String(item.quantity), pageWidth - 90, y, { align: "right" });
      doc.text(formatCurrency(item.unitPrice, invoice.currency), pageWidth - 55, y, { align: "right" });
      doc.text(formatCurrency(item.total, invoice.currency), pageWidth - 20, y, { align: "right" });
      y += 8;
    });

    y += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(pageWidth - 90, y, pageWidth - 15, y);
    y += 8;

    doc.setFontSize(10);
    doc.text("Sous-total HT:", pageWidth - 90, y);
    doc.text(formatCurrency(invoice.subtotal, invoice.currency), pageWidth - 20, y, { align: "right" });
    y += 7;
    doc.text(`TVA (${invoice.taxRate}%):`, pageWidth - 90, y);
    doc.text(formatCurrency(invoice.taxAmount, invoice.currency), pageWidth - 20, y, { align: "right" });
    y += 7;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Total TTC:", pageWidth - 90, y);
    doc.text(formatCurrency(invoice.totalAmount, invoice.currency), pageWidth - 20, y, { align: "right" });
    y += 18;

    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    doc.setFillColor(249, 250, 251);
    doc.roundedRect(15, y - 5, pageWidth - 30, 38, 3, 3, 'F');
    doc.setTextColor(59, 130, 246);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("COORDONNÉES BANCAIRES", 20, y + 5);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    if (financialSettings?.bankName || financialSettings?.iban) {
      doc.text(`Banque: ${financialSettings?.bankName || "Non configuré"}`, 20, y + 14);
      doc.text(`Titulaire: ${financialSettings?.accountName || "Non configuré"}`, 20, y + 21);
      doc.text(`IBAN: ${financialSettings?.iban || "Non configuré"}`, 20, y + 28);
      doc.text(`BIC: ${financialSettings?.bic || "Non configuré"}`, pageWidth - 80, y + 28);
    } else {
      doc.text("Coordonnées bancaires non configurées.", 20, y + 14);
    }
    y += 45;

    if (invoice.notes) {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Notes:", 20, y);
      doc.setFont("helvetica", "normal");
      doc.text(invoice.notes, 20, y + 6, { maxWidth: pageWidth - 40 });
    }

    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Document généré le ${new Date().toLocaleDateString('fr-FR')} - ${agencyName}`, pageWidth / 2, footerY, { align: "center" });

    if (output === "base64") {
      return doc.output("datauristring").split(",")[1];
    }
    doc.save(`facture_${invoice.invoiceNumber}.pdf`);
    return undefined;
  }

  const openMarkAsPaid = (invoice: Invoice) => {
    setInvoiceToMarkPaid(invoice);
    setMarkPaidMethod("Virement bancaire");
    setMarkPaidDate(new Date().toISOString().split('T')[0]);
    setShowMarkPaidDialog(true);
  };

  const confirmMarkAsPaid = () => {
    if (!invoiceToMarkPaid) return;
    markAsPaidMutation.mutate({ id: invoiceToMarkPaid.id, paymentMethod: markPaidMethod, paidDate: markPaidDate });
  };

  const filteredPlacements = placements.filter(p =>
    !p.invoiceNumber &&
    (newInvoiceClient ? p.agencyClientId === newInvoiceClient : true) &&
    !invoiceLines.some(line => line.placementId === p.id)
  );

  const addInvoiceLine = () => {
    if (!selectedPlacement) return;
    const placement = placements.find(p => p.id === selectedPlacement);
    if (!placement) return;

    if (!newInvoiceClient && placement.agencyClientId) {
      setNewInvoiceClient(placement.agencyClientId);
    }

    const newLine: InvoiceLine = {
      id: `line-${Date.now()}`,
      placementId: placement.id,
      description: `${placement.candidateName} - ${placement.contractType}`,
      subtitle: placement.companyName,
      quantity: 1,
      unitPrice: placement.commissionAmount,
      total: placement.commissionAmount,
    };

    setInvoiceLines([...invoiceLines, newLine]);
    setSelectedPlacement("");
  };

  const addCustomLine = () => {
    if (!newInvoiceClient) return;
    const newLine: InvoiceLine = {
      id: `line-${Date.now()}`,
      placementId: null,
      description: "",
      quantity: 1,
      unitPrice: 0,
      total: 0,
    };
    setInvoiceLines([...invoiceLines, newLine]);
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

  const updateLineUnitPrice = (lineId: string, unitPrice: number) => {
    setInvoiceLines(invoiceLines.map(line =>
      line.id === lineId
        ? { ...line, unitPrice, total: unitPrice * line.quantity }
        : line
    ));
  };

  const updateLineDescription = (lineId: string, description: string) => {
    setInvoiceLines(invoiceLines.map(line =>
      line.id === lineId ? { ...line, description } : line
    ));
  };

  const calculateTotals = () => {
    const vatRate = financialSettings?.vatRate ?? 18;
    const subtotal = invoiceLines.reduce((sum, line) => sum + line.total, 0);
    const tva = subtotal * (vatRate / 100);
    const total = subtotal + tva;
    return { subtotal, tva, total, vatRate };
  };

  const resetNewInvoiceForm = () => {
    setNewInvoiceClient("");
    setNewInvoiceDate(new Date().toISOString().split('T')[0]);
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setNewInvoiceDueDate(d.toISOString().split('T')[0]);
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

    if (!newInvoiceDueDate) {
      toast({
        title: "Erreur",
        description: "Veuillez indiquer une date d'échéance.",
        variant: "destructive",
      });
      return;
    }

    if (invoiceLines.some(line => !line.description.trim())) {
      toast({
        title: "Erreur",
        description: "Chaque ligne de facturation doit avoir une description.",
        variant: "destructive",
      });
      return;
    }

    createInvoiceMutation.mutate({
      agencyClientId: newInvoiceClient,
      issueDate: newInvoiceDate,
      dueDate: newInvoiceDueDate,
      notes: newInvoiceNotes || null,
      status: asDraft ? "draft" : "pending",
      lineItems: invoiceLines.map(line => ({
        placementId: line.placementId,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
      })),
    });
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

  const selectedClient = clients.find(c => c.id === newInvoiceClient);
  const totals = calculateTotals();

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
                <p className="text-2xl font-bold text-amber-600">{formatCurrency(invoiceStats.totalPending)}</p>
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
                <p className="text-2xl font-bold text-red-600">{formatCurrency(invoiceStats.totalOverdue)}</p>
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
                <p className="text-2xl font-bold text-green-600">{formatCurrency(invoiceStats.totalPaidThisMonth)}</p>
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
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {invoiceStats.hasPaidData ? `${invoiceStats.avgPaymentTime} jours` : "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {invoiceStats.hasPaidData ? "Basé sur les factures payées" : "Aucune facture payée"}
                </p>
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
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoicesLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-4">
                      <LoadingState label="Chargement des factures" rows={3} />
                    </TableCell>
                  </TableRow>
                )}
                {!invoicesLoading && filteredInvoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Aucune facture trouvée.
                    </TableCell>
                  </TableRow>
                )}
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
                          <span>{getClientDisplayName(invoice)}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(invoice.issueDate)}</TableCell>
                      <TableCell>
                        <span className={invoice.status === "overdue" ? "text-red-600 font-medium" : ""}>
                          {formatDate(invoice.dueDate)}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(invoice.totalAmount, invoice.currency)}</TableCell>
                      <TableCell>
                        <Badge className={statusBadge.className}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusBadge.label}
                        </Badge>
                        {(invoice.sentAt || invoice.reminderCount > 0) && (
                          <p className="mt-1 text-[11px] text-muted-foreground" title={invoice.sentTo ?? undefined}>
                            {invoice.sentAt ? `Envoyée le ${formatDate(invoice.sentAt)}` : "Non envoyée par email"}
                            {invoice.reminderCount > 0 && ` · relancée ×${invoice.reminderCount}`}
                          </p>
                        )}
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
                            <DropdownMenuItem
                              onClick={() => handleDownloadPDF(invoice)}
                              disabled={downloadingInvoiceId === invoice.id}
                            >
                              {downloadingInvoiceId === invoice.id ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4 mr-2" />
                              )}
                              Télécharger PDF
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {(invoice.status === "pending" || invoice.status === "overdue") && (
                              <>
                                <DropdownMenuItem onClick={() => handleSendReminder(invoice)}>
                                  <Mail className="h-4 w-4 mr-2" />
                                  Envoyer rappel
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openMarkAsPaid(invoice)}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Marquer payée
                                </DropdownMenuItem>
                              </>
                            )}
                            {invoice.status === "draft" && (
                              <>
                                <DropdownMenuItem onClick={() => openSend(invoice, "send")} data-testid={`button-send-invoice-${invoice.id}`}>
                                  <Send className="h-4 w-4 mr-2" />
                                  Envoyer au client
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateInvoiceStatusMutation.mutate({ id: invoice.id, status: "pending" })}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Marquer émise (envoyée autrement)
                                </DropdownMenuItem>
                              </>
                            )}
                            {invoice.status !== "paid" && invoice.status !== "cancelled" && (
                              <DropdownMenuItem
                                onClick={() => {
                                  if (window.confirm(`Annuler la facture ${invoice.invoiceNumber} ?`)) {
                                    updateInvoiceStatusMutation.mutate({ id: invoice.id, status: "cancelled" });
                                  }
                                }}
                                className="text-destructive"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Annuler la facture
                              </DropdownMenuItem>
                            )}
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
          {isLoadingInvoiceDetail && (
            <LoadingState label="Chargement de la facture" variant="block" rows={2} className="py-2" />
          )}
          {selectedInvoiceDetail && !isLoadingInvoiceDetail && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Client</p>
                    <p className="font-medium">{getClientDisplayName(selectedInvoiceDetail)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date d'émission</p>
                    <p className="font-medium">{formatDate(selectedInvoiceDetail.issueDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date d'échéance</p>
                    <p className="font-medium">{formatDate(selectedInvoiceDetail.dueDate)}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Statut</p>
                    <Badge className={getStatusBadge(selectedInvoiceDetail.status).className}>
                      {getStatusBadge(selectedInvoiceDetail.status).label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Lignes de facturation</p>
                    <p className="font-medium">{selectedInvoiceDetail.lineItems.length}</p>
                  </div>
                  {selectedInvoiceDetail.paidDate && (
                    <div>
                      <p className="text-sm text-muted-foreground">Date de paiement</p>
                      <p className="font-medium">{formatDate(selectedInvoiceDetail.paidDate)}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Qté</TableHead>
                      <TableHead className="text-right">P.U.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedInvoiceDetail.lineItems.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unitPrice, selectedInvoiceDetail.currency)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.total, selectedInvoiceDetail.currency)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="border rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Montant HT</span>
                  <span>{formatCurrency(selectedInvoiceDetail.subtotal, selectedInvoiceDetail.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">TVA ({selectedInvoiceDetail.taxRate}%)</span>
                  <span>{formatCurrency(selectedInvoiceDetail.taxAmount, selectedInvoiceDetail.currency)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total TTC</span>
                  <span>{formatCurrency(selectedInvoiceDetail.totalAmount, selectedInvoiceDetail.currency)}</span>
                </div>
              </div>

              {selectedInvoiceDetail.paymentMethod && selectedInvoiceDetail.paidDate && (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Paiement reçu</span>
                  </div>
                  <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                    Via {selectedInvoiceDetail.paymentMethod} le {formatDate(selectedInvoiceDetail.paidDate)}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvoiceDetail(false)}>
              Fermer
            </Button>
            <Button
              onClick={() => selectedInvoice && handleDownloadPDF(selectedInvoice)}
              disabled={!selectedInvoice || downloadingInvoiceId === selectedInvoice?.id}
            >
              <Download className="h-4 w-4 mr-2" />
              Télécharger PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showMarkPaidDialog} onOpenChange={setShowMarkPaidDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Marquer comme payée</DialogTitle>
            <DialogDescription>
              Facture {invoiceToMarkPaid?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paidMethod">Moyen de paiement</Label>
              <Select value={markPaidMethod} onValueChange={setMarkPaidMethod}>
                <SelectTrigger id="paidMethod">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Virement bancaire">Virement bancaire</SelectItem>
                  <SelectItem value="Orange Money">Orange Money</SelectItem>
                  <SelectItem value="Wave">Wave</SelectItem>
                  <SelectItem value="Espèces">Espèces</SelectItem>
                  <SelectItem value="Autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paidDate">Date de paiement</Label>
              <Input
                id="paidDate"
                type="date"
                value={markPaidDate}
                onChange={(e) => setMarkPaidDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMarkPaidDialog(false)}>
              Annuler
            </Button>
            <Button onClick={confirmMarkAsPaid} disabled={markAsPaidMutation.isPending}>
              {markAsPaidMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmer
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
                  <p className="font-bold text-lg">{profileData?.profile?.agencyName || profileData?.user?.fullName || "—"}</p>
                  {profileData?.user?.email && <p className="text-sm">{profileData.user.email}</p>}
                  {profileData?.user?.phone && <p className="text-sm">{profileData.user.phone}</p>}
                  {(profileData?.user?.city || profileData?.user?.country) && (
                    <p className="text-sm">{[profileData?.user?.city, profileData?.user?.country].filter(Boolean).join(", ")}</p>
                  )}
                  {profileData?.profile?.website && (
                    <p className="text-xs text-muted-foreground pt-1">{profileData.profile.website}</p>
                  )}
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
                      {clients.filter(client => client.status !== "inactive").map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedClient && (
                  <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 text-sm">
                    <p className="font-medium">{selectedClient.name}</p>
                    {selectedClient.address && <p className="text-muted-foreground">{selectedClient.address}</p>}
                    {(selectedClient.city || selectedClient.country) && (
                      <p className="text-muted-foreground">
                        {[selectedClient.city, selectedClient.country].filter(Boolean).join(", ")}
                      </p>
                    )}
                    {selectedClient.registrationNumber && <p className="text-muted-foreground">RCCM / NIF : {selectedClient.registrationNumber}</p>}
                    {!selectedClient.address && !selectedClient.registrationNumber && (
                      <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">Adresse et RCCM absents de la fiche : ils n'apparaîtront pas sur la facture.</p>
                    )}
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
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="font-medium">Lignes de facturation</h4>
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={selectedPlacement} onValueChange={setSelectedPlacement}>
                    <SelectTrigger className="w-64" data-testid="select-placement">
                      <UserIcon className="h-4 w-4 mr-2" />
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
                            {placement.candidateName} - {placement.companyName}
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
                  <Button
                    variant="outline"
                    onClick={addCustomLine}
                    disabled={!newInvoiceClient}
                    data-testid="button-add-custom-line"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Ligne libre
                  </Button>
                </div>
              </div>

              {!newInvoiceClient && invoiceLines.length === 0 && (
                <div className="border border-dashed rounded-lg p-8 text-center text-muted-foreground">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Sélectionnez un client ou ajoutez un placement pour commencer</p>
                </div>
              )}

              {newInvoiceClient && invoiceLines.length === 0 && (
                <div className="border border-dashed rounded-lg p-8 text-center text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Ajoutez des placements ou une ligne libre à facturer</p>
                </div>
              )}

              {invoiceLines.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
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
                            {line.placementId ? (
                              <div>
                                <p className="font-medium">{line.description}</p>
                                {line.subtitle && <p className="text-sm text-muted-foreground">{line.subtitle}</p>}
                              </div>
                            ) : (
                              <Input
                                value={line.description}
                                onChange={(e) => updateLineDescription(line.id, e.target.value)}
                                placeholder="Description de la prestation"
                                data-testid={`input-description-${line.id}`}
                              />
                            )}
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
                          <TableCell className="text-right">
                            {line.placementId ? (
                              formatCurrency(line.unitPrice)
                            ) : (
                              <Input
                                type="number"
                                min="0"
                                value={line.unitPrice}
                                onChange={(e) => updateLineUnitPrice(line.id, parseInt(e.target.value) || 0)}
                                className="w-32 text-right ml-auto"
                                data-testid={`input-unit-price-${line.id}`}
                              />
                            )}
                          </TableCell>
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
                      <span>{formatCurrency(totals.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">TVA ({totals.vatRate}%)</span>
                      <span>{formatCurrency(totals.tva)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total TTC</span>
                      <span>{formatCurrency(totals.total)}</span>
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
                {(financialSettings?.bankName || financialSettings?.iban) ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Banque</span>
                        <span className="font-medium">{financialSettings?.bankName || "Non configuré"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Titulaire</span>
                        <span className="font-medium">{financialSettings?.accountName || "Non configuré"}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">IBAN</span>
                        <span className="font-mono text-xs">{financialSettings?.iban || "Non configuré"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">BIC/SWIFT</span>
                        <span className="font-mono">{financialSettings?.bic || "Non configuré"}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Aucune coordonnée bancaire configurée. Renseignez-les dans les paramètres financiers de l'agence.
                  </p>
                )}
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
            <Button
              variant="outline"
              onClick={() => handleCreateInvoice(true)}
              disabled={createInvoiceMutation.isPending}
              data-testid="button-save-draft"
            >
              {createInvoiceMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Enregistrer brouillon
            </Button>
            <Button
              onClick={() => handleCreateInvoice(false)}
              disabled={createInvoiceMutation.isPending}
              data-testid="button-create-invoice"
            >
              {createInvoiceMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Créer et envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!sendState} onOpenChange={(open) => !open && setSendState(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{sendState?.kind === "reminder" ? "Envoyer un rappel de paiement" : "Envoyer la facture au client"}</DialogTitle>
            <DialogDescription>
              {sendState ? `${sendState.invoice.invoiceNumber} · ${sendState.invoice.clientName} · ${formatCurrency(sendState.invoice.totalAmount, sendState.invoice.currency)}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="send-to">Destinataire</Label>
              <Input id="send-to" type="email" value={sendTo} onChange={(e) => setSendTo(e.target.value)} placeholder="email du client" data-testid="input-send-to" />
              {!sendState?.invoice.clientEmail && (
                <p className="text-xs text-amber-700 dark:text-amber-300">Aucun contact avec email sur la fiche de ce client : saisissez une adresse, ou ajoutez un contact RH à sa fiche.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="send-message">Message <span className="text-muted-foreground">(optionnel)</span></Label>
              <Textarea id="send-message" rows={3} value={sendMessage} onChange={(e) => setSendMessage(e.target.value)} placeholder={sendState?.kind === "reminder" ? "Merci de bien vouloir procéder au règlement…" : "Veuillez trouver ci-joint notre facture…"} />
            </div>
            <p className="text-xs text-muted-foreground">La facture PDF est jointe automatiquement. Les réponses du client arrivent sur l'email de votre agence.</p>
            {sendState?.kind === "reminder" && sendState.invoice.reminderCount > 0 && (
              <p className="text-xs text-muted-foreground">Déjà relancée {sendState.invoice.reminderCount} fois{sendState.invoice.lastReminderAt ? `, dernière le ${formatDate(sendState.invoice.lastReminderAt)}` : ""}.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendState(null)}>Annuler</Button>
            <Button onClick={() => sendInvoiceMutation.mutate()} disabled={!sendTo.trim() || sendInvoiceMutation.isPending} data-testid="button-confirm-send">
              {sendInvoiceMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
