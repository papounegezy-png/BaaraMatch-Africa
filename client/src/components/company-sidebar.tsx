import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  Briefcase,
  FileText, 
  BarChart3,
  HelpCircle,
  Settings,
  UserCheck,
  UserPlus,
  ClipboardList,
  Calendar,
  Wallet,
  FileSpreadsheet,
  Building2,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  CalendarDays,
  CalendarCheck,
  CalendarX,
  Receipt,
  Calculator,
  Download,
  Network,
  GitBranch,
  Shield,
  Key,
  FileSearch,
  Bell,
  Target,
  TrendingUp,
  PieChart,
  UserCog,
  BadgeCheck,
  FolderKanban,
  ShieldCheck,
  History,
  Database,
  UserX,
  HardHat,
  FileCheck,
  AlertTriangle,
  Wrench,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface SubMenuItem {
  href: string;
  icon: React.ElementType;
  label: string;
}

interface MenuItem {
  href: string;
  icon: React.ElementType;
  label: string;
  subItems?: SubMenuItem[];
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const menuSections: MenuSection[] = [
  {
    title: "Principal",
    items: [
      {
        href: "/company/dashboard",
        icon: LayoutDashboard,
        label: "Tableau de bord",
        subItems: [
          { href: "/company/dashboard", icon: Target, label: "Vue d'ensemble" },
          { href: "/company/dashboard/alerts", icon: Bell, label: "Alertes" },
          { href: "/company/dashboard/kpis", icon: TrendingUp, label: "KPIs RH" },
        ],
      },
    ],
  },
  {
    title: "Recrutement",
    items: [
      {
        href: "/company/jobs",
        icon: Briefcase,
        label: "Offres d'emploi",
        subItems: [
          { href: "/company/jobs", icon: ClipboardList, label: "Toutes les offres" },
          { href: "/company/jobs/create", icon: UserPlus, label: "Créer une offre" },
          { href: "/company/jobs/drafts", icon: FileText, label: "Brouillons" },
          { href: "/company/jobs/archived", icon: FolderOpen, label: "Archivées" },
        ],
      },
      {
        href: "/company/applications",
        icon: Users,
        label: "Candidatures",
        subItems: [
          { href: "/company/applications", icon: ClipboardList, label: "Toutes les candidatures" },
          { href: "/company/applications/new", icon: Clock, label: "Nouvelles" },
          { href: "/company/applications/shortlist", icon: CheckCircle2, label: "Présélectionnées" },
          { href: "/company/applications/rejected", icon: XCircle, label: "Refusées" },
        ],
      },
      {
        href: "/company/pipeline",
        icon: FolderKanban,
        label: "Pipeline",
        subItems: [
          { href: "/company/pipeline", icon: GitBranch, label: "Vue Kanban" },
          { href: "/company/pipeline/interviews", icon: MessageSquare, label: "Entretiens" },
          { href: "/company/pipeline/offers", icon: FileText, label: "Offres envoyées" },
          { href: "/company/pipeline/hired", icon: UserCheck, label: "Recrutés" },
        ],
      },
      {
        href: "/company/statistics",
        icon: BarChart3,
        label: "Statistiques",
        subItems: [
          { href: "/company/statistics", icon: PieChart, label: "Vue globale" },
          { href: "/company/statistics/sources", icon: Target, label: "Sources candidats" },
          { href: "/company/statistics/time", icon: Clock, label: "Délais recrutement" },
          { href: "/company/statistics/conversion", icon: TrendingUp, label: "Taux conversion" },
        ],
      },
    ],
  },
  {
    title: "Gestion RH",
    items: [
      {
        href: "/company/employees",
        icon: Users,
        label: "Employés",
        subItems: [
          { href: "/company/employees", icon: ClipboardList, label: "Annuaire" },
          { href: "/company/employees/add", icon: UserPlus, label: "Ajouter employé" },
          { href: "/company/employees/roles", icon: UserCog, label: "Rôles & accès" },
          { href: "/company/employees/documents", icon: FileSearch, label: "Documents" },
          { href: "/company/employees/onboarding", icon: BadgeCheck, label: "Onboarding" },
        ],
      },
      {
        href: "/company/leaves",
        icon: CalendarDays,
        label: "Congés & Absences",
        subItems: [
          { href: "/company/leaves", icon: CalendarCheck, label: "Demandes" },
          { href: "/company/leaves/calendar", icon: Calendar, label: "Calendrier" },
          { href: "/company/leaves/balances", icon: Clock, label: "Soldes" },
          { href: "/company/leaves/history", icon: CalendarX, label: "Historique" },
        ],
      },
      {
        href: "/company/payroll",
        icon: Wallet,
        label: "Paie",
        subItems: [
          { href: "/company/payroll", icon: Receipt, label: "Bulletins de paie" },
          { href: "/company/payroll/run", icon: Calculator, label: "Lancer paie" },
          { href: "/company/payroll/contributions", icon: FileSpreadsheet, label: "Cotisations" },
          { href: "/company/payroll/export", icon: Download, label: "Exports" },
        ],
      },
      {
        href: "/company/orgchart",
        icon: Network,
        label: "Organigramme",
      },
    ],
  },
  {
    title: "Modules BTP/Mines",
    items: [
      {
        href: "/company/sites",
        icon: HardHat,
        label: "Chantiers & Sites",
        subItems: [
          { href: "/company/sites", icon: ClipboardList, label: "Liste des sites" },
          { href: "/company/sites/affectations", icon: Users, label: "Affectations" },
          { href: "/company/sites/rotations", icon: Calendar, label: "Rotations" },
          { href: "/company/sites/accommodations", icon: Building2, label: "Hébergements" },
        ],
      },
      {
        href: "/company/certifications",
        icon: FileCheck,
        label: "Habilitations",
        subItems: [
          { href: "/company/certifications", icon: ClipboardList, label: "Certifications" },
          { href: "/company/certifications/medical", icon: UserCheck, label: "Visites médicales" },
          { href: "/company/certifications/alerts", icon: Bell, label: "Alertes expiration" },
        ],
      },
      {
        href: "/company/epi",
        icon: Shield,
        label: "EPI & Équipements",
        subItems: [
          { href: "/company/epi", icon: ClipboardList, label: "Inventaire" },
          { href: "/company/epi/allocations", icon: Users, label: "Attributions" },
          { href: "/company/epi/conformity", icon: AlertTriangle, label: "Non-conformités" },
        ],
      },
      {
        href: "/company/hse",
        icon: AlertTriangle,
        label: "HSE",
        subItems: [
          { href: "/company/hse", icon: AlertTriangle, label: "Incidents" },
          { href: "/company/hse/trainings", icon: FileText, label: "Formations" },
          { href: "/company/hse/statistics", icon: BarChart3, label: "Statistiques" },
        ],
      },
    ],
  },
  {
    title: "Configuration",
    items: [
      {
        href: "/company/departments",
        icon: Building2,
        label: "Départements",
        subItems: [
          { href: "/company/departments", icon: ClipboardList, label: "Liste des départements" },
          { href: "/company/departments/add", icon: UserPlus, label: "Ajouter département" },
        ],
      },
      {
        href: "/company/positions",
        icon: Briefcase,
        label: "Postes",
        subItems: [
          { href: "/company/positions", icon: ClipboardList, label: "Liste des postes" },
          { href: "/company/positions/add", icon: UserPlus, label: "Ajouter poste" },
        ],
      },
      {
        href: "/company/settings",
        icon: Settings,
        label: "Paramètres",
        subItems: [
          { href: "/company/settings", icon: Building2, label: "Entreprise" },
          { href: "/company/settings/users", icon: Users, label: "Utilisateurs" },
          { href: "/company/settings/permissions", icon: Key, label: "Permissions" },
          { href: "/company/settings/integrations", icon: Shield, label: "Intégrations" },
        ],
      },
      {
        href: "/company/support",
        icon: HelpCircle,
        label: "Support",
      },
    ],
  },
  {
    title: "Sécurité & traçabilité",
    items: [
      {
        href: "/company/security",
        icon: ShieldCheck,
        label: "Sécurité",
        subItems: [
          { href: "/company/security/history", icon: History, label: "Historique des actions" },
          { href: "/company/security/backup", icon: Database, label: "Sauvegarde des données" },
          { href: "/company/security/gdpr", icon: UserX, label: "Conformité RGPD" },
        ],
      },
    ],
  },
];

export function CompanySidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [openMenus, setOpenMenus] = useState<string[]>(["Tableau de bord"]);

