import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Building2, Handshake, Plus } from "lucide-react";

export type PickedOrganization = {
  id: string;
  userType: "company" | "agency";
  name: string;
  isProspect: boolean;
};

type SearchResult = {
  id: string;
  userType: "company" | "agency";
  name: string;
  registrationNumber: string | null;
  phone: string | null;
  city: string | null;
  isProspect: boolean;
};

/**
 * The entry point every admin screen should use when it needs to attach an
 * action to an organization: search first (by name, RCCM/n° de licence,
 * téléphone) across every company/agency — real accounts and prospects
 * alike — falling back to creating a minimal prospect record inline when
 * nothing matches. Don't rebuild this search-or-create flow per screen;
 * import this component instead.
 */
export function OrganisationPickerOrCreate({
  onSelect,
  mode = "search-or-create",
  userTypeFilter,
}: {
  onSelect: (org: PickedOrganization) => void;
  // "search-only" hides the "create a prospect" fallback — for flows like
  // report generation where the organization must already have real
  // activity data, so creating a fresh prospect on the spot makes no sense.
  mode?: "search-or-create" | "search-only";
  userTypeFilter?: "company" | "agency";
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const searchQuery = useQuery<SearchResult[]>({
    queryKey: ["/api/admin/organizations/search", debouncedQuery],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/organizations/search?q=${encodeURIComponent(debouncedQuery)}`);
      return res.json();
    },
    enabled: debouncedQuery.trim().length >= 2,
  });

  const [showCreate, setShowCreate] = useState(false);
  const [createType, setCreateType] = useState<"company" | "agency">("company");
  const [createName, setCreateName] = useState("");
  const [createIndustry, setCreateIndustry] = useState("");
  const [createCity, setCreateCity] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createContactName, setCreateContactName] = useState("");
  const [createContactPhone, setCreateContactPhone] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/organizations/prospect", {
        userType: createType,
        email: createEmail,
        organizationName: createName,
        industry: createType === "company" ? (createIndustry || undefined) : undefined,
        city: createCity || undefined,
        contactName: createContactName || undefined,
        contactPhone: createContactPhone || undefined,
      });
      return res.json();
    },
    onSuccess: (created: { id: string; userType: "company" | "agency" }) => {
      // This component can be opened from anywhere, so any screen listing
      // organizations needs to see this new prospect immediately, not just
      // the parent that happened to render the picker this time.
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations/search"] });
      onSelect({ id: created.id, userType: created.userType, name: createName, isProspect: true });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer cette organisation",
        variant: "destructive",
      });
    },
  });

  const results = (searchQuery.data ?? []).filter((org) => !userTypeFilter || org.userType === userTypeFilter);
  const hasSearched = debouncedQuery.trim().length >= 2;
  const noResults = hasSearched && !searchQuery.isLoading && !showCreate && results.length === 0;
  const canCreate = mode === "search-or-create";

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom, RCCM / n° de licence, téléphone..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowCreate(false);
          }}
          className="pl-10"
          data-testid="input-organization-picker-search"
        />
      </div>

      {hasSearched && results.length > 0 && (
        <div className="border rounded-md divide-y max-h-64 overflow-y-auto">
          {results.map((org) => (
            <button
              key={org.id}
              type="button"
              className="w-full text-left p-3 hover-elevate flex items-center justify-between gap-3"
              onClick={() => onSelect({ id: org.id, userType: org.userType, name: org.name, isProspect: org.isProspect })}
              data-testid={`option-organization-${org.id}`}
            >
              <div className="flex items-center gap-2">
                {org.userType === "agency" ? (
                  <Handshake className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium">{org.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[org.city, org.phone, org.registrationNumber].filter(Boolean).join(" · ") || "-"}
                  </p>
                </div>
              </div>
              {org.isProspect && <Badge variant="secondary" className="text-xs">Prospect</Badge>}
            </button>
          ))}
        </div>
      )}

      {noResults && (
        <Card className="border-dashed">
          <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-muted-foreground">Aucune correspondance pour « {query} ».</p>
            {canCreate && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setShowCreate(true);
                  setCreateName(query);
                }}
                data-testid="button-create-new-organization"
              >
                <Plus className="h-4 w-4 mr-1" />
                Créer une nouvelle fiche entreprise
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* A real Dialog (not an inline card) so Radix gives us focus trap,
          auto-focus on the first field, and Escape-to-close for free —
          creating a prospect is common enough here that it deserves the
          same accessibility guarantees as any other modal in the app. */}
      <Dialog open={canCreate && showCreate} onOpenChange={setShowCreate}>
        <DialogContent data-testid="dialog-picker-create">
          <DialogHeader>
            <DialogTitle>Créer une nouvelle fiche entreprise</DialogTitle>
            <DialogDescription>
              Cette organisation sera créée en tant que prospect jusqu'à ce que son propriétaire réclame le compte.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="picker-create-type">Type</Label>
              <Select value={createType} onValueChange={(value) => setCreateType(value as "company" | "agency")}>
                <SelectTrigger id="picker-create-type" data-testid="select-picker-create-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">Entreprise</SelectItem>
                  <SelectItem value="agency">Agence de placement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="picker-create-name">Nom (raison sociale)</Label>
              <Input id="picker-create-name" value={createName} onChange={(e) => setCreateName(e.target.value)} data-testid="input-picker-create-name" />
            </div>
            {createType === "company" && (
              <div className="space-y-1">
                <Label htmlFor="picker-create-industry">Secteur d'activité</Label>
                <Input id="picker-create-industry" value={createIndustry} onChange={(e) => setCreateIndustry(e.target.value)} data-testid="input-picker-create-industry" />
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="picker-create-city">Ville</Label>
              <Input id="picker-create-city" value={createCity} onChange={(e) => setCreateCity(e.target.value)} data-testid="input-picker-create-city" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="picker-create-email">Email du compte</Label>
              <Input id="picker-create-email" type="email" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} data-testid="input-picker-create-email" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="picker-create-contact-name">Nom du contact</Label>
              <Input id="picker-create-contact-name" value={createContactName} onChange={(e) => setCreateContactName(e.target.value)} data-testid="input-picker-create-contact-name" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="picker-create-contact-phone">Téléphone du contact</Label>
              <Input id="picker-create-contact-phone" value={createContactPhone} onChange={(e) => setCreateContactPhone(e.target.value)} data-testid="input-picker-create-contact-phone" />
            </div>
          </div>
          {createMutation.isError && (
            <p className="text-sm text-destructive" role="alert" data-testid="text-picker-create-error">
              {createMutation.error instanceof Error ? createMutation.error.message : "Une erreur est survenue"}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreate(false)} data-testid="button-cancel-picker-create">
              Annuler
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={createMutation.isPending || !createName || !createEmail}
              onClick={() => createMutation.mutate()}
              data-testid="button-confirm-picker-create"
            >
              {createMutation.isPending ? "Création..." : "Créer et sélectionner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
