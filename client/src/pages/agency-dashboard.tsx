import { useAuth } from "@/lib/auth";
import { Redirect, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AgencyDashboardHome, type AgencyOverview } from "@/components/agency-dashboard-home";
import type { Contract } from "@/components/active-contracts-table";
import { CandidateManagementTable } from "@/components/candidate-management-table";
import { MissionsManagement } from "@/components/missions-management";
import { AgencyApplicationsPipeline } from "@/components/agency-applications-pipeline";
import { InterviewCalendar } from "@/components/interview-calendar";
import { FieldMissionsList } from "@/components/field-missions-list";
import { FieldMissionDetail } from "@/components/field-mission-detail";
import { FieldMissionClients } from "@/components/field-mission-clients";
import { OfferForm, mapJobPostingToOfferFormValue, type OfferFormValue, type OfferSaveResult } from "@/components/offer-form";
import type { JobPosting } from "@shared/schema";
import { NewCandidateForm } from "@/components/new-candidate-form";
import { CvAttachmentsManager } from "@/components/cv-attachments-manager";
import { AgencyPlacementHistory } from "@/components/agency-placement-history";
import { AgencyShortlist } from "@/components/agency-shortlist";
import { AgencyAssignments } from "@/components/agency-assignments";
import { AgencyPaymentStatement } from "@/components/agency-payment-statement";
import { AgencyAccountingExport } from "@/components/agency-accounting-export";
import { RelationsExchanges } from "@/components/agency-relations/exchanges";
import { RelationsCommunications } from "@/components/agency-relations/communications";
import { RelationsReminders } from "@/components/agency-relations/reminders";
import { RelationsSatisfaction } from "@/components/agency-relations/satisfaction";
import { ClientCompanies } from "@/components/agency-crm/clients";
import { ClientContacts } from "@/components/agency-crm/contacts";
import { ClientNeeds } from "@/components/agency-crm/needs";
import { ClientAgreements } from "@/components/agency-crm/agreements";
import { ClientMissionHistory } from "@/components/agency-crm/missions-history";
import { CandidateProfileView } from "@/components/candidate-profile-view";
import { PlacementReports } from "@/components/placement-reports";
import { FinancialSettings } from "@/components/financial-settings";
import { VisibiliteAccueil } from "@/components/visibilite-accueil";
import { ClientInvoicing } from "@/components/client-invoicing";
import { RequirePartnerPlan } from "@/components/require-partner-plan";
import { SalaryManagement } from "@/components/salary-management";
import { CommissionManagement } from "@/components/commission-management";
import { AgencyContractsPage } from "@/components/agency-contracts-page";
import { AgencyRecruitmentKanban } from "@/components/recruitment-kanban-board";
import { Card, CardContent } from "@/components/ui/card";
import { 
  BarChart3, 
  Shield, 
  Settings,
  HelpCircle,
  Construction,
} from "lucide-react";

type AgencyDashboardData = {
  user: { id: string; fullName: string };
  profile: { agencyName: string | null; subscriptionPlan?: string | null } | null;
  overview: AgencyOverview;
  managedCandidates: number;
  activeJobs: number;
  totalPlacements: number;
  verificationStatus: string;
  relatedCompanies: Array<{
    id: string;
    name: string;
    industry: string;
    city: string | null;
    country: string | null;
    activeJobs: number;
    status: "active" | "pending";
    createdAt: string;
  }>;
  kpis: {
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
  };
  activeContracts: Contract[];
  placementReport: {
    stats: {
      totalPlacements: number;
      placementsThisMonth: number;
      successRate: number;
      avgTimeToPlacement: number;
      activeContracts: number;
      endingThisMonth: number;
      renewalRate: number;
      totalRevenue: string;
    };
    placementsByStatus: Array<{ status: string; count: number; percentage: number; color: string }>;
    placementsBySector: Array<{ sector: string; count: number; percentage: number; revenue: string }>;
    recentPlacements: Array<{
      id: string;
      candidateName: string;
      candidateTitle: string;
      companyName: string;
      sector: string;
      startDate: string;
      contractType: string;
      status: "active" | "pending" | "completed" | "cancelled";
      monthlyRate: string;
    }>;
    monthlyTrends: Array<{ month: string; placements: number; target: number }>;
  };
};

