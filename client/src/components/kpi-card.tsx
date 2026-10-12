import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, type LucideIcon } from "lucide-react";

export function KpiCard({
  label,
  value,
  icon: Icon,
  variationLabel,
  isPositive,
  isLoading,
  // A KPI card's own fetch failing shows "—" with a discreet error icon on
  // just this card, instead of blocking the rest of an already-loaded page.
  isError,
  subText,
  subTextClassName,
  testId,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  // Omitted rather than fabricated when there's no honest "vs période
  // précédente" comparison available for a given KPI (e.g. a point-in-time
  // count with no prior snapshot to compare against).
  variationLabel?: string;
  isPositive?: boolean;
  isLoading?: boolean;
  isError?: boolean;
  subText?: string;
  subTextClassName?: string;
  testId?: string;
}) {
  if (isLoading) {
    return (
      <Card data-testid={testId ? `${testId}-loading` : undefined}>
        <CardContent className="p-6 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid={testId}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        {isError ? <AlertCircle className="h-4 w-4 text-muted-foreground" /> : Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={testId ? `${testId}-value` : undefined}>
          {isError ? "—" : value}
        </div>
        {isError ? (
          <p className="text-xs text-muted-foreground">Indisponible</p>
        ) : subText ? (
          <p className={`text-xs ${subTextClassName ?? "text-muted-foreground"}`}>{subText}</p>
        ) : variationLabel ? (
          <p className={`text-xs ${isPositive ? "text-green-600" : "text-red-600"}`}>{variationLabel}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
