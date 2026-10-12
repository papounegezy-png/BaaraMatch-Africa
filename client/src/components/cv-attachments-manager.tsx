import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Download,
  Eye,
  File,
  FileCheck,
  FileText,
  FileX,
  FolderOpen,
  IdCard,
  Loader2,
  Mic,
  Search,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import type { CandidateDocument, CandidateDocumentType } from "@shared/schema";

type DocumentMeta = Omit<CandidateDocument, "url" | "createdAt" | "expiresAt"> & {
  createdAt: string | null;
  expiresAt: string | null;
};

type ApiCandidate = {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  profile?: {
    title?: string | null;
    resumeUrl?: string | null;
    resumeFileName?: string | null;
    voiceCvUrl?: string | null;
  } | null;
};

type ExpiryState = "expired" | "expiring" | "valid" | "none";

type CandidateFile = {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  title?: string | null;
  hasProfileResume: boolean;
  resumeFileName?: string | null;
  voiceCvUrl?: string | null;
  documents: DocumentMeta[];
  hasCv: boolean;
  hasValidId: boolean;
  hasDiploma: boolean;
  alert: ExpiryState;
};

const DOCUMENT_TYPES: Record<CandidateDocumentType, { label: string; expires: boolean }> = {
  cv: { label: "CV", expires: false },
  id: { label: "Pièce d'identité", expires: true },
  diploma: { label: "Diplôme", expires: false },
  certificate: { label: "Certificat / habilitation", expires: true },
  medical: { label: "Visite médicale", expires: true },
  reference: { label: "Référence", expires: false },
  other: { label: "Autre", expires: false },
};

const ACCEPTED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;
const EXPIRING_WINDOW_DAYS = 30;
const ITEMS_PER_PAGE = 10;

function expiryState(expiresAt: string | null): ExpiryState {
  if (!expiresAt) return "none";
  const days = (new Date(expiresAt).getTime() - Date.now()) / 86_400_000;
  if (days < 0) return "expired";
  if (days <= EXPIRING_WINDOW_DAYS) return "expiring";
  return "valid";
}

function worstExpiry(documents: DocumentMeta[]): ExpiryState {
  const states = documents.map((doc) => expiryState(doc.expiresAt));
  if (states.includes("expired")) return "expired";
  if (states.includes("expiring")) return "expiring";
  return "none";
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

function initialsOf(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
}

function readAsBase64(file: globalThis.File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const documentFileUrl = (id: string, download = false) => `/api/agency/candidate-documents/${id}/file${download ? "?download=1" : ""}`;
const resumeFileUrl = (candidateId: string, download = false) => `/api/agency/candidates/${candidateId}/resume${download ? "?download=1" : ""}`;

const cardClass = "rounded-2xl border border-border/60 bg-card shadow-sm";

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
      <CheckCircle2 className="h-3 w-3" /> {label}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      <Circle className="h-3 w-3" /> Manquant
    </span>
  );
}

function ExpiryBadge({ state, date }: { state: ExpiryState; date?: string | null }) {
  if (state === "expired") {
    return <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300">Expiré{date ? ` · ${formatDate(date)}` : ""}</span>;
  }
  if (state === "expiring") {
    return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Expire{date ? ` le ${formatDate(date)}` : " bientôt"}</span>;
  }
  if (state === "valid" && date) {
    return <span className="text-xs text-muted-foreground">Valide jusqu'au {formatDate(date)}</span>;
  }
  return null;
}

