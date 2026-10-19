import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { LoadingState } from "@/components/loading-state";
import { invalidateCrm, useClients } from "@/components/agency-crm/shared";
import { FileText, AlertTriangle, Wallet, Search, Plus, MoreHorizontal } from "lucide-react";
import type { User, CandidateProfile } from "@shared/schema";
import { aideTauxCommission, useTauxCommissionPropose } from "@/hooks/use-taux-commission";

interface AgencyPlacementRow {
  id: string;
  contractNumber: string;
  candidateId: string;
  candidateName: string;
  candidateAvatarUrl: string | null;
  position: string | null;
  companyId: string | null;
  agencyClientId: string | null;
  companyName: string;
  contractType: string | null;
  status: "active" | "completed" | "terminated" | "on_leave";
  salary: number | null;
  salaryCurrency: string | null;
  startDate: string;
  endDate: string | null;
}


const contractTypes = ["CDI", "CDD", "Freelance"] as const;

const emptyContractForm = {
  candidateId: "",
  agencyClientId: "",
  position: "",
  contractType: "" as "" | (typeof contractTypes)[number],
  salary: "",
  startDate: "",
  endDate: "",
  commissionRate: "",
};

function formatCurrency(amount: number | null, currency: string | null) {
  if (amount === null) return "-";
  return new Intl.NumberFormat("fr-FR").format(amount) + " " + (currency ?? "XOF");
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("fr-FR");
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

// "Expiré" isn't a stored status — a placement can sit at status "active" in
// the DB past its own end date until someone closes it out. Deriving the
// display status from the real end date (rather than trusting a raw DB
// value nobody is required to keep in sync) is what makes the "Expiré"
// badge honest.
function getDisplayStatus(row: AgencyPlacementRow): "active" | "expired" | "completed" | "terminated" | "on_leave" {
  if (row.status === "active" && row.endDate && new Date(row.endDate).getTime() < Date.now()) {
    return "expired";
  }
  return row.status;
}

const statusBadge: Record<string, { label: string; className: string }> = {
  active: { label: "Actif", className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" },
  expired: { label: "Expiré", className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800" },
  completed: { label: "Terminé", className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800" },
  terminated: { label: "Résilié", className: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700" },
  on_leave: { label: "En pause", className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800" },
};

export function AgencyContractsPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | (typeof contractTypes)[number]>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "expired">("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  // Ending a contract is one-way (both actions are disabled once the
  // contract is no longer active) — confirm first.
  const [pendingStatusChange, setPendingStatusChange] = useState<{ contract: AgencyPlacementRow; status: "completed" | "terminated" } | null>(null);
  // Kept after the dialog closes (pendingStatusChange is already null by
  // then) so onCloseAutoFocus knows which row's button to refocus.
  const [statusDialogContractId, setStatusDialogContractId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyContractForm);

  const { data: placements = [], isLoading } = useQuery<AgencyPlacementRow[]>({
    queryKey: ["/api/agency/placements"],
  });
  // Clients come from the agency's own CRM fiches — never the platform-wide
  // company list. Any fiche works, registered on BaaraMatch or not.
  const { data: clients = [] } = useClients();
  const { data: candidates = [] } = useQuery<(User & { profile?: CandidateProfile })[]>({
    queryKey: ["/api/candidates"],
  });
  const selectableClients = clients.filter((client) => client.status !== "inactive");
  const [creatingClient, setCreatingClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");

  // Quick fiche creation without leaving the contract form — the usual case
  // for a client that isn't on BaaraMatch.
  const createClientMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/agency/clients", { name: newClientName.trim(), status: "active" })).json() as Promise<{ id: string; name: string }>,
    onSuccess: (client) => {
      invalidateCrm();
      setForm((current) => ({ ...current, agencyClientId: client.id }));
      setCreatingClient(false);
      setNewClientName("");
      toast({ title: "Client créé", description: `${client.name} a été ajouté à vos fiches entreprises.` });
    },
    onError: (error: Error) => toast({ title: "Création impossible", description: error.message, variant: "destructive" }),
  });

  // Taux proposé selon les réglages du client et le type de contrat.
  const tauxCommission = useTauxCommissionPropose(
    form.agencyClientId || null,
    form.contractType || null,
    (valeur) => setForm((current) => ({ ...current, commissionRate: valeur })),
    showCreateDialog,
  );

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/agency/placements", {
        candidateId: form.candidateId,
        agencyClientId: form.agencyClientId,
        position: form.position.trim(),
        contractType: form.contractType,
        salary: Number(form.salary),
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        // Champ vidé = aucune commission (null) ; le serveur n'applique son
        // taux par défaut que si le champ est absent.
        commissionRate: form.commissionRate ? Number(form.commissionRate) : null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agency/placements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/agency"] });
      invalidateCrm();
      toast({ title: "Contrat créé", description: "Le nouveau contrat a été enregistré avec succès." });
      setForm(emptyContractForm);
      setShowCreateDialog(false);
    },
    onError: (error: Error) => {
      toast({ title: "Impossible de créer le contrat", description: error.message, variant: "destructive" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "completed" | "terminated" }) => {
      const res = await apiRequest("PATCH", `/api/agency/placements/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agency/placements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/agency"] });
      toast({ title: "Contrat mis à jour" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de mettre à jour le contrat.", variant: "destructive" });
    },
  });

  const handleCreateSubmit = () => {
    if (!form.candidateId || !form.agencyClientId || !form.position.trim() || !form.contractType || !form.salary || !form.startDate) {
      toast({
        title: "Champs requis",
        description: "Employé, client, poste, type, salaire et date de début sont obligatoires.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate();
  };

  const activeContracts = placements.filter((p) => p.status === "active");
  const expiringSoon = activeContracts.filter((p) => {
    if (!p.endDate) return false;
    const daysLeft = Math.ceil((new Date(p.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysLeft >= 0 && daysLeft <= 30;
  });
  const totalActiveValue = activeContracts.reduce((sum, p) => sum + (p.salary ?? 0), 0);

  const filtered = placements.filter((p) => {
    const matchesSearch =
      !searchTerm ||
      p.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.contractNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || p.contractType === typeFilter;
    const displayStatus = getDisplayStatus(p);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && displayStatus === "active") ||
      (statusFilter === "expired" && displayStatus === "expired");
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Contrats</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Gestion des contrats actifs</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={(open) => { setShowCreateDialog(open); if (!open) setForm(emptyContractForm); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-contract">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau contrat
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nouveau contrat</DialogTitle>
              <DialogDescription>Enregistrez un placement pour un candidat chez un client</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="contract-candidate">Employé</Label>
                <Select value={form.candidateId} onValueChange={(v) => setForm({ ...form, candidateId: v })} disabled={candidates.length === 0}>
                  <SelectTrigger id="contract-candidate" data-testid="select-contract-candidate">
                    <SelectValue placeholder={candidates.length === 0 ? "Aucun candidat dans votre base" : "Sélectionner un candidat"} />
                  </SelectTrigger>
                  <SelectContent>
                    {candidates.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contract-company">Client</Label>
                {creatingClient ? (
                  <div className="flex gap-2">
                    <Input
                      autoFocus
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (newClientName.trim()) createClientMutation.mutate(); } }}
                      placeholder="Raison sociale du client"
                      data-testid="input-new-client-name"
                    />
                    <Button type="button" disabled={!newClientName.trim() || createClientMutation.isPending} onClick={() => createClientMutation.mutate()} data-testid="button-create-client">Créer</Button>
                    <Button type="button" variant="ghost" onClick={() => { setCreatingClient(false); setNewClientName(""); }}>Annuler</Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Select value={form.agencyClientId} onValueChange={(v) => setForm({ ...form, agencyClientId: v })}>
                      <SelectTrigger id="contract-company" data-testid="select-contract-company">
                        <SelectValue placeholder={selectableClients.length === 0 ? "Aucune fiche entreprise" : "Sélectionner un client"} />
                      </SelectTrigger>
                      <SelectContent>
                        {selectableClients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" className="shrink-0" onClick={() => setCreatingClient(true)} data-testid="button-new-client">
                      <Plus className="h-4 w-4" /> Nouveau
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Le client n'a pas besoin d'être inscrit sur BaaraMatch. Complétez sa fiche (adresse, RCCM, contacts) depuis{" "}
                  <Link href="/agency/companies" className="font-medium text-primary hover:underline">Fiches entreprises</Link>.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="contract-position">Poste</Label>
                  <Input
                    id="contract-position"
                    placeholder="Ex: Développeuse Full Stack"
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                    data-testid="input-contract-position"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="contract-type">Type</Label>
                  <Select value={form.contractType} onValueChange={(v) => setForm({ ...form, contractType: v as typeof form.contractType })}>
                    <SelectTrigger id="contract-type" data-testid="select-contract-type">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {contractTypes.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="contract-start">Date de début</Label>
                  <Input
                    id="contract-start"
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    data-testid="input-contract-start"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="contract-end">Date de fin (optionnel)</Label>
                  <Input
                    id="contract-end"
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    data-testid="input-contract-end"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="contract-salary">Salaire mensuel (FCFA)</Label>
                  <Input
                    id="contract-salary"
                    type="number"
                    placeholder="1500000"
                    value={form.salary}
                    onChange={(e) => setForm({ ...form, salary: e.target.value })}
                    data-testid="input-contract-salary"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="contract-commission">Commission (%) — optionnel</Label>
                  <Input
                    id="contract-commission"
                    type="number"
                    placeholder="10"
                    value={form.commissionRate}
                    onChange={(e) => { tauxCommission.marquerTouche(); setForm({ ...form, commissionRate: e.target.value }); }}
                    aria-describedby="contract-commission-aide"
                    data-testid="input-contract-commission"
                  />
                  <p id="contract-commission-aide" className="text-xs text-muted-foreground" data-testid="text-contract-commission-aide">
                    {aideTauxCommission(tauxCommission.propose, form.commissionRate)}
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Annuler</Button>
              <Button onClick={handleCreateSubmit} disabled={createMutation.isPending} data-testid="button-save-contract">
                {createMutation.isPending ? "Création..." : "Créer le contrat"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{activeContracts.length}</div>
              <p className="text-xs text-muted-foreground">Contrats actifs en cours d'exécution</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{expiringSoon.length}</div>
              <p className="text-xs text-muted-foreground">Expirations dans les 30 prochains jours</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{formatCurrency(totalActiveValue, "FCFA")}</div>
              <p className="text-xs text-muted-foreground">Masse salariale mensuelle active</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-wrap">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-search-contracts"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-lg border p-0.5">
            {(["all", ...contractTypes] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${typeFilter === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                data-testid={`filter-type-${t}`}
              >
                {t === "all" ? "Tous" : t}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg border p-0.5">
            {([
              { value: "all", label: "Tous" },
              { value: "active", label: "Actif" },
              { value: "expired", label: "Expiré" },
            ] as const).map((s) => (
              <button
                key={s.value}
                onClick={() => setStatusFilter(s.value)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${statusFilter === s.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                data-testid={`filter-status-${s.value}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Card className="border rounded-2xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° contrat</TableHead>
                  <TableHead>Employé</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Valeur</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Exp.</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-4">
                      <LoadingState label="Chargement des contrats" rows={3} />
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                      {placements.length === 0
                        ? "Aucun contrat pour le moment. Créez votre premier contrat."
                        : "Aucun contrat ne correspond à cette recherche."}
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((contract) => {
                  const displayStatus = getDisplayStatus(contract);
                  const daysLeft = contract.endDate
                    ? Math.ceil((new Date(contract.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    : null;
                  return (
                    <TableRow key={contract.id} data-testid={`row-contract-${contract.id}`}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{contract.contractNumber}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarFallback
                              className="text-white text-xs font-medium"
                              style={{ backgroundImage: "linear-gradient(135deg, rgb(81, 162, 255) 0%, rgb(21, 93, 252) 100%)" }}
                            >
                              {getInitials(contract.candidateName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{contract.candidateName}</p>
                            <p className="text-xs text-muted-foreground">{contract.position ?? "-"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{contract.companyName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{contract.contractType ?? "-"}</Badge>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {formatDate(contract.startDate)} → {formatDate(contract.endDate)}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{formatCurrency(contract.salary, contract.salaryCurrency)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`rounded-full px-3 py-1 text-xs font-medium ${statusBadge[displayStatus].className}`}>
                          {statusBadge[displayStatus].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {daysLeft === null ? (
                          "-"
                        ) : daysLeft < 0 ? (
                          "-"
                        ) : daysLeft <= 30 ? (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">{daysLeft}j</span>
                        ) : (
                          <span className="text-green-600 dark:text-green-400">{daysLeft}j restants</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-actions-${contract.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              disabled={contract.status !== "active"}
                              onClick={() => { setStatusDialogContractId(contract.id); setPendingStatusChange({ contract, status: "completed" }); }}
                            >
                              Marquer terminé
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={contract.status !== "active"}
                              className="text-red-600"
                              onClick={() => { setStatusDialogContractId(contract.id); setPendingStatusChange({ contract, status: "terminated" }); }}
                            >
                              Résilier
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

      <AlertDialog open={!!pendingStatusChange} onOpenChange={(open) => { if (!open) setPendingStatusChange(null); }}>
        <AlertDialogContent
          onCloseAutoFocus={(e) => {
            // Opened from a dropdown item (no AlertDialogTrigger): return focus
            // to that row's "…" actions button rather than <body>.
            if (!statusDialogContractId) return;
            const trigger = document.querySelector<HTMLElement>(`[data-testid="button-actions-${statusDialogContractId}"]`);
            if (trigger) { e.preventDefault(); trigger.focus(); }
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingStatusChange?.status === "terminated" ? "Résilier ce contrat ?" : "Marquer ce contrat comme terminé ?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingStatusChange && (
                <>
                  Contrat <strong>{pendingStatusChange.contract.contractNumber}</strong> de{" "}
                  <strong>{pendingStatusChange.contract.candidateName}</strong>
                  {pendingStatusChange.contract.position ? ` (${pendingStatusChange.contract.position})` : ""} chez{" "}
                  {pendingStatusChange.contract.companyName}.{" "}
                  {pendingStatusChange.status === "terminated"
                    ? "Il sera marqué « Résilié »."
                    : "Il sera marqué « Terminé »."}{" "}
                  Le contrat ne pourra plus être modifié depuis cet écran.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-contract-status">Annuler</AlertDialogCancel>
            <AlertDialogAction
              className={pendingStatusChange?.status === "terminated" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
              onClick={() => {
                if (pendingStatusChange) statusMutation.mutate({ id: pendingStatusChange.contract.id, status: pendingStatusChange.status });
                setPendingStatusChange(null);
              }}
              data-testid="button-confirm-contract-status"
            >
              {pendingStatusChange?.status === "terminated" ? "Résilier le contrat" : "Marquer terminé"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
