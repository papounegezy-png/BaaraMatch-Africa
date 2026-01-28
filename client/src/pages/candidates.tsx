import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search,
  MapPin,
  Briefcase,
  GraduationCap,
  Star,
  Filter,
  Mail,
  CheckCircle2,
  Languages,
  Clock,
} from "lucide-react";

const mockCandidates = [
  {
    id: "1",
    name: "Amadou Diallo",
    title: "Développeur Full Stack",
    location: "Dakar, Sénégal",
    experience: "5 ans d'expérience",
    skills: ["React", "Node.js", "Python", "PostgreSQL", "AWS"],
    languages: ["Français", "Anglais", "Wolof"],
    education: "Master en Informatique - UCAD",
    availability: "Disponible immédiatement",
    isVerified: true,
    avatarUrl: null,
    rating: 4.8,
  },
  {
    id: "2",
    name: "Fatou Ndiaye",
    title: "Chef de Projet Digital",
    location: "Dakar, Sénégal",
    experience: "7 ans d'expérience",
    skills: ["Gestion de projet", "Agile/Scrum", "Marketing Digital", "SEO"],
    languages: ["Français", "Anglais"],
    education: "MBA - ISM Dakar",
    availability: "Préavis de 1 mois",
    isVerified: true,
    avatarUrl: null,
    rating: 4.9,
  },
  {
    id: "3",
    name: "Moussa Koné",
    title: "Comptable Senior",
    location: "Abidjan, Côte d'Ivoire",
    experience: "8 ans d'expérience",
    skills: ["Comptabilité générale", "Fiscalité", "Sage", "Excel avancé"],
    languages: ["Français"],
    education: "DESCF - Université FHB",
    availability: "Disponible immédiatement",
    isVerified: false,
    avatarUrl: null,
    rating: 4.5,
  },
  {
    id: "4",
    name: "Aissatou Bah",
    title: "Data Analyst",
    location: "Conakry, Guinée",
    experience: "3 ans d'expérience",
    skills: ["Python", "SQL", "Tableau", "Power BI", "Machine Learning"],
    languages: ["Français", "Anglais", "Peul"],
    education: "Master Data Science - ESMT Dakar",
    availability: "Disponible dans 2 semaines",
    isVerified: true,
    avatarUrl: null,
    rating: 4.7,
  },
  {
    id: "5",
    name: "Ibrahima Traoré",
    title: "Ingénieur BTP",
    location: "Bamako, Mali",
    experience: "10 ans d'expérience",
    skills: ["AutoCAD", "MS Project", "Gestion de chantier", "Béton armé"],
    languages: ["Français", "Bambara"],
    education: "Ingénieur Génie Civil - ENI Bamako",
    availability: "Préavis de 2 mois",
    isVerified: true,
    avatarUrl: null,
    rating: 4.6,
  },
  {
    id: "6",
    name: "Mariama Sow",
    title: "Responsable RH",
    location: "Dakar, Sénégal",
    experience: "6 ans d'expérience",
    skills: ["Recrutement", "Paie", "Droit du travail", "SIRH"],
    languages: ["Français", "Anglais"],
    education: "Master RH - ESP Dakar",
    availability: "Disponible immédiatement",
    isVerified: true,
    avatarUrl: null,
    rating: 4.8,
  },
];

export default function CandidatesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredCandidates = mockCandidates.filter((candidate) => {
    const matchesSearch =
      searchQuery === "" ||
      candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.skills.some((skill) =>
        skill.toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesLocation =
      locationQuery === "" ||
      candidate.location.toLowerCase().includes(locationQuery.toLowerCase());

    return matchesSearch && matchesLocation;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold" data-testid="text-candidates-page-title">
                Candidats
              </h1>
              <p className="text-muted-foreground">
                Découvrez {filteredCandidates.length} profils de talents qualifiés
              </p>
            </div>

            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Nom, poste ou compétence..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      data-testid="input-candidate-search"
                    />
                  </div>
                  <div className="relative flex-1">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Ville ou pays..."
                      className="pl-10"
                      value={locationQuery}
                      onChange={(e) => setLocationQuery(e.target.value)}
                      data-testid="input-candidate-location"
                    />
                  </div>
                  <Button className="gap-2" data-testid="button-search-candidates">
                    <Search className="h-4 w-4" />
                    Rechercher
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted-foreground">
            {filteredCandidates.length} candidat{filteredCandidates.length > 1 ? "s" : ""} trouvé
            {filteredCandidates.length > 1 ? "s" : ""}
          </p>

          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" data-testid="button-filter-candidates">
              <Filter className="h-4 w-4" />
              Filtres
            </Button>
            <Select defaultValue="rating">
              <SelectTrigger className="w-40" data-testid="select-sort-candidates">
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">Mieux notés</SelectItem>
                <SelectItem value="experience">Plus expérimentés</SelectItem>
                <SelectItem value="recent">Plus récents</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCandidates.map((candidate) => (
            <Card key={candidate.id} className="hover-elevate overflow-visible" data-testid={`card-candidate-${candidate.id}`}>
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="relative">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={candidate.avatarUrl || undefined} />
                      <AvatarFallback className="text-lg gradient-gold text-white">
                        {getInitials(candidate.name)}
                      </AvatarFallback>
                    </Avatar>
                    {candidate.isVerified && (
                      <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-background">
                        <CheckCircle2 className="h-5 w-5 text-accent" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg" data-testid={`text-candidate-name-${candidate.id}`}>
                      {candidate.name}
                    </h3>
                    <p className="text-primary font-medium">{candidate.title}</p>
                    <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {candidate.location}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="font-medium">{candidate.rating}</span>
                    </div>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground">{candidate.experience}</span>
                  </div>

                  <div className="flex flex-wrap justify-center gap-2">
                    {candidate.skills.slice(0, 3).map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {candidate.skills.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{candidate.skills.length - 3}
                      </Badge>
                    )}
                  </div>

                  <div className="w-full space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <GraduationCap className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{candidate.education}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Languages className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{candidate.languages.join(", ")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{candidate.availability}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 w-full pt-2">
                    <Link href={`/candidates/${candidate.id}`} className="flex-1">
                      <Button variant="outline" className="w-full" data-testid={`button-view-candidate-${candidate.id}`}>
                        Voir le profil
                      </Button>
                    </Link>
                    <Button size="icon" variant="outline" data-testid={`button-contact-candidate-${candidate.id}`}>
                      <Mail className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredCandidates.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun candidat trouvé</h3>
              <p className="text-muted-foreground">
                Essayez de modifier vos critères de recherche.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
