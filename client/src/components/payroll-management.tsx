import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import { 
  Wallet,
  Receipt,
  Calculator,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertCircle,
  Play,
  Eye,
  Send,
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  Printer,
  FileText,
} from "lucide-react";

const mockPayslips = [
  { 
    id: 1, 
    employee: "Amadou Diallo",
    department: "Tech",
    position: "Développeur Senior",
    month: "Janvier 2026",
    grossSalary: 850000,
    netSalary: 680000,
    deductions: 170000,
    status: "paid",
    paidAt: "2026-01-31"
  },
  { 
    id: 2, 
    employee: "Fatou Sow",
    department: "Tech",
    position: "Chef de Projet",
    month: "Janvier 2026",
    grossSalary: 1200000,
    netSalary: 960000,
    deductions: 240000,
    status: "paid",
    paidAt: "2026-01-31"
  },
  { 
    id: 3, 
    employee: "Oumar Kane",
    department: "Marketing",
    position: "Responsable Marketing",
    month: "Janvier 2026",
    grossSalary: 950000,
    netSalary: 760000,
    deductions: 190000,
    status: "paid",
    paidAt: "2026-01-31"
  },
  { 
    id: 4, 
    employee: "Aissatou Ba",
    department: "RH",
    position: "Chargée RH",
    month: "Janvier 2026",
    grossSalary: 650000,
    netSalary: 520000,
    deductions: 130000,
    status: "pending",
    paidAt: null
  },
  { 
    id: 5, 
    employee: "Moussa Traore",
    department: "Ventes",
    position: "Commercial",
    month: "Janvier 2026",
    grossSalary: 550000,
    netSalary: 440000,
    deductions: 110000,
    status: "pending",
    paidAt: null
  },
];

const mockContributions = [
  { id: 1, name: "Cotisations sociales (CSS)", rate: 15.4, amount: 652400, dueDate: "2026-02-15", status: "pending" },
  { id: 2, name: "Impôt sur le revenu (IR)", rate: 5.0, amount: 212000, dueDate: "2026-02-10", status: "pending" },
  { id: 3, name: "Retraite complémentaire", rate: 3.0, amount: 127200, dueDate: "2026-02-20", status: "pending" },
  { id: 4, name: "Assurance maladie", rate: 2.6, amount: 110240, dueDate: "2026-02-15", status: "pending" },
];

