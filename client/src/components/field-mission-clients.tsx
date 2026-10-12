import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2 } from "lucide-react";

type FieldMissionClient = {
  clientName: string;
  relationshipStartDate: string;
  activeMissionsCount: number;
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

// Read-only V0 client portfolio, derived from the agency's own field
// missions (clients aren't a managed entity yet — see the backend comment
// on getFieldMissionClientsByAgency). No management actions on this screen
// by design.
export function FieldMissionClients() {
  const { data: clients = [], isLoading } = useQuery<FieldMissionClient[]>({
    queryKey: ["/api/agency/field-missions/clients"],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-field-mission-clients-title">Mes clients</h1>
        <p className="text-muted-foreground">Clients avec qui vous avez placé au moins un candidat</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
        </div>
      ) : clients.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center space-y-3">
            <Building2 className="h-14 w-14 mx-auto text-muted-foreground/30" />
            <p className="font-medium text-lg">Aucun client pour le moment</p>
            <p className="text-sm text-muted-foreground">Les clients apparaissent ici dès qu'une mission leur est associée.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Relation depuis</TableHead>
                <TableHead>Missions actives</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.clientName} data-testid={`row-client-${client.clientName}`}>
                  <TableCell className="font-medium">{client.clientName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(client.relationshipStartDate)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{client.activeMissionsCount}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
