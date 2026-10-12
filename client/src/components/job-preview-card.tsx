import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { JobCard } from "@/components/job-card";

/**
 * Live "how candidates will see this" preview — feeds the real JobCard
 * directly from the current form values, no separate preview-only variant.
 */
export function JobPreviewCard({
  title,
  organizationName,
  location,
  jobType,
  skills,
}: {
  title: string;
  organizationName: string;
  location: string;
  jobType: string;
  skills: string[];
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">Aperçu candidat</CardTitle>
      </CardHeader>
      <CardContent>
        <JobCard job={{ title, organizationName, location, jobType, skills }} />
      </CardContent>
    </Card>
  );
}
