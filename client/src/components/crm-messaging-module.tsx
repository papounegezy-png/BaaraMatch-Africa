import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Send, 
  Building2, 
  Clock, 
  CheckCircle2, 
  MapPin,
  FileText,
  Calendar,
  MoreVertical,
  Search
} from "lucide-react";

interface Company {
  id: string;
  name: string;
  logoUrl?: string;
  industry: string;
  unreadCount: number;
  lastMessage: string;
  lastMessageTime: string;
  isOnline: boolean;
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  isOwn: boolean;
}

interface Timesheet {
  id: string;
  employeeName: string;
  companyName: string;
  date: string;
  hoursWorked: number;
  location: string;
  status: "pending" | "approved" | "rejected";
  geoVerified: boolean;
}

const mockCompanies: Company[] = [
  {
    id: "1",
    name: "TechCorp Afrique",
    industry: "Technologie",
    unreadCount: 3,
    lastMessage: "Nous avons besoin de 2 développeurs...",
    lastMessageTime: "10:45",
    isOnline: true,
  },
  {
    id: "2",
    name: "Orange Mali",
    industry: "Télécommunications",
    unreadCount: 0,
    lastMessage: "Merci pour le placement!",
    lastMessageTime: "Hier",
    isOnline: true,
  },
  {
    id: "3",
    name: "Banque Atlantique",
    industry: "Finance",
    unreadCount: 1,
    lastMessage: "La candidature a été acceptée",
    lastMessageTime: "Lun",
    isOnline: false,
  },
  {
    id: "4",
    name: "Sonatel",
    industry: "Télécommunications",
    unreadCount: 0,
    lastMessage: "Planifions un appel cette semaine",
    lastMessageTime: "22 Jan",
    isOnline: false,
  },
];

const mockMessages: Message[] = [
  {
    id: "1",
    senderId: "company",
    content: "Bonjour, nous recherchons 2 développeurs React pour un projet de 6 mois.",
    timestamp: "10:30",
    isOwn: false,
  },
  {
    id: "2",
    senderId: "agency",
    content: "Bonjour! Nous avons plusieurs candidats qualifiés. Je vous envoie leurs profils.",
    timestamp: "10:35",
    isOwn: true,
  },
  {
    id: "3",
    senderId: "company",
    content: "Parfait, merci. Pouvez-vous inclure leurs CVs vocaux?",
    timestamp: "10:40",
    isOwn: false,
  },
  {
    id: "4",
    senderId: "agency",
    content: "Bien sûr! Je vous partage les profils avec CVs vocaux dans quelques minutes.",
    timestamp: "10:42",
    isOwn: true,
  },
  {
    id: "5",
    senderId: "company",
    content: "Nous avons besoin de 2 développeurs supplémentaires pour un autre projet.",
    timestamp: "10:45",
    isOwn: false,
  },
];

const mockTimesheets: Timesheet[] = [
  {
    id: "1",
    employeeName: "Amadou Diallo",
    companyName: "TechCorp Afrique",
    date: "2026-01-28",
    hoursWorked: 8,
    location: "Dakar, Sénégal",
    status: "pending",
    geoVerified: true,
  },
  {
    id: "2",
    employeeName: "Fatou Sow",
    companyName: "Orange Mali",
    date: "2026-01-28",
    hoursWorked: 8,
    location: "Bamako, Mali",
    status: "approved",
    geoVerified: true,
  },
  {
    id: "3",
    employeeName: "Ibrahim Koné",
    companyName: "Banque Atlantique",
    date: "2026-01-27",
    hoursWorked: 7.5,
    location: "Abidjan, Côte d'Ivoire",
    status: "pending",
    geoVerified: false,
  },
];

export function CRMMessagingModule() {
  const [selectedCompany, setSelectedCompany] = useState<Company>(mockCompanies[0]);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const getInitials = (name: string) => {
    return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
  };

  const filteredCompanies = mockCompanies.filter((company) =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: Timesheet["status"]) => {
    const variants = {
      pending: { label: "En attente", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
      approved: { label: "Validé", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
      rejected: { label: "Rejeté", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
    };
    return variants[status];
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Module CRM / VMS</CardTitle>
          <Tabs defaultValue="messages" className="w-auto">
            <TabsList className="h-8">
              <TabsTrigger value="messages" className="text-xs px-3">Messages</TabsTrigger>
              <TabsTrigger value="timesheets" className="text-xs px-3">Feuilles de temps</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="messages">
          <TabsContent value="messages" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="border rounded-lg overflow-hidden">
                <div className="p-3 border-b bg-muted/30">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-8"
                      data-testid="input-search-companies"
                    />
                  </div>
                </div>
                <ScrollArea className="h-[300px]">
                  {filteredCompanies.map((company) => (
                    <button
                      key={company.id}
                      onClick={() => setSelectedCompany(company)}
                      className={`w-full p-3 flex items-start gap-3 border-b transition-colors hover-elevate ${
                        selectedCompany.id === company.id ? "bg-muted/50" : ""
                      }`}
                      data-testid={`company-${company.id}`}
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={company.logoUrl} />
                          <AvatarFallback className="text-xs">
                            {getInitials(company.name)}
                          </AvatarFallback>
                        </Avatar>
                        {company.isOnline && (
                          <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm truncate">{company.name}</p>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {company.lastMessageTime}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {company.lastMessage}
                        </p>
                        {company.unreadCount > 0 && (
                          <Badge className="mt-1 text-[10px] px-1.5 py-0">
                            {company.unreadCount} nouveau(x)
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </ScrollArea>
              </div>

              <div className="lg:col-span-2 border rounded-lg flex flex-col overflow-hidden">
                <div className="p-3 border-b bg-muted/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={selectedCompany.logoUrl} />
                      <AvatarFallback className="text-xs">
                        {getInitials(selectedCompany.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{selectedCompany.name}</p>
                      <p className="text-xs text-muted-foreground">{selectedCompany.industry}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>

                <ScrollArea className="flex-1 h-[200px] p-4">
                  <div className="space-y-4">
                    {mockMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.isOwn ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-lg ${
                            message.isOwn
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-[10px] mt-1 ${
                            message.isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                          }`}>
                            {message.timestamp}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="p-3 border-t bg-muted/30">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Écrire un message..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      className="flex-1"
                      data-testid="input-message"
                    />
                    <Button data-testid="button-send-message">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="timesheets" className="mt-0">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Feuilles de temps en attente de validation
                </p>
                <Button variant="outline" size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  Cette semaine
                </Button>
              </div>

              <div className="space-y-3">
                {mockTimesheets.map((timesheet) => {
                  const statusBadge = getStatusBadge(timesheet.status);
                  return (
                    <div
                      key={timesheet.id}
                      className="p-4 border rounded-lg flex flex-col sm:flex-row sm:items-center gap-4"
                      data-testid={`timesheet-${timesheet.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{timesheet.employeeName}</p>
                          <Badge className={statusBadge.className}>
                            {statusBadge.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {timesheet.companyName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {timesheet.hoursWorked}h
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {timesheet.location}
                            {timesheet.geoVerified && (
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                            )}
                          </span>
                        </div>
                      </div>

                      {timesheet.status === "pending" && (
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            data-testid={`button-reject-${timesheet.id}`}
                          >
                            Rejeter
                          </Button>
                          <Button 
                            size="sm"
                            data-testid={`button-approve-${timesheet.id}`}
                          >
                            Valider
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
