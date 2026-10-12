import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface OperationalModuleComingSoonProps {
  icon: LucideIcon;
  title: string;
  description: string;
  reasons: string[];
}

// Full-page placeholder for a dashboard module that isn't real yet — used
// instead of shipping realistic-looking UI backed by nothing, which risks a
// user mistaking fabricated content for their own company's real records.
export function OperationalModuleComingSoon({ icon: Icon, title, description, reasons }: OperationalModuleComingSoonProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <Card>
        <CardContent className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Icon className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium">Bientôt disponible</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Ce module est en cours de développement et n'est pas encore fonctionnel.
          </p>
          {reasons.length > 0 && (
            <ul className="mx-auto mt-6 max-w-md space-y-2 text-left text-sm text-muted-foreground">
              {reasons.map((reason) => (
                <li key={reason} className="flex gap-2">
                  <span aria-hidden="true">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