// Sous-sections de /agency/candidates/* qui ne sont PAS des identifiants de
// candidat : sans cette liste, /agency/candidates/skills tentait d'ouvrir le
// profil du candidat « skills ».
const AGENCY_CANDIDATE_SECTIONS = new Set(["create", "documents", "history", "skills", "availability", "matching"]);

// Pages retirées (compétences, disponibilités) ou masquées (matching) : un
// ancien lien ou favori renvoie vers la base candidats au lieu d'une page cassée.
const AGENCY_CANDIDATE_REDIRECTS: Record<string, string> = {
  "/agency/candidates/skills": "/agency/candidates",
  "/agency/candidates/availability": "/agency/candidates",
  "/agency/candidates/matching": "/agency/candidates",
};

// PATCH body for an existing agency job (draft continuation or edit).
// Cleared fields are sent as null so they're actually cleared server-side.
function buildJobUpdatePayload(form: OfferFormValue) {
  return {
    title: form.title,
    description: form.descriptionHtml,
    location: form.location,
    jobType: form.contractType,
    category: form.category,
    educationLevel: form.educationLevel || null,
    salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
    salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
    requiredSkills: form.skills,
    applicationDeadline: form.applicationDeadline || null,
    startDate: form.startDate || null,
    isRemote: form.isRemote,
    isUrgent: form.isUrgent,
    positions: form.positions ? Number(form.positions) : 1,
    acceptsPlatformApplications: form.acceptsPlatformApplications,
  };
}

