import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { LucideIcon } from "lucide-react";

export function TopListCard({
  title,
  icon: Icon,
  iconColorClass = "text-primary",
  barColorClass = "bg-primary",
  items,
  valueLabel,
  isLoading,
  emptyMessage,
  testId,
}: {
  title: string;
  icon: LucideIcon;
  iconColorClass?: string;
  // Tailwind's JIT scanner needs literal class names in source — a string
  // built at runtime (e.g. iconColorClass.replace("text-", "bg-")) won't
  // reliably survive the production build, so this is a separate literal.
  barColorClass?: string;
  items: { id: string; label: string; sublabel?: string; value: number }[];
  valueLabel: (value: number) => string;
  isLoading: boolean;
  emptyMessage: string;
  testId: string;
}) {
  const maxValue = Math.max(1, ...items.map((item) => item.value));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${iconColorClass}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6" data-testid={`text-${testId}-no-data`}>
            {emptyMessage}
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={item.id} data-testid={`row-${testId}-${index}`}>
                <div className="flex items-center justify-between text-sm mb-1 gap-2">
                  <span className="font-medium truncate">{item.label}</span>
                  <span className="text-muted-foreground shrink-0">{valueLabel(item.value)}</span>
                </div>
                {item.sublabel && <p className="text-xs text-muted-foreground mb-1">{item.sublabel}</p>}
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${barColorClass}`}
                    style={{ width: `${Math.max(4, Math.round((item.value / maxValue) * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
