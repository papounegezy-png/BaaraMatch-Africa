import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Network,
  ZoomIn,
  ZoomOut,
  Download,
  Maximize2,
  Users,
  ChevronDown,
  ChevronRight,
  Mail,
  Phone,
  Building2,
} from "lucide-react";

interface OrgNode {
  id: number;
  name: string;
  position: string;
  department: string;
  email: string;
  phone: string;
  children?: OrgNode[];
}

const orgData: OrgNode = {
  id: 1,
  name: "Marie Dupont",
  position: "Directrice Générale",
  department: "Direction",
  email: "marie.d@company.com",
  phone: "+221 77 000 0001",
  children: [
    {
      id: 2,
      name: "Fatou Sow",
      position: "Directrice Tech",
      department: "Tech",
      email: "fatou.s@company.com",
      phone: "+221 78 234 5678",
      children: [
        {
          id: 5,
          name: "Amadou Diallo",
          position: "Développeur Senior",
          department: "Tech",
          email: "amadou.d@company.com",
          phone: "+221 77 123 4567",
          children: [
            {
              id: 8,
              name: "Ibrahim Ndiaye",
              position: "Développeur Junior",
              department: "Tech",
              email: "ibrahim.n@company.com",
              phone: "+221 77 111 2222",
            },
            {
              id: 9,
              name: "Mariama Fall",
              position: "Développeuse Frontend",
              department: "Tech",
              email: "mariama.f@company.com",
              phone: "+221 77 333 4444",
            },
          ],
        },
        {
          id: 6,
          name: "Cheikh Mbaye",
          position: "DevOps Engineer",
          department: "Tech",
          email: "cheikh.m@company.com",
          phone: "+221 76 555 6666",
        },
      ],
    },
    {
      id: 3,
      name: "Oumar Kane",
      position: "Directeur Marketing",
      department: "Marketing",
      email: "oumar.k@company.com",
      phone: "+221 70 345 6789",
      children: [
        {
          id: 7,
          name: "Awa Diop",
          position: "Chef de Projet Digital",
          department: "Marketing",
          email: "awa.d@company.com",
          phone: "+221 77 777 8888",
        },
      ],
    },
    {
      id: 4,
      name: "Jean Martin",
      position: "Directeur RH",
      department: "RH",
      email: "jean.m@company.com",
      phone: "+221 76 456 7890",
      children: [
        {
          id: 10,
          name: "Aissatou Ba",
          position: "Chargée RH",
          department: "RH",
          email: "aissatou.b@company.com",
          phone: "+221 76 456 7890",
        },
      ],
    },
  ],
};

const departmentColors: Record<string, string> = {
  Direction: "from-purple-500 to-pink-500",
  Tech: "from-blue-500 to-cyan-500",
  Marketing: "from-orange-500 to-amber-500",
  RH: "from-green-500 to-emerald-500",
  Ventes: "from-red-500 to-rose-500",
  Finance: "from-indigo-500 to-violet-500",
};

function OrgNodeCard({ 
  node, 
  isRoot = false,
  expanded,
  onToggle,
}: { 
  node: OrgNode; 
  isRoot?: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const colorClass = departmentColors[node.department] || "from-gray-500 to-slate-500";

  return (
    <div className="flex flex-col items-center">
      <Card 
        className={`w-64 cursor-pointer transition-all hover:shadow-lg ${isRoot ? 'border-2 border-purple-300 dark:border-purple-700' : ''}`}
        onClick={onToggle}
      >
        <CardContent className="pt-4 pb-3">
          <div className="flex items-start gap-3">
            <Avatar className={`h-12 w-12 bg-gradient-to-br ${colorClass}`}>
              <AvatarFallback className="text-white font-medium">
                {node.name.split(" ").map(n => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm truncate">{node.name}</p>
                {hasChildren && (
                  expanded ? 
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : 
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{node.position}</p>
              <Badge variant="outline" className="text-xs mt-1">{node.department}</Badge>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail className="h-3 w-3" />
              <span className="truncate">{node.email}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span>{node.phone}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function OrgTree({ node, isRoot = false }: { node: OrgNode; isRoot?: boolean }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="flex flex-col items-center">
      <OrgNodeCard 
        node={node} 
        isRoot={isRoot} 
        expanded={expanded}
        onToggle={() => hasChildren && setExpanded(!expanded)}
      />
      
      {hasChildren && expanded && (
        <>
          <div className="w-px h-6 bg-border" />
          <div className="relative">
            {node.children!.length > 1 && (
              <div 
                className="absolute top-0 h-px bg-border"
                style={{
                  left: '50%',
                  right: '50%',
                  transform: `translateX(-${(node.children!.length - 1) * 140}px)`,
                  width: `${(node.children!.length - 1) * 280}px`,
                }}
              />
            )}
            <div className="flex gap-8">
              {node.children!.map((child) => (
                <div key={child.id} className="flex flex-col items-center">
                  <div className="w-px h-6 bg-border" />
                  <OrgTree node={child} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function OrgChart() {
  const [zoom, setZoom] = useState(100);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 150));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 50));
  const handleResetZoom = () => setZoom(100);

  const countEmployees = (node: OrgNode): number => {
    let count = 1;
    if (node.children) {
      node.children.forEach(child => {
        count += countEmployees(child);
      });
    }
    return count;
  };

  const totalEmployees = countEmployees(orgData);
  const departments = new Set<string>();
  const countDepartments = (node: OrgNode) => {
    departments.add(node.department);
    node.children?.forEach(countDepartments);
  };
  countDepartments(orgData);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Organigramme</h1>
          <p className="text-muted-foreground">Structure organisationnelle de l'entreprise</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[50px] text-center">{zoom}%</span>
          <Button variant="outline" size="icon" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleResetZoom}>
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exporter
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total employés</p>
                <p className="text-2xl font-bold">{totalEmployees}</p>
              </div>
              <div className="p-3 rounded-full bg-muted text-blue-600">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Départements</p>
                <p className="text-2xl font-bold">{departments.size}</p>
              </div>
              <div className="p-3 rounded-full bg-muted text-purple-600">
                <Building2 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Niveaux hiérarchiques</p>
                <p className="text-2xl font-bold">4</p>
              </div>
              <div className="p-3 rounded-full bg-muted text-green-600">
                <Network className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Structure de l'organisation</CardTitle>
          <CardDescription>Cliquez sur un employé pour voir/masquer ses subordonnés</CardDescription>
        </CardHeader>
        <CardContent>
          <div 
            className="overflow-auto py-8 min-h-[500px]"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
          >
            <div className="flex justify-center">
              <OrgTree node={orgData} isRoot />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Légende des départements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {Object.entries(departmentColors).map(([dept, colors]) => (
              <div key={dept} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${colors}`} />
                <span className="text-sm">{dept}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
