import { Skeleton } from "@/components/ui/skeleton";

/**
 * Page/section loading placeholder: skeleton blocks shaped like what's
 * coming, announced once to screen readers via role="status" (the skeletons
 * themselves are aria-hidden so they aren't read as empty boxes). Replaces
 * bare "Chargement..." text, which jumped the layout once data arrived.
 */
export function LoadingState({
  label = "Chargement en cours",
  variant = "list",
  rows = 4,
  className = "",
}: {
  label?: string;
  // "list": stacked card-height rows. "block": a header band plus content.
  variant?: "list" | "block";
  rows?: number;
  className?: string;
}) {
  return (
    <div role="status" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="space-y-3">
        {variant === "block" && <Skeleton className="h-10 w-1/3" />}
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className={variant === "block" ? "h-24 w-full rounded-xl" : "h-16 w-full rounded-xl"} />
        ))}
      </div>
    </div>
  );
}
