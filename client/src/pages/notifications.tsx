import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Settings,
  Trash2,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { LoadingState } from "@/components/loading-state";
import { ThemeToggle } from "@/components/theme-toggle";
import { apiRequest } from "@/lib/queryClient";
import type { Notification } from "@shared/schema";

const notificationTypeConfig: Record<Notification["type"], { icon: typeof Bell; color: string; bgColor: string }> = {
  job_match: {
    icon: Briefcase,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  application_update: {
    icon: CheckCircle2,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  system: {
    icon: Bell,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
};

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const diffMinutes = Math.floor((Date.now() - date.getTime()) / (1000 * 60));
  if (diffMinutes < 1) return "À l'instant";
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function NotificationsPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");

  const { data: notifications = [], isLoading: isLoadingNotifications } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: !!user,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("PATCH", `/api/notifications/${id}/read`);
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", "/api/notifications/read-all");
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/notifications/${id}`);
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const jobNotifications = notifications.filter((n) => n.type === "job_match");

  const filteredNotifications =
    activeTab === "all" ? notifications : activeTab === "jobs" ? jobNotifications : notifications.filter((n) => n.type === "system");

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div>
            <h1 className="text-xl font-bold" data-testid="text-page-title">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/profile">
              <Button variant="ghost" size="icon" data-testid="button-settings">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4">
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1 gap-1" data-testid="tab-all">
              Tous
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-1 text-[10px] px-1.5">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="jobs" className="flex-1 gap-1" data-testid="tab-jobs">
              <Briefcase className="h-3.5 w-3.5" />
              Emplois
            </TabsTrigger>
            <TabsTrigger value="system" className="flex-1 gap-1" data-testid="tab-system">
              <Bell className="h-3.5 w-3.5" />
              Système
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      <div className="p-4 space-y-4">
        {unreadCount > 0 && (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="text-xs"
              data-testid="button-mark-all-read"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Tout marquer comme lu
            </Button>
          </div>
        )}

        {isLoadingNotifications ? (
          <LoadingState label="Chargement des notifications" />
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => {
              const config = notificationTypeConfig[notification.type];
              const Icon = config.icon;

              return (
                <Card
                  key={notification.id}
                  className={`transition-all cursor-pointer ${!notification.isRead ? "border-primary/50 bg-primary/5" : ""}`}
                  onClick={() => !notification.isRead && markReadMutation.mutate(notification.id)}
                  data-testid={`notification-${notification.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <div className={`h-10 w-10 rounded-full ${config.bgColor} flex items-center justify-center shrink-0`}>
                        <Icon className={`h-5 w-5 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`font-medium text-sm ${!notification.isRead ? "" : "text-muted-foreground"}`}>
                                {notification.title}
                              </p>
                              {!notification.isRead && (
                                <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate mt-0.5">
                              {notification.message}
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="shrink-0" onClick={(e) => e.stopPropagation()}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {!notification.isRead && (
                                <DropdownMenuItem onClick={() => markReadMutation.mutate(notification.id)}>
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Marquer comme lu
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => deleteMutation.mutate(notification.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">
                            {notification.createdAt ? formatRelativeTime(notification.createdAt as unknown as string) : ""}
                          </span>
                          {notification.actionUrl && (
                            <Link href={notification.actionUrl}>
                              <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={(e) => e.stopPropagation()}>
                                Voir <ChevronRight className="h-3 w-3" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {!isLoadingNotifications && filteredNotifications.length === 0 && (
          <div className="text-center py-12">
            <Bell className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-medium text-lg">Aucune notification</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Vous recevrez ici les mises à jour de vos candidatures.
            </p>
          </div>
        )}
      </div>

      <MobileBottomNav userType={user.userType} />
    </div>
  );
}
