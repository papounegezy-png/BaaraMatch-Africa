import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  BarChart3,
  Settings,
  ClipboardList,
  Plus,
  Building2,
  ChevronDown,
  ChevronRight,
  CalendarDays,
  Network,
  Shield,
  FolderKanban,
  HardHat,
  FileCheck,
  AlertTriangle,
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

// One entry per screen that actually exists. Sub-links used to point at
// sub-URLs (e.g. /company/leaves/balances) that every page ignores — they
// all opened the same page on its first tab — so the in-page tabs carry
// that navigation now. Paie, Sécurité and Support are "Bientôt disponible"
// placeholders and stay out of the menu until they're real; their routes
// still resolve for anyone with the URL.
const menuSections: MenuSection[] = [
  {
    title: "Principal",
    items: [
      { href: "/company/dashboard", icon: LayoutDashboard, label: "Tableau de bord" },
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
          // The offer form lives at /company/jobs/new (company-dashboard.tsx);
          // this link used to point at /company/jobs/create, which only
          // reopened the list.
          { href: "/company/jobs/new", icon: Plus, label: "Créer une offre" },
        ],
      },
      { href: "/company/applications", icon: Users, label: "Candidatures" },
      { href: "/company/calendar", icon: CalendarDays, label: "Calendrier" },
      { href: "/company/pipeline", icon: FolderKanban, label: "Pipeline" },
      { href: "/company/statistics", icon: BarChart3, label: "Statistiques" },
    ],
  },
  {
    title: "Gestion RH",
    items: [
      { href: "/company/employees", icon: Users, label: "Employés" },
      { href: "/company/leaves", icon: CalendarDays, label: "Congés & Absences" },
      { href: "/company/orgchart", icon: Network, label: "Organigramme" },
    ],
  },
  {
    title: "Modules BTP/Mines",
    items: [
      { href: "/company/sites", icon: HardHat, label: "Chantiers & Sites" },
      { href: "/company/certifications", icon: FileCheck, label: "Habilitations" },
      { href: "/company/epi", icon: Shield, label: "EPI & Équipements" },
      { href: "/company/hse", icon: AlertTriangle, label: "HSE" },
    ],
  },
  {
    title: "Configuration",
    items: [
      { href: "/company/departments", icon: Building2, label: "Départements" },
      { href: "/company/positions", icon: Briefcase, label: "Postes" },
      { href: "/company/settings", icon: Settings, label: "Paramètres" },
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
            <h1 className="font-semibold text-lg">BaaraMatch</h1>
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
