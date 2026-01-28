import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  Receipt, 
  Settings,
  Building2,
  MessageSquare,
  TrendingUp,
  HelpCircle
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
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const mainMenuItems = [
  { 
    href: "/agency/dashboard", 
    icon: LayoutDashboard, 
    label: "Tableau de Bord",
  },
  { 
    href: "/agency/recruitments", 
    icon: Users, 
    label: "Recrutements en cours",
  },
  { 
    href: "/agency/placements", 
    icon: UserCheck, 
    label: "Employés Placés",
  },
  { 
    href: "/agency/billing", 
    icon: Receipt, 
    label: "Facturation",
  },
];

const toolsMenuItems = [
  { 
    href: "/agency/messages", 
    icon: MessageSquare, 
    label: "Messagerie CRM",
  },
  { 
    href: "/agency/analytics", 
    icon: TrendingUp, 
    label: "Analytics RH",
  },
  { 
    href: "/agency/settings", 
    icon: Settings, 
    label: "Paramètres Agence",
  },
];

export function AgencySidebar() {
  const [location] = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 p-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <h1 className="font-bold text-sm">WorkMatch</h1>
            <p className="text-[10px] text-muted-foreground">Agency Portal</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => {
                const isActive = location === item.href || location.startsWith(item.href + "/");
                
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      tooltip={item.label}
                    >
                      <Link href={item.href} data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Outils</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolsMenuItems.map((item) => {
                const isActive = location === item.href || location.startsWith(item.href + "/");
                
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      tooltip={item.label}
                    >
                      <Link href={item.href} data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Support">
              <a href="#" className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                <span>Besoin d'aide?</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
