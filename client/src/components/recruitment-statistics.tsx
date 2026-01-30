import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  Target,
  Briefcase,
  CheckCircle2,
  XCircle,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Download,
  FileSpreadsheet,
  Globe,
  Linkedin,
  Building2,
  UserPlus,
} from "lucide-react";

const recruitmentStats = {
  totalApplications: 342,
  applicationsThisMonth: 89,
  applicationsTrend: +15,
  hiredThisMonth: 5,
  hiredTotal: 28,
  avgTimeToHire: 21,
  timeToHireTrend: -3,
  conversionRate: 24,
  conversionTrend: +5,
  openPositions: 12,
  closedPositions: 8,
};

const sourcesData = [
  { name: "Site carrières", value: 35, icon: Globe, color: "bg-blue-500" },
  { name: "LinkedIn", value: 28, icon: Linkedin, color: "bg-sky-500" },
  { name: "Agences", value: 18, icon: Building2, color: "bg-purple-500" },
  { name: "Cooptation", value: 12, icon: Users, color: "bg-green-500" },
  { name: "Autres", value: 7, icon: UserPlus, color: "bg-gray-500" },
];

const departmentStats = [
  { name: "Tech", openPositions: 5, applications: 124, hired: 3, avgDays: 18 },
  { name: "Marketing", openPositions: 2, applications: 56, hired: 1, avgDays: 25 },
  { name: "Ventes", openPositions: 3, applications: 89, hired: 2, avgDays: 15 },
  { name: "RH", openPositions: 1, applications: 34, hired: 1, avgDays: 22 },
  { name: "Finance", openPositions: 1, applications: 39, hired: 1, avgDays: 28 },
];

const pipelineConversion = [
  { stage: "CV reçus", count: 342, rate: 100 },
  { stage: "Présélection", count: 156, rate: 45.6 },
  { stage: "Entretien", count: 68, rate: 19.9 },
  { stage: "Offre", count: 35, rate: 10.2 },
  { stage: "Recrutés", count: 28, rate: 8.2 },
];

const monthlyData = [
  { month: "Août", applications: 65, hired: 3 },
  { month: "Sept", applications: 72, hired: 4 },
  { month: "Oct", applications: 58, hired: 2 },
  { month: "Nov", applications: 81, hired: 5 },
  { month: "Déc", applications: 76, hired: 4 },
  { month: "Jan", applications: 89, hired: 5 },
];