  const getInitials = (name: string) => {
    return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
  };

  const companyName = user?.fullName || "Entreprise";
  const companyInitials = getInitials(companyName);

  const toggleMenu = (label: string) => {
    setOpenMenus(prev => 
      prev.includes(label) 
        ? prev.filter(m => m !== label)
        : [...prev, label]
    );
  };

  const isMenuOpen = (label: string) => openMenus.includes(label);

  const isActive = (href: string) => {
    return location === href || location.startsWith(href + "/");
  };

  const hasActiveChild = (subItems?: SubMenuItem[]) => {
    if (!subItems) return false;
    return subItems.some(item => isActive(item.href));
  };

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b py-4 px-4">
        <Link href="/company/dashboard" className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundImage: "linear-gradient(135deg, rgb(139, 92, 246) 0%, rgb(236, 72, 153) 100%)" }}
          >
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <h1 className="font-semibold text-lg">WorkMatch ATS</h1>
            <p className="text-xs text-muted-foreground">Espace Entreprise</p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2 overflow-y-auto">
        {menuSections.map((section) => (
          <SidebarGroup key={section.title} className="py-2">
            <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1 group-data-[collapsible=icon]:hidden">
              {section.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const hasSubItems = item.subItems && item.subItems.length > 0;
                  const itemIsActive = isActive(item.href) || hasActiveChild(item.subItems);
                  const menuOpen = isMenuOpen(item.label);

                  if (hasSubItems) {
                    return (
                      <Collapsible
                        key={item.label}
                        open={menuOpen}
                        onOpenChange={() => toggleMenu(item.label)}
                      >
                        <SidebarMenuItem>
                          <div className="flex items-center w-full">
                            <SidebarMenuButton
                              asChild
                              isActive={itemIsActive}
                              tooltip={item.label}
                              className="flex-1"
                              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                            >
                              <Link href={item.href}>
                                <item.icon className="h-4 w-4 shrink-0" />
                                <span className="text-sm font-medium group-data-[collapsible=icon]:hidden flex-1">{item.label}</span>
                              </Link>
                            </SidebarMenuButton>
                            <CollapsibleTrigger asChild>
                              <button 
                                className="p-2 group-data-[collapsible=icon]:hidden"
                                data-testid={`toggle-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                              >
                                {menuOpen ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                              </button>
                            </CollapsibleTrigger>
                          </div>
                          <CollapsibleContent>
                            <SidebarMenuSub className="group-data-[collapsible=icon]:hidden ml-4 mt-1 space-y-0.5 border-l pl-3">
                              {item.subItems?.map((subItem) => {
                                const subItemActive = isActive(subItem.href);
                                return (
                                  <SidebarMenuSubItem key={subItem.href}>
                                    <SidebarMenuSubButton
                                      asChild
                                      isActive={subItemActive}
                                    >
                                      <Link 
                                        href={subItem.href}
                                        data-testid={`nav-${subItem.label.toLowerCase().replace(/\s+/g, '-')}`}
                                      >
                                        <subItem.icon className="h-3.5 w-3.5" />
                                        <span className="text-sm">{subItem.label}</span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                );
                              })}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    );
                  }

                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={itemIsActive}
                        tooltip={item.label}
                      >
                        <Link 
                          href={item.href} 
                          data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          <item.icon className="h-4 w-4" />
                          <span className="text-sm font-medium">{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t p-3">
        <div className="flex items-center gap-3 px-3 py-2 group-data-[collapsible=icon]:justify-center rounded-lg">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback 
              className="text-white text-sm font-medium"
              style={{ backgroundImage: "linear-gradient(135deg, rgb(139, 92, 246) 0%, rgb(236, 72, 153) 100%)" }}
            >
              {companyInitials}
            </AvatarFallback>
          </Avatar>
          <div className="group-data-[collapsible=icon]:hidden flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{companyName}</p>
            <p className="text-xs text-muted-foreground">Administrateur RH</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
