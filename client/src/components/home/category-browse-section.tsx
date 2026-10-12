import { Link } from "wouter";
import { Building2, Mountain, Truck, Landmark, Users, Laptop, type LucideIcon } from "lucide-react";

// Values match jobCategoryOptions (offer-form.tsx) exactly — the same list
// the real job-posting form writes to job.category — so each pill's filter
// actually matches real postings instead of a decorative label that would
// silently return zero results.
const categories: { label: string; value: string; icon: LucideIcon }[] = [
  { label: "BTP", value: "BTP & Construction", icon: Building2 },
  { label: "Mines", value: "Mines", icon: Mountain },
  { label: "Logistique", value: "Transport & Logistique", icon: Truck },
  { label: "Finance", value: "Finance & Comptabilité", icon: Landmark },
  { label: "RH", value: "Ressources Humaines", icon: Users },
  { label: "Tech", value: "Informatique & Tech", icon: Laptop },
];

export function CategoryBrowseSection() {
  return (
    <section className="py-6 sm:py-8 bg-white" aria-label="Parcourir par catégorie">
      <div className="container mx-auto px-4">
        <p className="text-center text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-4">
          Parcourir par catégorie
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {categories.map((category) => (
            <Link
              key={category.value}
              href={`/jobs?category=${encodeURIComponent(category.value)}`}
              className="inline-flex items-center gap-2 rounded-full bg-muted/60 hover:bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors"
              data-testid={`link-category-${category.label.toLowerCase()}`}
            >
              <category.icon className="h-4 w-4 text-muted-foreground" />
              {category.label}
            </Link>
          ))}
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline px-2"
            data-testid="link-category-see-all"
          >
            Voir tout
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
