import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Search, CheckCircle2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User, CandidateProfile } from "@shared/schema";

type HiredCandidate = { candidateId: string; candidateName: string; jobTitle: string };
type SearchableCandidate = User & { profile?: CandidateProfile };

interface CreateFieldMissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateFieldMissionModal({ open, onOpenChange }: CreateFieldMissionModalProps) {
  const { toast } = useToast();
  const [candidateMode, setCandidateMode] = useState<"hired" | "search">("hired");
  const [selectedCandidate, setSelectedCandidate] = useState<{ id: string; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [clientName, setClientName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [plannedEndDate, setPlannedEndDate] = useState("");
  const [dailyRateFcfa, setDailyRateFcfa] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const hiredCandidatesQuery = useQuery<HiredCandidate[]>({
    queryKey: ["/api/agency/field-missions/hired-candidates"],
    enabled: open && candidateMode === "hired",
  });

  const allCandidatesQuery = useQuery<SearchableCandidate[]>({
    queryKey: ["/api/candidates"],
    enabled: open && candidateMode === "search",
  });

  const filteredCandidates = (allCandidatesQuery.data ?? []).filter((c) =>
    searchQuery.trim().length === 0 || c.fullName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const resetForm = () => {
    setSelectedCandidate(null);
    setCandidateMode("hired");
    setSearchQuery("");
    setClientName("");
    setJobTitle("");
    setLocation("");
    setStartDate("");
    setPlannedEndDate("");
    setDailyRateFcfa("");
    setFormError(null);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCandidate) throw new Error("Sélectionnez un candidat");
      await apiRequest("POST", "/api/agency/field-missions", {
        candidateId: selectedCandidate.id,
        clientName: clientName.trim(),
        jobTitle: jobTitle.trim(),
        location: location.trim(),
        startDate: new Date(startDate).toISOString(),
        plannedEndDate: new Date(plannedEndDate).toISOString(),
        dailyRateFcfa: Number(dailyRateFcfa),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agency/field-missions"] });
      toast({ title: "Mission créée", description: `Mission créée pour ${selectedCandidate?.name}.` });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message || "Impossible de créer la mission.", variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    setFormError(null);
    if (!selectedCandidate) {
      setFormError("Sélectionnez un candidat pour cette mission.");
      return;
    }
    if (!clientName.trim() || !jobTitle.trim() || !location.trim() || !startDate || !plannedEndDate || !dailyRateFcfa) {
      setFormError("Tous les champs sont obligatoires.");
      return;
    }
    if (new Date(plannedEndDate) <= new Date(startDate)) {
      setFormError("La date de fin prévue doit être après la date de début.");
      return;
    }
    if (Number(dailyRateFcfa) <= 0) {
      setFormError("Le tarif journalier doit être positif.");
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) resetForm(); onOpenChange(next); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" data-testid="dialog-create-field-mission">
        <DialogHeader>
          <DialogTitle>Nouvelle mission</DialogTitle>
          <DialogDescription>Créez une mission terrain pour un candidat déjà placé.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Candidat</Label>
            <RadioGroup value={candidateMode} onValueChange={(v) => { setCandidateMode(v as "hired" | "search"); setSelectedCandidate(null); }} className="flex gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="hired" id="mode-hired" data-testid="radio-mode-hired" />
                <Label htmlFor="mode-hired" className="font-normal cursor-pointer">Candidat embauché via une offre</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="search" id="mode-search" data-testid="radio-mode-search" />
                <Label htmlFor="mode-search" className="font-normal cursor-pointer">Recherche libre</Label>
              </div>
            </RadioGroup>

            {candidateMode === "hired" ? (
              <div className="border rounded-md max-h-40 overflow-y-auto">
                {hiredCandidatesQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground p-3">Chargement...</p>
                ) : (hiredCandidatesQuery.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground p-3">Aucun candidat embauché pour l'instant.</p>
                ) : (
                  hiredCandidatesQuery.data!.map((c) => (
                    <button
                      key={c.candidateId}
                      type="button"
                      className={`w-full text-left px-3 py-2 text-sm hover-elevate flex items-center justify-between gap-2 ${selectedCandidate?.id === c.candidateId ? "bg-primary/10" : ""}`}
                      onClick={() => setSelectedCandidate({ id: c.candidateId, name: c.candidateName })}
                      data-testid={`option-hired-candidate-${c.candidateId}`}
                    >
                      <span>
                        <span className="font-medium">{c.candidateName}</span>
                        <span className="text-muted-foreground"> — embauché pour "{c.jobTitle}"</span>
                      </span>
                      {selectedCandidate?.id === c.candidateId && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                    </button>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un candidat par nom..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-search-candidate"
                  />
                </div>
                <div className="border rounded-md max-h-40 overflow-y-auto">
                  {allCandidatesQuery.isLoading ? (
                    <p className="text-sm text-muted-foreground p-3">Chargement...</p>
                  ) : filteredCandidates.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-3">Aucun candidat trouvé.</p>
                  ) : (
                    filteredCandidates.slice(0, 30).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className={`w-full text-left px-3 py-2 text-sm hover-elevate flex items-center justify-between gap-2 ${selectedCandidate?.id === c.id ? "bg-primary/10" : ""}`}
                        onClick={() => setSelectedCandidate({ id: c.id, name: c.fullName })}
                        data-testid={`option-search-candidate-${c.id}`}
                      >
                        <span className="font-medium">{c.fullName}</span>
                        {selectedCandidate?.id === c.id && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {selectedCandidate && (
              <p className="text-xs text-muted-foreground" data-testid="text-selected-candidate">
                Candidat sélectionné : <span className="font-medium text-foreground">{selectedCandidate.name}</span>
                {" "}({candidateMode === "hired" ? "via une offre" : "recherche libre"})
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="mission-client">Client</Label>
              <Input id="mission-client" autoFocus value={clientName} onChange={(e) => setClientName(e.target.value)} data-testid="input-mission-client" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="mission-job-title">Intitulé du poste</Label>
              <Input id="mission-job-title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} data-testid="input-mission-job-title" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="mission-location">Lieu de mission</Label>
              <Input id="mission-location" value={location} onChange={(e) => setLocation(e.target.value)} data-testid="input-mission-location" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mission-start">Date de début</Label>
              <Input id="mission-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} data-testid="input-mission-start-date" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mission-end">Fin prévue</Label>
              <Input id="mission-end" type="date" value={plannedEndDate} onChange={(e) => setPlannedEndDate(e.target.value)} data-testid="input-mission-planned-end-date" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="mission-rate">Tarif journalier (FCFA)</Label>
              <Input id="mission-rate" type="number" min={1} value={dailyRateFcfa} onChange={(e) => setDailyRateFcfa(e.target.value)} data-testid="input-mission-rate" />
            </div>
          </div>

          {formError && (
            <p className="text-sm text-destructive" role="alert" data-testid="text-mission-form-error">
              {formError}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} data-testid="button-cancel-create-mission">
            Annuler
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={createMutation.isPending} data-testid="button-submit-create-mission">
            {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Créer la mission
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
