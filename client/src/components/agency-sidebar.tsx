import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  Briefcase,
  FileText, 
  Receipt, 
  BarChart3,
  HelpCircle
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";

const menuItems = [
  { 
    href: "/agency/dashboard", 
    icon: LayoutDashboard, 
    label: "Accueil",
  },
  { 
    href: "/agency/candidates", 
    icon: Users, 
    label: "Candidats",
  },
  { 
    href: "/agency/missions", 
    icon: Briefcase, 
    label: "Missions",
  },
  { 
    href: "/agency/contracts", 
    icon: FileText, 
    label: "Contrats",
  },
  { 
    href: "/agency/billing", 
    icon: Receipt, 
    label: "Facturation",
  },
  { 
    href: "/agency/analytics", 
    icon: BarChart3, 
    label: "Analytique",
  },
];

export function AgencySidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const getInitials = (name: string) => {
    return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
  };

  const userName = user?.fullName || "Utilisateur";
  const userInitials = getInitials(userName);

  return (
    <Sidebar collapsible="icon" className="border-r border-gray-200 dark:border-gray-800">
      <SidebarHeader className="border-b border-gray-200 dark:border-gray-800 py-6 px-6">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundImage: "linear-gradient(135deg, rgb(43, 127, 255) 0%, rgb(0, 201, 80) 100%)" }}
          >
            <Briefcase className="h-5 w-5 text-white" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <h1 className="font-semibold text-lg text-gray-900 dark:text-white">RH Connect</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Agence de placement</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-4 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => {
                const isActive = location === item.href || 
                  (item.href === "/agency/dashboard" && location === "/agency/dashboard");
                
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      tooltip={item.label}
                      className={`h-11 rounded-xl px-4 ${
                        isActive 
                          ? "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400" 
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      <Link href={item.href} data-testid={`nav-${item.label.toLowerCase()}`}>
                        <item.icon className={`h-5 w-5 ${isActive ? "text-blue-600 dark:text-blue-400" : ""}`} />
                        <span className="text-sm font-medium">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center gap-3 px-4 py-3 group-data-[collapsible=icon]:justify-center">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarFallback 
              className="text-white text-sm font-medium"
              style={{ backgroundImage: "linear-gradient(135deg, rgb(81, 162, 255) 0%, rgb(21, 93, 252) 100%)" }}
            >
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="group-data-[collapsible=icon]:hidden flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{userName}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Administrateur</p>
          </div>
        </div>
        <SidebarMenu className="group-data-[collapsible=icon]:hidden">
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Aide" className="h-10 rounded-xl px-4 text-gray-600 dark:text-gray-400">
              <a href="#" data-testid="nav-help">
                <HelpCircle className="h-4 w-4" />
                <span className="text-sm">Besoin d'aide?</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
