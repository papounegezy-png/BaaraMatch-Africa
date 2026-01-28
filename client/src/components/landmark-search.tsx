import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  MapPin, 
  Search, 
  Building2, 
  Landmark, 
  ShoppingBag, 
  GraduationCap,
  Plane,
  Hospital,
  Train,
  ChevronRight,
  Navigation
} from "lucide-react";

interface LandmarkLocation {
  id: string;
  name: string;
  type: "landmark" | "market" | "school" | "airport" | "hospital" | "station";
  neighborhood: string;
  jobCount: number;
}

const bamakoLandmarks: LandmarkLocation[] = [
  { id: "1", name: "Monument de l'Indépendance", type: "landmark", neighborhood: "Centre-ville", jobCount: 45 },
  { id: "2", name: "Grand Marché de Bamako", type: "market", neighborhood: "Médine", jobCount: 128 },
  { id: "3", name: "Aéroport Modibo Keïta", type: "airport", neighborhood: "Sénou", jobCount: 32 },
  { id: "4", name: "Gare de Bamako", type: "station", neighborhood: "Quartier du Fleuve", jobCount: 18 },
  { id: "5", name: "Université de Bamako", type: "school", neighborhood: "Badalabougou", jobCount: 67 },
  { id: "6", name: "Hôpital Gabriel Touré", type: "hospital", neighborhood: "Centre", jobCount: 54 },
  { id: "7", name: "ACI 2000", type: "landmark", neighborhood: "Hamdallaye", jobCount: 89 },
  { id: "8", name: "Marché de Médine", type: "market", neighborhood: "Médine", jobCount: 76 },
  { id: "9", name: "CICB (Palais des Congrès)", type: "landmark", neighborhood: "ACI 2000", jobCount: 23 },
  { id: "10", name: "Sotuba", type: "landmark", neighborhood: "Sotuba", jobCount: 41 },
  { id: "11", name: "Kalaban Coura", type: "landmark", neighborhood: "Kalaban", jobCount: 58 },
  { id: "12", name: "Lafiabougou", type: "landmark", neighborhood: "Lafiabougou", jobCount: 34 },
];

const typeIcons = {
  landmark: Landmark,
  market: ShoppingBag,
  school: GraduationCap,
  airport: Plane,
  hospital: Hospital,
  station: Train,
};

const typeLabels = {
  landmark: "Repère",
  market: "Marché",
  school: "École/Université",
  airport: "Aéroport",
  hospital: "Hôpital",
  station: "Gare",
};

interface LandmarkSearchProps {
  onSelect?: (landmark: LandmarkLocation) => void;
  selectedLandmark?: LandmarkLocation | null;
}

export function LandmarkSearch({ onSelect, selectedLandmark }: LandmarkSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const filteredLandmarks = bamakoLandmarks.filter((landmark) => {
    const matchesSearch = 
      landmark.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      landmark.neighborhood.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = activeFilter === "all" || landmark.type === activeFilter;
    
    return matchesSearch && matchesFilter;
  });

  const filterOptions = [
    { value: "all", label: "Tous" },
    { value: "landmark", label: "Repères" },
    { value: "market", label: "Marchés" },
    { value: "school", label: "Écoles" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <Navigation className="h-5 w-5 text-primary" />
        <div>
          <h3 className="font-semibold">Recherche par repères</h3>
          <p className="text-xs text-muted-foreground">Trouvez des emplois près de chez vous à Bamako</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher un quartier ou repère..."
          className="pl-10"
          data-testid="input-landmark-search"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {filterOptions.map((filter) => (
          <Button
            key={filter.value}
            variant={activeFilter === filter.value ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter(filter.value)}
            className="shrink-0"
            data-testid={`filter-${filter.value}`}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {selectedLandmark && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{selectedLandmark.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedLandmark.neighborhood}</p>
                </div>
              </div>
              <Badge className="bg-primary">{selectedLandmark.jobCount} offres</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {filteredLandmarks.map((landmark) => {
          const Icon = typeIcons[landmark.type];
          const isSelected = selectedLandmark?.id === landmark.id;
          
          return (
            <Card 
              key={landmark.id}
              className={`cursor-pointer transition-all hover-elevate ${isSelected ? "border-primary" : ""}`}
              onClick={() => onSelect?.(landmark)}
              data-testid={`landmark-${landmark.id}`}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{landmark.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{landmark.neighborhood}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {typeLabels[landmark.type]}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-semibold text-primary">{landmark.jobCount}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredLandmarks.length === 0 && (
        <div className="text-center py-8">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">Aucun repère trouvé</p>
          <p className="text-xs text-muted-foreground">Essayez un autre terme de recherche</p>
        </div>
      )}
    </div>
  );
}
