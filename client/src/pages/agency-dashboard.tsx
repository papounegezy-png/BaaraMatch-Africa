import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { AgencyKPICards } from "@/components/agency-kpi-cards";
import { ActiveContractsTable } from "@/components/active-contracts-table";
import { CandidateSearchDashboard } from "@/components/candidate-search-dashboard";
import { CandidateManagementTable } from "@/components/candidate-management-table";
import { MissionsManagement } from "@/components/missions-management";
import { NewCandidateForm } from "@/components/new-candidate-form";
import { CvAttachmentsManager } from "@/components/cv-attachments-manager";
import { CandidateProfileView } from "@/components/candidate-profile-view";
import { PlacementReports } from "@/components/placement-reports";
import { FinancialSettings } from "@/components/financial-settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  Building2, 
  Briefcase, 
  FileText, 
  Receipt, 
  BarChart3, 
  Shield, 
  MessageCircle,
  Settings,
  HelpCircle,
  Construction
} from "lucide-react";

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

function DashboardHome() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
        Tableau de bord
      </h1>
      <AgencyKPICards />
      <ActiveContractsTable />
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Recherche de Candidats IA</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Filtrage intelligent par compétences, expérience et disponibilité
          </p>
        </div>
        <CandidateSearchDashboard />
      </div>
    </div>
  );
}

function CandidatesManagementPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Gestion des Candidats
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Base de données des candidats, profils, compétences et historique des placements
        </p>
      </div>
      <CandidateManagementTable />
    </div>
  );
}

export default function AgencyDashboardPage() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const getPageContent = () => {
    if (location === "/agency/dashboard" || location === "/agency") {
      return <DashboardHome />;
    }
    
    if (location === "/agency/candidates/create") {
      return <NewCandidateForm />;
    }
    
    if (location === "/agency/candidates/documents") {
      return <CvAttachmentsManager />;
    }
    
    const candidateProfileMatch = location.match(/^\/agency\/candidates\/([^/]+)$/);
    if (candidateProfileMatch && candidateProfileMatch[1] !== "create" && candidateProfileMatch[1] !== "documents") {
      return <CandidateProfileView candidateId={candidateProfileMatch[1]} />;
    }
    
    if (location.startsWith("/agency/candidates")) {
      return <CandidatesManagementPage />;
    }
    
    if (location.startsWith("/agency/companies")) {
      return (
        <ComingSoonPage 
          title="Gestion des Entreprises" 
          icon={Building2}
          description="Fiches entreprises, contacts RH, besoins en recrutement, contrats & accords cadres."
        />
      );
    }
    
    if (location.startsWith("/agency/missions")) {
      return <MissionsManagement />;
    }
    
    if (location.startsWith("/agency/contracts")) {
      return (
        <ComingSoonPage 
          title="Placements & Contrats" 
          icon={FileText}
          description="Placements en cours, contrats de travail, dates de début & fin, suivi des renouvellements et évaluations."
        />
      );
    }
    
    if (location.startsWith("/agency/billing")) {
      return (
        <ComingSoonPage 
          title="Paie & Facturation" 
          icon={Receipt}
          description="Facturation clients, rémunération candidats, commissions agence et export comptable."
        />
      );
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
    
    if (location.startsWith("/agency/crm")) {
      return (
        <ComingSoonPage 
          title="CRM & Relations Clients" 
          icon={MessageCircle}
          description="Suivi des échanges, appels/emails/réunions, relances automatiques et satisfaction client."
        />
      );
    }
    
    if (location === "/agency/analytics" || location === "/agency/analytics/placements") {
      return <PlacementReports />;
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
      return <FinancialSettings />;
    }
    
    if (location.startsWith("/agency/settings")) {
      return (
        <ComingSoonPage 
          title="Paramètres & Administration" 
          icon={Settings}
          description="Utilisateurs & rôles, droits d'accès, paramétrage des services et sauvegarde."
        />
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
    
    return <DashboardHome />;
  };

  return getPageContent();
}
