import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  Building2,
  Briefcase,
  FileText, 
  Receipt, 
  BarChart3,
  HelpCircle,
  Settings,
  Shield,
  MessageCircle,
  UserCheck,
  FolderOpen,
  FileSearch,
  Target,
  Calendar,
  History,
  Zap,
  Building,
  Phone,
  ClipboardList,
  FileCheck,
  UserPlus,
  Send,
  ListChecks,
  Star,
  CalendarClock,
  Wallet,
  CreditCard,
  PiggyBank,
  FileSpreadsheet,
  Download,
  BadgeCheck,
  Scale,
  TrendingUp,
  Mail,
  Bell,
  RefreshCw,
  ThumbsUp,
  PieChart,
  LineChart,
  FileDown,
  UsersRound,
  Lock,
  Cog,
  DollarSign,
  Database,
  Activity,
  ClipboardCheck,
  ShieldCheck,
  Ticket,
  BookOpen,
  ChevronDown,
  ChevronRight,
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
        href: "/agency/dashboard",
        icon: LayoutDashboard,
        label: "Tableau de bord",
        subItems: [
          { href: "/agency/dashboard", icon: Target, label: "Indicateurs clés" },
          { href: "/agency/dashboard/placements", icon: UserCheck, label: "Placements" },
          { href: "/agency/dashboard/alerts", icon: Bell, label: "Alertes" },
          { href: "/agency/dashboard/stats", icon: BarChart3, label: "Statistiques" },
        ],
      },
    ],
  },
  {
    title: "Gestion",
    items: [
      {
        href: "/agency/candidates",
        icon: Users,
        label: "Candidats",
        subItems: [
          { href: "/agency/candidates", icon: FolderOpen, label: "Base de données" },
          { href: "/agency/candidates/create", icon: UserPlus, label: "Nouveau candidat" },
          { href: "/agency/candidates/documents", icon: FileText, label: "CV & pièces jointes" },
          { href: "/agency/candidates/skills", icon: Star, label: "Compétences" },
          { href: "/agency/candidates/availability", icon: Calendar, label: "Disponibilités" },
          { href: "/agency/candidates/history", icon: History, label: "Historique placements" },
          { href: "/agency/candidates/matching", icon: Zap, label: "Matching automatique" },
        ],
      },
      {
        href: "/agency/companies",
        icon: Building2,
        label: "Entreprises",
        subItems: [
          { href: "/agency/companies", icon: Building, label: "Fiches entreprises" },
          { href: "/agency/companies/contacts", icon: Phone, label: "Contacts RH" },
          { href: "/agency/companies/needs", icon: ClipboardList, label: "Besoins recrutement" },
          { href: "/agency/companies/contracts", icon: FileCheck, label: "Contrats & accords" },
          { href: "/agency/companies/history", icon: History, label: "Historique missions" },
        ],
      },
      {
        href: "/agency/missions",
        icon: Briefcase,
        label: "Offres & missions",
        subItems: [
          { href: "/agency/missions", icon: FileText, label: "Toutes les offres" },
          { href: "/agency/missions/create", icon: UserPlus, label: "Créer une offre" },
          { href: "/agency/missions/publish", icon: Send, label: "Publications" },
          { href: "/agency/missions/applications", icon: ListChecks, label: "Candidatures" },
          { href: "/agency/missions/shortlist", icon: Star, label: "Shortlist" },
          { href: "/agency/missions/assign", icon: UserCheck, label: "Affectations" },
        ],
      },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        href: "/agency/contracts",
        icon: FileText,
        label: "Placements & contrats",
        subItems: [
          { href: "/agency/contracts", icon: Briefcase, label: "Placements en cours" },
          { href: "/agency/contracts/documents", icon: FileText, label: "Contrats de travail" },
          { href: "/agency/contracts/dates", icon: CalendarClock, label: "Dates & échéances" },
          { href: "/agency/contracts/renewals", icon: RefreshCw, label: "Renouvellements" },
          { href: "/agency/contracts/evaluations", icon: ThumbsUp, label: "Évaluations" },
        ],
      },
      {
        href: "/agency/billing",
        icon: Receipt,
        label: "Paie & facturation",
        subItems: [
          { href: "/agency/billing", icon: Receipt, label: "Facturation clients" },
          { href: "/agency/billing/salaries", icon: Wallet, label: "Rémunérations" },
          { href: "/agency/billing/commissions", icon: PiggyBank, label: "Commissions" },
          { href: "/agency/billing/payments", icon: CreditCard, label: "États de paiement" },
          { href: "/agency/billing/export", icon: FileSpreadsheet, label: "Export comptable" },
        ],
      },
      {
        href: "/agency/hr",
        icon: BadgeCheck,
        label: "Suivi RH & conformité",
        subItems: [
          { href: "/agency/hr", icon: FolderOpen, label: "Dossiers administratifs" },
          { href: "/agency/hr/documents", icon: FileSearch, label: "Pièces légales" },
          { href: "/agency/hr/compliance", icon: Scale, label: "Conformité légale" },
          { href: "/agency/hr/performance", icon: TrendingUp, label: "Performances" },
        ],
      },
    ],
  },
  {
    title: "Relations clients",
    items: [
      {
        href: "/agency/crm",
        icon: MessageCircle,
        label: "CRM",
        subItems: [
          { href: "/agency/crm", icon: History, label: "Suivi échanges" },
          { href: "/agency/crm/communications", icon: Mail, label: "Appels & emails" },
          { href: "/agency/crm/reminders", icon: Bell, label: "Relances auto" },
          { href: "/agency/crm/satisfaction", icon: ThumbsUp, label: "Satisfaction client" },
        ],
      },
      {
        href: "/agency/analytics",
        icon: BarChart3,
        label: "Rapports & stats",
        subItems: [
          { href: "/agency/analytics", icon: PieChart, label: "Rapports placement" },
          { href: "/agency/analytics/sectors", icon: LineChart, label: "Performance secteur" },
          { href: "/agency/analytics/satisfaction", icon: ThumbsUp, label: "Taux satisfaction" },
          { href: "/agency/analytics/dashboards", icon: LayoutDashboard, label: "Tableaux analytiques" },
          { href: "/agency/analytics/export", icon: FileDown, label: "Export PDF/Excel" },
        ],
      },
    ],
  },
  {
    title: "Configuration",
    items: [
      {
        href: "/agency/settings",
        icon: Settings,
        label: "Paramètres",
        subItems: [
          { href: "/agency/settings", icon: UsersRound, label: "Utilisateurs & rôles" },
          { href: "/agency/settings/permissions", icon: Lock, label: "Droits d'accès" },
          { href: "/agency/settings/services", icon: Cog, label: "Paramétrage services" },
          { href: "/agency/settings/financial", icon: DollarSign, label: "Paramètres financiers" },
          { href: "/agency/settings/backup", icon: Database, label: "Sauvegarde & sécurité" },
        ],
      },
      {
        href: "/agency/security",
        icon: Shield,
        label: "Sécurité & audit",
        subItems: [
          { href: "/agency/security", icon: Activity, label: "Historique actions" },
          { href: "/agency/security/logs", icon: ClipboardCheck, label: "Logs utilisateurs" },
          { href: "/agency/security/backup", icon: Database, label: "Sauvegarde données" },
          { href: "/agency/security/gdpr", icon: ShieldCheck, label: "RGPD & confidentialité" },
        ],
      },
      {
        href: "/agency/support",
        icon: HelpCircle,
        label: "Support",
        subItems: [
          { href: "/agency/support", icon: Ticket, label: "Tickets support" },
          { href: "/agency/support/faq", icon: HelpCircle, label: "FAQ" },
          { href: "/agency/support/guides", icon: BookOpen, label: "Guides utilisateurs" },
        ],
      },
    ],
  },
];

export function AgencySidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [openMenus, setOpenMenus] = useState<string[]>(["Tableau de bord"]);

  const getInitials = (name: string) => {
    return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
  };

  const userName = user?.fullName || "Utilisateur";
  const userInitials = getInitials(userName);

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
        <Link href="/agency/dashboard" className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundImage: "linear-gradient(135deg, rgb(43, 127, 255) 0%, rgb(0, 201, 80) 100%)" }}
          >
            <Briefcase className="h-5 w-5 text-white" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <h1 className="font-semibold text-lg">RH Connect</h1>
            <p className="text-xs text-muted-foreground">Agence de placement</p>
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
              style={{ backgroundImage: "linear-gradient(135deg, rgb(81, 162, 255) 0%, rgb(21, 93, 252) 100%)" }}
            >
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="group-data-[collapsible=icon]:hidden flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userName}</p>
            <p className="text-xs text-muted-foreground">Administrateur</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