const statusLabels: Record<string, { label: string; color: string }> = {
  paid: { label: "Payé", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  pending: { label: "En attente", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300" },
  processing: { label: "En cours", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
};

export function PayrollManagement() {
  const { toast } = useToast();
  const [showRunPayrollDialog, setShowRunPayrollDialog] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<typeof mockPayslips[0] | null>(null);
  const [showPayslipDialog, setShowPayslipDialog] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("janvier-2026");

  const totalGross = mockPayslips.reduce((sum, p) => sum + p.grossSalary, 0);
  const totalNet = mockPayslips.reduce((sum, p) => sum + p.netSalary, 0);
  const totalDeductions = mockPayslips.reduce((sum, p) => sum + p.deductions, 0);
  const paidCount = mockPayslips.filter(p => p.status === "paid").length;

  const stats = [
    { title: "Masse salariale brute", value: formatCurrency(totalGross), icon: DollarSign, color: "text-blue-600" },
    { title: "Total net à payer", value: formatCurrency(totalNet), icon: Wallet, color: "text-green-600" },
    { title: "Cotisations totales", value: formatCurrency(totalDeductions), icon: Receipt, color: "text-amber-600" },
    { title: "Bulletins générés", value: `${paidCount}/${mockPayslips.length}`, icon: FileText, color: "text-purple-600" },
  ];

  const handleRunPayroll = () => {
    toast({
      title: "Paie lancée",
      description: "Le traitement de la paie a démarré. Vous serez notifié à la fin.",
    });
    setShowRunPayrollDialog(false);
  };

  const handleViewPayslip = (payslip: typeof mockPayslips[0]) => {
    setSelectedPayslip(payslip);
    setShowPayslipDialog(true);
  };

  const generatePayslipPDF = (payslip: typeof mockPayslips[0]) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFillColor(139, 92, 246);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("BULLETIN DE PAIE", pageWidth / 2, 25, { align: "center" });
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("EMPLOYEUR", 20, 55);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("WorkMatch Africa SARL", 20, 63);
    doc.text("Dakar, Sénégal", 20, 70);
    doc.text("NINEA: SN-123456789", 20, 77);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("EMPLOYÉ", 120, 55);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(payslip.employee, 120, 63);
    doc.text(payslip.position, 120, 70);
    doc.text(payslip.department, 120, 77);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 85, pageWidth - 20, 85);
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`Période: ${payslip.month}`, 20, 95);
    
    doc.setFillColor(245, 245, 245);
    doc.rect(20, 105, pageWidth - 40, 10, 'F');
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("DÉSIGNATION", 25, 112);
    doc.text("MONTANT", pageWidth - 45, 112, { align: "right" });
    
    doc.setFont("helvetica", "normal");
    let yPos = 125;
    
    doc.text("Salaire brut", 25, yPos);
    doc.text(formatCurrency(payslip.grossSalary), pageWidth - 25, yPos, { align: "right" });
    yPos += 10;
    
    doc.setDrawColor(230, 230, 230);
    doc.line(20, yPos - 3, pageWidth - 20, yPos - 3);
    
    doc.setTextColor(200, 50, 50);
    doc.text("Cotisations sociales (15.4%)", 25, yPos);
    doc.text(`- ${formatCurrency(Math.round(payslip.grossSalary * 0.154))}`, pageWidth - 25, yPos, { align: "right" });
    yPos += 10;
    
    doc.text("Impôt sur le revenu (5%)", 25, yPos);
    doc.text(`- ${formatCurrency(Math.round(payslip.grossSalary * 0.05))}`, pageWidth - 25, yPos, { align: "right" });
    yPos += 10;
    
    doc.text("Retraite complémentaire (3%)", 25, yPos);
    doc.text(`- ${formatCurrency(Math.round(payslip.grossSalary * 0.03))}`, pageWidth - 25, yPos, { align: "right" });
    yPos += 10;
    
    doc.text("Assurance maladie (2.6%)", 25, yPos);
    doc.text(`- ${formatCurrency(Math.round(payslip.grossSalary * 0.026))}`, pageWidth - 25, yPos, { align: "right" });
    yPos += 15;
    
    doc.setDrawColor(100, 100, 100);
    doc.line(20, yPos - 5, pageWidth - 20, yPos - 5);
    
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text("Total retenues", 25, yPos);
    doc.setTextColor(200, 50, 50);
    doc.text(`- ${formatCurrency(payslip.deductions)}`, pageWidth - 25, yPos, { align: "right" });
    yPos += 15;
    
    doc.setFillColor(34, 197, 94);
    doc.rect(20, yPos - 7, pageWidth - 40, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text("NET À PAYER", 25, yPos);
    doc.text(formatCurrency(payslip.netSalary), pageWidth - 25, yPos, { align: "right" });
    
    yPos += 30;
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Ce document est généré automatiquement par WorkMatch ATS.", 20, yPos);
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 20, yPos + 7);
    
    const fileName = `bulletin_paie_${payslip.employee.replace(/\s+/g, '_')}_${payslip.month.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
    
    toast({
      title: "PDF téléchargé",
      description: `Le bulletin de paie a été téléchargé.`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Gestion de la paie</h1>
          <p className="text-muted-foreground">Automatisation de la paie et génération des bulletins</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sélectionner le mois" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="janvier-2026">Janvier 2026</SelectItem>
              <SelectItem value="decembre-2025">Décembre 2025</SelectItem>
              <SelectItem value="novembre-2025">Novembre 2025</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={showRunPayrollDialog} onOpenChange={setShowRunPayrollDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-run-payroll">
                <Play className="h-4 w-4" />
                Lancer la paie
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Lancer le traitement de la paie</DialogTitle>
                <DialogDescription>
                  Cette action va générer les bulletins de paie pour tous les employés du mois sélectionné.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="p-4 rounded-lg bg-muted">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Période</span>
                    <span className="font-bold">Janvier 2026</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Employés concernés</span>
                    <span className="font-bold">{mockPayslips.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Masse salariale estimée</span>
                    <span className="font-bold text-green-600">{formatCurrency(totalNet)}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800 dark:text-amber-200">Attention</p>
                    <p className="text-amber-700 dark:text-amber-300">Cette action est irréversible. Vérifiez que toutes les informations sont à jour avant de continuer.</p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowRunPayrollDialog(false)}>Annuler</Button>
                <Button onClick={handleRunPayroll} data-testid="button-confirm-payroll">Confirmer et lancer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-xl font-bold">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full bg-muted ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="payslips">
        <TabsList>
          <TabsTrigger value="payslips">Bulletins de paie</TabsTrigger>
          <TabsTrigger value="contributions">Cotisations sociales</TabsTrigger>
          <TabsTrigger value="exports">Exports</TabsTrigger>
        </TabsList>

        <TabsContent value="payslips" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Bulletins de paie - Janvier 2026</CardTitle>
                <CardDescription>Liste des bulletins générés pour la période</CardDescription>
              </div>
              <Button variant="outline" className="gap-2">
                <Send className="h-4 w-4" />
                Envoyer tous les bulletins
              </Button>
            </CardHeader>
            <CardContent>
              <Table data-testid="table-payslips">
                <TableHeader>
                  <TableRow>
                    <TableHead>Employé</TableHead>
                    <TableHead>Département</TableHead>
                    <TableHead className="text-right">Brut</TableHead>
                    <TableHead className="text-right">Retenues</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockPayslips.map((payslip) => (
                    <TableRow key={payslip.id} data-testid={`payslip-row-${payslip.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-pink-500 text-white text-xs">
                              {payslip.employee.split(" ").map(n => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{payslip.employee}</p>
                            <p className="text-xs text-muted-foreground">{payslip.position}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{payslip.department}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(payslip.grossSalary)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        -{formatCurrency(payslip.deductions)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-600">
                        {formatCurrency(payslip.netSalary)}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusLabels[payslip.status].color}>
                          {statusLabels[payslip.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleViewPayslip(payslip)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => generatePayslipPDF(payslip)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contributions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Cotisations sociales - Janvier 2026</CardTitle>
              <CardDescription>Déclarations et paiements des charges sociales</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organisme</TableHead>
                    <TableHead className="text-center">Taux</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Échéance</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockContributions.map((contribution) => (
                    <TableRow key={contribution.id}>
                      <TableCell className="font-medium">{contribution.name}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{contribution.rate}%</Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(contribution.amount)}
                      </TableCell>
                      <TableCell>
                        {new Date(contribution.dueDate).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusLabels[contribution.status].color}>
                          {statusLabels[contribution.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm">Payer</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-6 p-4 rounded-lg bg-muted">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total des cotisations</span>
                  <span className="text-xl font-bold">
                    {formatCurrency(mockContributions.reduce((sum, c) => sum + c.amount, 0))}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exports" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Export comptable
                </CardTitle>
                <CardDescription>Générez les écritures comptables pour votre logiciel</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Format d'export</Label>
                  <Select defaultValue="csv">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                      <SelectItem value="sage">Sage</SelectItem>
                      <SelectItem value="ciel">Ciel Compta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full gap-2">
                  <Download className="h-4 w-4" />
                  Télécharger l'export
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Printer className="h-5 w-5" />
                  Impression groupée
                </CardTitle>
                <CardDescription>Imprimez tous les bulletins de paie</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Sélection</Label>
                  <Select defaultValue="all">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les employés</SelectItem>
                      <SelectItem value="pending">En attente uniquement</SelectItem>
                      <SelectItem value="paid">Payés uniquement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full gap-2" variant="outline">
                  <Printer className="h-4 w-4" />
                  Imprimer les bulletins
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Déclarations sociales
                </CardTitle>
                <CardDescription>Générez les fichiers de déclaration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Button className="w-full justify-start gap-2" variant="outline">
                    <FileText className="h-4 w-4" />
                    DSN (Déclaration Sociale Nominative)
                  </Button>
                  <Button className="w-full justify-start gap-2" variant="outline">
                    <FileText className="h-4 w-4" />
                    État récapitulatif CNSS
                  </Button>
                  <Button className="w-full justify-start gap-2" variant="outline">
                    <FileText className="h-4 w-4" />
                    Déclaration IPRES
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Rapports analytiques
                </CardTitle>
                <CardDescription>Analysez vos données de paie</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Button className="w-full justify-start gap-2" variant="outline">
                    <FileText className="h-4 w-4" />
                    Évolution masse salariale
                  </Button>
                  <Button className="w-full justify-start gap-2" variant="outline">
                    <FileText className="h-4 w-4" />
                    Répartition par département
                  </Button>
                  <Button className="w-full justify-start gap-2" variant="outline">
                    <FileText className="h-4 w-4" />
                    Comparatif mensuel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showPayslipDialog} onOpenChange={setShowPayslipDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulletin de paie</DialogTitle>
            <DialogDescription>{selectedPayslip?.month}</DialogDescription>
          </DialogHeader>
          {selectedPayslip && (
            <div className="py-4 space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-pink-500 text-white">
                    {selectedPayslip.employee.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold">{selectedPayslip.employee}</p>
                  <p className="text-sm text-muted-foreground">{selectedPayslip.position}</p>
                  <p className="text-sm text-muted-foreground">{selectedPayslip.department}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Salaire brut</span>
                  <span className="font-medium">{formatCurrency(selectedPayslip.grossSalary)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Cotisations sociales (15.4%)</span>
                  <span className="text-red-600">-{formatCurrency(Math.round(selectedPayslip.grossSalary * 0.154))}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Impôt sur le revenu (5%)</span>
                  <span className="text-red-600">-{formatCurrency(Math.round(selectedPayslip.grossSalary * 0.05))}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Retraite complémentaire (3%)</span>
                  <span className="text-red-600">-{formatCurrency(Math.round(selectedPayslip.grossSalary * 0.03))}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Assurance maladie (2.6%)</span>
                  <span className="text-red-600">-{formatCurrency(Math.round(selectedPayslip.grossSalary * 0.026))}</span>
                </div>
                <div className="flex justify-between py-3 bg-green-50 dark:bg-green-950 rounded-lg px-3">
                  <span className="font-bold">Net à payer</span>
                  <span className="font-bold text-green-600 text-lg">{formatCurrency(selectedPayslip.netSalary)}</span>
                </div>
              </div>

              {selectedPayslip.status === "paid" && selectedPayslip.paidAt && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Payé le {new Date(selectedPayslip.paidAt).toLocaleDateString('fr-FR')}</span>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayslipDialog(false)}>Fermer</Button>
            <Button 
              className="gap-2"
              onClick={() => selectedPayslip && generatePayslipPDF(selectedPayslip)}
            >
              <Download className="h-4 w-4" />
              Télécharger PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
