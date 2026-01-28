import { Card, CardContent } from "@/components/ui/card";
import { Clock, FileCheck, DollarSign, Star, TrendingUp, TrendingDown } from "lucide-react";

interface KPIData {
  timeToFill: number;
  activeContracts: number;
  monthlyRevenue: number;
  satisfactionScore: number;
  trends: {
    timeToFill: number;
    activeContracts: number;
    monthlyRevenue: number;
    satisfactionScore: number;
  };
}

interface AgencyKPICardsProps {
  data?: KPIData;
  isLoading?: boolean;
}

export function AgencyKPICards({ data, isLoading }: AgencyKPICardsProps) {
  const defaultData: KPIData = {
    timeToFill: 18,
    activeContracts: 47,
    monthlyRevenue: 2850000,
    satisfactionScore: 4.6,
    trends: {
      timeToFill: -12,
      activeContracts: 8,
      monthlyRevenue: 15,
      satisfactionScore: 3,
    }
  };

  const kpiData = data || defaultData;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const kpis = [
    {
      title: "Time-to-fill moyen",
      value: `${kpiData.timeToFill} jours`,
      icon: Clock,
      trend: kpiData.trends.timeToFill,
      trendLabel: "vs mois dernier",
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Contrats Actifs",
      value: kpiData.activeContracts.toString(),
      icon: FileCheck,
      trend: kpiData.trends.activeContracts,
      trendLabel: "vs mois dernier",
      iconBg: "bg-green-100 dark:bg-green-900/30",
      iconColor: "text-green-600 dark:text-green-400",
    },
    {
      title: "CA du mois",
      value: formatCurrency(kpiData.monthlyRevenue),
      icon: DollarSign,
      trend: kpiData.trends.monthlyRevenue,
      trendLabel: "vs mois dernier",
      iconBg: "bg-amber-100 dark:bg-amber-900/30",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    {
      title: "Score Satisfaction",
      value: `${kpiData.satisfactionScore}/5`,
      icon: Star,
      trend: kpiData.trends.satisfactionScore,
      trendLabel: "vs mois dernier",
      iconBg: "bg-purple-100 dark:bg-purple-900/30",
      iconColor: "text-purple-600 dark:text-purple-400",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, index) => (
        <Card key={index} data-testid={`kpi-card-${index}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground truncate">{kpi.title}</p>
                <p className="text-2xl font-bold mt-1 truncate">{kpi.value}</p>
                <div className="flex items-center gap-1 mt-2">
                  {kpi.trend > 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className={`text-xs font-medium ${
                    kpi.trend > 0 ? "text-green-500" : "text-red-500"
                  }`}>
                    {kpi.trend > 0 ? "+" : ""}{kpi.trend}%
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {kpi.trendLabel}
                  </span>
                </div>
              </div>
              <div className={`p-2.5 rounded-lg ${kpi.iconBg} flex-shrink-0`}>
                <kpi.icon className={`h-5 w-5 ${kpi.iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
