import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Briefcase } from "lucide-react";
import { formatJobType } from "@/lib/job-type-labels";

export type JobCardData = {
  title: string;
  organizationName: string;
  location: string;
  jobType: string;
  skills: string[];
};

/**
 * The candidate-facing job card — how a listing actually looks to a
 * candidate browsing offers. Reused directly (not duplicated) by
 * JobPreviewCard for the live "Aperçu candidat" panel in the offer form.
 */
export function JobCard({ job }: { job: JobCardData }) {
  return (
    <Card className="overflow-hidden" data-testid="job-card">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold truncate" data-testid="text-job-card-title">
              {job.title || "Titre du poste"}
            </h3>
            <p className="text-sm text-muted-foreground truncate" data-testid="text-job-card-organization">
              {job.organizationName || "Votre organisation"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {job.location && (
            <Badge variant="secondary" className="gap-1 text-xs">
              <MapPin className="h-3 w-3" />
              {job.location}
            </Badge>
          )}
          {job.jobType && (
            <Badge variant="secondary" className="gap-1 text-xs">
              <Briefcase className="h-3 w-3" />
              {formatJobType(job.jobType)}
            </Badge>
          )}
        </div>
        {job.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t">
            {job.skills.slice(0, 2).map((skill) => (
              <Badge key={skill} variant="outline" className="text-xs">
                {skill}
              </Badge>
            ))}
            {job.skills.length > 2 && (
              <span className="text-xs text-muted-foreground self-center">+{job.skills.length - 2}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
