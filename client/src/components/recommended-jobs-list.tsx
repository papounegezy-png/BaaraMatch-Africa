import { Link } from "wouter";
import { Briefcase, Heart, MapPin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatJobType } from "@/lib/job-type-labels";
import { formatJobTitle } from "@/lib/format-job-title";
import type { JobPosting } from "@shared/schema";

export type RecommendedJob = JobPosting & {
  organizationName: string | null;
  // Both absent when the candidate has no profile yet: no score is shown
  // rather than a neutral/invented one.
  matchScore?: number;
  matchExplanation?: string;
};

/**
 * Dashboard "Offres recommandées": a few offers visible at once (replaces the
 * one-at-a-time swipe carousel). One filled action per offer ("Voir
 * l'offre"); saving is secondary and labelled, backed by /api/saved-jobs.
 * There is deliberately no "masquer" button: the app has no way to hide an
 * offer, and the old ✕ only moved the carousel.
 */
export function RecommendedJobsList({
  jobs,
  savedJobIds,
  onToggleSave,
  savePending = false,
}: {
  jobs: RecommendedJob[];
  savedJobIds: Set<string>;
  onToggleSave: (jobId: string) => void;
  savePending?: boolean;
}) {
  return (
    <ul className="space-y-3" data-testid="recommended-jobs">
      {jobs.map((job) => {
        const saved = savedJobIds.has(job.id);
        return (
          // bg-card (white), not bg-background: the grey secondary text is
          // 4.56:1 on white but only 4.09:1 on the light-blue page tint.
          <li key={job.id} className="rounded-xl border border-border/70 bg-card p-3" data-testid={`recommended-job-${job.id}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/jobs/${job.id}`} className="block truncate font-semibold hover:text-primary hover:underline">
                  {formatJobTitle(job.title)}
                </Link>
                {job.organizationName && <p className="truncate text-sm text-muted-foreground">{job.organizationName}</p>}
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {job.location && (
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" aria-hidden="true" />{formatJobTitle(job.location)}</span>
                  )}
                  <span className="inline-flex items-center gap-1"><Briefcase className="h-3 w-3" aria-hidden="true" />{formatJobType(job.jobType)}</span>
                </p>
              </div>
              {job.matchScore !== undefined && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-light px-2 py-0.5 text-xs font-semibold text-primary-dark">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  {job.matchScore} %
                </span>
              )}
            </div>
            {job.matchExplanation && (
              <p className="mt-1.5 text-xs text-muted-foreground" data-testid={`recommended-job-explanation-${job.id}`}>
                Correspondance : {job.matchExplanation}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/jobs/${job.id}`}>
                <Button size="sm" className="h-11 px-4" data-testid={`button-view-recommended-${job.id}`}>Voir l'offre</Button>
              </Link>
              <Button
                size="sm"
                variant="outline"
                className="h-11 gap-1.5 px-4"
                aria-pressed={saved}
                disabled={savePending}
                onClick={() => onToggleSave(job.id)}
                data-testid={`button-save-recommended-${job.id}`}
              >
                <Heart className={`h-4 w-4 ${saved ? "fill-current text-destructive" : ""}`} aria-hidden="true" />
                {saved ? "Enregistrée" : "Enregistrer"}
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
