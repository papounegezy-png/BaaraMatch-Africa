import { Card, CardContent } from "@/components/ui/card";
import { Users, AlertTriangle, TrendingUp, Clock, DollarSign, ArrowUpRight } from "lucide-react";

interface KPIData {
  fillRate: number;
  urgentMissions: number;
  placedCandidates: number;
  pendingApplications: number;
  revenue: number;
  trends: {
    fillRate: number;
    urgentMissions: string;
    placedCandidates: number;
    pendingApplications: number;
    revenue: number;
  };
}

interface AgencyKPICardsProps {
  data?: KPIData;
  isLoading?: boolean;
}

export function AgencyKPICards({ data, isLoading }: AgencyKPICardsProps) {
  const defaultData: KPIData = {
    fillRate: 87,
    urgentMissions: 12,
    placedCandidates: 156,
    pendingApplications: 24,
    revenue: 4250000,
    trends: {
      fillRate: 5,
      urgentMissions: "3 nouvelles",
      placedCandidates: 12,
      pendingApplications: 8,
      revenue: 15,
    }
  };

  const kpiData = data || defaultData;

  const kpis = [
    {
      title: "Taux de remplissage",
      value: `${kpiData.fillRate}%`,
      icon: Users,
      trend: `+${kpiData.trends.fillRate}%`,
      trendLabel: "vs mois dernier",
      trendPositive: true,
      iconBg: "bg-sky-100 dark:bg-sky-900/30",
      iconColor: "text-sky-700 dark:text-sky-300",
      accent: "bg-sky-500",
    },
    {
      title: "Missions urgentes",
      value: kpiData.urgentMissions.toString(),
      icon: AlertTriangle,
      trend: kpiData.trends.urgentMissions,
      trendLabel: "vs mois dernier",
      trendPositive: false,
      iconBg: "bg-amber-100 dark:bg-amber-900/30",
      iconColor: "text-amber-700 dark:text-amber-300",
      accent: "bg-amber-500",
    },
    {
      title: "Candidats placés",
      value: kpiData.placedCandidates.toString(),
      icon: TrendingUp,
      trend: `+${kpiData.trends.placedCandidates}`,
      trendLabel: "ce mois",
      trendPositive: true,
      iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
      iconColor: "text-emerald-700 dark:text-emerald-300",
      accent: "bg-emerald-500",
    },
    {
      title: "En attente",
      value: kpiData.pendingApplications.toString(),
      icon: Clock,
      trend: `+${kpiData.trends.pendingApplications}`,
      trendLabel: "nouvelles",
      trendPositive: false,
      iconBg: "bg-violet-100 dark:bg-violet-900/30",
      iconColor: "text-violet-700 dark:text-violet-300",
      accent: "bg-violet-500",
    },
    {
      title: "Revenus",
      value: `${(kpiData.revenue / 1000000).toFixed(1)}M FCFA`,
      icon: DollarSign,
      trend: `+${kpiData.trends.revenue}%`,
      trendLabel: "vs mois dernier",
      trendPositive: true,
      iconBg: "bg-teal-100 dark:bg-teal-900/30",
      iconColor: "text-teal-700 dark:text-teal-300",
      accent: "bg-teal-500",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="animate-pulse border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="h-28 bg-muted rounded-xl" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
      {kpis.map((kpi, index) => (
        <Card 
          key={index} 
          className="relative overflow-hidden border-0 shadow-sm rounded-xl bg-card"
          data-testid={`kpi-card-${index}`}
        >
          <div className={`absolute inset-x-0 top-0 h-1 ${kpi.accent}`} />
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className={`w-10 h-10 rounded-lg ${kpi.iconBg} flex items-center justify-center`}>
                <kpi.icon className={`h-5 w-5 ${kpi.iconColor}`} />
              </div>
              <ArrowUpRight className={`h-4 w-4 ${kpi.trendPositive ? "text-emerald-600" : "text-amber-600"}`} />
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{kpi.title}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{kpi.value}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1 text-xs">
              <span className={`text-sm font-medium ${
                kpi.trendPositive ? "text-green-600 dark:text-green-400" : "text-orange-500 dark:text-orange-400"
              }`}>
                {kpi.trend}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {kpi.trendLabel}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
