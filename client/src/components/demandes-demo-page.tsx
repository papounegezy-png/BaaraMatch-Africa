import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CalendarCheck, Mail, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { DemoRequest } from "@shared/schema";

type Filtre = "a-traiter" | "traitees" | "toutes";

const FILTRES: { valeur: Filtre; libelle: string }[] = [
  { valeur: "a-traiter", libelle: "À traiter" },
  { valeur: "traitees", libelle: "Traitées" },
  { valeur: "toutes", libelle: "Toutes" },
];

const TYPES: Record<string, string> = { entreprise: "Entreprise", agence: "Agence", company: "Entreprise", agency: "Agence" };

const date = (v: string | Date | null) => (v ? new Date(v).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "");

/**
 * Demandes de démo reçues depuis la page Services (formulaire « Demander une
 * démo »). L'équipe recontacte le demandeur hors de l'application, puis
 * marque la demande comme traitée.
 */
export function DemandesDemoPage() {
  const { toast } = useToast();
  const [filtre, setFiltre] = useState<Filtre>("a-traiter");
  const { data: demandes = [], isLoading, isError, refetch } = useQuery<DemoRequest[]>({ queryKey: ["/api/admin/demo-requests"] });
  const traiter = useMutation({
    mutationFn: async ({ id, traitee }: { id: string; traitee: boolean }) => (await apiRequest("PATCH", `/api/admin/demo-requests/${id}`, { traitee })).json(),
    onSuccess: (_d, { traitee }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/demo-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/logs"] });
      toast({ title: traitee ? "Demande marquée comme traitée" : "Demande rouverte" });
    },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const aTraiter = demandes.filter((d) => !d.treatedAt).length;
  const visibles = demandes.filter((d) => (filtre === "toutes" ? true : filtre === "traitees" ? !!d.treatedAt : !d.treatedAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="titre-demandes-demo">Demandes de démo</h1>
        <p className="text-muted-foreground">
          Reçues depuis la page Services. Recontactez le demandeur par e-mail ou par téléphone, puis marquez la demande comme traitée.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrer les demandes">
        {FILTRES.map((f) => (
          <Button key={f.valeur} size="sm" variant={filtre === f.valeur ? "default" : "outline"} aria-pressed={filtre === f.valeur} onClick={() => setFiltre(f.valeur)} data-testid={`filtre-demo-${f.valeur}`}>
            {f.libelle}
            {f.valeur === "a-traiter" && aTraiter > 0 && <Badge variant="secondary" className="ml-2">{aTraiter}</Badge>}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}</div>
      ) : isError ? (
        <Card><CardContent className="py-10 text-center space-y-3">
          <p className="font-medium">Les demandes n'ont pas pu être chargées.</p>
          <Button variant="outline" onClick={() => refetch()}>Réessayer</Button>
        </CardContent></Card>
      ) : visibles.length === 0 ? (
        <Card><CardContent className="py-14 text-center space-y-3">
          <CalendarCheck className="h-14 w-14 mx-auto text-muted-foreground/30" aria-hidden="true" />
          <p className="font-medium text-lg">{filtre === "a-traiter" ? "Aucune demande à traiter" : "Aucune demande"}</p>
          <p className="text-sm text-muted-foreground">Les demandes envoyées depuis la page Services apparaîtront ici.</p>
        </CardContent></Card>
      ) : (
        <ul className="space-y-3" data-testid="liste-demandes-demo">
          {visibles.map((d) => (
            <li key={d.id}>
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{d.company}</p>
                      <p className="text-sm text-muted-foreground">
                        {d.fullName}{d.profileType && TYPES[d.profileType] ? ` · ${TYPES[d.profileType]}` : ""} · reçue le {date(d.createdAt)}
                      </p>
                    </div>
                    {d.treatedAt
                      ? <Badge variant="secondary">Traitée le {date(d.treatedAt)}</Badge>
                      : <Badge>À traiter</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                    {d.email && <span className="inline-flex items-center gap-1.5"><Mail className="h-4 w-4 text-muted-foreground" aria-hidden="true" /><a href={`mailto:${d.email}`} className="underline underline-offset-2">{d.email}</a></span>}
                    {d.phone && <span className="inline-flex items-center gap-1.5"><Phone className="h-4 w-4 text-muted-foreground" aria-hidden="true" /><a href={`tel:${d.phone.replace(/\s+/g, "")}`} className="underline underline-offset-2">{d.phone}</a></span>}
                  </div>
                  {d.message && <p className="text-sm whitespace-pre-line rounded-md bg-muted/50 p-3">{d.message}</p>}
                  <Button
                    size="sm"
                    variant={d.treatedAt ? "outline" : "default"}
                    disabled={traiter.isPending}
                    onClick={() => traiter.mutate({ id: d.id, traitee: !d.treatedAt })}
                    data-testid={`traiter-demo-${d.id}`}
                  >
                    {d.treatedAt ? "Rouvrir" : "Marquer comme traitée"}
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
