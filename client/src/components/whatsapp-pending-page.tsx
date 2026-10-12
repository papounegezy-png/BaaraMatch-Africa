import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageCircle } from "lucide-react";
import type { WhatsAppNotification } from "@shared/schema";

type PendingRow = WhatsAppNotification & { candidateName: string | null; jobTitle: string | null };

function formatWaiting(createdAt: string | Date | null) {
  if (!createdAt) return "-";
  const hours = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60));
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} j ${hours % 24} h`;
}

// Read-only backlog of WhatsApp status notifications waiting for the
// candidate to reopen Meta's 24h window (see server/whatsapp-bot.ts). In
// MVP the fallback for a long wait is a phone call, made outside the app.
export function WhatsAppPendingPage() {
  const { data: rows = [], isLoading } = useQuery<PendingRow[]>({
    queryKey: ["/api/admin/whatsapp-notifications/pending"],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-whatsapp-pending-title">Notifications WhatsApp en attente</h1>
        <p className="text-muted-foreground">
          Changements de statut non envoyés : le candidat ne nous a pas écrit depuis plus de 24h et aucun modèle WhatsApp
          validé n'est disponible. Ils partiront automatiquement à son prochain message ; en cas d'attente trop longue,
          appelez-le.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Notifications en attente</p>
          <p className="text-2xl font-bold" data-testid="text-whatsapp-pending-count">{rows.length}</p>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center space-y-3">
            <MessageCircle className="h-14 w-14 mx-auto text-muted-foreground/30" />
            <p className="font-medium text-lg">Aucune notification en attente</p>
            <p className="text-sm text-muted-foreground">Toutes les notifications WhatsApp ont pu être envoyées.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidat</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Offre</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>En attente depuis</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} data-testid={`row-whatsapp-pending-${row.id}`}>
                    <TableCell className="font-medium">{row.candidateName ?? "-"}</TableCell>
                    <TableCell className="font-mono text-sm whitespace-nowrap">+{row.phone.replace(/^\+/, "")}</TableCell>
                    <TableCell className="text-sm">{row.jobTitle ?? "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-md whitespace-pre-line">{row.message}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{formatWaiting(row.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
