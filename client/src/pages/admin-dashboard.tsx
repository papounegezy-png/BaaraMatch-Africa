import { useLocation } from "wouter";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Building2,
  Users,
  Briefcase,
  TrendingUp,
  Search,
  Settings,
  ToggleRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  HardHat,
  Shield,
  Wrench,
  FileCheck,
  UserCheck,
  Eye,
  Edit,
} from "lucide-react";
import { useState } from "react";

const mockStats = {
  totalCompanies: 47,
  activeCompanies: 42,
  totalAgencies: 23,
  totalUsers: 1250,
  companiesWithModules: 12,
  pendingVerifications: 5,
};

const mockCompanies = [
  {
    id: "1",
    name: "Afrique Mining Corp",
    industry: "Mines",
    employeeCount: "500+",
    status: "active",
    modules: ["sites", "certifications", "hse", "epi"],
    createdAt: "2025-06-15",
    contact: "contact@afriquemining.com",
  },
  {
    id: "2",
    name: "BTP Sénégal SA",
    industry: "BTP",
    employeeCount: "200-500",
    status: "active",
    modules: ["sites", "certifications", "hse"],
    createdAt: "2025-08-20",
    contact: "info@btpsenegal.sn",
  },
  {
    id: "3",
    name: "Tech Solutions Dakar",
    industry: "Technologie",
    employeeCount: "50-200",
    status: "active",
    modules: [],
    createdAt: "2025-10-01",
    contact: "hello@techsolutions.sn",
  },
  {
    id: "4",
    name: "Ciments du Sahel",
    industry: "BTP",
    employeeCount: "200-500",
    status: "pending",
    modules: ["sites", "hse", "epi"],
    createdAt: "2026-01-10",
    contact: "rh@cimentssahel.com",
  },
  {
    id: "5",
    name: "Gold Coast Mining",
    industry: "Mines",
    employeeCount: "500+",
    status: "active",
    modules: ["sites", "certifications", "hse", "epi", "interim"],
    createdAt: "2025-04-22",
    contact: "admin@goldcoast.gh",
  },
];

const modulesList = [
  {
    id: "sites",
    name: "Gestion des Chantiers/Sites",
    description: "Affectation du personnel, rotations, hébergements",
    icon: HardHat,
    color: "bg-amber-500",
  },
  {
    id: "certifications",
    name: "Habilitations & Certifications",
    description: "CACES, permis, visites médicales, alertes expiration",
    icon: FileCheck,
    color: "bg-blue-500",
  },
  {
    id: "epi",
    name: "EPI & Équipements",
    description: "Attribution, suivi conformité, inventaire",
    icon: Shield,
    color: "bg-green-500",
  },
  {
    id: "hse",
    name: "HSE (Hygiène, Sécurité, Environnement)",
    description: "Incidents, statistiques sécurité, formations",
    icon: AlertTriangle,
    color: "bg-red-500",
  },
  {
    id: "interim",
    name: "Intérimaires/Sous-traitants",
    description: "Gestion des contrats temporaires et prestataires",
    icon: UserCheck,
    color: "bg-purple-500",
  },
];

