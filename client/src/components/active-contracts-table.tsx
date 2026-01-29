import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, AlertTriangle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Contract {
  id: string;
  candidateName: string;
  initials: string;
  company: string;
  status: "active" | "pending" | "imminent";
  endDate: string;
  hasAlert?: boolean;
}

const mockContracts: Contract[] = [
  {
    id: "1",
    candidateName: "Sophie Martin",
    initials: "SM",
    company: "Tech Solutions",
    status: "active",
    endDate: "15 Avril 2026",
    hasAlert: true,
  },
  {
    id: "2",
    candidateName: "Thomas Dubois",
    initials: "TD",
    company: "Innovation Labs",
    status: "active",
    endDate: "30 Mars 2026",
  },
  {
    id: "3",
    candidateName: "Claire Bernard",
    initials: "CB",
    company: "Digital Services",
    status: "active",
    endDate: "08 Fév 2026",
    hasAlert: true,
  },
  {
    id: "4",
    candidateName: "Lucas Petit",
    initials: "LP",
    company: "Consulting Group",
    status: "pending",
    endDate: "20 Mai 2026",
  },
  {
    id: "5",
    candidateName: "Emma Leroy",
    initials: "EL",
    company: "Financial Partners",
    status: "active",
    endDate: "12 Avril 2026",
  },
];

const statusConfig = {
  active: {
    label: "Actif",
    className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  },
  pending: {
    label: "En cours",
    className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  },
  imminent: {
    label: "Imminent",
    className: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
  },
};

export function ActiveContractsTable() {
  const [contracts] = useState<Contract[]>(mockContracts);

  return (
    <Card className="border border-gray-200 dark:border-gray-800 rounded-2xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
          Contrats actifs
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="contracts-table">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="text-left text-sm font-medium text-gray-500 dark:text-gray-400 px-6 py-3">
                  Candidat
                </th>
                <th className="text-left text-sm font-medium text-gray-500 dark:text-gray-400 px-6 py-3">
                  Entreprise
                </th>
                <th className="text-left text-sm font-medium text-gray-500 dark:text-gray-400 px-6 py-3">
                  Statut
                </th>
                <th className="text-left text-sm font-medium text-gray-500 dark:text-gray-400 px-6 py-3">
                  Fin de contrat
                </th>
                <th className="text-left text-sm font-medium text-gray-500 dark:text-gray-400 px-6 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((contract) => (
                <tr 
                  key={contract.id} 
                  className="border-b border-gray-200 dark:border-gray-800 last:border-0"
                  data-testid={`contract-row-${contract.id}`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback 
                          className="text-white text-sm font-medium"
                          style={{ backgroundImage: "linear-gradient(135deg, rgb(81, 162, 255) 0%, rgb(21, 93, 252) 100%)" }}
                        >
                          {contract.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {contract.candidateName}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {contract.company}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Badge 
                      variant="outline" 
                      className={`rounded-full px-3 py-1 text-xs font-medium ${statusConfig[contract.status].className}`}
                    >
                      {statusConfig[contract.status].label}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {contract.endDate}
                      </span>
                      {contract.hasAlert && contract.status === "active" && (
                        <Badge 
                          variant="outline" 
                          className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800 text-xs px-2 py-0.5 rounded"
                        >
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Imminent
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {contract.hasAlert && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800 rounded-xl text-xs px-3"
                          data-testid={`button-alert-${contract.id}`}
                        >
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Alerte
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            data-testid={`button-actions-${contract.id}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Voir le contrat</DropdownMenuItem>
                          <DropdownMenuItem>Modifier</DropdownMenuItem>
                          <DropdownMenuItem>Renouveler</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">Résilier</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
