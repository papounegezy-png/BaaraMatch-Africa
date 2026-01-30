import { useState } from "react";
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
  DollarSign,
  Percent,
  CreditCard,
  Building2,
  Receipt,
  Calendar,
  Save,
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  AlertCircle,
  Wallet,
  FileText,
  Clock,
  TrendingUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CommissionRate {
  id: string;
  contractType: string;
  rate: number;
  minAmount: string;
  isActive: boolean;
}

interface PaymentMethod {
  id: string;
  name: string;
  type: string;
  accountInfo: string;
  isDefault: boolean;
  isActive: boolean;
}

const defaultCommissionRates: CommissionRate[] = [
  { id: "1", contractType: "CDI", rate: 15, minAmount: "50,000 XOF", isActive: true },
  { id: "2", contractType: "CDD", rate: 12, minAmount: "30,000 XOF", isActive: true },
  { id: "3", contractType: "Intérim", rate: 18, minAmount: "25,000 XOF", isActive: true },
  { id: "4", contractType: "Mission ponctuelle", rate: 20, minAmount: "15,000 XOF", isActive: true },
  { id: "5", contractType: "Stage", rate: 8, minAmount: "10,000 XOF", isActive: false },
];

const defaultPaymentMethods: PaymentMethod[] = [
  { id: "1", name: "Virement bancaire", type: "bank", accountInfo: "BICIS - **** 4521", isDefault: true, isActive: true },
  { id: "2", name: "Orange Money", type: "mobile", accountInfo: "+221 77 *** ** 45", isDefault: false, isActive: true },
  { id: "3", name: "Wave", type: "mobile", accountInfo: "+221 76 *** ** 89", isDefault: false, isActive: true },
];

export function FinancialSettings() {
  const { toast } = useToast();
  const [currency, setCurrency] = useState("XOF");
  const [invoicePrefix, setInvoicePrefix] = useState("RHC");
  const [invoiceNextNumber, setInvoiceNextNumber] = useState("2026-0045");
  const [paymentTerms, setPaymentTerms] = useState("30");
  const [vatRate, setVatRate] = useState("18");
  const [autoInvoice, setAutoInvoice] = useState(true);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderDays, setReminderDays] = useState("7");
  
  const [commissionRates, setCommissionRates] = useState<CommissionRate[]>(defaultCommissionRates);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(defaultPaymentMethods);

  const handleSaveGeneral = () => {
    toast({
      title: "Paramètres enregistrés",
      description: "Les paramètres généraux ont été mis à jour avec succès.",
    });
  };

  const handleSaveCommissions = () => {
    toast({
      title: "Commissions mises à jour",
      description: "Les taux de commission ont été enregistrés.",
    });
  };

  const handleSavePayment = () => {
    toast({
      title: "Moyens de paiement mis à jour",
      description: "Les méthodes de paiement ont été enregistrées.",
    });
  };

  const toggleCommissionActive = (id: string) => {
    setCommissionRates(rates => 
      rates.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r)
    );
  };

  const togglePaymentActive = (id: string) => {
    setPaymentMethods(methods =>
      methods.map(m => m.id === id ? { ...m, isActive: !m.isActive } : m)
    );
  };

  const setDefaultPayment = (id: string) => {
    setPaymentMethods(methods =>
      methods.map(m => ({ ...m, isDefault: m.id === id }))
    );
  };

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
                    value={invoiceNextNumber} 
                    onChange={(e) => setInvoiceNextNumber(e.target.value)}
                    data-testid="input-invoice-number"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Exemple de numéro: {invoicePrefix}-{invoiceNextNumber}
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

            <Button onClick={handleSaveGeneral} className="w-full" data-testid="button-save-general">
              <Save className="h-4 w-4 mr-2" />
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
                onCheckedChange={setAutoInvoice}
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
                  onCheckedChange={setReminderEnabled}
                  data-testid="switch-reminder"
                />
              </div>
              
              {reminderEnabled && (
                <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                  <Label htmlFor="reminderDays">Jours avant échéance</Label>
                  <Select value={reminderDays} onValueChange={setReminderDays}>
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
              <CardDescription>Commissions par type de contrat</CardDescription>
            </div>
            <Button variant="outline" size="sm" data-testid="button-add-commission">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un taux
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
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
                    <TableCell className="font-medium">{rate.contractType}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {rate.rate}%
                      </Badge>
                    </TableCell>
                    <TableCell>{rate.minAmount}</TableCell>
                    <TableCell>
                      <Switch 
                        checked={rate.isActive}
                        onCheckedChange={() => toggleCommissionActive(rate.id)}
                        data-testid={`switch-commission-${rate.id}`}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" data-testid={`button-edit-commission-${rate.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" data-testid={`button-delete-commission-${rate.id}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleSaveCommissions} data-testid="button-save-commissions">
              <Save className="h-4 w-4 mr-2" />
              Enregistrer les commissions
            </Button>
          </div>
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
            <Button variant="outline" size="sm" data-testid="button-add-payment">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un moyen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {paymentMethods.map((method) => (
              <div 
                key={method.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${
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
                    onCheckedChange={() => togglePaymentActive(method.id)}
                    data-testid={`switch-payment-${method.id}`}
                  />
                  {!method.isDefault && method.isActive && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setDefaultPayment(method.id)}
                      data-testid={`button-default-payment-${method.id}`}
                    >
                      Définir par défaut
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" data-testid={`button-edit-payment-${method.id}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleSavePayment} data-testid="button-save-payments">
              <Save className="h-4 w-4 mr-2" />
              Enregistrer les moyens de paiement
            </Button>
          </div>
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
              <Input id="bankName" defaultValue="BICIS Sénégal" data-testid="input-bank-name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountName">Titulaire du compte</Label>
              <Input id="accountName" defaultValue="RH Connect SARL" data-testid="input-account-name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="iban">IBAN</Label>
              <Input id="iban" defaultValue="SN08 SN00 0000 0000 0000 0000 4521" data-testid="input-iban" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bic">Code BIC/SWIFT</Label>
              <Input id="bic" defaultValue="BICISNDAXXX" data-testid="input-bic" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button data-testid="button-save-bank">
              <Save className="h-4 w-4 mr-2" />
              Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