export function RecruitmentStatistics() {
  const stats = [
    { 
      title: "Candidatures totales", 
      value: recruitmentStats.totalApplications, 
      change: recruitmentStats.applicationsTrend,
      subtext: `+${recruitmentStats.applicationsThisMonth} ce mois`,
      icon: Users, 
      color: "text-blue-600" 
    },
    { 
      title: "Recrutés", 
      value: recruitmentStats.hiredTotal, 
      change: recruitmentStats.hiredThisMonth,
      subtext: `${recruitmentStats.hiredThisMonth} ce mois`,
      icon: CheckCircle2, 
      color: "text-green-600" 
    },
    { 
      title: "Délai moyen (jours)", 
      value: recruitmentStats.avgTimeToHire, 
      change: recruitmentStats.timeToHireTrend,
      subtext: "du dépôt à l'embauche",
      icon: Clock, 
      color: "text-purple-600" 
    },
    { 
      title: "Taux de conversion", 
      value: `${recruitmentStats.conversionRate}%`, 
      change: recruitmentStats.conversionTrend,
      subtext: "CV → Embauche",
      icon: Target, 
      color: "text-amber-600" 
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Statistiques de recrutement</h1>
          <p className="text-muted-foreground">Analysez les performances de vos recrutements</p>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue="6months">
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">Dernier mois</SelectItem>
              <SelectItem value="3months">3 derniers mois</SelectItem>
              <SelectItem value="6months">6 derniers mois</SelectItem>
              <SelectItem value="1year">Cette année</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exporter
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.subtext}</p>
                </div>
                <div className={`p-3 rounded-full bg-muted ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1 text-sm">
                {stat.change > 0 ? (
                  <>
                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">+{stat.change}%</span>
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">{stat.change}j</span>
                  </>
                )}
                <span className="text-muted-foreground">vs mois dernier</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Sources de candidatures
            </CardTitle>
            <CardDescription>Répartition par canal d'acquisition</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sourcesData.map((source) => (
                <div key={source.name} className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${source.color}`}>
                    <source.icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{source.name}</span>
                      <span className="text-sm text-muted-foreground">{source.value}%</span>
                    </div>
                    <Progress value={source.value} className="h-2" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Funnel de conversion
            </CardTitle>
            <CardDescription>Progression dans le pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pipelineConversion.map((stage, index) => (
                <div key={stage.stage}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{stage.stage}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{stage.count}</span>
                      <Badge variant="outline">{stage.rate}%</Badge>
                    </div>
                  </div>
                  <div className="h-8 rounded-lg bg-muted overflow-hidden">
                    <div 
                      className="h-full rounded-lg transition-all"
                      style={{ 
                        width: `${stage.rate}%`,
                        background: `linear-gradient(90deg, 
                          hsl(${260 - index * 30}, 70%, 60%) 0%, 
                          hsl(${260 - index * 30}, 70%, 50%) 100%)`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance par département</CardTitle>
          <CardDescription>Statistiques de recrutement par équipe</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Département</th>
                  <th className="text-center py-3 px-4 font-medium">Postes ouverts</th>
                  <th className="text-center py-3 px-4 font-medium">Candidatures</th>
                  <th className="text-center py-3 px-4 font-medium">Recrutés</th>
                  <th className="text-center py-3 px-4 font-medium">Taux conversion</th>
                  <th className="text-center py-3 px-4 font-medium">Délai moyen</th>
                </tr>
              </thead>
              <tbody>
                {departmentStats.map((dept) => (
                  <tr key={dept.name} className="border-b last:border-0">
                    <td className="py-3 px-4">
                      <span className="font-medium">{dept.name}</span>
                    </td>
                    <td className="text-center py-3 px-4">
                      <Badge variant="outline">{dept.openPositions}</Badge>
                    </td>
                    <td className="text-center py-3 px-4">{dept.applications}</td>
                    <td className="text-center py-3 px-4">
                      <span className="text-green-600 font-medium">{dept.hired}</span>
                    </td>
                    <td className="text-center py-3 px-4">
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                        {((dept.hired / dept.applications) * 100).toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className="text-muted-foreground">{dept.avgDays}j</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Évolution mensuelle
          </CardTitle>
          <CardDescription>Candidatures et recrutements sur les 6 derniers mois</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end gap-4">
            {monthlyData.map((month) => (
              <div key={month.month} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex gap-1 justify-center h-48">
                  <div 
                    className="w-8 bg-blue-500 rounded-t-lg transition-all"
                    style={{ height: `${(month.applications / 100) * 100}%` }}
                    title={`${month.applications} candidatures`}
                  />
                  <div 
                    className="w-8 bg-green-500 rounded-t-lg transition-all"
                    style={{ height: `${(month.hired / 6) * 100}%` }}
                    title={`${month.hired} recrutés`}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{month.month}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-6 mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500" />
              <span className="text-sm text-muted-foreground">Candidatures</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500" />
              <span className="text-sm text-muted-foreground">Recrutés</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Postes ouverts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-blue-600">{recruitmentStats.openPositions}</div>
            <p className="text-sm text-muted-foreground mt-1">en cours de recrutement</p>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Tech</span>
                <span className="font-medium">5</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Ventes</span>
                <span className="font-medium">3</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Marketing</span>
                <span className="font-medium">2</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Autres</span>
                <span className="font-medium">2</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Postes pourvus</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-600">{recruitmentStats.closedPositions}</div>
            <p className="text-sm text-muted-foreground mt-1">ce trimestre</p>
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span>Objectif trimestriel</span>
                <span>10</span>
              </div>
              <Progress value={80} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">80% de l'objectif atteint</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Satisfaction candidats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-purple-600">4.2<span className="text-lg">/5</span></div>
            <p className="text-sm text-muted-foreground mt-1">note moyenne</p>
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm flex-1">Processus clair</span>
                <Progress value={85} className="w-20 h-2" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm flex-1">Rapidité</span>
                <Progress value={72} className="w-20 h-2" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm flex-1">Communication</span>
                <Progress value={90} className="w-20 h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