function DashboardOverview() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-admin-title">Tableau de bord Super Admin</h1>
        <p className="text-muted-foreground">Vue d'ensemble de la plateforme WorkMatch Africa</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entreprises</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.totalCompanies}</div>
            <p className="text-xs text-muted-foreground">
              {mockStats.activeCompanies} actives
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agences</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.totalAgencies}</div>
            <p className="text-xs text-muted-foreground">
              Agences de placement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilisateurs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Candidats, agences et entreprises
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Modules BTP/Mines</CardTitle>
            <ToggleRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.companiesWithModules}</div>
            <p className="text-xs text-muted-foreground">
              Entreprises avec modules activés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.pendingVerifications}</div>
            <p className="text-xs text-muted-foreground">
              Vérifications en attente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Croissance</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+18%</div>
            <p className="text-xs text-muted-foreground">
              Ce mois-ci
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Entreprises récentes</CardTitle>
            <CardDescription>Dernières inscriptions sur la plateforme</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockCompanies.slice(0, 4).map((company) => (
                <div key={company.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium">{company.name}</p>
                      <p className="text-sm text-muted-foreground">{company.industry}</p>
                    </div>
                  </div>
                  <Badge variant={company.status === "active" ? "default" : "secondary"}>
                    {company.status === "active" ? "Actif" : "En attente"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Modules disponibles</CardTitle>
            <CardDescription>Modules spéciaux BTP/Mines</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {modulesList.map((module) => (
                <div key={module.id} className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${module.color} flex items-center justify-center`}>
                    <module.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{module.name}</p>
                    <p className="text-xs text-muted-foreground">{module.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CompaniesManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<typeof mockCompanies[0] | null>(null);
  const [companyModules, setCompanyModules] = useState<Record<string, string[]>>({});

  const filteredCompanies = mockCompanies.filter(
    (company) =>
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.industry.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getModulesForCompany = (companyId: string) => {
    return companyModules[companyId] || mockCompanies.find(c => c.id === companyId)?.modules || [];
  };

  const toggleModule = (companyId: string, moduleId: string) => {
    const currentModules = getModulesForCompany(companyId);
    const newModules = currentModules.includes(moduleId)
      ? currentModules.filter((m) => m !== moduleId)
      : [...currentModules, moduleId];
    setCompanyModules({ ...companyModules, [companyId]: newModules });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Gestion des Entreprises</h1>
          <p className="text-muted-foreground">Configurez les modules pour chaque entreprise</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-companies"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entreprise</TableHead>
                <TableHead>Secteur</TableHead>
                <TableHead>Employés</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Modules activés</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCompanies.map((company) => {
                const activeModules = getModulesForCompany(company.id);
                return (
                  <TableRow key={company.id} data-testid={`row-company-${company.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-medium">{company.name}</p>
                          <p className="text-xs text-muted-foreground">{company.contact}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={company.industry === "Mines" ? "default" : company.industry === "BTP" ? "secondary" : "outline"}>
                        {company.industry}
                      </Badge>
                    </TableCell>
                    <TableCell>{company.employeeCount}</TableCell>
                    <TableCell>
                      {company.status === "active" ? (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Actif
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          En attente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {activeModules.length > 0 ? (
                          activeModules.map((moduleId) => {
                            const module = modulesList.find((m) => m.id === moduleId);
                            return module ? (
                              <Badge key={moduleId} variant="outline" className="text-xs">
                                <module.icon className="w-3 h-3 mr-1" />
                                {moduleId}
                              </Badge>
                            ) : null;
                          })
                        ) : (
                          <span className="text-muted-foreground text-sm">Aucun</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedCompany(company)}
                              data-testid={`button-configure-modules-${company.id}`}
                            >
                              <ToggleRight className="w-4 h-4 mr-1" />
                              Modules
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Configuration des modules</DialogTitle>
                              <DialogDescription>
                                {company.name} - Activez les modules BTP/Mines
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              {modulesList.map((module) => {
                                const isEnabled = getModulesForCompany(company.id).includes(module.id);
                                return (
                                  <div
                                    key={module.id}
                                    className="flex items-center justify-between p-3 rounded-lg border"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={`w-8 h-8 rounded-lg ${module.color} flex items-center justify-center`}>
                                        <module.icon className="w-4 h-4 text-white" />
                                      </div>
                                      <div>
                                        <p className="font-medium text-sm">{module.name}</p>
                                        <p className="text-xs text-muted-foreground">{module.description}</p>
                                      </div>
                                    </div>
                                    <Switch
                                      checked={isEnabled}
                                      onCheckedChange={() => toggleModule(company.id, module.id)}
                                      data-testid={`switch-module-${module.id}`}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                            <DialogFooter>
                              <Button type="submit" data-testid="button-save-modules">
                                Enregistrer
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Button size="icon" variant="ghost" data-testid={`button-view-company-${company.id}`}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ModulesOverview() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Modules BTP/Mines</h1>
        <p className="text-muted-foreground">Vue d'ensemble des modules spécialisés disponibles</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {modulesList.map((module) => {
          const companiesWithModule = mockCompanies.filter((c) => c.modules.includes(module.id)).length;
          return (
            <Card key={module.id} data-testid={`card-module-${module.id}`}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg ${module.color} flex items-center justify-center`}>
                    <module.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{module.name}</CardTitle>
                    <CardDescription>{module.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Entreprises</span>
                  <Badge variant="secondary">{companiesWithModule} actives</Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entreprises par module</CardTitle>
          <CardDescription>Répartition des modules activés</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Module</TableHead>
                <TableHead>Entreprises</TableHead>
                <TableHead>Secteur principal</TableHead>
                <TableHead className="text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modulesList.map((module) => {
                const companies = mockCompanies.filter((c) => c.modules.includes(module.id));
                const percentage = Math.round((companies.length / mockCompanies.length) * 100);
                const mainIndustry = companies.reduce((acc, c) => {
                  acc[c.industry] = (acc[c.industry] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>);
                const topIndustry = Object.entries(mainIndustry).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";

                return (
                  <TableRow key={module.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <module.icon className="w-4 h-4" />
                        {module.name}
                      </div>
                    </TableCell>
                    <TableCell>{companies.length}</TableCell>
                    <TableCell>{topIndustry}</TableCell>
                    <TableCell className="text-right">{percentage}%</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ComingSoonPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Settings className="w-8 h-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-muted-foreground max-w-md">{description}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [location] = useLocation();

  const renderContent = () => {
    if (location.startsWith("/admin/companies")) {
      return <CompaniesManagement />;
    }

    if (location.startsWith("/admin/modules")) {
      return <ModulesOverview />;
    }

    if (location.startsWith("/admin/agencies")) {
      return <ComingSoonPage title="Gestion des Agences" description="La gestion des agences de placement sera bientôt disponible." />;
    }

    if (location.startsWith("/admin/users")) {
      return <ComingSoonPage title="Gestion des Utilisateurs" description="La gestion des utilisateurs sera bientôt disponible." />;
    }

    if (location.startsWith("/admin/security")) {
      return <ComingSoonPage title="Sécurité" description="Les paramètres de sécurité seront bientôt disponibles." />;
    }

    if (location.startsWith("/admin/settings")) {
      return <ComingSoonPage title="Paramètres" description="Les paramètres globaux seront bientôt disponibles." />;
    }

    return <DashboardOverview />;
  };

  const style = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AdminSidebar />
        <SidebarInset className="flex-1 overflow-auto">
          <header className="flex h-14 items-center gap-4 border-b bg-background px-6 sticky top-0 z-10">
            <SidebarTrigger data-testid="button-sidebar-trigger" />
            <div className="flex-1">
              <h1 className="text-lg font-semibold">Administration WorkMatch Africa</h1>
            </div>
          </header>
          <main className="p-6">
            {renderContent()}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
