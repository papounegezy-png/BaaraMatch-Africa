import { useLocation, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ArrowLeft } from "lucide-react";

const pageContent: Record<string, { title: string; description: string }> = {
  "/privacy": {
    title: "Politique de confidentialité",
    description: "Cette page est en cours de rédaction.",
  },
  "/terms": {
    title: "Conditions d'utilisation",
    description: "Cette page est en cours de rédaction.",
  },
  "/legal-notice": {
    title: "Mentions légales",
    description: "Cette page est en cours de rédaction.",
  },
};

export default function LegalPlaceholderPage() {
  const [location] = useLocation();
  const content = pageContent[location] || {
    title: "Page en préparation",
    description: "Cette page est en cours de rédaction.",
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full">
        <CardContent className="pt-12 pb-8 px-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold" data-testid="text-legal-title">
              {content.title}
            </h1>
            <p className="text-muted-foreground">{content.description}</p>
            <p className="text-sm text-muted-foreground">
              Pour toute question, contactez-nous à{" "}
              <a href="mailto:contact@baaramatch.africa" className="text-primary hover:underline">
                contact@baaramatch.africa
              </a>
              .
            </p>
          </div>

          <Link href="/">
            <Button variant="outline" className="gap-2" data-testid="button-legal-go-home">
              <ArrowLeft className="h-4 w-4" />
              Retour à l'accueil
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
