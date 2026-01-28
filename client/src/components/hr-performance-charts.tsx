import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const placementTrendData = [
  { month: "Juil", placements: 12, objectif: 15 },
  { month: "Août", placements: 18, objectif: 15 },
  { month: "Sept", placements: 15, objectif: 18 },
  { month: "Oct", placements: 22, objectif: 20 },
  { month: "Nov", placements: 19, objectif: 20 },
  { month: "Déc", placements: 25, objectif: 22 },
  { month: "Jan", placements: 28, objectif: 25 },
];

const timeToFillData = [
  { sector: "Tech", days: 14 },
  { sector: "Finance", days: 21 },
  { sector: "Commerce", days: 18 },
  { sector: "Industrie", days: 25 },
  { sector: "Services", days: 16 },
];

const contractTypeData = [
  { name: "CDI", value: 45, color: "hsl(var(--chart-1))" },
  { name: "CDD", value: 30, color: "hsl(var(--chart-2))" },
  { name: "Intérim", value: 15, color: "hsl(var(--chart-3))" },
  { name: "Stage", value: 10, color: "hsl(var(--chart-4))" },
];

const revenueData = [
  { month: "Juil", revenue: 1200000 },
  { month: "Août", revenue: 1450000 },
  { month: "Sept", revenue: 1380000 },
  { month: "Oct", revenue: 1800000 },
  { month: "Nov", revenue: 2100000 },
  { month: "Déc", revenue: 2350000 },
  { month: "Jan", revenue: 2850000 },
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
};

export function HRPerformanceCharts() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card data-testid="chart-placements-trend">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tendance des Placements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={placementTrendData}>
                <defs>
                  <linearGradient id="colorPlacements" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="placements"
                  stroke="hsl(var(--chart-1))"
                  fill="url(#colorPlacements)"
                  strokeWidth={2}
                  name="Placements"
                />
                <Line
                  type="monotone"
                  dataKey="objectif"
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="5 5"
                  strokeWidth={1.5}
                  dot={false}
                  name="Objectif"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="chart-revenue">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Évolution du Chiffre d'Affaires</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--chart-2))"
                  fill="url(#colorRevenue)"
                  strokeWidth={2}
                  name="CA"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="chart-time-to-fill">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Time-to-fill par Secteur</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeToFillData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                <XAxis 
                  type="number"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  unit=" j"
                />
                <YAxis 
                  type="category"
                  dataKey="sector"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={80}
                />
                <Tooltip 
                  formatter={(value: number) => `${value} jours`}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar
                  dataKey="days"
                  fill="hsl(var(--chart-3))"
                  radius={[0, 4, 4, 0]}
                  name="Jours"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="chart-contract-types">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Répartition par Type de Contrat</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={contractTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {contractTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => `${value}%`}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => <span className="text-xs">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
