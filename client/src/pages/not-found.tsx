import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, ArrowLeft, Briefcase } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4 bg-gradient-to-br from-background via-card to-muted">
      <Card className="max-w-md w-full">
        <CardContent className="pt-12 pb-8 px-8 text-center space-y-6">
          <div className="w-20 h-20 rounded-full gradient-gold mx-auto flex items-center justify-center">
            <span className="text-4xl font-bold text-white">404</span>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold" data-testid="text-404-title">
              Page introuvable
            </h1>
            <p className="text-muted-foreground">
              Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Link href="/" className="flex-1">
              <Button className="w-full gap-2" data-testid="button-go-home">
                <Home className="h-4 w-4" />
                Accueil
              </Button>
            </Link>
            <Link href="/jobs" className="flex-1">
              <Button variant="outline" className="w-full gap-2" data-testid="button-go-jobs">
                <Briefcase className="h-4 w-4" />
                Offres d'emploi
              </Button>
            </Link>
          </div>

          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => window.history.back()}
            data-testid="button-go-back"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à la page précédente
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
