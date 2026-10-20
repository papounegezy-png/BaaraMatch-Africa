import { useLocation, Link } from "wouter";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import {
  Building2,
  Users,
  Briefcase,
  TrendingUp,
  Search,
  Settings,
  ToggleRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  HardHat,
  Shield,
  Wrench,
  FileCheck,
  UserCheck,
  Eye,
  Edit,
  Clock,
  Flag,
  MessageSquare,
  Image as ImageIcon,
  FileText,
  ScrollText,
  Plus,
  Copy,
  Building,
  ShieldCheck,
  ArrowLeft,
  MapPin as MapPinIcon,
  Banknote,
  LayoutDashboard,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiRequest, type ApiError } from "@/lib/queryClient";
import { VerificationEmployeur } from "@/components/verification-employeur";
import { useToast } from "@/hooks/use-toast";
import { hasAdminPermission } from "@shared/schema";
import { OrganisationPickerOrCreate, type PickedOrganization } from "@/components/organization-picker-or-create";
import { OfferForm, champsOffreComplementaires, type OfferFormValue, type OfferSaveResult } from "@/components/offer-form";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingState } from "@/components/loading-state";
import { KpiCard } from "@/components/kpi-card";
import { InvitationCodesPage } from "@/components/invitation-codes-page";
import { WhatsAppPendingPage } from "@/components/whatsapp-pending-page";
import { TopListCard } from "@/components/top-list-card";
import { DashboardTrendChart } from "@/components/dashboard-trend-chart";
import { VisitorAnalyticsCard } from "@/components/visitor-analytics-card";
import { ConversionFunnel } from "@/components/conversion-funnel";
import { ExportCurrentViewButton } from "@/components/export-current-view-button";
import { ExportStatusBadge } from "@/components/export-status-badge";
import { GenererRapportModal, type ReportTemplate, type ReportExportSummary } from "@/components/generer-rapport-modal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const modulesList = [
  {
    id: "sites",
    name: "Gestion des Chantiers/Sites",
    description: "Affectation du personnel, rotations, hébergements",
    icon: HardHat,
    color: "bg-amber-500",
  },
  {
    id: "certifications",
    name: "Habilitations & Certifications",
    description: "CACES, permis, visites médicales, alertes expiration",
    icon: FileCheck,
    color: "bg-blue-500",
  },
  {
    id: "epi",
    name: "EPI & Équipements",
    description: "Attribution, suivi conformité, inventaire",
    icon: Shield,
    color: "bg-green-500",
  },
  {
    id: "hse",
    name: "HSE (Hygiène, Sécurité, Environnement)",
    description: "Incidents, statistiques sécurité, formations",
    icon: AlertTriangle,
    color: "bg-red-500",
  },
  {
    id: "interim",
    name: "Intérimaires/Sous-traitants",
    description: "Gestion des contrats temporaires et prestataires",
    icon: UserCheck,
    color: "bg-purple-500",
  },
];

type AdminOverviewResponse = {
  stats: {
    totalCompanies: number;
    activeCompanies: number;
    totalAgencies: number;
    totalUsers: number;
    companiesWithModules: number;
    pendingVerifications: number;
  };
  recentCompanies: Array<{
    id: string;
    name: string;
    industry: string;
    status: "active" | "pending";
    contact: string;
    createdAt: string;
    modulesEnabled: boolean;
  }>;
  userGrowth: Array<{
    month: string;
    candidates: number;
    companies: number;
    agencies: number;
    admins: number;
  }>;
  moduleUsage: Array<{
    moduleType: string;
    count: number;
  }>;
};

type AdminCompany = {
  id: string;
  profileId: string | null;
  name: string;
  industry: string;
  employeeCount: string;
  status: "active" | "pending";
  // Vérification BaaraMatch (badge des offres) ; null : non vérifiée.
  verifiedAt: string | null;
  createdAt: string;
  contact: string;
  country: string | null;
  city: string | null;
  modules: string[];
};

type AdminAgency = {
  id: string;
  name: string;
  email: string;
  city: string | null;
  country: string | null;
  status: "verified" | "pending";
  verifiedAt: string | null;
  licenseNumber: string | null;
  specializations: string[];
  totalPlacements: number;
  subscriptionPlan: "standard" | "partner";
  // Fin de l’essai de lancement ; null = plan choisi à la main (définitif).
  partnerTrialEndsAt: string | null;
  createdAt: string;
};

type AdminCandidateListItem = {
  id: string;
  name: string;
  email: string;
  city: string | null;
  country: string | null;
  status: "verified" | "pending";
  title: string | null;
  createdAt: string;
};

type AdminUserRecord = {
  id: string;
  name: string;
  email: string;
  userType: string;
  city: string | null;
  country: string | null;
  isVerified: boolean;
  createdAt: string;
};

