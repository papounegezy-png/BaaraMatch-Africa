import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { MobileProfileEditor } from "@/components/mobile-profile-editor";
import { ProfileView } from "@/components/profile-view";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, Edit } from "lucide-react";
import type { User, CandidateProfile } from "@shared/schema";

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [isEditing, setIsEditing] = useState(false);

  const { data: profileData } = useQuery<{ user: User; profile: CandidateProfile | null }>({
    queryKey: ["/api/profile"],
    enabled: !!user,
  });

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 pb-20">
        <Skeleton className="h-32 w-full rounded-xl mb-4" />
        <Skeleton className="h-48 w-full rounded-xl mb-4" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleSave = () => {
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="lg:hidden">
        <div className="sticky top-0 z-40 bg-background border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => isEditing ? setIsEditing(false) : setLocation("/dashboard")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-semibold" data-testid="text-profile-title">
              {isEditing ? "Modifier le profil" : "Mon Profil"}
            </h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsEditing(!isEditing)}
            data-testid="button-toggle-mode"
          >
            {isEditing ? <Eye className="h-5 w-5" /> : <Edit className="h-5 w-5" />}
          </Button>
        </div>
        <div className="p-4">
          {isEditing ? (
            <MobileProfileEditor 
              user={profileData?.user || user} 
              profile={profileData?.profile || undefined}
              onSave={handleSave} 
            />
          ) : (
            <ProfileView 
              user={profileData?.user || user} 
              onEdit={() => setIsEditing(true)} 
            />
          )}
        </div>
        <MobileBottomNav userType={user.userType} />
      </div>

      <div className="hidden lg:block">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-profile-title">
                {isEditing ? "Modifier le profil" : "Mon Profil"}
              </h1>
              <p className="text-muted-foreground">
                {isEditing ? "Modifiez vos informations personnelles" : "Consultez vos informations"}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setIsEditing(!isEditing)}
              className="gap-2"
              data-testid="button-toggle-mode-desktop"
            >
              {isEditing ? (
                <>
                  <Eye className="h-4 w-4" />
                  Voir le profil
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4" />
                  Modifier
                </>
              )}
            </Button>
          </div>
          {isEditing ? (
            <MobileProfileEditor 
              user={profileData?.user || user} 
              profile={profileData?.profile || undefined}
              onSave={handleSave} 
            />
          ) : (
            <ProfileView 
              user={profileData?.user || user} 
              onEdit={() => setIsEditing(true)} 
            />
          )}
        </div>
      </div>
    </div>
  );
}
