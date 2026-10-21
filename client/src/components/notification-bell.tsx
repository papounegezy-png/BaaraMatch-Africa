import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Briefcase, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/lib/queryClient";
import type { Notification } from "@shared/schema";

const typeIcon: Record<Notification["type"], typeof Bell> = {
  job_match: Briefcase,
  application_update: CheckCircle2,
  system: Bell,
  employer_job: Briefcase,
};

function formatRelativeTime(dateString: string) {
  const diffMinutes = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60));
  if (diffMinutes < 1) return "À l'instant";
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return diffDays === 1 ? "Hier" : `Il y a ${diffDays} jours`;
}

interface NotificationBellProps {
  iconClassName?: string;
  buttonClassName?: string;
  // « entete » : bouton rond de 48 px bordé, point rouge de 12 px (en-tête
  // des pages publiques et de l'espace candidat).
  variante?: "entete";
}

// Real notification bell (unread badge + dropdown preview) — shared by the
// public Navbar and the Company/Agency dashboard layouts, which previously
// each rendered a plain decorative Bell icon with no data behind it.
export function NotificationBell({ iconClassName = "h-4 w-4", buttonClassName, variante }: NotificationBellProps) {
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("PATCH", `/api/notifications/${id}/read`);
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const unread = notifications.filter((n) => !n.isRead);
  const preview = notifications.slice(0, 5);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={unread.length > 0 ? `Notifications, ${unread.length} nouvelle${unread.length > 1 ? "s" : ""}` : "Notifications"}
          className={variante === "entete"
            ? `relative h-12 w-12 rounded-full border border-baara-trait text-baara-marine hover:bg-baara-clair focus-visible:ring-2 focus-visible:ring-baara-bleu dark:border-white/15 dark:text-white dark:hover:bg-white/10 ${buttonClassName ?? ""}`
            : `relative ${buttonClassName ?? ""}`}
          data-testid="button-notifications"
        >
          <Bell className={variante === "entete" ? "h-5 w-5" : iconClassName} aria-hidden="true" />
          {unread.length > 0 && (
            <span
              aria-hidden="true"
              className={variante === "entete"
                ? "absolute right-2 top-2 h-3 w-3 rounded-full border-2 border-white bg-baara-urgent dark:border-baara-profond"
                : "absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive"}
              data-testid="badge-unread-notifications"
            />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-sm font-medium">Notifications</span>
          {unread.length > 0 && (
            <Badge variant="secondary" className="text-xs">{unread.length} non lue{unread.length > 1 ? "s" : ""}</Badge>
          )}
        </div>
        {preview.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Aucune notification</div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {preview.map((notification) => {
              const Icon = typeIcon[notification.type];
              return (
                <Link
                  key={notification.id}
                  href={notification.actionUrl ?? "/notifications"}
                  onClick={() => !notification.isRead && markReadMutation.mutate(notification.id)}
                >
                  <div
                    className={`flex gap-2.5 px-3 py-2.5 border-b last:border-b-0 hover-elevate cursor-pointer ${!notification.isRead ? "bg-primary/5" : ""}`}
                    data-testid={`notification-preview-${notification.id}`}
                  >
                    <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className={`text-sm truncate ${!notification.isRead ? "font-medium" : "text-muted-foreground"}`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {notification.createdAt ? formatRelativeTime(notification.createdAt as unknown as string) : ""}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        <Link href="/notifications">
          <div className="text-center py-2 text-sm text-primary hover-elevate cursor-pointer" data-testid="link-all-notifications">
            Voir toutes les notifications
          </div>
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
