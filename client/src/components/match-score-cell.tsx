import { Progress } from "@/components/ui/progress";

// The V0 match score as shown in the company and agency applications
// lists (bar + percentage), with its one-line explanation underneath
// (shared/matching.ts's explainMatchScore, computed server-side).
export function MatchScoreCell({ score, explanation }: { score: number; explanation?: string | null }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Progress value={score} className="w-16 h-2" aria-label={`Score de matching ${score}%`} />
        <span className="text-sm font-medium">{score}%</span>
      </div>
      {explanation && (
        <p className="text-xs text-muted-foreground max-w-[200px]" data-testid="text-match-explanation">
          {explanation}
        </p>
      )}
    </div>
  );
}