function StatCard({ icon: Icon, value, label, tone }: { icon: React.ElementType; value: number; label: string; tone: string }) {
  return (
    <div className={`${cardClass} flex items-center gap-3 p-4`}>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-bold tabular-nums text-foreground">{value}</p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function UploadForm({ candidateId }: { candidateId: string }) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<globalThis.File | null>(null);
  const [type, setType] = useState<CandidateDocumentType>("id");
  const [name, setName] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const reset = () => {
    setFile(null);
    setName("");
    setExpiresAt("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const pickFile = (picked: globalThis.File | undefined) => {
    if (!picked) return;
    if (!ACCEPTED_MIME.includes(picked.type)) {
      toast({ title: "Format non pris en charge", description: "PDF, JPG, PNG ou WebP uniquement.", variant: "destructive" });
      return;
    }
    if (picked.size > MAX_BYTES) {
      toast({ title: "Fichier trop volumineux", description: "10 Mo maximum.", variant: "destructive" });
      return;
    }
    setFile(picked);
    setName(picked.name);
  };

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Aucun fichier sélectionné");
      const res = await apiRequest("POST", `/api/agency/candidates/${candidateId}/documents`, {
        type,
        name: name.trim() || file.name,
        mimeType: file.type,
        dataBase64: await readAsBase64(file),
        expiresAt: DOCUMENT_TYPES[type].expires && expiresAt ? expiresAt : null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agency/candidate-documents"] });
      toast({ title: "Document ajouté", description: `${DOCUMENT_TYPES[type].label} enregistré dans le dossier.` });
      reset();
    },
    onError: (error: Error) => toast({ title: "Échec de l'envoi", description: error.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-muted/30 p-4">
      <p className="text-sm font-semibold text-foreground">Ajouter une pièce</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); pickFile(e.dataTransfer.files[0]); }}
        className={`flex w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-4 py-5 text-center transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-background"}`}
        data-testid="dropzone-document"
      >
        {file ? (
          <>
            <FileCheck className="h-6 w-6 text-emerald-600" />
            <span className="max-w-full truncate text-sm font-medium text-foreground">{file.name}</span>
            <span className="text-xs text-muted-foreground">{formatSize(file.size)} · cliquer pour changer</span>
          </>
        ) : (
          <>
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Glisser un fichier ou cliquer</span>
            <span className="text-xs text-muted-foreground">PDF, JPG, PNG · 10 Mo max</span>
          </>
        )}
      </button>
      <input ref={inputRef} type="file" accept={ACCEPTED_MIME.join(",")} className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} data-testid="input-document-file" />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Type de pièce</Label>
          <Select value={type} onValueChange={(value) => setType(value as CandidateDocumentType)}>
            <SelectTrigger data-testid="select-document-type"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(DOCUMENT_TYPES).map(([value, { label }]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {DOCUMENT_TYPES[type].expires && (
          <div className="space-y-1.5">
            <Label className="text-xs">Date d'expiration <span className="text-muted-foreground">(optionnel)</span></Label>
            <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} data-testid="input-document-expiry" />
          </div>
        )}
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">Nom du document</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex. Passeport – Amadou Diallo" maxLength={200} data-testid="input-document-name" />
        </div>
      </div>
      <Button className="w-full" disabled={!file || upload.isPending} onClick={() => upload.mutate()} data-testid="button-upload-document">
        {upload.isPending ? <Loader2 className="animate-spin" /> : <Upload />}
        {upload.isPending ? "Envoi en cours…" : "Ajouter au dossier"}
      </Button>
    </div>
  );
}

function DocumentRow({ document }: { document: DocumentMeta }) {
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const state = expiryState(document.expiresAt);

  const remove = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/agency/candidate-documents/${document.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agency/candidate-documents"] });
      toast({ title: "Document supprimé" });
    },
    onError: (error: Error) => toast({ title: "Suppression impossible", description: error.message, variant: "destructive" }),
  });

  return (
    <li className="flex items-center gap-3 rounded-xl border border-border/60 p-3" data-testid={`document-${document.id}`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
        {document.type === "id" ? <IdCard className="h-4 w-4" /> : document.mimeType === "application/pdf" ? <FileText className="h-4 w-4" /> : <File className="h-4 w-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{document.name}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="font-medium">{DOCUMENT_TYPES[document.type]?.label ?? document.type}</span>
          <span>· {formatSize(document.sizeBytes)} · ajouté le {formatDate(document.createdAt)}</span>
          <ExpiryBadge state={state} date={document.expiresAt} />
        </div>
      </div>
      {confirming ? (
        <div className="flex shrink-0 items-center gap-1">
          <Button size="sm" variant="destructive" disabled={remove.isPending} onClick={() => remove.mutate()}>
            {remove.isPending ? <Loader2 className="animate-spin" /> : "Supprimer"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>Annuler</Button>
        </div>
      ) : (
        <div className="flex shrink-0 items-center">
          <Button variant="ghost" size="icon" asChild title="Voir">
            <a href={documentFileUrl(document.id)} target="_blank" rel="noopener noreferrer"><Eye className="h-4 w-4" /></a>
          </Button>
          <Button variant="ghost" size="icon" asChild title="Télécharger">
            <a href={documentFileUrl(document.id, true)}><Download className="h-4 w-4" /></a>
          </Button>
          <Button variant="ghost" size="icon" title="Supprimer" onClick={() => setConfirming(true)} data-testid={`button-delete-${document.id}`}>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      )}
    </li>
  );
}

function CandidateFilePanel({ candidate, onClose }: { candidate: CandidateFile | null; onClose: () => void }) {
  return (
    <Sheet open={!!candidate} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {candidate && (
          <div className="space-y-6">
            <SheetHeader className="text-left">
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11">
                  <AvatarImage src={candidate.avatarUrl ?? undefined} />
                  <AvatarFallback>{initialsOf(candidate.fullName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <SheetTitle className="truncate">{candidate.fullName}</SheetTitle>
                  <SheetDescription className="truncate">{candidate.title || candidate.email}</SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Complétude du dossier</h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { ok: candidate.hasCv, label: "CV" },
                  { ok: candidate.hasValidId, label: "Pièce d'identité" },
                  { ok: candidate.hasDiploma, label: "Diplôme" },
                ].map((item) => (
                  <div key={item.label} className={`rounded-xl border p-2.5 ${item.ok ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-900/20" : "border-dashed border-border"}`}>
                    {item.ok ? <CheckCircle2 className="mx-auto h-5 w-5 text-emerald-600" /> : <Circle className="mx-auto h-5 w-5 text-muted-foreground/60" />}
                    <p className="mt-1 text-xs font-medium text-foreground">{item.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Un dossier est complet avec un CV et une pièce d'identité en cours de validité. Le diplôme est recommandé.</p>
            </section>

            {candidate.hasProfileResume && (
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">CV déposé par le candidat</h3>
                <div className="flex items-center gap-3 rounded-xl border border-border/60 p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"><FileText className="h-4 w-4" /></span>
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{candidate.resumeFileName || "CV.pdf"}</p>
                  <Button variant="ghost" size="icon" asChild title="Voir">
                    <a href={resumeFileUrl(candidate.id)} target="_blank" rel="noopener noreferrer"><Eye className="h-4 w-4" /></a>
                  </Button>
                  <Button variant="ghost" size="icon" asChild title="Télécharger">
                    <a href={resumeFileUrl(candidate.id, true)}><Download className="h-4 w-4" /></a>
                  </Button>
                </div>
              </section>
            )}

            {candidate.voiceCvUrl && (
              <section className="space-y-2">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Mic className="h-3.5 w-3.5" /> CV vocal</h3>
                <audio controls preload="none" src={candidate.voiceCvUrl} className="w-full" />
              </section>
            )}

            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pièces du dossier ({candidate.documents.length})</h3>
              {candidate.documents.length === 0 ? (
                <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">Aucune pièce déposée pour ce candidat.</p>
              ) : (
                <ul className="space-y-2">{candidate.documents.map((doc) => <DocumentRow key={doc.id} document={doc} />)}</ul>
              )}
            </section>

            <UploadForm candidateId={candidate.id} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

type StatusFilter = "all" | "complete" | "incomplete" | "no_cv" | "no_id" | "alerts";

export function CvAttachmentsManager() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const candidatesQuery = useQuery<ApiCandidate[]>({ queryKey: ["/api/candidates"] });
  const documentsQuery = useQuery<DocumentMeta[]>({ queryKey: ["/api/agency/candidate-documents"] });
  const isLoading = candidatesQuery.isLoading || documentsQuery.isLoading;

  const files = useMemo<CandidateFile[]>(() => {
    const byCandidate = new Map<string, DocumentMeta[]>();
    for (const doc of documentsQuery.data ?? []) {
      byCandidate.set(doc.candidateId, [...(byCandidate.get(doc.candidateId) ?? []), doc]);
    }
    return (candidatesQuery.data ?? []).map((candidate) => {
      const documents = byCandidate.get(candidate.id) ?? [];
      const hasProfileResume = !!candidate.profile?.resumeUrl;
      return {
        id: candidate.id,
        fullName: candidate.fullName,
        email: candidate.email,
        avatarUrl: candidate.avatarUrl,
        title: candidate.profile?.title,
        hasProfileResume,
        resumeFileName: candidate.profile?.resumeFileName,
        voiceCvUrl: candidate.profile?.voiceCvUrl,
        documents,
        hasCv: hasProfileResume || documents.some((doc) => doc.type === "cv"),
        hasValidId: documents.some((doc) => doc.type === "id" && expiryState(doc.expiresAt) !== "expired"),
        hasDiploma: documents.some((doc) => doc.type === "diploma"),
        alert: worstExpiry(documents),
      };
    });
  }, [candidatesQuery.data, documentsQuery.data]);

  const stats = useMemo(() => ({
    total: files.length,
    withCv: files.filter((file) => file.hasCv).length,
    complete: files.filter((file) => file.hasCv && file.hasValidId).length,
    alerts: files.filter((file) => file.alert !== "none").length,
  }), [files]);

  const filtered = files.filter((file) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query
      || file.fullName.toLowerCase().includes(query)
      || file.email.toLowerCase().includes(query)
      || (file.title?.toLowerCase().includes(query) ?? false);
    if (!matchesSearch) return false;
    switch (statusFilter) {
      case "complete": return file.hasCv && file.hasValidId;
      case "incomplete": return !(file.hasCv && file.hasValidId);
      case "no_cv": return !file.hasCv;
      case "no_id": return !file.hasValidId;
      case "alerts": return file.alert !== "none";
      default: return true;
    }
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const page = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const selected = files.find((file) => file.id === selectedId) ?? null;

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">CV & pièces jointes</h1>
        <p className="text-sm text-muted-foreground">Constituez et suivez les dossiers administratifs de vos candidats.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={Users} value={stats.total} label="Candidats" tone="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300" />
        <StatCard icon={FileText} value={stats.withCv} label="Avec CV" tone="bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300" />
        <StatCard icon={FileCheck} value={stats.complete} label="Dossiers complets" tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300" />
        <StatCard icon={AlertTriangle} value={stats.alerts} label="Pièces à renouveler" tone="bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300" />
      </div>

      <div className={`${cardClass} overflow-hidden`}>
        <div className="flex flex-col gap-3 border-b border-border/60 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher un candidat, un poste…"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="pl-10"
              data-testid="input-search-cv"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value as StatusFilter); setCurrentPage(1); }}>
            <SelectTrigger className="w-full sm:w-[220px]" data-testid="select-status-filter"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les dossiers</SelectItem>
              <SelectItem value="complete">Dossiers complets</SelectItem>
              <SelectItem value="incomplete">Dossiers incomplets</SelectItem>
              <SelectItem value="no_cv">Sans CV</SelectItem>
              <SelectItem value="no_id">Sans pièce d'identité valide</SelectItem>
              <SelectItem value="alerts">Pièces expirées ou à renouveler</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
        ) : candidatesQuery.isError || documentsQuery.isError ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground" role="alert">
            <FileX className="h-8 w-8" aria-hidden="true" /> Impossible de charger les dossiers. Réessayez dans un instant.
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <FolderOpen className="h-10 w-10 text-muted-foreground/60" />
            <p className="font-medium text-foreground">Aucun dossier trouvé</p>
            <p className="text-sm text-muted-foreground">Modifiez la recherche ou le filtre.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="bg-muted/40 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Candidat</th>
                  <th className="px-4 py-3">CV</th>
                  <th className="px-4 py-3">Pièce d'identité</th>
                  <th className="px-4 py-3">Pièces</th>
                  <th className="px-4 py-3">Alertes</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginated.map((file) => (
                  <tr key={file.id} className="cursor-pointer transition-colors hover:bg-muted/30" onClick={() => setSelectedId(file.id)} data-testid={`row-candidate-${file.id}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={file.avatarUrl ?? undefined} />
                          <AvatarFallback className="text-xs">{initialsOf(file.fullName)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{file.fullName}</p>
                          <p className="truncate text-xs text-muted-foreground">{file.title || file.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><StatusPill ok={file.hasCv} label="Fourni" /></td>
                    <td className="px-4 py-3"><StatusPill ok={file.hasValidId} label="Valide" /></td>
                    <td className="px-4 py-3 text-sm tabular-nums text-foreground">{file.documents.length}</td>
                    <td className="px-4 py-3">{file.alert === "none" ? <span className="text-xs text-muted-foreground">—</span> : <ExpiryBadge state={file.alert} />}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedId(file.id); }} data-testid={`button-view-${file.id}`}>
                        Gérer le dossier
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && filtered.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between border-t border-border/60 px-4 py-3">
            <p className="text-sm text-muted-foreground">{filtered.length} dossier{filtered.length > 1 ? "s" : ""}</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" disabled={page === 1} onClick={() => setCurrentPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm tabular-nums">{page} / {totalPages}</span>
              <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setCurrentPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </div>

      <CandidateFilePanel candidate={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
}
