import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Copy, Check, Ticket, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { InvitationCode } from "@shared/schema";

type InvitationCodeRow = InvitationCode & { organizationName: string | null };

function formatDate(date: string | Date | null) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      data-testid={`button-copy-${text}`}
    >
      {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}

export function InvitationCodesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [trialDays, setTrialDays] = useState("90");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  const { data: codes = [], isLoading } = useQuery<InvitationCodeRow[]>({
    queryKey: ["/api/admin/invitation-codes"],
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/invitation-codes", {
        targetPlan: "partner",
        trialDays: Number(trialDays),
      });
      return response.json() as Promise<InvitationCode>;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/invitation-codes"] });
      setGeneratedCode(created.code);
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message || "Impossible de générer le code.", variant: "destructive" });
    },
  });

  const closeDialog = (open: boolean) => {
    setCreateOpen(open);
    if (!open) {
      setGeneratedCode(null);
      setTrialDays("90");
    }
  };

  const available = codes.filter((c) => !c.isUsed).length;
  const used = codes.filter((c) => c.isUsed).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-invitation-codes-title">Codes d'invitation pilotes</h1>
          <p className="text-muted-foreground">Génère un code à transmettre à une agence pilote pour une activation directe en Agence Partenaire</p>
        </div>
        <Button className="gap-2" onClick={() => setCreateOpen(true)} data-testid="button-generate-code">
          <Plus className="h-4 w-4" />
          Générer un code
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Codes disponibles</p>
            <p className="text-2xl font-bold" data-testid="text-codes-available">{available}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Codes utilisés</p>
            <p className="text-2xl font-bold" data-testid="text-codes-used">{used}</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
        </div>
      ) : codes.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center space-y-3">
            <Ticket className="h-14 w-14 mx-auto text-muted-foreground/30" />
            <p className="font-medium text-lg">Aucun code généré pour le moment</p>
            <p className="text-sm text-muted-foreground">Génère un code pour l'envoyer à une agence pilote par téléphone ou WhatsApp.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Essai</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Créé le</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.map((code) => (
                <TableRow key={code.id} data-testid={`row-invitation-code-${code.code}`}>
                  <TableCell className="font-mono font-medium flex items-center gap-1">
                    {code.code}
                    <CopyButton text={code.code} />
                  </TableCell>
                  <TableCell className="capitalize">{code.targetPlan}</TableCell>
                  <TableCell>{code.trialDays} jours</TableCell>
                  <TableCell>
                    {code.isUsed ? (
                      <Badge variant="secondary">Utilisé</Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-700 border-0">Disponible</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{code.organizationName ?? "-"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(code.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={createOpen} onOpenChange={closeDialog}>
        <DialogContent data-testid="dialog-generate-code">
          {generatedCode ? (
            <>
              <DialogHeader>
                <DialogTitle>Code généré</DialogTitle>
                <DialogDescription>Transmets ce code à l'agence pilote par téléphone ou WhatsApp — il ne sera plus affiché après fermeture.</DialogDescription>
              </DialogHeader>
              <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 p-4">
                <span className="font-mono text-lg font-bold" data-testid="text-generated-code">{generatedCode}</span>
                <CopyButton text={generatedCode} />
              </div>
              <DialogFooter>
                <Button onClick={() => closeDialog(false)} data-testid="button-close-generated-code">Terminé</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Générer un code d'invitation</DialogTitle>
                <DialogDescription>Le code activera le plan Agence Partenaire avec la période d'essai indiquée.</DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5">
                <Label htmlFor="trial-days">Durée d'essai (jours)</Label>
                <Input
                  id="trial-days"
                  type="number"
                  min={1}
                  autoFocus
                  value={trialDays}
                  onChange={(e) => setTrialDays(e.target.value)}
                  data-testid="input-trial-days"
                />
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => closeDialog(false)} data-testid="button-cancel-generate-code">Annuler</Button>
                <Button
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending || !trialDays || Number(trialDays) <= 0}
                  data-testid="button-confirm-generate-code"
                >
                  {generateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Générer
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
