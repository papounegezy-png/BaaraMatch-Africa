import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, Search, ArrowRight, AlertCircle, RotateCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { CandidatureCard, type CandidatureCardData } from "@/components/candidature-card";
import { PickInterviewSlotDialog } from "@/components/pick-interview-slot-dialog";

type TabKey = "all" | "active" | "accepted" | "closed";

const activeStatuses = ["pending", "reviewing", "shortlisted", "interview_proposed", "interview", "offered"];
const acceptedStatuses = ["hired"];
const closedStatuses = ["rejected", "withdrawn"];

function matchesTab(status: string, tab: TabKey): boolean {
  if (tab === "all") return true;
  if (tab === "active") return activeStatuses.includes(status);
  if (tab === "accepted") return acceptedStatuses.includes(status);
  return closedStatuses.includes(status);
}

export default function CandidateApplicationsPage() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [slotPickerTarget, setSlotPickerTarget] = useState<{ applicationId: string; jobTitle?: string } | null>(null);

  const {
    data: applications = [],
    isLoading: applicationsLoading,
    isError,
    refetch,
  } = useQuery<CandidatureCardData[]>({
    queryKey: ["/api/applications"],
    enabled: !!user && user.userType === "candidate",
  });

  const withdrawMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      const response = await apiRequest("PATCH", `/api/applications/${applicationId}/withdraw`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      toast({ title: "Candidature retirée", description: "Votre candidature a bien été retirée." });
    },
    onError: (error: Error) => {
      toast({
        title: "Impossible de retirer la candidature",
        description: error.message || "Une erreur est survenue. Réessayez.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
    if (!isLoading && user && user.userType !== "candidate") {
      setLocation("/");
    }
  }, [isLoading, setLocation, user]);

  if (isLoading || (applicationsLoading && !isError)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 pb-24">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-10 w-48 rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
                <Skeleton className="h-3 w-1/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!user || user.userType !== "candidate") {
    return null;
  }

  const counts = {
    all: applications.length,
    active: applications.filter((a) => matchesTab(a.status ?? "pending", "active")).length,
    accepted: applications.filter((a) => matchesTab(a.status ?? "pending", "accepted")).length,
    closed: applications.filter((a) => matchesTab(a.status ?? "pending", "closed")).length,
  };

  const filteredApplications = applications.filter((a) => matchesTab(a.status ?? "pending", activeTab));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 pb-24">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div>
          <Link href="/espace-personnel">
            <Button variant="ghost" className="gap-2 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-900 transition-colors -ml-2 mb-2">
              <ArrowRight className="h-4 w-4 rotate-180" />
              Retour au Dashboard
            </Button>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white/80 rounded-2xl shadow-lg p-6 border border-indigo-100">
            <div>
              <h1 className="text-2xl font-bold text-indigo-700 flex items-center gap-2" data-testid="text-candidate-applications-title">
                <Briefcase className="h-6 w-6 text-indigo-400" />
                Mes candidatures
              </h1>
              <p className="text-indigo-400 text-sm mt-1" aria-live="polite" data-testid="text-applications-total">
                {counts.all} candidature{counts.all !== 1 ? "s" : ""} au total
              </p>
            </div>
            <Link href="/candidate/jobs">
              <Button className="gap-2 bg-gradient-to-r from-indigo-500 to-blue-400 text-white" data-testid="button-find-jobs">
                <Search className="h-4 w-4" />
                Rechercher des offres
              </Button>
            </Link>
          </div>
        </div>

        {isError ? (
          <Card>
            <CardContent className="py-10 text-center space-y-3" role="alert">
              <AlertCircle className="h-10 w-10 mx-auto text-destructive/70" aria-hidden="true" />
              <p className="font-medium">Impossible de charger vos candidatures.</p>
              <p className="text-sm text-muted-foreground">Vérifiez votre connexion et réessayez.</p>
              <Button variant="outline" className="gap-2" onClick={() => refetch()} data-testid="button-retry-applications">
                <RotateCw className="h-4 w-4" />
                Réessayer
              </Button>
            </CardContent>
          </Card>
        ) : applications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center space-y-4">
              <Briefcase className="h-14 w-14 mx-auto text-indigo-200" />
              <div>
                <p className="font-medium text-lg">Vous n'avez pas encore postulé</p>
                <p className="text-sm text-muted-foreground mt-1">Parcourez les offres disponibles et postulez en quelques clics.</p>
              </div>
              <Link href="/candidate/jobs">
                <Button className="gap-2 bg-gradient-to-r from-indigo-500 to-blue-400 text-white">
                  <Search className="h-4 w-4" />
                  Parcourir les offres
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)}>
            <div className="overflow-x-auto pb-1">
              <TabsList className="w-max min-w-full">
                <TabsTrigger value="all" className="gap-1.5" data-testid="tab-all">
                  Toutes
                  <span className="text-xs text-muted-foreground" aria-live="polite">({counts.all})</span>
                </TabsTrigger>
                <TabsTrigger value="active" className="gap-1.5" data-testid="tab-active">
                  En cours
                  <span className="text-xs text-muted-foreground" aria-live="polite">({counts.active})</span>
                </TabsTrigger>
                <TabsTrigger value="accepted" className="gap-1.5" data-testid="tab-accepted">
                  Acceptées
                  <span className="text-xs text-muted-foreground" aria-live="polite">({counts.accepted})</span>
                </TabsTrigger>
                <TabsTrigger value="closed" className="gap-1.5" data-testid="tab-closed">
                  Terminées
                  <span className="text-xs text-muted-foreground" aria-live="polite">({counts.closed})</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="mt-4 space-y-3">
              {filteredApplications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">Aucune candidature dans cette catégorie.</p>
              ) : (
                filteredApplications.map((application) => (
                  <CandidatureCard
                    key={application.id}
                    application={application}
                    onPickSlot={() => setSlotPickerTarget({ applicationId: application.id, jobTitle: application.jobTitle })}
                    onWithdraw={(id) => withdrawMutation.mutate(id)}
                    isWithdrawing={withdrawMutation.isPending && withdrawMutation.variables === application.id}
                  />
                ))
              )}
            </div>
          </Tabs>
        )}

        <div className="block md:hidden">
          <MobileBottomNav userType="candidate" />
        </div>
      </div>

      <PickInterviewSlotDialog
        applicationId={slotPickerTarget?.applicationId ?? null}
        jobTitle={slotPickerTarget?.jobTitle}
        open={!!slotPickerTarget}
        onOpenChange={(open) => { if (!open) setSlotPickerTarget(null); }}
      />
    </div>
  );
}
