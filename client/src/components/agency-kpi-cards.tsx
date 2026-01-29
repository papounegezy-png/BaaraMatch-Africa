import { Card, CardContent } from "@/components/ui/card";
import { Users, AlertTriangle, TrendingUp, Clock, DollarSign } from "lucide-react";

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
      iconBg: "bg-blue-50 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Missions urgentes",
      value: kpiData.urgentMissions.toString(),
      icon: AlertTriangle,
      trend: kpiData.trends.urgentMissions,
      trendLabel: "vs mois dernier",
      trendPositive: false,
      iconBg: "bg-orange-50 dark:bg-orange-900/30",
      iconColor: "text-orange-500 dark:text-orange-400",
    },
    {
      title: "Candidats placés",
      value: kpiData.placedCandidates.toString(),
      icon: TrendingUp,
      trend: `+${kpiData.trends.placedCandidates}`,
      trendLabel: "ce mois",
      trendPositive: true,
      iconBg: "bg-green-50 dark:bg-green-900/30",
      iconColor: "text-green-600 dark:text-green-400",
    },
    {
      title: "En attente",
      value: kpiData.pendingApplications.toString(),
      icon: Clock,
      trend: `+${kpiData.trends.pendingApplications}`,
      trendLabel: "nouvelles",
      trendPositive: false,
      iconBg: "bg-purple-50 dark:bg-purple-900/30",
      iconColor: "text-purple-600 dark:text-purple-400",
    },
    {
      title: "Revenus",
      value: `${(kpiData.revenue / 1000000).toFixed(1)}M FCFA`,
      icon: DollarSign,
      trend: `+${kpiData.trends.revenue}%`,
      trendLabel: "vs mois dernier",
      trendPositive: true,
      iconBg: "bg-emerald-50 dark:bg-emerald-900/30",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="animate-pulse border border-gray-200 dark:border-gray-800">
            <CardContent className="p-6">
              <div className="h-32 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {kpis.map((kpi, index) => (
        <Card 
          key={index} 
          className="border border-gray-200 dark:border-gray-800 rounded-2xl"
          data-testid={`kpi-card-${index}`}
        >
          <CardContent className="p-6">
            <div className={`w-12 h-12 rounded-xl ${kpi.iconBg} flex items-center justify-center mb-4`}>
              <kpi.icon className={`h-6 w-6 ${kpi.iconColor}`} />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{kpi.title}</p>
            <p className="text-3xl font-semibold text-gray-900 dark:text-white mb-2">{kpi.value}</p>
            <div className="flex flex-wrap items-center gap-1">
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
