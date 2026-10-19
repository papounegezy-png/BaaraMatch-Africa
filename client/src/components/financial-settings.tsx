import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DollarSign,
  Percent,
  CreditCard,
  Building2,
  Receipt,
  Save,
  Plus,
  Pencil,
  Trash2,
  Wallet,
  FileText,
  Clock,
  TrendingUp,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { placementContractTypes } from "@shared/commissions";

interface FinancialSettingsData {
  id: string;
  agencyId: string;
  currency: string;
  invoicePrefix: string;
  invoiceNextNumber: number;
  defaultPaymentTerms: number;
  vatRate: number;
  autoInvoice: boolean;
  reminderEnabled: boolean;
  reminderDays: number;
  bankName: string | null;
  accountName: string | null;
  iban: string | null;
  bic: string | null;
  updatedAt: string;
}

interface CommissionRate {
  id: string;
  agencyId: string;
  // null = tous les clients / tous les contrats (shared/commissions.ts).
  agencyClientId: string | null;
  contractType: string | null;
  rate: number;
  minAmount: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PaymentMethod {
  id: string;
  agencyId: string;
  name: string;
  type: "bank" | "mobile";
  accountInfo: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const FINANCIAL_SETTINGS_KEY = ["/api/agency/financial-settings"];
const COMMISSION_RATES_KEY = ["/api/agency/commission-rates"];
const TOUS = "tous";
const PAYMENT_METHODS_KEY = ["/api/agency/payment-methods"];

export function FinancialSettings() {
  const { toast } = useToast();

  // ---- General / invoicing / bank settings ----
  const settingsQuery = useQuery<FinancialSettingsData>({
    queryKey: FINANCIAL_SETTINGS_KEY,
  });
  const settings = settingsQuery.data;

  const [currency, setCurrency] = useState("XOF");
  const [invoicePrefix, setInvoicePrefix] = useState("FAC");
  const [paymentTerms, setPaymentTerms] = useState("30");
  const [vatRate, setVatRate] = useState("18");
  const [autoInvoice, setAutoInvoice] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderDays, setReminderDays] = useState("7");

  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [iban, setIban] = useState("");
  const [bic, setBic] = useState("");

  useEffect(() => {
    if (!settings) return;
    setCurrency(settings.currency ?? "XOF");
    setInvoicePrefix(settings.invoicePrefix ?? "FAC");
    setPaymentTerms(String(settings.defaultPaymentTerms ?? 30));
    setVatRate(String(settings.vatRate ?? 18));
    setAutoInvoice(!!settings.autoInvoice);
    setReminderEnabled(!!settings.reminderEnabled);
    setReminderDays(String(settings.reminderDays ?? 7));
    setBankName(settings.bankName ?? "");
    setAccountName(settings.accountName ?? "");
    setIban(settings.iban ?? "");
    setBic(settings.bic ?? "");
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const res = await apiRequest("PATCH", "/api/agency/financial-settings", patch);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINANCIAL_SETTINGS_KEY });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'enregistrer les paramètres financiers.",
        variant: "destructive",
      });
    },
  });

  const handleSaveGeneral = () => {
    updateSettingsMutation.mutate(
      {
        currency,
        invoicePrefix,
        defaultPaymentTerms: Number(paymentTerms),
        vatRate: Number(vatRate),
      },
      {
        onSuccess: () => {
          toast({
            title: "Paramètres enregistrés",
            description: "Les paramètres généraux ont été mis à jour avec succès.",
          });
        },
      }
    );
  };

  const handleToggleAutoInvoice = (checked: boolean) => {
    setAutoInvoice(checked);
    updateSettingsMutation.mutate(
      { autoInvoice: checked },
      { onError: () => setAutoInvoice(!checked) }
    );
  };

  const handleToggleReminder = (checked: boolean) => {
    setReminderEnabled(checked);
    updateSettingsMutation.mutate(
      { reminderEnabled: checked },
      { onError: () => setReminderEnabled(!checked) }
    );
  };

  const handleReminderDaysChange = (value: string) => {
    const previous = reminderDays;
    setReminderDays(value);
    updateSettingsMutation.mutate(
      { reminderDays: Number(value) },
      { onError: () => setReminderDays(previous) }
    );
  };

  const handleSaveBankInfo = () => {
    updateSettingsMutation.mutate(
      {
        bankName: bankName.trim() || null,
        accountName: accountName.trim() || null,
        iban: iban.trim() || null,
        bic: bic.trim() || null,
      },
      {
        onSuccess: () => {
          toast({
            title: "Coordonnées bancaires enregistrées",
            description: "Les informations bancaires ont été mises à jour.",
          });
        },
      }
    );
  };

  // ---- Commission rates ----
  const commissionRatesQuery = useQuery<CommissionRate[]>({
    queryKey: COMMISSION_RATES_KEY,
  });
  const commissionRates = commissionRatesQuery.data ?? [];

  const [showCommissionDialog, setShowCommissionDialog] = useState(false);
  const [editingCommission, setEditingCommission] = useState<CommissionRate | null>(null);
  // TOUS : valeur des listes pour « Tous les clients » / « Tous les contrats »
  // (une liste Radix n'accepte pas de valeur vide).
  const [commissionForm, setCommissionForm] = useState({ clientId: TOUS, contractType: TOUS, rate: "", minAmount: "" });
  const clientsQuery = useQuery<{ id: string; name: string }[]>({ queryKey: ["/api/agency/clients"] });
  const clients = clientsQuery.data ?? [];
  const nomClient = (id: string | null) => (id ? clients.find((c) => c.id === id)?.name ?? "Client supprimé" : "Tous les clients");

  const openAddCommissionDialog = () => {
    setEditingCommission(null);
    setCommissionForm({ clientId: TOUS, contractType: TOUS, rate: "", minAmount: "" });
    setShowCommissionDialog(true);
  };

  const openEditCommissionDialog = (rate: CommissionRate) => {
    setEditingCommission(rate);
    setCommissionForm({
      clientId: rate.agencyClientId ?? TOUS,
      contractType: rate.contractType ?? TOUS,
      rate: String(rate.rate),
      minAmount: rate.minAmount != null ? String(rate.minAmount) : "",
    });
    setShowCommissionDialog(true);
  };

  const createCommissionMutation = useMutation({
    mutationFn: async (data: { agencyClientId: string | null; contractType: string | null; rate: number; minAmount: number | null }) => {
      const res = await apiRequest("POST", "/api/agency/commission-rates", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMMISSION_RATES_KEY });
      toast({ title: "Taux ajouté", description: "Le taux de commission a été créé avec succès." });
      setShowCommissionDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le taux de commission.",
        variant: "destructive",
      });
    },
  });

  const updateCommissionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/agency/commission-rates/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMMISSION_RATES_KEY });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour le taux de commission.",
        variant: "destructive",
      });
    },
  });

  const deleteCommissionMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/agency/commission-rates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMMISSION_RATES_KEY });
      toast({ title: "Taux supprimé", description: "Le taux de commission a été supprimé." });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer le taux de commission.",
        variant: "destructive",
      });
    },
  });

  const handleSubmitCommission = () => {
    const rateNum = Number(commissionForm.rate);
    if (commissionForm.rate.trim() === "" || Number.isNaN(rateNum) || rateNum < 0 || rateNum > 100) {
      toast({
        title: "Taux invalide",
        description: "Saisissez un taux entre 0 et 100 %.",
        variant: "destructive",
      });
      return;
    }
    const minAmountNum = commissionForm.minAmount.trim() === "" ? null : Number(commissionForm.minAmount);
    const payload = {
      agencyClientId: commissionForm.clientId === TOUS ? null : commissionForm.clientId,
      contractType: commissionForm.contractType === TOUS ? null : commissionForm.contractType,
      rate: rateNum,
      minAmount: minAmountNum,
    };

    if (editingCommission) {
      updateCommissionMutation.mutate(
        { id: editingCommission.id, data: payload },
        {
          onSuccess: () => {
            toast({ title: "Taux mis à jour", description: "Le taux de commission a été modifié." });
            setShowCommissionDialog(false);
          },
        }
      );
    } else {
      createCommissionMutation.mutate(payload);
    }
  };

  const toggleCommissionActive = (rate: CommissionRate) => {
    updateCommissionMutation.mutate({ id: rate.id, data: { isActive: !rate.isActive } });
  };

  const handleDeleteCommission = (id: string) => {
    if (window.confirm("Supprimer ce taux de commission ?")) {
      deleteCommissionMutation.mutate(id);
    }
  };

  const isSavingCommission = createCommissionMutation.isPending || updateCommissionMutation.isPending;

  // ---- Payment methods ----
  const paymentMethodsQuery = useQuery<PaymentMethod[]>({
    queryKey: PAYMENT_METHODS_KEY,
  });
  const paymentMethods = paymentMethodsQuery.data ?? [];

  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentMethod | null>(null);
  const [paymentForm, setPaymentForm] = useState<{ name: string; type: "bank" | "mobile"; accountInfo: string }>({
    name: "",
    type: "bank",
    accountInfo: "",
  });

  const openAddPaymentDialog = () => {
    setEditingPayment(null);
    setPaymentForm({ name: "", type: "bank", accountInfo: "" });
    setShowPaymentDialog(true);
  };

  const openEditPaymentDialog = (method: PaymentMethod) => {
    setEditingPayment(method);
    setPaymentForm({ name: method.name, type: method.type, accountInfo: method.accountInfo });
    setShowPaymentDialog(true);
  };

  const createPaymentMutation = useMutation({
    mutationFn: async (data: { name: string; type: string; accountInfo: string }) => {
      const res = await apiRequest("POST", "/api/agency/payment-methods", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_METHODS_KEY });
      toast({ title: "Moyen de paiement ajouté", description: "Le moyen de paiement a été créé avec succès." });
      setShowPaymentDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le moyen de paiement.",
        variant: "destructive",
      });
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/agency/payment-methods/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_METHODS_KEY });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour le moyen de paiement.",
        variant: "destructive",
      });
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/agency/payment-methods/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_METHODS_KEY });
      toast({ title: "Moyen de paiement supprimé", description: "Le moyen de paiement a été supprimé." });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer le moyen de paiement.",
        variant: "destructive",
      });
    },
  });

  const handleSubmitPayment = () => {
    if (!paymentForm.name.trim() || !paymentForm.accountInfo.trim()) {
      toast({
        title: "Champs invalides",
        description: "Merci de renseigner un nom et les informations du compte.",
        variant: "destructive",
      });
      return;
    }
    const payload = {
      name: paymentForm.name.trim(),
      type: paymentForm.type,
      accountInfo: paymentForm.accountInfo.trim(),
    };

    if (editingPayment) {
      updatePaymentMutation.mutate(
        { id: editingPayment.id, data: payload },
        {
          onSuccess: () => {
            toast({ title: "Moyen de paiement mis à jour", description: "Le moyen de paiement a été modifié." });
            setShowPaymentDialog(false);
          },
        }
      );
    } else {
      createPaymentMutation.mutate(payload);
    }
  };

  const togglePaymentActive = (method: PaymentMethod) => {
    updatePaymentMutation.mutate({ id: method.id, data: { isActive: !method.isActive } });
  };

  const handleDeletePayment = (id: string) => {
    if (window.confirm("Supprimer ce moyen de paiement ?")) {
      deletePaymentMutation.mutate(id);
    }
  };

  // Setting a new default also unsets the previous default, so at most one
  // payment method is ever marked "isDefault" at a time (the backend does
  // not enforce this invariant itself).
  const setDefaultPayment = async (method: PaymentMethod) => {
    const previousDefault = paymentMethods.find((m) => m.isDefault && m.id !== method.id);
    try {
      if (previousDefault) {
        await updatePaymentMutation.mutateAsync({ id: previousDefault.id, data: { isDefault: false } });
      }
      await updatePaymentMutation.mutateAsync({ id: method.id, data: { isDefault: true } });
      toast({
        title: "Moyen par défaut mis à jour",
        description: `${method.name} est maintenant le moyen de paiement par défaut.`,
      });
    } catch {
      // errors are already surfaced via updatePaymentMutation's onError toast
    }
  };

  const isSavingPayment = createPaymentMutation.isPending || updatePaymentMutation.isPending;

  if (settingsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Paramètres Financiers
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Configuration des tarifs, commissions, devises et facturation
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-general-settings">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Paramètres Généraux
            </CardTitle>
            <CardDescription>Devise, TVA et numérotation des factures</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Devise principale</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="currency" data-testid="select-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="XOF">XOF (Franc CFA)</SelectItem>
                    <SelectItem value="EUR">EUR (Euro)</SelectItem>
                    <SelectItem value="USD">USD (Dollar US)</SelectItem>
                    <SelectItem value="GNF">GNF (Franc Guinéen)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vat">Taux de TVA (%)</Label>
                <Input
                  id="vat"
                  type="number"
                  value={vatRate}
                  onChange={(e) => setVatRate(e.target.value)}
                  data-testid="input-vat-rate"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Numérotation des factures
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prefix">Préfixe</Label>
                  <Input
                    id="prefix"
                    value={invoicePrefix}
                    onChange={(e) => setInvoicePrefix(e.target.value)}
                    data-testid="input-invoice-prefix"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nextNumber">Prochain numéro</Label>
                  <Input
                    id="nextNumber"
                    value={settings?.invoiceNextNumber ?? ""}
                    disabled
                    data-testid="input-invoice-number"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Exemple de numéro: {invoicePrefix}-{settings?.invoiceNextNumber ?? ""}
                {" "}(généré automatiquement à chaque facture)
              </p>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Délais de paiement
              </h4>
              <div className="space-y-2">
                <Label htmlFor="terms">Délai de paiement par défaut (jours)</Label>
                <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                  <SelectTrigger id="terms" data-testid="select-payment-terms">
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
            </div>

            <Button
              onClick={handleSaveGeneral}
              className="w-full"
              disabled={updateSettingsMutation.isPending}
              data-testid="button-save-general"
            >
              {updateSettingsMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Enregistrer les paramètres
            </Button>
          </CardContent>
        </Card>

        <Card data-testid="card-invoice-settings">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Facturation Automatique
            </CardTitle>
            <CardDescription>Automatisation et rappels de paiement</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Génération automatique des factures</Label>
                <p className="text-sm text-muted-foreground">
                  Créer automatiquement les factures à la fin de chaque mois
                </p>
              </div>
              <Switch
                checked={autoInvoice}
                onCheckedChange={handleToggleAutoInvoice}
                data-testid="switch-auto-invoice"
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Rappels de paiement</Label>
                  <p className="text-sm text-muted-foreground">
                    Envoyer des rappels automatiques avant échéance
                  </p>
                </div>
                <Switch
                  checked={reminderEnabled}
                  onCheckedChange={handleToggleReminder}
                  data-testid="switch-reminder"
                />
              </div>

              {reminderEnabled && (
                <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                  <Label htmlFor="reminderDays">Jours avant échéance</Label>
                  <Select value={reminderDays} onValueChange={handleReminderDaysChange}>
                    <SelectTrigger id="reminderDays" data-testid="select-reminder-days">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 jours</SelectItem>
                      <SelectItem value="5">5 jours</SelectItem>
                      <SelectItem value="7">7 jours</SelectItem>
                      <SelectItem value="14">14 jours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <Separator />

            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Statistiques de facturation
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Factures ce mois</p>
                  <p className="text-lg font-semibold">24</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Montant total</p>
                  <p className="text-lg font-semibold">4.2M XOF</p>
                </div>
                <div>
                  <p className="text-muted-foreground">En attente</p>
                  <p className="text-lg font-semibold text-amber-600">8</p>
                </div>
                <div>
                  <p className="text-muted-foreground">En retard</p>
                  <p className="text-lg font-semibold text-red-600">2</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-commission-rates">
        <CardHeader>
          <div className="flex flex-col sm:flex-row flex-wrap justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-primary" />
                Taux de Commission
              </CardTitle>
              <CardDescription>Par client et par type de contrat. Le taux le plus précis est proposé à chaque placement.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={openAddCommissionDialog} data-testid="button-add-commission">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un taux
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {commissionRatesQuery.isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : commissionRates.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Percent className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="font-medium">Aucun taux de commission</h3>
              <p className="text-sm text-muted-foreground">
                Ajoutez un taux par défaut, puis un taux propre à chaque client si besoin.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Type de contrat</TableHead>
                    <TableHead>Taux (%)</TableHead>
                    <TableHead>Montant minimum</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissionRates.map((rate) => (
                    <TableRow key={rate.id} data-testid={`commission-row-${rate.id}`}>
                      <TableCell className="font-medium">{nomClient(rate.agencyClientId)}</TableCell>
                      <TableCell>{rate.contractType ?? "Tous les contrats"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {rate.rate}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {rate.minAmount != null ? `${rate.minAmount.toLocaleString()} XOF` : "—"}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={rate.isActive}
                          onCheckedChange={() => toggleCommissionActive(rate)}
                          data-testid={`switch-commission-${rate.id}`}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditCommissionDialog(rate)}
                            data-testid={`button-edit-commission-${rate.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => handleDeleteCommission(rate.id)}
                            data-testid={`button-delete-commission-${rate.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-payment-methods">
        <CardHeader>
          <div className="flex flex-col sm:flex-row flex-wrap justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Moyens de Paiement
              </CardTitle>
              <CardDescription>Méthodes de réception des paiements</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={openAddPaymentDialog} data-testid="button-add-payment">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un moyen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {paymentMethodsQuery.isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : paymentMethods.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Wallet className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="font-medium">Aucun moyen de paiement</h3>
              <p className="text-sm text-muted-foreground">
                Ajoutez un moyen de paiement pour recevoir vos règlements.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border ${
                    method.isDefault ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                  data-testid={`payment-method-${method.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      method.type === 'bank' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-orange-100 dark:bg-orange-900/30'
                    }`}>
                      {method.type === 'bank' ? (
                        <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <CreditCard className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{method.name}</p>
                        {method.isDefault && (
                          <Badge className="bg-primary/10 text-primary border-primary/20">
                            Par défaut
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{method.accountInfo}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={method.isActive}
                      onCheckedChange={() => togglePaymentActive(method)}
                      data-testid={`switch-payment-${method.id}`}
                    />
                    {!method.isDefault && method.isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDefaultPayment(method)}
                        data-testid={`button-default-payment-${method.id}`}
                      >
                        Définir par défaut
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditPaymentDialog(method)}
                      data-testid={`button-edit-payment-${method.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => handleDeletePayment(method.id)}
                      data-testid={`button-delete-payment-${method.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-bank-info">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Coordonnées Bancaires
          </CardTitle>
          <CardDescription>Informations affichées sur les factures</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bankName">Nom de la banque</Label>
              <Input
                id="bankName"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                data-testid="input-bank-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountName">Titulaire du compte</Label>
              <Input
                id="accountName"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                data-testid="input-account-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="iban">IBAN</Label>
              <Input
                id="iban"
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                data-testid="input-iban"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bic">Code BIC/SWIFT</Label>
              <Input
                id="bic"
                value={bic}
                onChange={(e) => setBic(e.target.value)}
                data-testid="input-bic"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleSaveBankInfo}
              disabled={updateSettingsMutation.isPending}
              data-testid="button-save-bank"
            >
              {updateSettingsMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit commission rate dialog */}
      <Dialog open={showCommissionDialog} onOpenChange={setShowCommissionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCommission ? "Modifier le taux" : "Ajouter un taux de commission"}</DialogTitle>
            <DialogDescription>
              Sans client, le taux vaut pour tous vos clients ; sans type de contrat, pour tous les contrats.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="commissionClient">Client</Label>
              <Select value={commissionForm.clientId} onValueChange={(v) => setCommissionForm({ ...commissionForm, clientId: v })}>
                <SelectTrigger id="commissionClient" data-testid="select-commission-client">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TOUS}>Tous les clients</SelectItem>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="commissionContractType">Type de contrat</Label>
              <Select value={commissionForm.contractType} onValueChange={(v) => setCommissionForm({ ...commissionForm, contractType: v })}>
                <SelectTrigger id="commissionContractType" data-testid="select-commission-contract-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TOUS}>Tous les contrats</SelectItem>
                  {placementContractTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="commissionRate">Taux (%)</Label>
              <Input
                id="commissionRate"
                type="number"
                value={commissionForm.rate}
                onChange={(e) => setCommissionForm({ ...commissionForm, rate: e.target.value })}
                data-testid="input-commission-rate"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commissionMinAmount">Montant minimum (XOF, optionnel)</Label>
              <Input
                id="commissionMinAmount"
                type="number"
                value={commissionForm.minAmount}
                onChange={(e) => setCommissionForm({ ...commissionForm, minAmount: e.target.value })}
                data-testid="input-commission-min-amount"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCommissionDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmitCommission} disabled={isSavingCommission} data-testid="button-submit-commission">
              {isSavingCommission && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingCommission ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit payment method dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPayment ? "Modifier le moyen de paiement" : "Ajouter un moyen de paiement"}</DialogTitle>
            <DialogDescription>
              Renseignez les informations du moyen de paiement utilisé pour recevoir vos règlements.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paymentName">Nom</Label>
              <Input
                id="paymentName"
                placeholder="Ex: Virement bancaire, Orange Money..."
                value={paymentForm.name}
                onChange={(e) => setPaymentForm({ ...paymentForm, name: e.target.value })}
                data-testid="input-payment-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentType">Type</Label>
              <Select
                value={paymentForm.type}
                onValueChange={(value: "bank" | "mobile") => setPaymentForm({ ...paymentForm, type: value })}
              >
                <SelectTrigger id="paymentType" data-testid="select-payment-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Banque</SelectItem>
                  <SelectItem value="mobile">Mobile Money</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentAccountInfo">Informations du compte</Label>
              <Input
                id="paymentAccountInfo"
                placeholder="Ex: BICIS - **** 4521"
                value={paymentForm.accountInfo}
                onChange={(e) => setPaymentForm({ ...paymentForm, accountInfo: e.target.value })}
                data-testid="input-payment-account-info"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmitPayment} disabled={isSavingPayment} data-testid="button-submit-payment">
              {isSavingPayment && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingPayment ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
