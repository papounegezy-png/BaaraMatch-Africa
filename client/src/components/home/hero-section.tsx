import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Search, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function HeroSection() {
  const [, setLocation] = useLocation();
  const [keyword, setKeyword] = useState("");
  const [city, setCity] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword.trim()) params.set("q", keyword.trim());
    if (city.trim()) params.set("location", city.trim());
    setLocation(`/jobs${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <section className="bg-gradient-to-b from-white to-muted/40 py-6 sm:py-8">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center space-y-4">
          <h1 className="max-w-3xl mx-auto text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight text-primary-dark" data-testid="text-hero-title">
            Trouvez un emploi <span className="text-gold">qui vous correspond</span>, plus vite
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto" data-testid="text-hero-description">
            Explorez des offres vérifiées, postulez en quelques clics et suivez vos candidatures en temps réel.
          </p>

          <form
            onSubmit={handleSearch}
            className="mx-auto max-w-5xl rounded-2xl bg-white p-3 sm:p-4 shadow-xl border border-border/60 text-left"
            data-testid="form-hero-search"
          >
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 space-y-1">
                <Label htmlFor="hero-search-keyword" className="sr-only">Métier ou compétence</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="hero-search-keyword"
                    placeholder="Offre, métier, compétence, employeur"
                    className="pl-10 h-12 rounded-xl border-border/70"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    data-testid="input-hero-search-keyword"
                  />
                </div>
              </div>
              <div className="flex-1 space-y-1">
                <Label htmlFor="hero-search-city" className="sr-only">Ville</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="hero-search-city"
                    placeholder="Pays, Ville"
                    className="pl-10 h-12 rounded-xl border-border/70"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    data-testid="input-hero-search-city"
                  />
                </div>
              </div>
              <Button type="submit" className="h-12 rounded-xl gap-2 px-6 w-full sm:w-auto" data-testid="button-hero-search">
                <Search className="h-4 w-4" />
                Rechercher
              </Button>
            </div>
          </form>

          <p className="text-sm">
            <Link href="/register/organisation" className="text-gold-dark hover:underline font-medium" data-testid="link-hero-employer-cta">
              Vous recrutez ? Publiez votre première offre gratuitement →
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
