import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  TrendingUp, 
  TrendingDown,
  Users,
  Briefcase,
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
  Building2,
  MapPin,
  Download,
  Filter,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Target
} from "lucide-react";

interface PlacementStats {
  totalPlacements: number;
  placementsThisMonth: number;
  successRate: number;
  avgTimeToPlacement: number;
  activeContracts: number;
  endingThisMonth: number;
  renewalRate: number;
  totalRevenue: string;
}

interface PlacementByStatus {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

interface PlacementBySector {
  sector: string;
  count: number;
  percentage: number;
  revenue: string;
}

interface RecentPlacement {
  id: string;
  candidateName: string;
  candidateTitle: string;
  companyName: string;
  sector: string;
  startDate: string;
  contractType: string;
  status: "active" | "pending" | "completed" | "cancelled";
  monthlyRate: string;
}

interface PlacementReportData {
  stats: PlacementStats;
  placementsByStatus: PlacementByStatus[];
  placementsBySector: PlacementBySector[];
  recentPlacements: RecentPlacement[];
  monthlyTrends: Array<{ month: string; placements: number; target: number }>;
}

const mockStats: PlacementStats = {
  totalPlacements: 156,
  placementsThisMonth: 12,
  successRate: 87,
  avgTimeToPlacement: 14,
  activeContracts: 89,
  endingThisMonth: 7,
  renewalRate: 72,
  totalRevenue: "1.2M XOF"
};

const mockPlacementsByStatus: PlacementByStatus[] = [
  { status: "Actifs", count: 89, percentage: 57, color: "bg-green-500" },
  { status: "En attente", count: 23, percentage: 15, color: "bg-amber-500" },
  { status: "Terminés", count: 38, percentage: 24, color: "bg-blue-500" },
  { status: "Annulés", count: 6, percentage: 4, color: "bg-red-500" },
];

const mockPlacementsBySector: PlacementBySector[] = [
  { sector: "Technologie & IT", count: 45, percentage: 29, revenue: "450K XOF" },
  { sector: "Finance & Banque", count: 32, percentage: 21, revenue: "380K XOF" },
  { sector: "Commerce & Distribution", count: 28, percentage: 18, revenue: "220K XOF" },
  { sector: "Industrie & Production", count: 24, percentage: 15, revenue: "180K XOF" },
  { sector: "Services & Conseil", count: 18, percentage: 12, revenue: "150K XOF" },
  { sector: "Autres", count: 9, percentage: 5, revenue: "70K XOF" },
];

const mockRecentPlacements: RecentPlacement[] = [
  {
    id: "1",
    candidateName: "Sophie Marchand",
    candidateTitle: "Développeur Full Stack Senior",
    companyName: "TechCorp Africa",
    sector: "Technologie & IT",
    startDate: "2026-01-15",
    contractType: "CDI",
    status: "active",
    monthlyRate: "850K XOF"
  },
  {
    id: "2",
    candidateName: "Amadou Diallo",
    candidateTitle: "Ingénieur DevOps",
    companyName: "FinBank Sénégal",
    sector: "Finance & Banque",
    startDate: "2026-01-10",
    contractType: "CDD 12 mois",
    status: "active",
    monthlyRate: "720K XOF"
  },
  {
    id: "3",
    candidateName: "Fatou Sow",
    candidateTitle: "UX Designer",
    companyName: "Orange Digital Center",
    sector: "Technologie & IT",
    startDate: "2026-01-08",
    contractType: "Mission",
    status: "pending",
    monthlyRate: "550K XOF"
  },
  {
    id: "4",
    candidateName: "Ibrahim Koné",
    candidateTitle: "Backend Engineer",
    companyName: "Wave Mobile Money",
    sector: "Finance & Banque",
    startDate: "2025-12-01",
    contractType: "CDI",
    status: "active",
    monthlyRate: "780K XOF"
  },
  {
    id: "5",
    candidateName: "Marie Laurent",
    candidateTitle: "Product Manager",
    companyName: "Jumia Sénégal",
    sector: "Commerce & Distribution",
    startDate: "2025-11-15",
    contractType: "CDD 6 mois",
    status: "completed",
    monthlyRate: "680K XOF"
  },
];

const monthlyTrends = [
  { month: "Août", placements: 8, target: 10 },
  { month: "Sept", placements: 11, target: 10 },
  { month: "Oct", placements: 9, target: 12 },
  { month: "Nov", placements: 14, target: 12 },
  { month: "Déc", placements: 10, target: 12 },
  { month: "Jan", placements: 12, target: 15 },
];

export function PlacementReports({ data }: { data?: PlacementReportData }) {
  const [period, setPeriod] = useState("month");
  const [sectorFilter, setSectorFilter] = useState("all");
  const reportData = data ?? {
    stats: mockStats,
    placementsByStatus: mockPlacementsByStatus,
    placementsBySector: mockPlacementsBySector,
    recentPlacements: mockRecentPlacements,
    monthlyTrends,
  };

  const filteredPlacements = sectorFilter === "all"
    ? reportData.recentPlacements
    : reportData.recentPlacements.filter((placement) => placement.sector === sectorFilter);

  const getStatusBadge = (status: RecentPlacement["status"]) => {
    const variants = {
      active: { label: "Actif", className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800" },
      pending: { label: "En attente", className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800" },
      completed: { label: "Terminé", className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800" },
      cancelled: { label: "Annulé", className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800" },
    };
    return variants[status];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row flex-wrap justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Rapports de Placement
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Vue d'ensemble des placements, performances et tendances
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-36" data-testid="select-period">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Cette semaine</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="quarter">Ce trimestre</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" data-testid="button-export-report">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-total-placements">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Placements</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{reportData.stats.totalPlacements}</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-green-600">+{reportData.stats.placementsThisMonth} ce mois</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-success-rate">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taux de Réussite</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{reportData.stats.successRate}%</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-green-600">+3% vs mois dernier</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Target className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-avg-time">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Délai Moyen</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{reportData.stats.avgTimeToPlacement}j</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowDownRight className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-green-600">-2j vs mois dernier</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-revenue">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Revenus Générés</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{reportData.stats.totalRevenue}</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-green-600">+15% vs mois dernier</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-status-distribution">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              Répartition par Statut
            </CardTitle>
            <CardDescription>Distribution des placements selon leur état actuel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {reportData.placementsByStatus.map((item) => (
              <div key={item.status} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${item.color}`} />
                    <span className="font-medium">{item.status}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{item.count}</span>
                    <span className="font-medium">{item.percentage}%</span>
                  </div>
                </div>
                <Progress value={item.percentage} className="h-2" />
              </div>
            ))}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Contrats actifs</span>
                <span className="font-bold text-lg">{reportData.stats.activeContracts}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-muted-foreground">Fin ce mois</span>
                <Badge variant="outline" className="text-amber-600">
                  {reportData.stats.endingThisMonth} contrats
                </Badge>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-muted-foreground">Taux de renouvellement</span>
                <span className="font-medium text-green-600">{reportData.stats.renewalRate}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-sector-distribution">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Performance par Secteur
            </CardTitle>
            <CardDescription>Placements et revenus par secteur d'activité</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {reportData.placementsBySector.map((item) => (
              <div key={item.sector} className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium truncate">{item.sector}</span>
                    <span className="text-muted-foreground ml-2">{item.count}</span>
                  </div>
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-medium text-green-600">{item.revenue}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-monthly-trends">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Tendance Mensuelle
          </CardTitle>
          <CardDescription>Évolution des placements vs objectifs sur les 6 derniers mois</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-2 h-48">
            {reportData.monthlyTrends.map((item) => {
              const placementHeight = (item.placements / 15) * 100;
              const targetHeight = (item.target / 15) * 100;
              const achieved = item.placements >= item.target;
              return (
                <div key={item.month} className="flex-1 flex flex-col items-center gap-2">
                  <div className="relative w-full h-40 flex items-end justify-center gap-1">
                    <div 
                      className={`w-5 rounded-t ${achieved ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ height: `${placementHeight}%` }}
                      title={`Placements: ${item.placements}`}
                    />
                    <div 
                      className="w-5 bg-gray-200 dark:bg-gray-700 rounded-t border-2 border-dashed border-gray-400"
                      style={{ height: `${targetHeight}%` }}
                      title={`Objectif: ${item.target}`}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium">{item.month}</p>
                    <p className={`text-xs ${achieved ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {item.placements}/{item.target}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded" />
              <span className="text-sm text-muted-foreground">Placements réalisés</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded" />
              <span className="text-sm text-muted-foreground">Objectif atteint</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-200 border-2 border-dashed border-gray-400 rounded" />
              <span className="text-sm text-muted-foreground">Objectif</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-recent-placements">
        <CardHeader>
          <div className="flex flex-col sm:flex-row flex-wrap justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Placements Récents</CardTitle>
              <CardDescription>Derniers placements effectués par l'agence</CardDescription>
            </div>
            <Select value={sectorFilter} onValueChange={setSectorFilter}>
              <SelectTrigger className="w-48" data-testid="select-sector-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrer par secteur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les secteurs</SelectItem>
                <SelectItem value="tech">Technologie & IT</SelectItem>
                <SelectItem value="finance">Finance & Banque</SelectItem>
                <SelectItem value="commerce">Commerce & Distribution</SelectItem>
                <SelectItem value="industry">Industrie & Production</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidat</TableHead>
                  <TableHead>Entreprise</TableHead>
                  <TableHead>Secteur</TableHead>
                  <TableHead>Date début</TableHead>
                  <TableHead>Contrat</TableHead>
                  <TableHead>Rémunération</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlacements.map((placement) => {
                  const statusBadge = getStatusBadge(placement.status);
                  return (
                    <TableRow key={placement.id} data-testid={`placement-row-${placement.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{placement.candidateName}</p>
                          <p className="text-sm text-muted-foreground">{placement.candidateTitle}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span>{placement.companyName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{placement.sector}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(placement.startDate)}</TableCell>
                      <TableCell>{placement.contractType}</TableCell>
                      <TableCell className="font-medium">{placement.monthlyRate}</TableCell>
                      <TableCell>
                        <Badge className={statusBadge.className}>
                          {statusBadge.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
