import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";

type DailyMetric = { date: string; value: number };

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
}

function bucketByMonth(rows: DailyMetric[], monthsWindow: { key: string; label: string }[]): Map<string, number> {
  const totals = new Map(monthsWindow.map((m) => [m.key, 0]));
  for (const row of rows) {
    const key = monthKey(new Date(row.date));
    if (totals.has(key)) {
      totals.set(key, (totals.get(key) ?? 0) + row.value);
    }
  }
  return totals;
}

export function DashboardTrendChart() {
  const [monthsBack, setMonthsBack] = useState(6);

  const { from, to, monthsWindow } = useMemo(() => {
    const to = new Date();
    const monthsWindow: { key: string; label: string }[] = [];
    for (let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date(to.getFullYear(), to.getMonth() - i, 1);
      monthsWindow.push({ key: monthKey(d), label: monthLabel(d) });
    }
    const from = new Date(to.getFullYear(), to.getMonth() - (monthsBack - 1), 1);
    return { from, to, monthsWindow };
  }, [monthsBack]);

  const offresQuery = useQuery<DailyMetric[]>({
    queryKey: ["/api/admin/dashboard/metrics", "offres_publiees", from.toISOString(), to.toISOString()],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/dashboard/metrics?key=offres_publiees&from=${from.toISOString()}&to=${to.toISOString()}`);
      return res.json();
    },
  });

  const candidaturesQuery = useQuery<DailyMetric[]>({
    queryKey: ["/api/admin/dashboard/metrics", "candidatures_recues", from.toISOString(), to.toISOString()],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/dashboard/metrics?key=candidatures_recues&from=${from.toISOString()}&to=${to.toISOString()}`);
      return res.json();
    },
  });

  const isLoading = offresQuery.isLoading || candidaturesQuery.isLoading;

  const chartData = useMemo(() => {
    const offresByMonth = bucketByMonth(offresQuery.data ?? [], monthsWindow);
    const candidaturesByMonth = bucketByMonth(candidaturesQuery.data ?? [], monthsWindow);
    return monthsWindow.map((m) => ({
      month: m.label,
      offres: offresByMonth.get(m.key) ?? 0,
      candidatures: candidaturesByMonth.get(m.key) ?? 0,
    }));
  }, [monthsWindow, offresQuery.data, candidaturesQuery.data]);

  const hasAnyData = chartData.some((row) => row.offres > 0 || row.candidatures > 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap space-y-0">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-500" />
          Évolution offres & candidatures
        </CardTitle>
        <Select value={String(monthsBack)} onValueChange={(v) => setMonthsBack(Number(v))}>
          <SelectTrigger className="w-32" data-testid="select-trend-period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">3 mois</SelectItem>
            <SelectItem value="6">6 mois</SelectItem>
            <SelectItem value="12">12 mois</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : !hasAnyData ? (
          <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground text-center px-6" data-testid="text-trend-no-data">
            Pas encore de données sur cette période.
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Line type="monotone" dataKey="offres" stroke="#f97316" strokeWidth={2} name="Offres publiées" dot={{ fill: "#f97316", strokeWidth: 2 }} />
                <Line type="monotone" dataKey="candidatures" stroke="#8b5cf6" strokeWidth={2} name="Candidatures reçues" dot={{ fill: "#8b5cf6", strokeWidth: 2 }} />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