type AdminModerationItem = {
  id: string;
  targetType: "profile" | "job" | "message" | "document";
  targetEntityId: string | null;
  targetUserId: string | null;
  targetLabel: string;
  targetUserType: string | null;
  targetOrgName: string | null;
  reason: string;
  reportedBy: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

type AdminActivityLog = {
  id: string;
  action: string;
  userId: string | null;
  userLabel: string;
  ipAddress: string | null;
  status: "success" | "warning" | "error";
  details: string | null;
  targetType: string | null;
  targetId: string | null;
  targetLabel: string | null;
  createdAt: string;
};

function AdminLoadingState({ title }: { title: string }) {
  return (
    <Card>
      <CardContent className="py-6">
        <LoadingState label={title} />
      </CardContent>
    </Card>
  );
}

function GeographicBreakdown() {
  const jobsQuery = useQuery<{ location: string }[]>({ queryKey: ["/api/jobs"] });

  const topCities = (() => {
    const counts = new Map<string, number>();
    for (const job of jobsQuery.data ?? []) {
      const city = job.location?.trim() || "Non renseignée";
      counts.set(city, (counts.get(city) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  })();

  const maxCount = Math.max(1, ...topCities.map(([, count]) => count));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPinIcon className="h-5 w-5 text-orange-500" />
          Offres par ville (top 5)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {jobsQuery.isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
        ) : topCities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6" data-testid="text-geo-no-data">
            Pas encore d'offres publiées.
          </p>
        ) : (
          <div className="space-y-3">
            {topCities.map(([city, count]) => (
              <div key={city}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium">{city}</span>
                  <span className="text-muted-foreground">{count} offre{count > 1 ? "s" : ""}</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.max(4, Math.round((count / maxCount) * 100))}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// The real, live-data analytics screen — kept separate from the main
// "Tableau de bord" landing page so that page stays a light, quick overview
// instead of getting saturated with KPI rows, charts, and a funnel.
function AdminStatisticsPage() {
  const kpisQuery = useQuery<{
    activeOrganizations: number;
    jobsPublishedThisMonth: number;
    applicationsReceivedThisMonth: number;
    missionsInProgress: number;
    jobsPendingValidation: number;
    mrrEstimatedFcfa: number;
  }>({ queryKey: ["/api/admin/dashboard/kpis"] });
  const kpis = kpisQuery.data;

  const topEmployersQuery = useQuery<{ id: string; name: string; jobCount: number }[]>({
    queryKey: ["/api/admin/dashboard/top-employers"],
  });
  const topJobCategoriesQuery = useQuery<{ category: string; count: number }[]>({
    queryKey: ["/api/admin/dashboard/top-job-categories"],
  });
  const topVisitedOrganizationsQuery = useQuery<{ id: string; name: string; userType: "company" | "agency"; viewCount: number }[]>({
    queryKey: ["/api/admin/dashboard/top-visited-organizations"],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-statistics-title">Statistiques</h1>
          <p className="text-muted-foreground">Indicateurs et tendances de la plateforme BaaraMatch Africa</p>
        </div>
        <ExportCurrentViewButton />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard testId="kpi-active-organizations" label="Organisations actives" value={kpis?.activeOrganizations ?? 0} icon={Building2} isLoading={kpisQuery.isLoading} />
        <KpiCard testId="kpi-jobs-published" label="Offres publiées (mois)" value={kpis?.jobsPublishedThisMonth ?? 0} icon={Briefcase} isLoading={kpisQuery.isLoading} />
        <KpiCard testId="kpi-applications-received" label="Candidatures reçues (mois)" value={kpis?.applicationsReceivedThisMonth ?? 0} icon={Users} isLoading={kpisQuery.isLoading} />
        <KpiCard testId="kpi-missions-in-progress" label="Missions en cours" value={kpis?.missionsInProgress ?? 0} icon={TrendingUp} isLoading={kpisQuery.isLoading} />
        <KpiCard
          testId="kpi-mrr"
          label="MRR estimé"
          value={kpisQuery.isLoading ? 0 : `${(kpis?.mrrEstimatedFcfa ?? 0).toLocaleString("fr-FR")} FCFA`}
          icon={Banknote}
          isLoading={kpisQuery.isLoading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardTrendChart />
        <ConversionFunnel />
      </div>

      <VisitorAnalyticsCard />

      <GeographicBreakdown />

      <div className="grid gap-4 lg:grid-cols-3">
        <TopListCard
          testId="top-employers"
          title="Top employeurs"
          icon={Building2}
          iconColorClass="text-primary"
          barColorClass="bg-primary"
          isLoading={topEmployersQuery.isLoading}
          items={(topEmployersQuery.data ?? []).map((employer) => ({
            id: employer.id,
            label: employer.name,
            value: employer.jobCount,
          }))}
          valueLabel={(value) => `${value} offre${value > 1 ? "s" : ""}`}
          emptyMessage="Aucune offre publiée pour le moment."
        />
        <TopListCard
          testId="top-job-categories"
          title="Profils recherchés"
          icon={UserCheck}
          iconColorClass="text-purple-600"
          barColorClass="bg-purple-600"
          isLoading={topJobCategoriesQuery.isLoading}
          items={(topJobCategoriesQuery.data ?? []).map((row) => ({
            id: row.category,
            label: row.category,
            value: row.count,
          }))}
          valueLabel={(value) => `${value} offre${value > 1 ? "s" : ""}`}
          emptyMessage="Aucune offre publiée pour le moment."
        />
        <TopListCard
          testId="top-visited-organizations"
          title="Organisations les plus visitées"
          icon={Eye}
          iconColorClass="text-blue-600"
          barColorClass="bg-blue-600"
          isLoading={topVisitedOrganizationsQuery.isLoading}
          items={(topVisitedOrganizationsQuery.data ?? []).map((org) => ({
            id: org.id,
            label: org.name,
            sublabel: org.userType === "agency" ? "Agence" : "Entreprise",
            value: org.viewCount,
          }))}
          valueLabel={(value) => `${value} vue${value > 1 ? "s" : ""}`}
          emptyMessage="Aucune visite de profil enregistrée pour le moment."
        />
      </div>
    </div>
  );
}

function DashboardOverview({
  overview,
  moderationItems,
  moderationLoading,
}: {
  overview?: AdminOverviewResponse;
  moderationItems: AdminModerationItem[];
  moderationLoading: boolean;
}) {
  const pendingModeration = moderationItems.filter((item) => item.status === "pending");

  const recentCompanies = overview?.recentCompanies ?? [];
  // Real data only — no fabricated fallback while the overview query is
  // still loading (a brief flash of invented numbers is still invented).
  const growthData = overview?.userGrowth ?? [];
  const monthlyTotals = growthData.map((entry) => entry.candidates + entry.companies + entry.agencies + entry.admins);
  const lastMonthTotal = monthlyTotals[monthlyTotals.length - 1] ?? 0;
  const previousMonthTotal = monthlyTotals[monthlyTotals.length - 2] ?? 0;
  const growthPercent = previousMonthTotal > 0
    ? Math.round(((lastMonthTotal - previousMonthTotal) / previousMonthTotal) * 100)
    : null;

  const [, setLocation] = useLocation();
  const kpisQuery = useQuery<{
    activeOrganizations: number;
    jobsPublishedActive: number;
    applicationsReceivedThisMonth: number;
    missionsInProgress: number;
    jobsPendingValidation: number;
    jobsPendingValidationOverdue: number;
  }>({ queryKey: ["/api/admin/dashboard/kpis"] });
  const dashboardKpis = kpisQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-admin-title">Tableau de bord Super Admin</h1>
          <p className="text-muted-foreground">Vue d'ensemble de la plateforme BaaraMatch Africa</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => kpisQuery.refetch()}
          disabled={kpisQuery.isFetching}
          data-testid="button-refresh-kpis"
        >
          <RefreshCw className={`h-4 w-4 ${kpisQuery.isFetching ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          testId="kpi-organisations-actives"
          label="Organisations actives"
          value={dashboardKpis?.activeOrganizations ?? 0}
          icon={Building2}
          isLoading={kpisQuery.isLoading}
          isError={kpisQuery.isError}
        />
        <KpiCard
          testId="kpi-offres-publiees"
          label="Offres publiées"
          value={dashboardKpis?.jobsPublishedActive ?? 0}
          icon={Briefcase}
          isLoading={kpisQuery.isLoading}
          isError={kpisQuery.isError}
        />
        <KpiCard
          testId="kpi-candidatures-mois"
          label="Candidatures ce mois"
          value={dashboardKpis?.applicationsReceivedThisMonth ?? 0}
          icon={Users}
          isLoading={kpisQuery.isLoading}
          isError={kpisQuery.isError}
        />
        <KpiCard
          testId="kpi-missions-en-cours"
          label="Missions en cours"
          value={dashboardKpis?.missionsInProgress ?? 0}
          icon={TrendingUp}
          isLoading={kpisQuery.isLoading}
          isError={kpisQuery.isError}
        />
        <button
          type="button"
          className="text-left"
          onClick={() => setLocation("/admin/moderation")}
          data-testid="button-kpi-offres-en-attente"
        >
          <KpiCard
            testId="kpi-offres-en-attente"
            label="Offres en attente de validation"
            value={dashboardKpis?.jobsPendingValidation ?? 0}
            icon={AlertTriangle}
            isLoading={kpisQuery.isLoading}
            isError={kpisQuery.isError}
            subText={
              (dashboardKpis?.jobsPendingValidationOverdue ?? 0) > 0
                ? `${dashboardKpis!.jobsPendingValidationOverdue} en retard (> 24h)`
                : "Cliquer pour ouvrir la file de validation"
            }
            subTextClassName={(dashboardKpis?.jobsPendingValidationOverdue ?? 0) > 0 ? "text-red-600 font-medium" : undefined}
          />
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Entreprises récentes</CardTitle>
            <CardDescription>Dernières inscriptions sur la plateforme</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentCompanies.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune entreprise enregistrée.</p>
              ) : recentCompanies.map((company) => (
                <div key={company.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium">{company.name}</p>
                      <p className="text-sm text-muted-foreground">{company.industry}</p>
                    </div>
                  </div>
                  <Badge variant={company.status === "active" ? "default" : "secondary"}>
                    {company.status === "active" ? "Actif" : "En attente"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Modules disponibles</CardTitle>
            <CardDescription>Modules spéciaux BTP/Mines</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {modulesList.map((module) => (
                <div key={module.id} className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${module.color} flex items-center justify-center`}>
                    <module.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{module.name}</p>
                    <p className="text-xs text-muted-foreground">{module.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Croissance Utilisateurs — the "Distribution Matching IA" chart that
          used to sit alongside this was always a hardcoded mock array;
          POST /api/matching/results (the only writer of matchingResults) is
          never called from anywhere in the client, so that table is
          realistically empty. Removed rather than left faking a result. */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Croissance Utilisateurs
          </CardTitle>
          <CardDescription>Évolution des inscriptions sur 7 mois</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="candidates"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  name="Candidats"
                  dot={{ fill: '#8b5cf6', strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="companies"
                  stroke="#f97316"
                  strokeWidth={2}
                  name="Entreprises"
                  dot={{ fill: '#f97316', strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="agencies"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Agences"
                  dot={{ fill: '#10b981', strokeWidth: 2 }}
                />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Moderation Queue */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Flag className="h-5 w-5 text-red-500" />
                File de Modération
              </CardTitle>
              <CardDescription>Éléments signalés nécessitant une révision</CardDescription>
            </div>
            <Badge variant="destructive" className="text-sm">
              {pendingModeration.length} en attente
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {moderationLoading ? (
            <LoadingState label="Chargement de la file de modération" rows={3} />
          ) : pendingModeration.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Aucun élément en attente de modération.</p>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Raison</TableHead>
                <TableHead>Signalé par</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Priorité</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingModeration.slice(0, 5).map((item) => (
                <TableRow key={item.id} data-testid={`moderation-row-${item.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {item.targetType === "profile" && <Users className="h-4 w-4 text-blue-500" />}
                      {item.targetType === "job" && <Briefcase className="h-4 w-4 text-green-500" />}
                      {item.targetType === "message" && <MessageSquare className="h-4 w-4 text-purple-500" />}
                      {item.targetType === "document" && <FileText className="h-4 w-4 text-orange-500" />}
                      <span className="capitalize">{item.targetType === "profile" ? "Profil" : item.targetType === "job" ? "Offre" : item.targetType === "message" ? "Message" : "Document"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.targetLabel}</p>
                      <p className="text-xs text-muted-foreground capitalize">{item.targetUserType === "candidate" ? "Candidat" : item.targetUserType === "company" ? "Entreprise" : item.targetUserType === "agency" ? "Agence" : "-"}</p>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <p className="truncate" title={item.reason}>{item.reason}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{item.reportedBy}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(item.createdAt).toLocaleString("fr-FR")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={item.priority === "high" ? "destructive" : item.priority === "medium" ? "default" : "secondary"}
                    >
                      {item.priority === "high" ? "Haute" : item.priority === "medium" ? "Moyenne" : "Basse"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AdminReportsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTemplate, setActiveTemplate] = useState<ReportTemplate | null>(null);
  const [pendingReports, setPendingReports] = useState<ReportExportSummary[]>([]);
  const pollTimers = useState(() => new Map<string, ReturnType<typeof setInterval>>())[0];

  const templatesQuery = useQuery<ReportTemplate[]>({ queryKey: ["/api/admin/reports/templates"] });
  const historyQuery = useQuery<ReportExportSummary[]>({ queryKey: ["/api/admin/reports"] });

  useEffect(() => {
    return () => {
      pollTimers.forEach((timer) => clearInterval(timer));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pollReport = (id: string) => {
    const timer = setInterval(async () => {
      try {
        const res = await apiRequest("GET", `/api/admin/reports/${id}`);
        const updated: ReportExportSummary = await res.json();
        setPendingReports((prev) => prev.map((r) => (r.id === id ? updated : r)));
        if (updated.status === "termine" || updated.status === "echec") {
          clearInterval(timer);
          pollTimers.delete(id);
          queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
          setPendingReports((prev) => prev.filter((r) => r.id !== id));
          if (updated.status === "echec") {
            toast({ title: "Échec de la génération", description: updated.error || "Une erreur est survenue.", variant: "destructive" });
          }
        }
      } catch {
        clearInterval(timer);
        pollTimers.delete(id);
      }
    }, 2500);
    pollTimers.set(id, timer);
  };

  const handleGenerated = (report: ReportExportSummary) => {
    setPendingReports((prev) => [report, ...prev]);
    pollReport(report.id);
  };

  const historyIds = new Set((historyQuery.data ?? []).map((r) => r.id));
  const displayedReports = [
    ...pendingReports.filter((r) => !historyIds.has(r.id)),
    ...(historyQuery.data ?? []),
  ];

  const typeLabels: Record<string, string> = Object.fromEntries(
    (templatesQuery.data ?? []).map((t) => [t.type, t.label]),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-reports-title">Rapports</h1>
        <p className="text-muted-foreground">Générez et téléchargez des rapports Excel</p>
      </div>

      {templatesQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(templatesQuery.data ?? []).map((template) => (
            <Card
              key={template.type}
              className="cursor-pointer hover-elevate"
              onClick={() => setActiveTemplate(template)}
              data-testid={`card-report-template-${template.type}`}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  {template.label}
                </CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <GenererRapportModal
        template={activeTemplate}
        onOpenChange={(open) => { if (!open) setActiveTemplate(null); }}
        onGenerated={handleGenerated}
      />

      <Card>
        <CardHeader>
          <CardTitle>Historique</CardTitle>
          <CardDescription>Rapports déjà générés — téléchargez sans regénérer</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {historyQuery.isLoading ? (
            <div className="p-6 space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : displayedReports.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">Aucun rapport généré pour le moment.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Généré le</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedReports.map((report) => (
                  <TableRow key={report.id} data-testid={`row-report-${report.id}`}>
                    <TableCell className="font-medium">{typeLabels[report.type] ?? report.type}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{String(report.parameters?.periode ?? "-")}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{new Date(report.createdAt).toLocaleString("fr-FR")}</TableCell>
                    <TableCell aria-live="polite">
                      <ExportStatusBadge status={report.status} />
                      {report.status === "echec" && report.error && (
                        <p className="text-xs text-destructive mt-1">{report.error}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {report.status === "termine" && report.downloadUrl && (
                        <Button asChild size="sm" variant="outline" data-testid={`button-download-report-${report.id}`}>
                          <a href={report.downloadUrl}>Télécharger</a>
                        </Button>
                      )}
                      {report.status === "echec" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const template = (templatesQuery.data ?? []).find((t) => t.type === report.type);
                            if (template) setActiveTemplate(template);
                          }}
                          data-testid={`button-retry-report-${report.id}`}
                        >
                          Relancer
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CompaniesManagement({
  companies,
  isLoading,
  onSaveModules,
  savingCompanyId,
}: {
  companies: AdminCompany[];
  isLoading: boolean;
  onSaveModules: (companyId: string, modules: string[]) => Promise<void>;
  savingCompanyId?: string;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [companyModules, setCompanyModules] = useState<Record<string, string[]>>({});

  const filteredCompanies = companies.filter(
    (company) =>
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.industry.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getModulesForCompany = (companyId: string) => {
    return companyModules[companyId] || companies.find(c => c.id === companyId)?.modules || [];
  };

  const toggleModule = (companyId: string, moduleId: string) => {
    const currentModules = getModulesForCompany(companyId);
    const newModules = currentModules.includes(moduleId)
      ? currentModules.filter((m) => m !== moduleId)
      : [...currentModules, moduleId];
    setCompanyModules({ ...companyModules, [companyId]: newModules });
  };

  if (isLoading) {
    return <AdminLoadingState title="Chargement des entreprises..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Gestion des Entreprises</h1>
          <p className="text-muted-foreground">Configurez les modules pour chaque entreprise</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-companies"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entreprise</TableHead>
                <TableHead>Secteur</TableHead>
                <TableHead>Employés</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Vérification</TableHead>
                <TableHead>Modules activés</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCompanies.map((company) => {
                const activeModules = getModulesForCompany(company.id);
                return (
                  <TableRow key={company.id} data-testid={`row-company-${company.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-medium">{company.name}</p>
                          <p className="text-xs text-muted-foreground">{company.contact}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={company.industry === "Mines" ? "default" : company.industry === "BTP" ? "secondary" : "outline"}>
                        {company.industry}
                      </Badge>
                    </TableCell>
                    <TableCell>{company.employeeCount}</TableCell>
                    <TableCell>
                      {company.status === "active" ? (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Actif
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          En attente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <VerificationEmployeur employeurId={company.id} nom={company.name} verifieLe={company.verifiedAt} cleListe="/api/admin/companies" />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {activeModules.length > 0 ? (
                          activeModules.map((moduleId) => {
                            const module = modulesList.find((m) => m.id === moduleId);
                            return module ? (
                              <Badge key={moduleId} variant="outline" className="text-xs">
                                <module.icon className="w-3 h-3 mr-1" />
                                {moduleId}
                              </Badge>
                            ) : null;
                          })
                        ) : (
                          <span className="text-muted-foreground text-sm">Aucun</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              data-testid={`button-configure-modules-${company.id}`}
                            >
                              <ToggleRight className="w-4 h-4 mr-1" />
                              Modules
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Configuration des modules</DialogTitle>
                              <DialogDescription>
                                {company.name} - Activez les modules BTP/Mines
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              {modulesList.map((module) => {
                                const isEnabled = getModulesForCompany(company.id).includes(module.id);
                                return (
                                  <div
                                    key={module.id}
                                    className="flex items-center justify-between p-3 rounded-lg border"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={`w-8 h-8 rounded-lg ${module.color} flex items-center justify-center`}>
                                        <module.icon className="w-4 h-4 text-white" />
                                      </div>
                                      <div>
                                        <p className="font-medium text-sm">{module.name}</p>
                                        <p className="text-xs text-muted-foreground">{module.description}</p>
                                      </div>
                                    </div>
                                    <Switch
                                      checked={isEnabled}
                                      onCheckedChange={() => toggleModule(company.id, module.id)}
                                      data-testid={`switch-module-${module.id}`}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                            <DialogFooter>
                              <Button
                                type="button"
                                disabled={savingCompanyId === company.id}
                                onClick={() => onSaveModules(company.id, getModulesForCompany(company.id))}
                                data-testid="button-save-modules"
                              >
                                Enregistrer
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Button size="icon" variant="ghost" data-testid={`button-view-company-${company.id}`}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ModulesOverview({ companies, isLoading }: { companies: AdminCompany[]; isLoading: boolean }) {
  if (isLoading) {
    return <AdminLoadingState title="Chargement des modules..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Modules BTP/Mines</h1>
        <p className="text-muted-foreground">Vue d'ensemble des modules spécialisés disponibles</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {modulesList.map((module) => {
          const companiesWithModule = companies.filter((c) => c.modules.includes(module.id)).length;
          return (
            <Card key={module.id} data-testid={`card-module-${module.id}`}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg ${module.color} flex items-center justify-center`}>
                    <module.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{module.name}</CardTitle>
                    <CardDescription>{module.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Entreprises</span>
                  <Badge variant="secondary">{companiesWithModule} actives</Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entreprises par module</CardTitle>
          <CardDescription>Répartition des modules activés</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Module</TableHead>
                <TableHead>Entreprises</TableHead>
                <TableHead>Secteur principal</TableHead>
                <TableHead className="text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modulesList.map((module) => {
                const companiesWithCurrentModule = companies.filter((c) => c.modules.includes(module.id));
                const percentage = companies.length === 0 ? 0 : Math.round((companiesWithCurrentModule.length / companies.length) * 100);
                const mainIndustry = companiesWithCurrentModule.reduce((acc, c) => {
                  acc[c.industry] = (acc[c.industry] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>);
                const topIndustry = Object.entries(mainIndustry).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";

                return (
                  <TableRow key={module.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <module.icon className="w-4 h-4" />
                        {module.name}
                      </div>
                    </TableCell>
                    <TableCell>{companiesWithCurrentModule.length}</TableCell>
                    <TableCell>{topIndustry}</TableCell>
                    <TableCell className="text-right">{percentage}%</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function AgenciesManagement({
  agencies,
  isLoading,
  onTogglePlan,
  updatingAgencyId,
}: {
  agencies: AdminAgency[];
  isLoading: boolean;
  onTogglePlan: (agencyId: string, plan: "standard" | "partner") => void;
  updatingAgencyId?: string;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  // The switch changes a paid plan (150 000 FCFA/mois) and its feature
  // gates immediately — confirm first, same as the admin level change.
  const [pendingPlanChange, setPendingPlanChange] = useState<{ id: string; name: string; plan: "standard" | "partner" } | null>(null);
  const [planDialogAgencyId, setPlanDialogAgencyId] = useState<string | null>(null);

  const filteredAgencies = agencies.filter((agency) =>
    `${agency.name} ${agency.email} ${agency.city ?? ""} ${agency.country ?? ""}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase()),
  );

  if (isLoading) {
    return <AdminLoadingState title="Chargement des agences..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Gestion des Agences</h1>
          <p className="text-muted-foreground">Vue opérationnelle des agences de placement</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une agence..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agence</TableHead>
                <TableHead>Vérification</TableHead>
                <TableHead>Implantation</TableHead>
                <TableHead>Spécialisations</TableHead>
                <TableHead>Placements</TableHead>
                <TableHead>Plan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAgencies.map((agency) => (
                <TableRow key={agency.id} data-testid={`row-agency-${agency.id}`}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{agency.name}</p>
                      <p className="text-xs text-muted-foreground">{agency.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <VerificationEmployeur employeurId={agency.id} nom={agency.name} verifieLe={agency.verifiedAt} cleListe="/api/admin/agencies" />
                  </TableCell>
                  <TableCell>{agency.city || agency.country ? `${agency.city ?? "-"}, ${agency.country ?? "-"}` : "-"}</TableCell>
                  <TableCell>{agency.specializations.length ? agency.specializations.join(", ") : "-"}</TableCell>
                  <TableCell>{agency.totalPlacements}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={agency.subscriptionPlan === "partner"}
                        disabled={updatingAgencyId === agency.id}
                        onCheckedChange={(checked) => {
                          setPlanDialogAgencyId(agency.id);
                          setPendingPlanChange({ id: agency.id, name: agency.name, plan: checked ? "partner" : "standard" });
                        }}
                        aria-label={`Plan Agence Partenaire pour ${agency.name}`}
                        data-testid={`switch-plan-${agency.id}`}
                      />
                      <span className="text-xs text-muted-foreground">
                        {agency.subscriptionPlan !== "partner"
                          ? "Standard"
                          : agency.partnerTrialEndsAt
                            ? `Partenaire, essai jusqu’au ${new Date(agency.partnerTrialEndsAt).toLocaleDateString("fr-FR")}`
                            : "Agence Partenaire"}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!pendingPlanChange} onOpenChange={(open) => { if (!open) setPendingPlanChange(null); }}>
        <AlertDialogContent
          onCloseAutoFocus={(e) => {
            // State-driven dialog (no AlertDialogTrigger): refocus the switch.
            const trigger = planDialogAgencyId && document.querySelector<HTMLElement>(`[data-testid="switch-plan-${planDialogAgencyId}"]`);
            if (trigger) { e.preventDefault(); trigger.focus(); }
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingPlanChange?.plan === "partner" ? "Activer le plan Agence Partenaire ?" : "Repasser en plan Standard ?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingPlanChange && (pendingPlanChange.plan === "partner" ? (
                <>
                  <strong>{pendingPlanChange.name}</strong> passera au plan Agence Partenaire (150 000 FCFA/mois).
                  Aucun paiement n'est encaissé par la plateforme : vérifiez que le règlement a bien été reçu.
                  Le changement s'applique immédiatement.
                </>
              ) : (
                <>
                  <strong>{pendingPlanChange.name}</strong> repassera au plan Standard et perdra immédiatement
                  l'accès aux modules réservés aux Agences Partenaires.
                </>
              ))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-plan-change">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingPlanChange) onTogglePlan(pendingPlanChange.id, pendingPlanChange.plan);
                setPendingPlanChange(null);
              }}
              data-testid="button-confirm-plan-change"
            >
              {pendingPlanChange?.plan === "partner" ? "Activer le plan Partenaire" : "Repasser en Standard"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Dedicated candidate list — separate from the generic "Utilisateurs" page
// so admin (support, moderation) doesn't have to filter companies/agencies/
// admins out to find a candidate. Only the minimal fields the list endpoint
// returns are shown here; the CV, skills, and salary expectation stay
// behind "Voir le profil" (GET /api/admin/candidates/:id), same rule as
// everywhere else in the admin console.
function CandidatesManagement({
  candidates,
  isLoading,
  canViewCandidateProfiles,
}: {
  candidates: AdminCandidateListItem[];
  isLoading: boolean;
  canViewCandidateProfiles: boolean;
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCandidates = candidates.filter((candidate) =>
    `${candidate.name} ${candidate.email} ${candidate.title ?? ""} ${candidate.city ?? ""} ${candidate.country ?? ""}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase()),
  );

  if (isLoading) {
    return <AdminLoadingState title="Chargement des candidats..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Candidats</h1>
          <p className="text-muted-foreground">{candidates.length} candidat{candidates.length !== 1 ? "s" : ""} inscrit{candidates.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un candidat..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-candidates-search"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidat</TableHead>
                <TableHead>Métier recherché</TableHead>
                <TableHead>Vérification</TableHead>
                <TableHead>Localisation</TableHead>
                <TableHead>Inscription</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCandidates.map((candidate) => (
                <TableRow key={candidate.id} data-testid={`row-candidate-${candidate.id}`}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{candidate.name}</p>
                      <p className="text-xs text-muted-foreground">{candidate.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>{candidate.title || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={candidate.status === "verified" ? "default" : "secondary"}>
                      {candidate.status === "verified" ? "Vérifié" : "En attente"}
                    </Badge>
                  </TableCell>
                  <TableCell>{candidate.city || candidate.country ? `${candidate.city ?? "-"}, ${candidate.country ?? "-"}` : "-"}</TableCell>
                  <TableCell>{new Date(candidate.createdAt).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell className="text-right">
                    {canViewCandidateProfiles ? (
                      <Link href={`/admin/candidates/${candidate.id}`}>
                        <Button variant="ghost" size="sm" className="gap-1.5" data-testid={`button-view-candidate-${candidate.id}`}>
                          <Eye className="h-3.5 w-3.5" />
                          Voir le profil
                        </Button>
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">Accès restreint</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function UsersManagement({ users, isLoading, canViewCandidateProfiles }: { users: AdminUserRecord[]; isLoading: boolean; canViewCandidateProfiles: boolean }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredUsers = users.filter((user) =>
    `${user.name} ${user.email} ${user.userType} ${user.city ?? ""} ${user.country ?? ""}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase()),
  );

  if (isLoading) {
    return <AdminLoadingState title="Chargement des utilisateurs..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Gestion des Utilisateurs</h1>
          <p className="text-muted-foreground">Suivi centralisé des comptes de la plateforme</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un utilisateur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Vérification</TableHead>
                <TableHead>Localisation</TableHead>
                <TableHead>Création</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.userType}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isVerified ? "default" : "secondary"}>
                      {user.isVerified ? "Vérifié" : "En attente"}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.city || user.country ? `${user.city ?? "-"}, ${user.country ?? "-"}` : "-"}</TableCell>
                  <TableCell>{new Date(user.createdAt).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell className="text-right">
                    {user.userType === "candidate" && canViewCandidateProfiles && (
                      <Link href={`/admin/candidates/${user.id}`}>
                        <Button variant="ghost" size="sm" className="gap-1.5" data-testid={`button-view-candidate-${user.id}`}>
                          <Eye className="h-3.5 w-3.5" />
                          Voir le profil
                        </Button>
                      </Link>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ModerationPage({
  items,
  isLoading,
  onUpdateStatus,
  updatingId,
}: {
  items: AdminModerationItem[];
  isLoading: boolean;
  onUpdateStatus: (id: string, status: "approved" | "rejected") => void;
  updatingId?: string;
}) {
  const [filter, setFilter] = useState("all");

  const pendingItems = items.filter((item) => item.status === "pending");
  const resolvedToday = items.filter((item) => {
    if (item.status === "pending") return false;
    const date = new Date(item.createdAt);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  });

  const filteredItems = filter === "all"
    ? pendingItems
    : pendingItems.filter(item => item.priority === filter);

  if (isLoading) {
    return <AdminLoadingState title="Chargement de la file de modération..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-moderation-title">Modération</h1>
          <p className="text-muted-foreground">Gérez les contenus signalés sur la plateforme</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="destructive">{pendingItems.filter(i => i.priority === "high").length} urgents</Badge>
          <Badge variant="secondary">{pendingItems.length} total</Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingItems.length}</div>
            <p className="text-xs text-muted-foreground">Éléments à traiter</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Priorité haute</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{pendingItems.filter(i => i.priority === "high").length}</div>
            <p className="text-xs text-muted-foreground">À traiter en urgence</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Traités aujourd'hui</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{resolvedToday.length}</div>
            <p className="text-xs text-muted-foreground">Éléments résolus</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-moderation-all">Tous ({pendingItems.length})</TabsTrigger>
          <TabsTrigger value="high" data-testid="tab-moderation-high">Urgents ({pendingItems.filter(i => i.priority === "high").length})</TabsTrigger>
          <TabsTrigger value="medium" data-testid="tab-moderation-medium">Moyens ({pendingItems.filter(i => i.priority === "medium").length})</TabsTrigger>
          <TabsTrigger value="low" data-testid="tab-moderation-low">Faibles ({pendingItems.filter(i => i.priority === "low").length})</TabsTrigger>
        </TabsList>
        <TabsContent value={filter} className="mt-4">
          <Card>
            <CardContent className="p-0">
              {filteredItems.length === 0 ? (
                <p className="text-sm text-muted-foreground py-10 text-center">Aucun élément à traiter dans cette catégorie.</p>
              ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Raison</TableHead>
                    <TableHead>Signalé par</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Priorité</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id} data-testid={`moderation-item-${item.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {item.targetType === "profile" && <Users className="h-4 w-4 text-blue-500" />}
                          {item.targetType === "job" && <Briefcase className="h-4 w-4 text-green-500" />}
                          {item.targetType === "message" && <MessageSquare className="h-4 w-4 text-purple-500" />}
                          {item.targetType === "document" && <FileText className="h-4 w-4 text-orange-500" />}
                          <span className="capitalize">{item.targetType === "profile" ? "Profil" : item.targetType === "job" ? "Offre" : item.targetType === "message" ? "Message" : "Document"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          {item.targetType === "job" && item.targetEntityId ? (
                            <a
                              href={`/jobs/${item.targetEntityId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-primary hover:underline"
                              data-testid={`link-moderation-job-${item.id}`}
                            >
                              {item.targetLabel}
                            </a>
                          ) : (
                            <p className="font-medium">{item.targetLabel}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {item.targetOrgName
                              ?? (item.targetUserType === "candidate" ? "Candidat" : item.targetUserType === "company" ? "Entreprise" : item.targetUserType === "agency" ? "Agence" : "-")}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="truncate" title={item.reason}>{item.reason}</p>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{item.reportedBy}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(item.createdAt).toLocaleString("fr-FR")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.priority === "high" ? "destructive" : item.priority === "medium" ? "default" : "secondary"}>
                          {item.priority === "high" ? "Haute" : item.priority === "medium" ? "Moyenne" : "Basse"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-green-600 hover:text-green-700"
                            title="Approuver"
                            disabled={updatingId === item.id}
                            onClick={() => onUpdateStatus(item.id, "approved")}
                            data-testid={`button-approve-moderation-${item.id}`}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                            title="Rejeter"
                            disabled={updatingId === item.id}
                            onClick={() => onUpdateStatus(item.id, "rejected")}
                            data-testid={`button-reject-moderation-${item.id}`}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LogsPage({ logs, isLoading }: { logs: AdminActivityLog[]; isLoading: boolean }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [adminFilter, setAdminFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [candidateViewsOnly, setCandidateViewsOnly] = useState(false);

  const adminOptions = Array.from(new Set(logs.map((log) => log.userLabel))).sort((a, b) =>
    a.localeCompare(b, "fr", { sensitivity: "base" }),
  );

  const filteredLogs = logs.filter(log => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = log.action.toLowerCase().includes(term) ||
                         log.userLabel.toLowerCase().includes(term) ||
                         (log.details ?? "").toLowerCase().includes(term) ||
                         (log.targetLabel ?? "").toLowerCase().includes(term);
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    const matchesAdmin = adminFilter === "all" || log.userLabel === adminFilter;
    const matchesCandidateViews = !candidateViewsOnly || log.targetType === "candidate";
    const logDate = log.createdAt.slice(0, 10);
    const matchesFrom = !dateFrom || logDate >= dateFrom;
    const matchesTo = !dateTo || logDate <= dateTo;
    return matchesSearch && matchesStatus && matchesAdmin && matchesCandidateViews && matchesFrom && matchesTo;
  });

  if (isLoading) {
    return <AdminLoadingState title="Chargement des logs..." />;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "warning": return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "error": return <XCircle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      login: "Connexion",
      login_failed: "Échec connexion",
      module_toggle: "Module activé/désactivé",
      company_verify: "Vérification entreprise",
      moderation: "Action modération",
      backup: "Sauvegarde",
      export: "Export données",
      settings_change: "Modification paramètres",
      api_error: "Erreur API",
      user_delete: "Suppression utilisateur",
      candidate_profile_viewed: "Consultation profil candidat",
    };
    return labels[action] || action;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-logs-title">Logs d'activité</h1>
          <p className="text-muted-foreground">Historique des actions sur la plateforme</p>
        </div>
        <Button variant="outline" data-testid="button-export-logs">
          <FileText className="h-4 w-4 mr-2" />
          Exporter
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total logs</CardTitle>
            <ScrollText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.length}</div>
            <p className="text-xs text-muted-foreground">Dernières 24h</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Succès</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{logs.filter(l => l.status === "success").length}</div>
            <p className="text-xs text-muted-foreground">Actions réussies</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avertissements</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{logs.filter(l => l.status === "warning").length}</div>
            <p className="text-xs text-muted-foreground">À surveiller</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Erreurs</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{logs.filter(l => l.status === "error").length}</div>
            <p className="text-xs text-muted-foreground">Incidents</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle>Historique des logs</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="input-logs-search"
                />
              </div>
              <Tabs defaultValue="all" onValueChange={setStatusFilter}>
                <TabsList>
                  <TabsTrigger value="all">Tous</TabsTrigger>
                  <TabsTrigger value="success">Succès</TabsTrigger>
                  <TabsTrigger value="warning">Avertissements</TabsTrigger>
                  <TabsTrigger value="error">Erreurs</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          <div className="flex items-end gap-3 flex-wrap pt-3">
            <div className="space-y-1">
              <Label htmlFor="logs-admin-filter" className="text-xs text-muted-foreground">Admin</Label>
              <Select value={adminFilter} onValueChange={setAdminFilter}>
                <SelectTrigger id="logs-admin-filter" className="w-48" data-testid="select-logs-admin-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les admins</SelectItem>
                  {adminOptions.map((label) => (
                    <SelectItem key={label} value={label}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="logs-date-from" className="text-xs text-muted-foreground">Du</Label>
              <Input
                id="logs-date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40"
                data-testid="input-logs-date-from"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="logs-date-to" className="text-xs text-muted-foreground">Au</Label>
              <Input
                id="logs-date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40"
                data-testid="input-logs-date-to"
              />
            </div>
            <Button
              type="button"
              variant={candidateViewsOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setCandidateViewsOnly((v) => !v)}
              className="gap-1.5"
              data-testid="button-toggle-candidate-views"
            >
              <Eye className="h-3.5 w-3.5" />
              Consultations de profils candidats
            </Button>
          </div>
          <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
            {filteredLogs.length} résultat{filteredLogs.length !== 1 ? "s" : ""}
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Statut</TableHead>
                <TableHead>Date/Heure</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Cible</TableHead>
                <TableHead>Détails</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id} data-testid={`log-row-${log.id}`}>
                  <TableCell>{getStatusIcon(log.status)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(log.createdAt).toLocaleString("fr-FR")}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{log.userLabel}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{getActionLabel(log.action)}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.targetLabel ? (
                      log.targetType === "candidate" ? (
                        <Link href={`/admin/candidates/${log.targetId}`} className="text-primary hover:underline">
                          {log.targetLabel}
                        </Link>
                      ) : (
                        log.targetLabel
                      )
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[220px]">
                    <p className="truncate" title={log.details ?? ""}>{log.details}</p>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

type AdminCandidateProfile = {
  title: string | null;
  bio: string | null;
  skills: string[] | null;
  experience: string | null;
  education: string | null;
  educationLevel: string | null;
  experienceYears: number | null;
  languages: string[] | null;
  availableFrom: string | null;
  salaryExpectation: string | null;
  resumeUrl: string | null;
  resumeFileName: string | null;
};

type AdminCandidateDetail = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  city: string | null;
  country: string | null;
  isVerified: boolean | null;
  createdAt: string;
  profile?: AdminCandidateProfile | null;
};

// Fetched only when this screen is actually visited — never preloaded into
// a list, so the sensitive fields it shows only ever load behind the
// permission-gated, audit-logged GET /api/admin/candidates/:id call.
function CandidateDetailPage({ candidateId, onBack }: { candidateId: string; onBack: () => void }) {
  const query = useQuery<AdminCandidateDetail>({
    queryKey: ["/api/admin/candidates", candidateId],
  });
  const error = query.error as ApiError | null;

  const BackButton = (
    <Button variant="ghost" size="sm" className="gap-2 -ml-2" onClick={onBack} data-testid="button-back-to-users">
      <ArrowLeft className="h-4 w-4" />
      Retour
    </Button>
  );

  if (query.isLoading) {
    return (
      <div className="space-y-6">
        {BackButton}
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 w-full lg:col-span-2" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    const isForbidden = error.status === 403;
    return (
      <div className="space-y-4">
        {BackButton}
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <AlertTriangle className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="font-medium" role="alert" data-testid="text-candidate-access-error">
              {isForbidden
                ? "Vous n'avez pas accès aux profils candidats détaillés"
                : "Impossible de charger ce profil"}
            </p>
            {!isForbidden && <p className="text-sm text-muted-foreground">{error.message}</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  const candidate = query.data;
  if (!candidate) return null;
  const profile = candidate.profile;

  return (
    <div className="space-y-6">
      {BackButton}

      <div
        className="rounded-lg border px-4 py-3 text-sm flex items-center gap-2.5"
        style={{ backgroundColor: "#FBF2DC", borderColor: "#E8D9AD", color: "#7A5A0C" }}
        data-testid="banner-audit-notice"
      >
        <Shield className="h-4 w-4 flex-shrink-0" />
        <span>Cette consultation est enregistrée dans le journal d'audit.</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold" data-testid="text-candidate-name">{candidate.fullName}</h1>
        <p className="text-muted-foreground">{profile?.title || "Titre non renseigné"}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Profil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile?.bio && <p className="text-sm">{profile.bio}</p>}

            {profile?.skills && profile.skills.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1.5">Compétences</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">{skill}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Expérience</p>
                <p className="font-medium">
                  {profile?.experienceYears ? `${profile.experienceYears} ans` : (profile?.experience || "-")}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Formation</p>
                <p className="font-medium">{profile?.educationLevel || profile?.education || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Prétention salariale</p>
                <p className="font-medium">{profile?.salaryExpectation || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Disponibilité</p>
                <p className="font-medium">{profile?.availableFrom || "-"}</p>
              </div>
            </div>

            {profile?.resumeUrl && (
              <Button asChild variant="outline" size="sm" className="gap-2" data-testid="link-candidate-resume">
                <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer">
                  <FileText className="h-4 w-4" />
                  Voir le CV
                </a>
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Coordonnées</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium">{candidate.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Téléphone</p>
              <p className="font-medium">{candidate.phone || "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Ville</p>
              <p className="font-medium">{[candidate.city, candidate.country].filter(Boolean).join(", ") || "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Inscrit le</p>
              <p className="font-medium">{new Date(candidate.createdAt).toLocaleDateString("fr-FR")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type AdminProspectOrg = {
  id: string;
  userType: "company" | "agency";
  email: string;
  name: string;
  city: string | null;
  industry: string | null;
  jobCount: number;
  claimed: boolean;
  claimToken: string | null;
  contactName: string | null;
  contactPhone: string | null;
  createdAt: string;
};

function ThirdPartyOrganizationsPage({
  prospects,
  isLoading,
  onCreateProspect,
  isCreating,
  onOpenJobDialogForOrg,
}: {
  prospects: AdminProspectOrg[];
  isLoading: boolean;
  onCreateProspect: (data: { userType: "company" | "agency"; email: string; organizationName: string; contactName?: string; contactPhone?: string }) => Promise<void>;
  isCreating: boolean;
  onOpenJobDialogForOrg: (org: PickedOrganization) => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [orgType, setOrgType] = useState<"company" | "agency">("company");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgName, setOrgName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  // A toast alone can be missed while attention is on a centered modal —
  // show the failure inline, right next to the form, too.
  const [createError, setCreateError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<"all" | "prospect" | "claimed">("all");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredProspects = prospects
    .filter((org) => statusFilter === "all" || (statusFilter === "prospect" ? !org.claimed : org.claimed))
    .filter((org) => `${org.name} ${org.email}`.toLowerCase().includes(searchTerm.toLowerCase()));

  const resetCreateForm = () => {
    setOrgType("company");
    setOrgEmail("");
    setOrgName("");
    setContactName("");
    setContactPhone("");
    setCreateError(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-muted-foreground text-sm">
          Comptes créés directement (sans passer par le formulaire de recherche ci-dessus).
        </p>
        <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetCreateForm(); }}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" data-testid="button-new-prospect">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle organisation prospect
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvelle organisation prospect</DialogTitle>
              <DialogDescription>
                Cette organisation sera publiée au nom de "{orgName || "..."}" jusqu'à ce que son propriétaire réclame le compte via le lien de récupération.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={orgType} onValueChange={(value) => setOrgType(value as "company" | "agency")}>
                  <SelectTrigger data-testid="select-prospect-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">Entreprise</SelectItem>
                    <SelectItem value="agency">Agence de placement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nom de l'organisation</Label>
                <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} data-testid="input-prospect-name" />
              </div>
              <div className="space-y-2">
                <Label>Email du compte</Label>
                <Input type="email" value={orgEmail} onChange={(e) => setOrgEmail(e.target.value)} data-testid="input-prospect-email" />
              </div>
              <div className="space-y-2">
                <Label>Nom du contact (personne jointe)</Label>
                <Input value={contactName} onChange={(e) => setContactName(e.target.value)} data-testid="input-prospect-contact-name" />
              </div>
              <div className="space-y-2">
                <Label>Téléphone du contact</Label>
                <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} data-testid="input-prospect-contact-phone" />
              </div>
              {createError && (
                <p className="text-sm text-destructive" role="alert" data-testid="text-create-prospect-error">
                  {createError}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                disabled={isCreating || !orgName || !orgEmail}
                onClick={async () => {
                  setCreateError(null);
                  try {
                    await onCreateProspect({
                      userType: orgType,
                      email: orgEmail,
                      organizationName: orgName,
                      contactName: contactName || undefined,
                      contactPhone: contactPhone || undefined,
                    });
                    setCreateOpen(false);
                    resetCreateForm();
                  } catch (err) {
                    // A toast fires too (via the mutation's onError), but it
                    // can be missed while attention is on the modal — show
                    // it here as well, right where the admin is looking.
                    setCreateError(err instanceof Error ? err.message : "Une erreur est survenue");
                  }
                }}
                data-testid="button-confirm-create-prospect"
              >
                {isCreating ? "Création..." : "Créer l'organisation"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-org-all">Toutes ({prospects.length})</TabsTrigger>
            <TabsTrigger value="prospect" data-testid="tab-org-prospect">Prospects ({prospects.filter((o) => !o.claimed).length})</TabsTrigger>
            <TabsTrigger value="claimed" data-testid="tab-org-claimed">Comptes actifs ({prospects.filter((o) => o.claimed).length})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une organisation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-organizations"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organisation</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead>Secteur</TableHead>
                <TableHead>Offres</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Lien de récupération</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProspects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    Aucune organisation pour ce filtre.
                  </TableCell>
                </TableRow>
              ) : (
                filteredProspects.map((org) => {
                  const claimUrl = org.claimToken ? `${window.location.origin}/claim/${org.claimToken}` : null;
                  return (
                    <TableRow key={org.id} data-testid={`row-prospect-${org.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{org.name}</p>
                          <p className="text-xs text-muted-foreground">{org.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {!org.claimed && (org.contactName || org.contactPhone) ? (
                          <div className="text-xs">
                            <p>{org.contactName || "-"}</p>
                            <p className="text-muted-foreground">{org.contactPhone || "-"}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{org.userType === "agency" ? "Agence" : "Entreprise"}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{org.city || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{org.industry || "-"}</TableCell>
                      <TableCell className="text-sm">{org.jobCount}</TableCell>
                      <TableCell>
                        <Badge variant={org.claimed ? "default" : "secondary"}>
                          {org.claimed ? "Compte actif" : "Prospect"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {claimUrl ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-xs"
                            onClick={() => navigator.clipboard.writeText(claimUrl)}
                            data-testid={`button-copy-claim-${org.id}`}
                          >
                            <Copy className="h-3 w-3" />
                            Copier le lien
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onOpenJobDialogForOrg({ id: org.id, userType: org.userType, name: org.name, isProspect: !org.claimed })}
                          data-testid={`button-post-job-${org.id}`}
                        >
                          Créer une offre pour cette organisation
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

type AdminManagedJob = {
  id: string;
  title: string;
  isActive: boolean;
  organizationId: string;
  organizationName: string;
  organizationType: "company" | "agency" | null;
  createdByAdminId: string | null;
  createdByAdminName: string;
  createdAt: string;
};

function ManagedJobsList({ jobs, isLoading }: { jobs: AdminManagedJob[]; isLoading: boolean }) {
  const [adminFilter, setAdminFilter] = useState<string>("all");
  const [orgFilter, setOrgFilter] = useState<string>("all");

  const admins = Array.from(new Map(jobs.map((j) => [j.createdByAdminId ?? "", j.createdByAdminName])).entries())
    .filter(([id]) => id);
  const orgs = Array.from(new Map(jobs.map((j) => [j.organizationId, j.organizationName])).entries());

  const filteredJobs = jobs
    .filter((j) => adminFilter === "all" || j.createdByAdminId === adminFilter)
    .filter((j) => orgFilter === "all" || j.organizationId === orgFilter);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Offres gérées</h1>
          <p className="text-muted-foreground">
            Traçabilité de toutes les offres publiées par un administrateur au nom d'une organisation.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={adminFilter} onValueChange={setAdminFilter}>
            <SelectTrigger className="w-48" data-testid="select-filter-managed-jobs-admin">
              <SelectValue placeholder="Tous les admins" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les admins</SelectItem>
              {admins.map(([id, name]) => (
                <SelectItem key={id} value={id}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={orgFilter} onValueChange={setOrgFilter}>
            <SelectTrigger className="w-48" data-testid="select-filter-managed-jobs-org">
              <SelectValue placeholder="Toutes les organisations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les organisations</SelectItem>
              {orgs.map(([id, name]) => (
                <SelectItem key={id} value={id}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Offre</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Créée par</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredJobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Aucune offre gérée par un administrateur pour ce filtre.
                  </TableCell>
                </TableRow>
              ) : (
                filteredJobs.map((job) => (
                  <TableRow key={job.id} data-testid={`row-managed-job-${job.id}`}>
                    <TableCell className="font-medium">{job.title}</TableCell>
                    <TableCell>
                      <div>
                        <p>{job.organizationName}</p>
                        <p className="text-xs text-muted-foreground">
                          {job.organizationType === "agency" ? "Agence" : "Entreprise"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{job.createdByAdminName}</TableCell>
                    <TableCell>
                      <Badge variant={job.isActive ? "default" : "secondary"}>
                        {job.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(job.createdAt).toLocaleDateString("fr-FR")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// The primary, reusable entry point for "post an offer on behalf of a
// third party": pick or create the organization first (OrganisationPickerOrCreate),
// then fill in the job via the same OfferForm the recruiter screen uses.
// Any future admin action that needs to attach to an organization should
// open this same picker rather than a bespoke one.

// The single "post a job for a third party" flow, reused both from the
// top-level "Nouvelle offre pour un tiers" button (picker-first, initialOrg
// unset) and from each organization row's action (initialOrg pre-filled,
// skips straight to the job form).
// Picks (or creates) the target organization — the actual job form lives in
// OfferForm, rendered full-width by ThirdPartyManagementPage once an
// organization is chosen, rather than crammed into this dialog. Keeping
// "search/create the org" as a lightweight modal step matches "chercher ou
// créer l'organisation d'abord, jamais l'inverse".
function PickOrganizationDialog({
  open,
  onOpenChange,
  onOrgPicked,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrgPicked: (org: PickedOrganization) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Publier une offre pour un tiers</DialogTitle>
          <DialogDescription>
            Recherchez l'organisation concernée, ou créez une fiche prospect si elle n'existe pas encore.
          </DialogDescription>
        </DialogHeader>
        <OrganisationPickerOrCreate onSelect={(org) => { onOrgPicked(org); onOpenChange(false); }} />
      </DialogContent>
    </Dialog>
  );
}

function ThirdPartyManagementPage(props: {
  prospects: AdminProspectOrg[];
  isLoadingProspects: boolean;
  onCreateProspect: (data: { userType: "company" | "agency"; email: string; organizationName: string; contactName?: string; contactPhone?: string }) => Promise<void>;
  isCreating: boolean;
  onPublishJob: (orgId: string, data: OfferFormValue) => Promise<OfferSaveResult>;
  managedJobs: AdminManagedJob[];
  isLoadingManagedJobs: boolean;
}) {
  const [tab, setTab] = useState<"organisations" | "offres-gerees">("organisations");
  const [pickDialogOpen, setPickDialogOpen] = useState(false);
  // Once an organization is picked, the whole screen becomes the offer
  // form (same OfferForm as the recruiter screen) rather than a modal —
  // matches "écran", not "modale", in the spec.
  const [offerOrg, setOfferOrg] = useState<PickedOrganization | null>(null);

  if (offerOrg) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="gap-2 -ml-2" onClick={() => setOfferOrg(null)} data-testid="button-back-to-third-party">
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>
        <OfferForm
          organization={{ name: offerOrg.name, userType: offerOrg.userType }}
          backHref="/admin/organizations"
          backLabel="Organisations tiers"
          onSaveDraft={async () => {
            // Admin-managed jobs are always published immediately by design
            // (the admin creating it is the validator) — there's no draft
            // concept on this path, so this is a genuine no-op for now
            // rather than a misleading "saved" call to the publish endpoint.
          }}
          onPublish={(data) => props.onPublishJob(offerOrg.id, data)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Organisations tiers</h1>
          <p className="text-muted-foreground">Gérez les organisations que BaaraMatch accompagne et les offres publiées en leur nom.</p>
        </div>
        <Button onClick={() => setPickDialogOpen(true)} data-testid="button-new-third-party-job">
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle offre pour un tiers
        </Button>
      </div>

      <PickOrganizationDialog
        open={pickDialogOpen}
        onOpenChange={setPickDialogOpen}
        onOrgPicked={setOfferOrg}
      />

      <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
        <TabsList className="mb-6">
          <TabsTrigger value="organisations" data-testid="tab-third-party-organizations">Organisations</TabsTrigger>
          <TabsTrigger value="offres-gerees" data-testid="tab-third-party-managed-jobs">Offres gérées</TabsTrigger>
        </TabsList>
        <TabsContent value="organisations">
          <ThirdPartyOrganizationsPage
            prospects={props.prospects}
            isLoading={props.isLoadingProspects}
            onCreateProspect={props.onCreateProspect}
            isCreating={props.isCreating}
            onOpenJobDialogForOrg={setOfferOrg}
          />
        </TabsContent>
        <TabsContent value="offres-gerees">
          <ManagedJobsList jobs={props.managedJobs} isLoading={props.isLoadingManagedJobs} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type AdminAccountRecord = {
  id: string;
  email: string;
  fullName: string;
  adminLevel: "super_admin" | "gestionnaire_comptes" | "moderateur" | null;
  isAdminActive: boolean;
  createdAt: string;
};

const adminLevelLabels: Record<string, string> = {
  super_admin: "Super Admin",
  gestionnaire_comptes: "Gestionnaire de comptes",
  moderateur: "Modérateur",
};

function AdminAccountsPage({
  accounts,
  isLoading,
  currentAdminId,
  onCreate,
  isCreating,
  onChangeLevel,
  updatingId,
  onChangeStatus,
  updatingStatusId,
}: {
  accounts: AdminAccountRecord[];
  isLoading: boolean;
  currentAdminId?: string;
  onCreate: (data: { email: string; password: string; fullName: string; adminLevel: string }) => Promise<void>;
  isCreating: boolean;
  onChangeLevel: (id: string, adminLevel: string) => void;
  updatingId?: string;
  onChangeStatus: (id: string, isAdminActive: boolean) => void;
  updatingStatusId?: string;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [newAdminLevel, setNewAdminLevel] = useState("moderateur");

  // Changing an admin's level is sensitive — hold the pending change here
  // and only commit it once the confirmation dialog is accepted.
  const [pendingLevelChange, setPendingLevelChange] = useState<{ id: string; name: string; level: string } | null>(null);

  const [createError, setCreateError] = useState<string | null>(null);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setFullName("");
    setNewAdminLevel("moderateur");
    setCreateError(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Comptes admin</h1>
          <p className="text-muted-foreground">Gérez qui a accès au back-office et avec quel niveau de permission.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-admin-account">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau compte admin
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouveau compte admin</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nom complet</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} data-testid="input-admin-fullname" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="input-admin-email" />
              </div>
              <div className="space-y-2">
                <Label>Mot de passe temporaire</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="input-admin-password" />
              </div>
              <div className="space-y-2">
                <Label>Niveau d'accès</Label>
                <Select value={newAdminLevel} onValueChange={setNewAdminLevel}>
                  <SelectTrigger data-testid="select-new-admin-level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="moderateur">Modérateur</SelectItem>
                    <SelectItem value="gestionnaire_comptes">Gestionnaire de comptes</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {createError && (
                <p className="text-sm text-destructive" role="alert" data-testid="text-create-admin-error">
                  {createError}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                disabled={isCreating || !email || !password || !fullName}
                onClick={async () => {
                  setCreateError(null);
                  try {
                    await onCreate({ email, password, fullName, adminLevel: newAdminLevel });
                    setCreateOpen(false);
                    resetForm();
                  } catch (err) {
                    setCreateError(err instanceof Error ? err.message : "Une erreur est survenue");
                  }
                }}
                data-testid="button-confirm-create-admin"
              >
                {isCreating ? "Création..." : "Créer le compte"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Compte</TableHead>
                <TableHead>Niveau d'accès</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Créé le</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id} data-testid={`row-admin-account-${account.id}`}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{account.fullName}</p>
                      <p className="text-xs text-muted-foreground">{account.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={account.adminLevel ?? "moderateur"}
                      disabled={account.id === currentAdminId || updatingId === account.id}
                      onValueChange={(value) => setPendingLevelChange({ id: account.id, name: account.fullName, level: value })}
                    >
                      <SelectTrigger className="w-44" data-testid={`select-admin-level-${account.id}`}>
                        <SelectValue>{adminLevelLabels[account.adminLevel ?? "moderateur"]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="moderateur">Modérateur</SelectItem>
                        <SelectItem value="gestionnaire_comptes">Gestionnaire de comptes</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    {account.id === currentAdminId && (
                      <p className="text-xs text-muted-foreground mt-1">Vous ne pouvez pas modifier votre propre niveau</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={account.isAdminActive}
                        disabled={account.id === currentAdminId || updatingStatusId === account.id}
                        onCheckedChange={(checked) => onChangeStatus(account.id, checked)}
                        data-testid={`switch-admin-status-${account.id}`}
                      />
                      <span className="text-xs text-muted-foreground">
                        {account.isAdminActive ? "Actif" : "Désactivé"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(account.createdAt).toLocaleDateString("fr-FR")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!pendingLevelChange} onOpenChange={(open) => { if (!open) setPendingLevelChange(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Changer le niveau d'accès ?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingLevelChange && (
                <>
                  Le niveau de <strong>{pendingLevelChange.name}</strong> passera à « {adminLevelLabels[pendingLevelChange.level]} ».
                  Cette action modifie immédiatement les permissions de ce compte.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-level-change">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingLevelChange) onChangeLevel(pendingLevelChange.id, pendingLevelChange.level);
                setPendingLevelChange(null);
              }}
              data-testid="button-confirm-level-change"
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ComingSoonPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Settings className="w-8 h-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-muted-foreground max-w-md">{description}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [location, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const handleMutationError = (error: Error) => {
    toast({
      title: "Erreur",
      description: error.message || "Une erreur est survenue",
      variant: "destructive",
    });
  };
  const adminEnabled = user?.userType === "admin";

  const overviewQuery = useQuery<AdminOverviewResponse>({
    queryKey: ["/api/admin/overview"],
    enabled: adminEnabled,
  });

  const companiesQuery = useQuery<AdminCompany[]>({
    queryKey: ["/api/admin/companies"],
    enabled: adminEnabled,
  });

  const agenciesQuery = useQuery<AdminAgency[]>({
    queryKey: ["/api/admin/agencies"],
    enabled: adminEnabled,
  });

  const usersQuery = useQuery<AdminUserRecord[]>({
    queryKey: ["/api/admin/users"],
    enabled: adminEnabled,
  });

  const candidatesQuery = useQuery<AdminCandidateListItem[]>({
    queryKey: ["/api/admin/candidates"],
    enabled: adminEnabled,
  });

  const moderationQuery = useQuery<AdminModerationItem[]>({
    queryKey: ["/api/admin/moderation"],
    enabled: adminEnabled,
  });

  const adminLevel = user?.adminLevel;
  const canManageThirdParty = hasAdminPermission(adminLevel, "organisations:gerer");
  const canManageAdminAccounts = hasAdminPermission(adminLevel, "admins:gerer");
  const canViewCandidateProfiles = hasAdminPermission(adminLevel, "candidats:consulter_profil_complet");

  // Only super_admin can read the audit journal — see /api/admin/logs.
  const logsQuery = useQuery<AdminActivityLog[]>({
    queryKey: ["/api/admin/logs"],
    enabled: adminEnabled && canManageAdminAccounts,
  });

  const prospectsQuery = useQuery<AdminProspectOrg[]>({
    queryKey: ["/api/admin/organizations"],
    enabled: adminEnabled && canManageThirdParty,
  });

  const managedJobsQuery = useQuery<AdminManagedJob[]>({
    queryKey: ["/api/admin/organizations/managed-jobs"],
    enabled: adminEnabled && canManageThirdParty,
  });

  const adminAccountsQuery = useQuery<AdminAccountRecord[]>({
    queryKey: ["/api/admin/accounts"],
    enabled: adminEnabled && canManageAdminAccounts,
  });

  const updateModulesMutation = useMutation({
    mutationFn: async ({ companyId, modules }: { companyId: string; modules: string[] }) => {
      const response = await apiRequest("PATCH", `/api/admin/companies/${companyId}/modules`, { modules });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/logs"] });
    },
    onError: handleMutationError,
  });

  const updateAgencyPlanMutation = useMutation({
    mutationFn: async ({ agencyId, plan }: { agencyId: string; plan: "standard" | "partner" }) => {
      const response = await apiRequest("PATCH", `/api/admin/agencies/${agencyId}/plan`, { plan });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/agencies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/logs"] });
    },
    onError: handleMutationError,
  });

  const updateModerationMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      const response = await apiRequest("PATCH", `/api/admin/moderation/${id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/moderation"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/logs"] });
    },
    onError: handleMutationError,
  });

  const createProspectMutation = useMutation({
    mutationFn: async (data: { userType: "company" | "agency"; email: string; organizationName: string; contactName?: string; contactPhone?: string }) => {
      const response = await apiRequest("POST", "/api/admin/organizations/prospect", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/logs"] });
    },
    onError: handleMutationError,
  });

  const postThirdPartyJobMutation = useMutation({
    mutationFn: async ({ orgId, data }: { orgId: string; data: OfferFormValue }) => {
      const response = await apiRequest("POST", `/api/admin/organizations/${orgId}/jobs`, {
        title: data.title,
        description: data.descriptionHtml,
        location: data.location,
        jobType: data.contractType,
        category: data.category,
        educationLevel: data.educationLevel || undefined,
        salaryMin: data.salaryMin ? Number(data.salaryMin) : undefined,
        salaryMax: data.salaryMax ? Number(data.salaryMax) : undefined,
        ...champsOffreComplementaires(data, undefined),
        requiredSkills: data.skills,
        applicationDeadline: data.applicationDeadline || undefined,
        startDate: data.startDate || undefined,
        isRemote: data.isRemote,
        isUrgent: data.isUrgent,
        positions: data.positions ? Number(data.positions) : 1,
        visibleToAgencies: data.visibleToAgencies,
        acceptsPlatformApplications: data.acceptsPlatformApplications,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations/managed-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/logs"] });
    },
    onError: handleMutationError,
  });

  const createAdminAccountMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; fullName: string; adminLevel: string }) => {
      const response = await apiRequest("POST", "/api/admin/accounts", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/logs"] });
    },
    onError: handleMutationError,
  });

  const updateAdminLevelMutation = useMutation({
    mutationFn: async ({ id, adminLevel }: { id: string; adminLevel: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/accounts/${id}/level`, { adminLevel });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/logs"] });
    },
    onError: handleMutationError,
  });

  const updateAdminStatusMutation = useMutation({
    mutationFn: async ({ id, isAdminActive }: { id: string; isAdminActive: boolean }) => {
      const response = await apiRequest("PATCH", `/api/admin/accounts/${id}/status`, { isAdminActive });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/logs"] });
    },
    onError: handleMutationError,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/login");
    }

    if (!authLoading && user && user.userType !== "admin") {
      setLocation("/");
    }
  }, [authLoading, setLocation, user]);

  if (authLoading) {
    return <AdminLoadingState title="Vérification de la session administrateur..." />;
  }

  if (!user || user.userType !== "admin") {
    return <AdminLoadingState title="Redirection..." />;
  }

  const companies = companiesQuery.data ?? [];

  const renderContent = () => {
    if (location.startsWith("/admin/companies")) {
      return (
        <CompaniesManagement
          companies={companies}
          isLoading={companiesQuery.isLoading}
          onSaveModules={async (companyId, modules) => {
            try {
              await updateModulesMutation.mutateAsync({ companyId, modules });
            } catch {
              // Failure is already surfaced via the mutation's onError toast.
            }
          }}
          savingCompanyId={updateModulesMutation.variables?.companyId}
        />
      );
    }

    if (location.startsWith("/admin/modules")) {
      return <ModulesOverview companies={companies} isLoading={companiesQuery.isLoading} />;
    }

    if (location.startsWith("/admin/agencies")) {
      return (
        <AgenciesManagement
          agencies={agenciesQuery.data ?? []}
          isLoading={agenciesQuery.isLoading}
          onTogglePlan={(agencyId, plan) => updateAgencyPlanMutation.mutate({ agencyId, plan })}
          updatingAgencyId={updateAgencyPlanMutation.variables?.agencyId}
        />
      );
    }

    if (location.startsWith("/admin/candidates/")) {
      const candidateId = location.replace("/admin/candidates/", "");
      return <CandidateDetailPage candidateId={candidateId} onBack={() => setLocation("/admin/candidates")} />;
    }

    if (location.startsWith("/admin/candidates")) {
      return (
        <CandidatesManagement
          candidates={candidatesQuery.data ?? []}
          isLoading={candidatesQuery.isLoading}
          canViewCandidateProfiles={canViewCandidateProfiles}
        />
      );
    }

    if (location.startsWith("/admin/users")) {
      return (
        <UsersManagement
          users={usersQuery.data ?? []}
          isLoading={usersQuery.isLoading}
          canViewCandidateProfiles={canViewCandidateProfiles}
        />
      );
    }

    if (location.startsWith("/admin/security")) {
      return <ComingSoonPage title="Sécurité" description="Les paramètres de sécurité seront bientôt disponibles." />;
    }

    if (location.startsWith("/admin/settings")) {
      return <ComingSoonPage title="Paramètres" description="Les paramètres globaux seront bientôt disponibles." />;
    }

    if (location.startsWith("/admin/moderation")) {
      return (
        <ModerationPage
          items={moderationQuery.data ?? []}
          isLoading={moderationQuery.isLoading}
          updatingId={updateModerationMutation.variables?.id}
          onUpdateStatus={(id, status) => updateModerationMutation.mutate({ id, status })}
        />
      );
    }

    if (location.startsWith("/admin/logs")) {
      if (!canManageAdminAccounts) {
        return <ComingSoonPage title="Accès restreint" description="Le journal d'audit est réservé au Super Admin." />;
      }
      return <LogsPage logs={logsQuery.data ?? []} isLoading={logsQuery.isLoading} />;
    }

    if (location.startsWith("/admin/organizations")) {
      if (!canManageThirdParty) {
        return <ComingSoonPage title="Accès restreint" description="La gestion des organisations tiers est réservée aux niveaux Admin et Super Admin." />;
      }
      return (
        <ThirdPartyManagementPage
          prospects={prospectsQuery.data ?? []}
          isLoadingProspects={prospectsQuery.isLoading}
          onCreateProspect={(data) => createProspectMutation.mutateAsync(data)}
          isCreating={createProspectMutation.isPending}
          onPublishJob={async (orgId, data) => {
            const job = await postThirdPartyJobMutation.mutateAsync({ orgId, data });
            return { id: job.id, status: "PUBLIEE" as const };
          }}
          managedJobs={managedJobsQuery.data ?? []}
          isLoadingManagedJobs={managedJobsQuery.isLoading}
        />
      );
    }

    if (location.startsWith("/admin/whatsapp-pending")) {
      if (!canViewCandidateProfiles) {
        return <ComingSoonPage title="Accès restreint" description="Les coordonnées des candidats sont réservées aux niveaux Admin et Super Admin." />;
      }
      return <WhatsAppPendingPage />;
    }

    if (location.startsWith("/admin/invitation-codes")) {
      if (!canManageThirdParty) {
        return <ComingSoonPage title="Accès restreint" description="La gestion des codes d'invitation est réservée aux niveaux Admin et Super Admin." />;
      }
      return <InvitationCodesPage />;
    }

    if (location.startsWith("/admin/accounts")) {
      if (!canManageAdminAccounts) {
        return <ComingSoonPage title="Accès restreint" description="La gestion des comptes admin est réservée au Super Admin." />;
      }
      return (
        <AdminAccountsPage
          accounts={adminAccountsQuery.data ?? []}
          isLoading={adminAccountsQuery.isLoading}
          currentAdminId={user?.id}
          onCreate={(data) => createAdminAccountMutation.mutateAsync(data)}
          isCreating={createAdminAccountMutation.isPending}
          onChangeLevel={(id, adminLevel) => updateAdminLevelMutation.mutate({ id, adminLevel })}
          updatingId={updateAdminLevelMutation.variables?.id}
          onChangeStatus={(id, isAdminActive) => updateAdminStatusMutation.mutate({ id, isAdminActive })}
          updatingStatusId={updateAdminStatusMutation.variables?.id}
        />
      );
    }

    if (location.startsWith("/admin/statistics")) {
      return <AdminStatisticsPage />;
    }

    if (location.startsWith("/admin/reports")) {
      return <AdminReportsPage />;
    }

    return (
      <DashboardOverview
        overview={overviewQuery.data}
        moderationItems={moderationQuery.data ?? []}
        moderationLoading={moderationQuery.isLoading}
      />
    );
  };

  const style = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AdminSidebar />
        <SidebarInset className="flex-1 overflow-auto">
          <header className="flex h-14 items-center gap-4 border-b bg-background px-6 sticky top-0 z-10">
            <SidebarTrigger data-testid="button-sidebar-trigger" />
            <div className="flex-1">
              <h1 className="text-lg font-semibold">Administration BaaraMatch Africa</h1>
            </div>
          </header>
          <main className="p-6">
            {renderContent()}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
