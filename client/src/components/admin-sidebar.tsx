import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Building2,
  Users,
  UserCheck,
  Briefcase,
  Settings,
  Shield,
  ShieldCheck,
  ToggleRight,
  LogOut,
  Flag,
  ScrollText,
  Building,
  FileBarChart,
  BarChart3,
  Ticket,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { hasAdminPermission } from "@shared/schema";

const mainMenuItems = [
  {
    title: "Tableau de bord",
    url: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Entreprises",
    url: "/admin/companies",
    icon: Building2,
  },
  {
    title: "Agences",
    url: "/admin/agencies",
    icon: Briefcase,
  },
  {
    title: "Candidats",
    url: "/admin/candidates",
    icon: UserCheck,
  },
  {
    title: "Utilisateurs",
    url: "/admin/users",
    icon: Users,
  },
];

const supervisionMenuItems = [
  {
    title: "Modération",
    url: "/admin/moderation",
    icon: Flag,
  },
];

const statisticsMenuItems = [
  {
    title: "Statistiques",
    url: "/admin/statistics",
    icon: BarChart3,
  },
  {
    title: "Rapports",
    url: "/admin/reports",
    icon: FileBarChart,
  },
];

// The audit journal (who viewed what, including candidate profile
// consultations) is only meaningful if the admins it watches can't read
// it — restricted to super_admin, same as adminAccountsMenuItem below.
const logsMenuItem = {
  title: "Logs",
  url: "/admin/logs",
  icon: ScrollText,
};

// Third-party job management is restricted to super_admin/admin server-side
// (requireAdminLevel) — hidden here too so a moderateur never even sees the
// entry point.
const thirdPartyMenuItem = {
  title: "Organisations tiers",
  url: "/admin/organizations",
  icon: Building,
};

// Shows candidate names + phone numbers: same permission as full candidate
// profiles server-side (candidats:consulter_profil_complet).
const whatsappPendingMenuItem = {
  title: "WhatsApp en attente",
  url: "/admin/whatsapp-pending",
  icon: MessageCircle,
};

// Same permission as thirdPartyMenuItem server-side (organisations:gerer).
const invitationCodesMenuItem = {
  title: "Codes d'invitation",
  url: "/admin/invitation-codes",
  icon: Ticket,
};

// Managing who else has admin access is super_admin only.
const adminAccountsMenuItem = {
  title: "Comptes admin",
  url: "/admin/accounts",
  icon: ShieldCheck,
};

const configMenuItems = [
  {
    title: "Modules",
    url: "/admin/modules",
    icon: ToggleRight,
  },
  {
    title: "Sécurité",
    url: "/admin/security",
    icon: Shield,
  },
  {
    title: "Paramètres",
    url: "/admin/settings",
    icon: Settings,
  },
];

export function AdminSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const adminLevel = user?.adminLevel;
  const canManageThirdParty = hasAdminPermission(adminLevel, "organisations:gerer");
  const canManageAdminAccounts = hasAdminPermission(adminLevel, "admins:gerer");
  const canViewCandidateContacts = hasAdminPermission(adminLevel, "candidats:consulter_profil_complet");
  const supervisionItemsWithWhatsApp = canViewCandidateContacts
    ? [...supervisionMenuItems, whatsappPendingMenuItem]
    : supervisionMenuItems;
  const visibleSupervisionItems = canManageThirdParty
    ? [...supervisionItemsWithWhatsApp, thirdPartyMenuItem, invitationCodesMenuItem]
    : supervisionItemsWithWhatsApp;
  const visibleConfigItems = canManageAdminAccounts
    ? [adminAccountsMenuItem, ...configMenuItems]
    : configMenuItems;
  const visibleSupervisionItemsWithLogs = canManageAdminAccounts
    ? [...visibleSupervisionItems, logsMenuItem]
    : visibleSupervisionItems;

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Super Admin</h2>
            <p className="text-xs text-muted-foreground">BaaraMatch Africa</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.startsWith(item.url)}
                    data-testid={`link-admin-${item.url.split('/').pop()}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Supervision</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleSupervisionItemsWithLogs.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.startsWith(item.url)}
                    data-testid={`link-admin-${item.url.split('/').pop()}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Statistique & rapport</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {statisticsMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.startsWith(item.url)}
                    data-testid={`link-admin-${item.url.split('/').pop()}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Configuration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleConfigItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.startsWith(item.url)}
                    data-testid={`link-admin-${item.url.split('/').pop()}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        <Button variant="ghost" className="w-full justify-start gap-2" data-testid="button-admin-logout">
          <LogOut className="w-4 h-4" />
          Déconnexion
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
