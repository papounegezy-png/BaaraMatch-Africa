import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/kpi-card";
import { Users, Clock, Globe } from "lucide-react";

interface VisitorAnalytics {
  visitorsPerDay: { date: string; value: number }[];
  totalVisitors: number;
  avgDurationSeconds: number;
  countries: { code: string; name: string; count: number; percentage: number }[];
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}min ${remainingSeconds}s`;
}

// Super Admin's "who's actually visiting the site" panel — visitor count,
// time on site, and country, all derived from the real siteVisits table
// (see shared/schema.ts) rather than a third-party analytics embed.
export function VisitorAnalyticsCard() {
  const { data, isLoading } = useQuery<VisitorAnalytics>({
    queryKey: ["/api/admin/analytics/visitors"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/analytics/visitors");
      return res.json();
    },
  });

  const topCountry = data?.countries[0];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          testId="kpi-visitors"
          label="Visiteurs (30 derniers jours)"
          value={data?.totalVisitors ?? 0}
          icon={Users}
          isLoading={isLoading}
        />
        <KpiCard
          testId="kpi-visit-duration"
          label="Temps de visite moyen"
          value={isLoading ? 0 : formatDuration(data?.avgDurationSeconds ?? 0)}
          icon={Clock}
          isLoading={isLoading}
        />
        <KpiCard
          testId="kpi-top-country"
          label="Premier pays visiteur"
          value={topCountry ? topCountry.name : "-"}
          subText={topCountry ? `${topCountry.percentage}% des visiteurs` : undefined}
          icon={Globe}
          isLoading={isLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-500" />
            Visiteurs par pays
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : !data || data.countries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6" data-testid="text-countries-no-data">
              Pas encore de visites enregistrées.
            </p>
          ) : (
            <div className="space-y-3">
              {data.countries.slice(0, 8).map((country) => (
                <div key={country.code}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">{country.name}</span>
                    <span className="text-muted-foreground">
                      {country.count} visiteur{country.count > 1 ? "s" : ""} ({country.percentage}%)
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.max(4, country.percentage)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
