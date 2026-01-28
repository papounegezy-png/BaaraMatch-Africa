import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { MobileProfileEditor } from "@/components/mobile-profile-editor";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

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

  const handleSave = (data: any) => {
    console.log("Saving profile:", data);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="lg:hidden">
        <div className="sticky top-0 z-40 bg-background border-b px-4 py-3 flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setLocation("/dashboard")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold" data-testid="text-profile-title">Mon Profil</h1>
        </div>
        <div className="p-4">
          <MobileProfileEditor user={user} onSave={handleSave} />
        </div>
        <MobileBottomNav userType={user.userType} />
      </div>

      <div className="hidden lg:block">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold" data-testid="text-profile-title">Mon Profil</h1>
            <p className="text-muted-foreground">Gérez vos informations personnelles</p>
          </div>
          <MobileProfileEditor user={user} onSave={handleSave} />
        </div>
      </div>
    </div>
  );
}
