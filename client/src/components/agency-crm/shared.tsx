import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type {
  AgencyClient,
  AgencyClientAgreementStatus,
  AgencyClientAgreementType,
  AgencyClientContact,
  AgencyClientNeedPriority,
  AgencyClientNeedStatus,
  AgencyClientStatus,
} from "@shared/schema";

// Dates arrive as ISO strings over JSON.
type Jsonify<T> = { [K in keyof T]: T[K] extends Date | null ? string | null : T[K] extends Date ? string : T[K] };

export type ClientRow = Jsonify<AgencyClient> & {
  contactsCount: number;
  primaryContact: { id: string; fullName: string; jobTitle: string | null; email: string | null; phone: string | null } | null;
  openNeeds: number;
  activeAgreements: number;
  expiringAgreements: number;
  activePlacements: number;
  totalPlacements: number;
  lastActivityAt: string | null;
};

export type ContactRow = Jsonify<AgencyClientContact> & { clientName: string };

export type NeedRow = {
  id: string;
  clientId: string;
  clientName: string;
  contactId: string | null;
  contactName: string | null;
  title: string;
  positions: number;
  contractType: string | null;
  location: string | null;
  desiredStartDate: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  priority: AgencyClientNeedPriority;
  status: AgencyClientNeedStatus;
  description: string | null;
  jobId: string | null;
  jobIsActive: boolean | null;
  createdAt: string | null;
};

export type AgreementRow = {
  id: string;
  clientId: string;
  clientName: string;
  type: AgencyClientAgreementType;
  title: string;
  reference: string | null;
  status: AgencyClientAgreementStatus;
  startDate: string | null;
  endDate: string | null;
  commissionRate: number | null;
  paymentTermsDays: number | null;
  notes: string | null;
  fileName: string | null;
  fileMimeType: string | null;
  fileSizeBytes: number | null;
  createdAt: string | null;
};

export type MissionRow = {
  id: string;
  kind: "mission" | "placement" | "field_mission";
  clientId: string;
  clientName: string;
  title: string;
  candidateName: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  positions: number | null;
  applications: number | null;
  rating: number | null;
  amount: number | null;
};

export const CLIENTS_KEY = ["/api/agency/clients"] as const;
export const CONTACTS_KEY = ["/api/agency/client-contacts"] as const;
export const NEEDS_KEY = ["/api/agency/client-needs"] as const;
export const AGREEMENTS_KEY = ["/api/agency/client-agreements"] as const;
export const MISSIONS_KEY = ["/api/agency/client-missions"] as const;

// Anything that changes a client's related records also changes the
// aggregates shown on its fiche.
export const CRM_KEYS = [CLIENTS_KEY, CONTACTS_KEY, NEEDS_KEY, AGREEMENTS_KEY, MISSIONS_KEY];

export const invalidateCrm = () => CRM_KEYS.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));

export const useClients = () => useQuery<ClientRow[]>({ queryKey: CLIENTS_KEY });

export const CLIENT_STATUS: Record<AgencyClientStatus, { label: string; className: string }> = {
  active: { label: "Client actif", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  prospect: { label: "Prospect", className: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  inactive: { label: "Inactif", className: "bg-muted text-muted-foreground" },
};

export const NEED_STATUS: Record<AgencyClientNeedStatus, { label: string; className: string }> = {
  new: { label: "Nouveau", className: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  qualified: { label: "Qualifié", className: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" },
  in_progress: { label: "En recrutement", className: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  filled: { label: "Pourvu", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  cancelled: { label: "Annulé", className: "bg-muted text-muted-foreground" },
};

export const NEED_PRIORITY: Record<AgencyClientNeedPriority, { label: string; className: string }> = {
  low: { label: "Basse", className: "text-muted-foreground" },
  normal: { label: "Normale", className: "text-foreground" },
  high: { label: "Haute", className: "text-amber-700 dark:text-amber-300" },
  urgent: { label: "Urgente", className: "text-red-700 dark:text-red-300" },
};

export const AGREEMENT_TYPE: Record<AgencyClientAgreementType, string> = {
  framework: "Contrat-cadre",
  secondment: "Convention de mise à disposition",
  nda: "Accord de confidentialité",
  pricing: "Grille tarifaire",
  other: "Autre",
};

export type AgreementDisplayStatus = AgencyClientAgreementStatus | "expired" | "expiring";

export const AGREEMENT_STATUS: Record<AgreementDisplayStatus, { label: string; className: string }> = {
  draft: { label: "Brouillon", className: "bg-muted text-muted-foreground" },
  sent: { label: "Envoyé", className: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  signed: { label: "Signé", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  expiring: { label: "Expire bientôt", className: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  expired: { label: "Expiré", className: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
  terminated: { label: "Résilié", className: "bg-muted text-muted-foreground" },
};

// "Expiré" / "expire bientôt" are derived from the end date of a signed
// agreement, never stored — the same rule the server uses for its counters.
export function agreementDisplayStatus(row: Pick<AgreementRow, "status" | "endDate">): AgreementDisplayStatus {
  if (row.status !== "signed" || !row.endDate) return row.status;
  const days = (new Date(row.endDate).getTime() - Date.now()) / 86_400_000;
  if (days < 0) return "expired";
  if (days <= 30) return "expiring";
  return "signed";
}

export const CONTRACT_TYPES = ["CDI", "CDD", "Intérim", "Mission", "Stage", "Freelance"];

export const cardClass = "rounded-2xl border border-border/60 bg-card shadow-sm";

export function Pill({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${className}`}>{children}</span>;
}

export function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

export function formatMoney(amount: number | null | undefined) {
  return amount === null || amount === undefined ? "—" : `${new Intl.NumberFormat("fr-FR").format(amount)} FCFA`;
}

export function initialsOf(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
}

/** yyyy-mm-dd for <input type="date"> from an ISO string. */
export const toDateInput = (value: string | null | undefined) => (value ? value.slice(0, 10) : "");

/** Integer from a text input, or null when empty. */
export const toIntOrNull = (value: string) => (value.trim() === "" ? null : Math.round(Number(value.replace(/\s/g, ""))));

export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function PageHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </header>
  );
}

export function StatCard({ icon: Icon, value, label, tone }: { icon: React.ElementType; value: string | number; label: string; tone: string }) {
  return (
    <div className={`${cardClass} flex items-center gap-3 p-4`}>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span>
      <div className="min-w-0">
        <p className="truncate text-2xl font-bold tabular-nums text-foreground">{value}</p>
        <p className="text-xs leading-tight text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: React.ElementType; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <Icon className="h-10 w-10 text-muted-foreground/60" />
      <div>
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

/** Company picker used by every "add" form that isn't opened from a fiche. */
export function ClientSelect({ value, onChange, includeAll, testId }: { value: string; onChange: (value: string) => void; includeAll?: boolean; testId?: string }) {
  const { data: clients = [] } = useClients();
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger data-testid={testId}><SelectValue placeholder="Choisir une entreprise" /></SelectTrigger>
      <SelectContent>
        {includeAll && <SelectItem value="all">Entreprises</SelectItem>}
        {clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
