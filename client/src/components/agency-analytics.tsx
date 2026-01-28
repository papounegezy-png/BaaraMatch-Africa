import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown,
  Briefcase,
  Target,
  Clock,
  DollarSign
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

const placementData = [
  { month: "Jan", placements: 12, revenue: 450 },
  { month: "Fév", placements: 15, revenue: 520 },
  { month: "Mar", placements: 18, revenue: 680 },
  { month: "Avr", placements: 14, revenue: 510 },
  { month: "Mai", placements: 22, revenue: 820 },
  { month: "Juin", placements: 28, revenue: 980 },
];

const contractTypes = [
  { name: "CDI", value: 45, color: "hsl(var(--primary))" },
  { name: "CDD", value: 30, color: "hsl(var(--accent))" },
  { name: "Stage", value: 15, color: "hsl(var(--secondary))" },
  { name: "Freelance", value: 10, color: "hsl(var(--muted-foreground))" },
];

const sectorData = [
  { sector: "Tech", count: 35 },
  { sector: "Finance", count: 22 },
  { sector: "Santé", count: 18 },
  { sector: "Commerce", count: 15 },
  { sector: "Industrie", count: 10 },
];

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: { value: number; isPositive: boolean };
  color?: string;
}

function KPICard({ title, value, subtitle, icon: Icon, trend, color }: KPICardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              {title}
            </p>
            <p className="text-2xl font-bold" data-testid={`kpi-${title.toLowerCase().replace(/\s+/g, '-')}`}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={`p-2.5 rounded-xl ${color || "bg-primary/10"}`}>
            <Icon className={`h-5 w-5 ${color ? "text-white" : "text-primary"}`} />
          </div>
        </div>
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            {trend.isPositive ? (
              <TrendingUp className="h-3 w-3 text-green-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500" />
            )}
            <span className={`text-xs font-medium ${trend.isPositive ? "text-green-500" : "text-red-500"}`}>
              {trend.isPositive ? "+" : ""}{trend.value}%
            </span>
            <span className="text-xs text-muted-foreground">vs mois dernier</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AgencyAnalytics() {
  const fillRate = 78;
  const activeContracts = 34;
  const pendingPlacements = 12;
  const monthlyRevenue = "2.4M";

  return (
    <div className="space-y-4 pb-20">
      <div className="grid grid-cols-2 gap-3">
        <KPICard
          title="Taux de remplissage"
          value={`${fillRate}%`}
          subtitle="Objectif: 85%"
          icon={Target}
          trend={{ value: 5, isPositive: true }}
        />
        <KPICard
          title="Contrats actifs"
          value={activeContracts}
          subtitle="8 nouveaux ce mois"
          icon={Briefcase}
          trend={{ value: 12, isPositive: true }}
        />
        <KPICard
          title="En attente"
          value={pendingPlacements}
          subtitle="Candidats à placer"
          icon={Clock}
          trend={{ value: -3, isPositive: true }}
        />
        <KPICard
          title="Revenus"
          value={`${monthlyRevenue}`}
          subtitle="FCFA ce mois"
          icon={DollarSign}
          trend={{ value: 18, isPositive: true }}
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Taux de remplissage</CardTitle>
            <Badge variant="secondary">{fillRate}%</Badge>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="space-y-3">
            <Progress value={fillRate} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>34 postes pourvus</span>
              <span>44 postes total</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Placements mensuels</CardTitle>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={placementData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="placementGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="placements"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#placementGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm">Types de contrat</CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={contractTypes}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={45}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {contractTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string) => [`${value}%`, name]}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '11px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {contractTypes.map((type) => (
                <div key={type.name} className="flex items-center gap-1">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: type.color }}
                  />
                  <span className="text-[10px] text-muted-foreground">{type.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm">Par secteur</CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectorData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis 
                    type="category" 
                    dataKey="sector" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                    width={50}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '11px'
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="hsl(var(--accent))" 
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Performance récente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Amadou Diallo</p>
                  <p className="text-xs text-muted-foreground">Placé chez TechAfrica - CDI</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">Hier</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Fatou Sow</p>
                  <p className="text-xs text-muted-foreground">Placée chez Orange - CDD</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">Il y a 2j</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Moussa Ndiaye</p>
                  <p className="text-xs text-muted-foreground">Entretien programmé - Wave</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">Demain</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
