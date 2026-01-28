import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  Bell,
  Briefcase,
  Wallet,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  Building2,
  ChevronRight,
  Settings,
  Phone,
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
import { ThemeToggle } from "@/components/theme-toggle";

interface Notification {
  id: string;
  type: "job_match" | "application_update" | "payment_reminder" | "system";
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  matchScore?: number;
  actionUrl?: string;
  companyName?: string;
  companyLogo?: string;
  amount?: number;
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "job_match",
    title: "Nouvelle offre correspondante",
    message: "Développeur Frontend React chez Orange Mali",
    timestamp: "Il y a 5 min",
    isRead: false,
    matchScore: 92,
    actionUrl: "/jobs/1",
    companyName: "Orange Mali",
  },
  {
    id: "2",
    type: "payment_reminder",
    title: "Rappel Mobile Money",
    message: "Votre abonnement Premium expire dans 3 jours",
    timestamp: "Il y a 1h",
    isRead: false,
    amount: 5000,
  },
  {
    id: "3",
    type: "application_update",
    title: "Candidature acceptée !",
    message: "Votre candidature pour Chef de Projet IT a été retenue",
    timestamp: "Il y a 2h",
    isRead: false,
    companyName: "Sonatel",
    actionUrl: "/applications/2",
  },
  {
    id: "4",
    type: "job_match",
    title: "Nouvelle offre correspondante",
    message: "Analyste Business chez Wave Mobile",
    timestamp: "Il y a 4h",
    isRead: true,
    matchScore: 87,
    actionUrl: "/jobs/3",
    companyName: "Wave Mobile",
  },
  {
    id: "5",
    type: "payment_reminder",
    title: "Paiement reçu",
    message: "Votre paiement de 5,000 FCFA via Orange Money a été confirmé",
    timestamp: "Hier",
    isRead: true,
    amount: 5000,
  },
  {
    id: "6",
    type: "system",
    title: "Complétez votre profil",
    message: "Ajoutez votre CV vocal pour augmenter vos chances",
    timestamp: "Hier",
    isRead: true,
    actionUrl: "/profile",
  },
  {
    id: "7",
    type: "job_match",
    title: "Opportunité urgente",
    message: "Technicien Réseau recherché en urgence - ACI 2000",
    timestamp: "Il y a 2 jours",
    isRead: true,
    matchScore: 78,
    actionUrl: "/jobs/5",
    companyName: "Malitel",
  },
];

const notificationTypeConfig = {
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
  payment_reminder: {
    icon: Wallet,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  system: {
    icon: Bell,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
};

export default function NotificationsPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [notifications, setNotifications] = useState(mockNotifications);
  const [activeTab, setActiveTab] = useState("all");

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
  const paymentNotifications = notifications.filter((n) => n.type === "payment_reminder");

  const filteredNotifications =
    activeTab === "all"
      ? notifications
      : activeTab === "jobs"
      ? jobNotifications
      : paymentNotifications;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

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
            <Link href="/settings">
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
            <TabsTrigger value="payments" className="flex-1 gap-1" data-testid="tab-payments">
              <Wallet className="h-3.5 w-3.5" />
              Paiements
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
              onClick={markAllAsRead}
              className="text-xs"
              data-testid="button-mark-all-read"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Tout marquer comme lu
            </Button>
          </div>
        )}

        <div className="space-y-3">
          {filteredNotifications.map((notification) => {
            const config = notificationTypeConfig[notification.type];
            const Icon = config.icon;

            return (
              <Card
                key={notification.id}
                className={`transition-all ${!notification.isRead ? "border-primary/50 bg-primary/5" : ""}`}
                onClick={() => markAsRead(notification.id)}
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
                            <Button variant="ghost" size="icon" className="shrink-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {!notification.isRead && (
                              <DropdownMenuItem onClick={() => markAsRead(notification.id)}>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Marquer comme lu
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteNotification(notification.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{notification.timestamp}</span>
                          {notification.matchScore && (
                            <Badge variant="secondary" className="text-[10px] gap-1">
                              <Sparkles className="h-3 w-3" />
                              {notification.matchScore}% match
                            </Badge>
                          )}
                          {notification.amount && (
                            <Badge variant="outline" className="text-[10px]">
                              {notification.amount.toLocaleString()} FCFA
                            </Badge>
                          )}
                        </div>
                        {notification.actionUrl && (
                          <Link href={notification.actionUrl}>
                            <Button variant="ghost" size="sm" className="text-xs gap-1">
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

        {filteredNotifications.length === 0 && (
          <div className="text-center py-12">
            <Bell className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-medium text-lg">Aucune notification</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Vous recevrez ici les alertes emploi et rappels de paiement
            </p>
          </div>
        )}

        <Card className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                <Phone className="h-6 w-6 text-orange-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Alertes WhatsApp</h3>
                <p className="text-xs text-muted-foreground">
                  Recevez les offres sur votre WhatsApp
                </p>
              </div>
              <Switch data-testid="switch-whatsapp-alerts" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4 text-orange-500" />
              Paiements Mobile Money
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-orange-500">OM</span>
                </div>
                <div>
                  <p className="font-medium text-sm">Orange Money</p>
                  <p className="text-xs text-muted-foreground">+223 7X XX XX XX</p>
                </div>
              </div>
              <Badge variant="secondary">Actif</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-yellow-600">MM</span>
                </div>
                <div>
                  <p className="font-medium text-sm">Moov Money</p>
                  <p className="text-xs text-muted-foreground">Non configuré</p>
                </div>
              </div>
              <Button variant="outline" size="sm" data-testid="button-add-moov">
                Ajouter
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <MobileBottomNav userType={user.userType} />
    </div>
  );
}