function ComingSoonPage({ title, icon: Icon, description }: { title: string; icon: React.ElementType; description: string }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{title}</h1>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
            <Icon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
            {title}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mb-4">
            {description}
          </p>
          <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
            <Construction className="h-4 w-4" />
            <span>En cours de développement</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardHome({ data, isLoading }: { data?: AgencyDashboardData; isLoading: boolean }) {
  const firstName = data?.user.fullName?.split(" ")[0] || "équipe";
  return <AgencyDashboardHome firstName={firstName} overview={data?.overview} isLoading={isLoading} />;
}

function CandidatesManagementPage() {
  return <CandidateManagementTable />;
}

export default function AgencyDashboardPage() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery<AgencyDashboardData>({
    queryKey: ["/api/dashboard/agency"],
    enabled: !!user && user.userType === "agency",
  });

  const editJobMatch = location.match(/^\/agency\/missions\/([^/]+)\/edit$/);
  const editingJobId = editJobMatch ? editJobMatch[1] : null;
  const editJobQuery = useQuery<JobPosting>({
    queryKey: ["/api/jobs", editingJobId],
    enabled: !!editingJobId,
  });
  // An offline job opened for editing is continued as a draft. Frozen per
  // job: publishing it refetches it as live, which must not flip the form
  // back to plain edit mode (and lose its confirmation screen) mid-flow.
  const [draftEditJobId, setDraftEditJobId] = useState<string | null>(null);
  const editJobIsOffline = !!editJobQuery.data && editJobQuery.data.id === editingJobId && !editJobQuery.data.isActive;
  useEffect(() => {
    if (!editingJobId) setDraftEditJobId(null);
    else if (editJobIsOffline) setDraftEditJobId(editingJobId);
  }, [editingJobId, editJobIsOffline]);
  const editContinuesDraft = !!editingJobId && (draftEditJobId === editingJobId || editJobIsOffline);

  const jobMutation = useMutation({
    mutationFn: async ({ url, method, data }: { url: string; method: string; data?: unknown }) => {
      const response = await apiRequest(method, url, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/agency"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agency/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agency/jobs-with-applications"] });
    },
  });

  // One offer = one job row, from first draft to publication: once a draft
  // exists every save/publish PATCHes it rather than POSTing a duplicate.
  // Publishing flips isActive; the server decides whether it really goes
  // live (partner plan) or into the admin review queue (standard plan).
  const saveAgencyDraft = async (draftId: string | null, form: OfferFormValue, buildCreatePayload?: () => unknown) => {
    if (draftId || !buildCreatePayload) {
      await jobMutation.mutateAsync({ url: `/api/jobs/${draftId}`, method: "PATCH", data: buildJobUpdatePayload(form) });
      return draftId!;
    }
    const created = await jobMutation.mutateAsync({ url: "/api/jobs", method: "POST", data: buildCreatePayload() });
    return created.id as string;
  };

  const publishAgencyOffer = async (draftId: string | null, form: OfferFormValue, buildCreatePayload?: () => unknown): Promise<OfferSaveResult> => {
    const saved = draftId || !buildCreatePayload
      ? await jobMutation.mutateAsync({ url: `/api/jobs/${draftId}`, method: "PATCH", data: { ...buildJobUpdatePayload(form), isActive: true } })
      : await jobMutation.mutateAsync({ url: "/api/jobs", method: "POST", data: buildCreatePayload() });
    return { id: saved.id, status: saved.isActive ? "PUBLIEE" : "EN_REVISION" };
  };

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
    if (!isLoading && user && user.userType !== "agency") {
      setLocation("/");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user || user.userType !== "agency") {
    return null;
  }

  const getPageContent = () => {
    if (location === "/agency/dashboard" || location === "/agency") {
      return <DashboardHome data={dashboardData} isLoading={isDashboardLoading} />;
    }
    
    const candidateRedirect = AGENCY_CANDIDATE_REDIRECTS[location];
    if (candidateRedirect) {
      return <Redirect to={candidateRedirect} />;
    }

    if (location === "/agency/candidates/create") {
      return <NewCandidateForm />;
    }
    
    if (location === "/agency/candidates/documents") {
      return <CvAttachmentsManager />;
    }

    if (location === "/agency/candidates/history") {
      return <AgencyPlacementHistory />;
    }
    
    const candidateProfileMatch = location.match(/^\/agency\/candidates\/([^/]+)$/);
    if (candidateProfileMatch && !AGENCY_CANDIDATE_SECTIONS.has(candidateProfileMatch[1])) {
      return <CandidateProfileView candidateId={candidateProfileMatch[1]} />;
    }
    
    if (location.startsWith("/agency/candidates")) {
      return <CandidatesManagementPage />;
    }
    
    if (location === "/agency/companies/contacts") {
      return <ClientContacts />;
    }

    if (location === "/agency/companies/needs") {
      return <ClientNeeds />;
    }

    if (location === "/agency/companies/contracts") {
      return <ClientAgreements />;
    }

    if (location === "/agency/companies/history") {
      return <ClientMissionHistory />;
    }

    if (location.startsWith("/agency/companies")) {
      return <ClientCompanies />;
    }
    
    if (location === "/agency/missions/new") {
      const organizationName = dashboardData?.profile?.agencyName ?? dashboardData?.user?.fullName ?? user.fullName;

      // Same shortcut missions-management.tsx already uses for agency-posted
      // jobs: job_postings.company_id is NOT NULL with no "real client
      // company" picker in this flow yet, so it's set to the agency's own
      // id (matching agencyId) rather than inventing a new required field.
      const buildJobPayload = (form: OfferFormValue, isActive: boolean) => ({
        companyId: user.id,
        agencyId: user.id,
        title: form.title,
        description: form.descriptionHtml,
        location: form.location,
        jobType: form.contractType,
        category: form.category,
        educationLevel: form.educationLevel || undefined,
        salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
        salaryMax: form.salaryMax ? Number(form.salaryMax) : undefined,
        requiredSkills: form.skills,
        applicationDeadline: form.applicationDeadline || undefined,
        startDate: form.startDate || undefined,
        isRemote: form.isRemote,
        isUrgent: form.isUrgent,
        positions: form.positions ? Number(form.positions) : 1,
        acceptsPlatformApplications: form.acceptsPlatformApplications,
        isActive,
      });

      // Standard-plan agencies go through admin review before a job goes
      // live (see POST /api/jobs) — partner-plan agencies skip the queue.
      // Unknown until the dashboard loads: the form waits (skeleton) rather
      // than briefly showing a partner agency the review-delay copy.
      const isFreemium = !!dashboardData && dashboardData.profile?.subscriptionPlan !== "partner";

      return (
        <OfferForm
          organization={{ name: organizationName, userType: "agency", isFreemium }}
          isLoadingInitialData={isDashboardLoading}
          backHref="/agency/missions"
          backLabel="Offres & Missions"
          onSaveDraft={(form, draftId) => saveAgencyDraft(draftId, form, () => buildJobPayload(form, false))}
          onPublish={(form, draftId) => publishAgencyOffer(draftId, form, () => buildJobPayload(form, true))}
        />
      );
    }

    if (editingJobId) {
      const organizationName = dashboardData?.profile?.agencyName ?? dashboardData?.user?.fullName ?? user.fullName;
      const isFreemium = !!dashboardData && dashboardData.profile?.subscriptionPlan !== "partner";
      // An offline job (draft, or closed) opens as a draft to continue: it
      // keeps « Enregistrer le brouillon » and its main button publishes it
      // (live for a partner agency, admin review for a standard one). A
      // live job opens in plain edit mode, as before.
      const continuesDraft = editContinuesDraft;

      return (
        <OfferForm
          key={continuesDraft ? "draft" : "edit"}
          mode={continuesDraft ? "create" : "edit"}
          draftId={continuesDraft ? editingJobId : null}
          organization={{ name: organizationName, userType: "agency", isFreemium }}
          initialData={editJobQuery.data ? mapJobPostingToOfferFormValue(editJobQuery.data) : undefined}
          isLoadingInitialData={editJobQuery.isLoading || !editJobQuery.data || isDashboardLoading}
          backHref="/agency/missions"
          backLabel="Offres & Missions"
          onSaveDraft={continuesDraft ? (form, draftId) => saveAgencyDraft(draftId ?? editingJobId, form) : undefined}
          onPublish={async (form, draftId): Promise<OfferSaveResult> => {
            if (continuesDraft) return publishAgencyOffer(draftId ?? editingJobId, form);
            await jobMutation.mutateAsync({ url: `/api/jobs/${editingJobId}`, method: "PATCH", data: buildJobUpdatePayload(form) });
            return { id: editingJobId, status: "PUBLIEE" };
          }}
        />
      );
    }

    if (location.startsWith("/agency/missions/applications")) {
      return <AgencyApplicationsPipeline />;
    }

    if (location === "/agency/missions/shortlist") {
      return <AgencyShortlist />;
    }

    if (location === "/agency/missions/assign") {
      return <AgencyAssignments />;
    }

    // The sidebar's « Créer une offre » link; the editor lives at /new.
    if (location === "/agency/missions/create") {
      return <Redirect to="/agency/missions/new" />;
    }

    if (location.startsWith("/agency/calendar")) {
      return (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-calendar-title">Calendrier des entretiens</h1>
            <p className="text-muted-foreground">Vue d'ensemble des entretiens planifiés</p>
          </div>
          <InterviewCalendar />
        </div>
      );
    }

    if (location.startsWith("/agency/pipeline")) {
      return (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-pipeline-title">Pipeline de recrutement</h1>
            <p className="text-muted-foreground">Suivi en direct de chaque étape, toutes missions et tous clients confondus</p>
          </div>
          <AgencyRecruitmentKanban />
        </div>
      );
    }

    if (location.startsWith("/agency/missions")) {
      return <MissionsManagement />;
    }

    if (location === "/agency/placements/clients") {
      return <RequirePartnerPlan><FieldMissionClients /></RequirePartnerPlan>;
    }

    const fieldMissionDetailMatch = location.match(/^\/agency\/placements\/([^/]+)$/);
    if (fieldMissionDetailMatch) {
      return <RequirePartnerPlan><FieldMissionDetail missionId={fieldMissionDetailMatch[1]} /></RequirePartnerPlan>;
    }

    if (location.startsWith("/agency/placements")) {
      return <RequirePartnerPlan><FieldMissionsList /></RequirePartnerPlan>;
    }

    if (location.startsWith("/agency/contracts")) {
      return <AgencyContractsPage />;
    }
    
    if (location === "/agency/billing" || location === "/agency/billing/invoices") {
      return <RequirePartnerPlan><ClientInvoicing /></RequirePartnerPlan>;
    }

    if (location === "/agency/billing/salaries") {
      return <RequirePartnerPlan><SalaryManagement /></RequirePartnerPlan>;
    }

    if (location === "/agency/billing/commissions") {
      return <RequirePartnerPlan><CommissionManagement /></RequirePartnerPlan>;
    }
    
    if (location === "/agency/billing/payments") {
      return <RequirePartnerPlan><AgencyPaymentStatement /></RequirePartnerPlan>;
    }

    if (location === "/agency/billing/export") {
      return <RequirePartnerPlan><AgencyAccountingExport /></RequirePartnerPlan>;
    }

    if (location.startsWith("/agency/billing")) {
      return <Redirect to="/agency/billing" />;
    }
    
    if (location.startsWith("/agency/hr")) {
      return (
        <ComingSoonPage 
          title="Suivi RH & Conformité" 
          icon={Shield}
          description="Dossiers administratifs, pièces légales, conformité légale & sociale et suivi des performances."
        />
      );
    }
    
    if (location === "/agency/crm/communications") {
      return <RelationsCommunications />;
    }

    if (location === "/agency/crm/reminders") {
      return <RelationsReminders />;
    }

    if (location === "/agency/crm/satisfaction") {
      return <RelationsSatisfaction />;
    }

    if (location.startsWith("/agency/crm")) {
      return <RelationsExchanges />;
    }
    
    if (location === "/agency/analytics" || location === "/agency/analytics/placements") {
      return <PlacementReports data={dashboardData?.placementReport} />;
    }
    
    if (location.startsWith("/agency/analytics")) {
      return (
        <ComingSoonPage 
          title="Rapports & Statistiques" 
          icon={BarChart3}
          description="Performance par secteur, taux de satisfaction, tableaux analytiques et export PDF/Excel."
        />
      );
    }
    
    if (location === "/agency/settings/financial") {
      return <RequirePartnerPlan><FinancialSettings /></RequirePartnerPlan>;
    }
    
    if (location.startsWith("/agency/settings")) {
      // Seul réglage disponible pour l'instant : la visibilité sur l'accueil.
      return (
        <div className="space-y-6">
          <VisibiliteAccueil />
          <ComingSoonPage
            title="Paramètres & Administration"
            icon={Settings}
            description="Utilisateurs & rôles, droits d'accès, paramétrage des services et sauvegarde."
          />
        </div>
      );
    }
    
    if (location.startsWith("/agency/security")) {
      return (
        <ComingSoonPage 
          title="Sécurité & Audit" 
          icon={Shield}
          description="Historique des actions, logs utilisateurs, sauvegarde des données et RGPD."
        />
      );
    }
    
    if (location.startsWith("/agency/support")) {
      return (
        <ComingSoonPage 
          title="Support & Assistance" 
          icon={HelpCircle}
          description="Tickets support, FAQ et guides utilisateurs."
        />
      );
    }
    
    return <DashboardHome data={dashboardData} isLoading={isDashboardLoading} />;
  };

  return getPageContent();
}
