import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Briefcase } from "lucide-react";
import { FieldMissionStatusBadge } from "@/components/field-mission-status-badge";
import { CreateFieldMissionModal } from "@/components/create-field-mission-modal";
import type { FieldMission, FieldMissionStatus } from "@shared/schema";

type MissionRow = FieldMission & { candidateName: string };
type TabKey = "all" | FieldMissionStatus;

function formatDate(date: Date | string | null) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("fr-FR");
}

export function FieldMissionsList() {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [createOpen, setCreateOpen] = useState(false);

  const { data: missions = [], isLoading } = useQuery<MissionRow[]>({
    queryKey: ["/api/agency/field-missions"],
  });

  const counts = {
    all: missions.length,
    planned: missions.filter((m) => m.status === "planned").length,
    in_progress: missions.filter((m) => m.status === "in_progress").length,
    completed: missions.filter((m) => m.status === "completed").length,
    disputed: missions.filter((m) => m.status === "disputed").length,
  };

  const filtered = activeTab === "all" ? missions : missions.filter((m) => m.status === activeTab);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-field-missions-title">Missions terrain</h1>
          <p className="text-muted-foreground">Suivez les missions de vos candidats placés chez vos clients</p>
        </div>
        <Button className="gap-2" onClick={() => setCreateOpen(true)} data-testid="button-new-mission">
          <Plus className="h-4 w-4" />
          Nouvelle mission
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : missions.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center space-y-4">
            <Briefcase className="h-14 w-14 mx-auto text-muted-foreground/30" />
            <div>
              <p className="font-medium text-lg">Aucune mission pour le moment</p>
              <p className="text-sm text-muted-foreground mt-1">Créez votre première mission pour suivre un candidat placé chez un client.</p>
            </div>
            <Button className="gap-2" onClick={() => setCreateOpen(true)} data-testid="button-create-first-mission">
              <Plus className="h-4 w-4" />
              Créer votre première mission
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
          <div className="overflow-x-auto pb-1">
            <TabsList className="w-max min-w-full">
              <TabsTrigger value="all" data-testid="tab-mission-all">Toutes ({counts.all})</TabsTrigger>
              <TabsTrigger value="planned" data-testid="tab-mission-planned">Planifiées ({counts.planned})</TabsTrigger>
              <TabsTrigger value="in_progress" data-testid="tab-mission-in-progress">En cours ({counts.in_progress})</TabsTrigger>
              <TabsTrigger value="completed" data-testid="tab-mission-completed">Terminées ({counts.completed})</TabsTrigger>
              <TabsTrigger value="disputed" data-testid="tab-mission-disputed">Litiges ({counts.disputed})</TabsTrigger>
            </TabsList>
          </div>

          <Card className="mt-4">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground py-10 text-center">Aucune mission dans cette catégorie.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Poste</TableHead>
                    <TableHead>Candidat</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((mission) => (
                    <TableRow
                      key={mission.id}
                      className={mission.status === "disputed" ? "border-l-4 border-l-destructive" : ""}
                      data-testid={`row-mission-${mission.id}`}
                    >
                      <TableCell>
                        <Link href={`/agency/placements/${mission.id}`} className="font-medium hover:underline" data-testid={`link-mission-${mission.id}`}>
                          {mission.jobTitle}
                        </Link>
                      </TableCell>
                      <TableCell>{mission.candidateName}</TableCell>
                      <TableCell>{mission.clientName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(mission.startDate)} → {formatDate(mission.plannedEndDate)}
                      </TableCell>
                      <TableCell><FieldMissionStatusBadge status={mission.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </Tabs>
      )}

      <CreateFieldMissionModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
