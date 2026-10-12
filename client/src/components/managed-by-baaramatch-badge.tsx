import { Badge } from "@/components/ui/badge";
import type { JobManagementType } from "@shared/schema";

/**
 * Internal-tracking signal for jobs an admin posted on behalf of an
 * organization — deliberately neutral gray, not a status color, so it never
 * reads as "approved"/"urgent"/etc. Whether to show this to candidates or
 * the public job board is a separate, deliberately undecided question (it
 * could read as reassuring — "relayed by the BaaraMatch team" — or as less
 * legitimate; worth validating with real user feedback before exposing it
 * outside admin/organization-facing screens). Only render this where the
 * viewer is BaaraMatch staff or the organization itself, never on public
 * job listings.
 */
export function ManagedByBaaraMatchBadge({ managementType }: { managementType?: JobManagementType | null }) {
  if (managementType !== "geree_par_baaramatch") {
    return null;
  }
  return (
    <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30 font-normal">
      Gérée par BaaraMatch
    </Badge>
  );
}
