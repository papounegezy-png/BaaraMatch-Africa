import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Clock, AlertTriangle, Zap } from "lucide-react";
import type { ApplicationStatus } from "@shared/schema";

interface BoardCandidate {
  id: string;
  name: string;
  avatarUrl: string | null;
  title: string | null;
  skills: string[];
}

interface BoardCard {
  id: string;
  jobId: string;
  jobTitle: string;
  clientCompanyName: string | null;
  stage: ApplicationStatus;
  matchScore: number;
  isPriority: boolean;
  daysInStage: number;
  statusChangedAt: string;
  appliedAt: string | null;
  candidate: BoardCandidate | null;
}

interface KanbanColumn {
  key: string;
  label: string;
  statuses: ApplicationStatus[];
  // Status applied when a card from elsewhere is dropped on this column.
  // "Entretien" covers both interview_proposed and interview (the only two
  // interview states this app tracks) — dropping onto it always sets the
  // confirmed "interview" status, never invents a stage the data model
  // doesn't have.
  dropStatus: ApplicationStatus;
  accent: string;
}

const columns: KanbanColumn[] = [
  { key: "pending", label: "Nouveau", statuses: ["pending"], dropStatus: "pending", accent: "border-t-slate-400" },
  { key: "reviewing", label: "CV Examiné", statuses: ["reviewing"], dropStatus: "reviewing", accent: "border-t-blue-500" },
  { key: "shortlisted", label: "Présélectionné", statuses: ["shortlisted"], dropStatus: "shortlisted", accent: "border-t-violet-500" },
  { key: "interview", label: "Entretien", statuses: ["interview_proposed", "interview"], dropStatus: "interview", accent: "border-t-amber-500" },
  { key: "offered", label: "Offre envoyée", statuses: ["offered"], dropStatus: "offered", accent: "border-t-cyan-500" },
  { key: "hired", label: "Placé", statuses: ["hired"], dropStatus: "hired", accent: "border-t-green-500" },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function CandidateCardContent({ card }: { card: BoardCard }) {
  if (!card.candidate) {
    return <p className="text-sm text-muted-foreground">Candidat introuvable</p>;
  }
  return (
    <>
      <div className="flex items-start gap-2.5">
        <Avatar className="h-9 w-9 shrink-0">
          {card.candidate.avatarUrl && <AvatarImage src={card.candidate.avatarUrl} />}
          <AvatarFallback className="bg-gradient-to-br from-violet-500 to-pink-500 text-white text-xs">
            {getInitials(card.candidate.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{card.candidate.name}</p>
          <p className="text-xs text-muted-foreground truncate">{card.candidate.title ?? card.jobTitle}</p>
        </div>
      </div>
      <div className="mt-2">
        <Badge variant="secondary" className="text-xs font-normal">
          {card.clientCompanyName ?? card.jobTitle}
        </Badge>
      </div>
      {card.candidate.skills.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {card.candidate.skills.map((skill) => (
            <Badge key={skill} variant="outline" className="text-[10px] px-1.5 py-0">
              {skill}
            </Badge>
          ))}
        </div>
      )}
      <div className="mt-2.5 flex items-center gap-2 text-xs flex-wrap">
        <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
          <Zap className="h-3 w-3" />
          {card.matchScore}%
        </span>
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Clock className="h-3 w-3" />
          {card.daysInStage}j
        </span>
        {card.isPriority && (
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-0.5">
            <AlertTriangle className="h-2.5 w-2.5" />
            Prio
          </Badge>
        )}
      </div>
    </>
  );
}

function DraggableCandidateCard({ card }: { card: BoardCard }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 10 }
    : undefined;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-grab active:cursor-grabbing touch-none ${isDragging ? "opacity-40" : ""}`}
      data-testid={`card-application-${card.id}`}
    >
      <CardContent className="p-3">
        <CandidateCardContent card={card} />
      </CardContent>
    </Card>
  );
}

function DroppableColumn({ column, cards }: { column: KanbanColumn; cards: BoardCard[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key });

  return (
    <div className="flex-1 min-w-[260px] max-w-[300px]">
      <div className={`flex items-center justify-between mb-3 p-3 rounded-lg bg-muted border-t-4 ${column.accent}`}>
        <span className="font-medium text-sm">{column.label}</span>
        <Badge variant="outline">{cards.length}</Badge>
      </div>
      <div
        ref={setNodeRef}
        className={`space-y-2.5 min-h-[120px] rounded-lg p-1.5 transition-colors ${isOver ? "bg-primary/5 ring-2 ring-primary/30" : ""}`}
        data-testid={`column-${column.key}`}
      >
        {cards.length === 0 && (
          <div className="p-6 text-center text-muted-foreground text-xs border-2 border-dashed rounded-lg">
            Glisser un candidat
          </div>
        )}
        {cards.map((card) => (
          <DraggableCandidateCard key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, sublabel }: { label: string; value: string | number; sublabel?: string }) {
  return (
    <div className="flex-1 min-w-[140px] rounded-xl border bg-card p-4">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm font-medium">{label}</p>
      {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
    </div>
  );
}

// Shared presentational + data-fetching board, reused by both the company
// and agency pipelines below — same columns, same drag mechanics, same
// stage semantics, only the API base differs (each org only ever sees its
// own applications; enforced server-side, not just by which URL is called).
function RecruitmentKanbanBoard({ boardUrl }: { boardUrl: string }) {
  const { toast } = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const { data: cards = [], isLoading } = useQuery<BoardCard[]>({
    queryKey: [boardUrl],
  });

  const updateStageMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ApplicationStatus }) => {
      const res = await apiRequest("PATCH", `/api/applications/${id}`, { status });
      return res.json();
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: [boardUrl] });
      const previous = queryClient.getQueryData<BoardCard[]>([boardUrl]);
      queryClient.setQueryData<BoardCard[]>([boardUrl], (old) =>
        (old ?? []).map((card) => (card.id === id ? { ...card, stage: status, daysInStage: 0 } : card)),
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData([boardUrl], context.previous);
      toast({ title: "Erreur", description: "Impossible de déplacer ce candidat.", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [boardUrl] });
    },
  });

  const cardsByColumn = useMemo(() => {
    const map = new Map<string, BoardCard[]>(columns.map((col) => [col.key, []]));
    for (const card of cards) {
      const column = columns.find((col) => col.statuses.includes(card.stage));
      if (column) map.get(column.key)!.push(card);
    }
    return map;
  }, [cards]);

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const hiredThisMonth = cards.filter(
      (card) => card.stage === "hired" && new Date(card.statusChangedAt) >= monthStart,
    );
    const totalHired = cards.filter((card) => card.stage === "hired");
    const conversionRate = cards.length === 0 ? 0 : Math.round((totalHired.length / cards.length) * 100);
    const delays = totalHired
      .filter((card) => card.appliedAt)
      .map((card) => Math.max(0, Math.round((new Date(card.statusChangedAt).getTime() - new Date(card.appliedAt!).getTime()) / (1000 * 60 * 60 * 24))));
    const avgDelay = delays.length === 0 ? null : Math.round(delays.reduce((sum, d) => sum + d, 0) / delays.length);

    return {
      enPipeline: cards.length,
      placesCeMois: hiredThisMonth.length,
      conversionRate,
      avgDelay,
    };
  }, [cards]);

  const activeCard = cards.find((card) => card.id === activeId) ?? null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const card = cards.find((c) => c.id === active.id);
    const targetColumn = columns.find((col) => col.key === over.id);
    if (!card || !targetColumn) return;
    if (targetColumn.statuses.includes(card.stage)) return;
    updateStageMutation.mutate({ id: card.id, status: targetColumn.dropStatus });
  };

  if (isLoading) {
    return (
      <div className="flex gap-3">
        {columns.map((col) => (
          <Skeleton key={col.key} className="h-64 flex-1 min-w-[260px]" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <StatCard label="En pipeline" sublabel="candidats actifs" value={stats.enPipeline} />
        <StatCard label="Placés ce mois" sublabel="recrutements finalisés" value={stats.placesCeMois} />
        <StatCard label="Taux conversion" sublabel="Nouveau → Placé" value={`${stats.conversionRate}%`} />
        <StatCard label="Délai moyen" sublabel="candidature → placement" value={stats.avgDelay === null ? "-" : `${stats.avgDelay}j`} />
      </div>

      <div className="flex items-center gap-1.5 flex-wrap text-sm rounded-xl border bg-card px-4 py-3">
        <span className="text-muted-foreground shrink-0">Étapes :</span>
        {columns.map((col, index) => (
          <span key={col.key} className="inline-flex items-center gap-1.5">
            <Badge variant="outline" className="font-normal">
              {col.label} {cardsByColumn.get(col.key)?.length ?? 0}
            </Badge>
            {index < columns.length - 1 && <span className="text-muted-foreground">→</span>}
          </span>
        ))}
      </div>

      {cards.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground text-sm" data-testid="text-board-empty">
          Aucune candidature active pour le moment.
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {columns.map((column) => (
              <DroppableColumn key={column.key} column={column} cards={cardsByColumn.get(column.key) ?? []} />
            ))}
          </div>
          <DragOverlay>
            {activeCard && (
              <Card className="cursor-grabbing shadow-lg">
                <CardContent className="p-3">
                  <CandidateCardContent card={activeCard} />
                </CardContent>
              </Card>
            )}
          </DragOverlay>
        </DndContext>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Glissez-déposez les cartes entre les colonnes pour faire avancer les candidats dans le pipeline
      </p>
    </div>
  );
}

export function CompanyRecruitmentKanban() {
  return <RecruitmentKanbanBoard boardUrl="/api/company/applications-board" />;
}

export function AgencyRecruitmentKanban() {
  return <RecruitmentKanbanBoard boardUrl="/api/agency/applications-board" />;
}
