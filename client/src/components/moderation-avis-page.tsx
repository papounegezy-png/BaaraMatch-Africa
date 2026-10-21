import { useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MessageSquareQuote, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AvisAdmin = { id: string; employeurId: string; employeurNom: string | null; employeurType: string; note: number; commentaire: string | null; masque: boolean; publieLe: string };
type Filtre = "publies" | "masques" | "tous";

const FILTRES: { valeur: Filtre; libelle: string }[] = [
  { valeur: "publies", libelle: "Publiés" },
  { valeur: "masques", libelle: "Masqués" },
  { valeur: "tous", libelle: "Tous" },
];

/**
 * Modération des avis de candidats (profils employeur). Un avis masqué
 * disparaît du profil et de la note moyenne ; il peut être rétabli. Le nom
 * de l'auteur n'est pas montré : la modération porte sur le contenu.
 */
export function ModerationAvisPage() {
  const { toast } = useToast();
  const [filtre, setFiltre] = useState<Filtre>("publies");
  const { data: avis = [], isLoading, isError, refetch } = useQuery<AvisAdmin[]>({ queryKey: ["/api/admin/avis"] });
  const moderer = useMutation({
    mutationFn: async ({ id, masque }: { id: string; masque: boolean }) => (await apiRequest("PATCH", `/api/admin/avis/${id}`, { masque })).json(),
    onSuccess: (_d, { masque }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/avis"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/logs"] });
      toast({ title: masque ? "Avis masqué" : "Avis rétabli" });
    },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });
  const visibles = avis.filter((a) => (filtre === "tous" ? true : filtre === "masques" ? a.masque : !a.masque));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="titre-moderation-avis">Avis de candidats</h1>
        <p className="text-muted-foreground">
          Masquez un avis injurieux, hors sujet ou qui donne des informations personnelles. Il disparaît du profil et de la note moyenne, et peut être rétabli.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer les avis">
        {FILTRES.map((f) => (
          <Button key={f.valeur} size="sm" variant={filtre === f.valeur ? "default" : "outline"} aria-pressed={filtre === f.valeur} onClick={() => setFiltre(f.valeur)} data-testid={`filtre-avis-${f.valeur}`}>
            {f.libelle}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
      ) : isError ? (
        <Card><CardContent className="py-10 text-center space-y-3">
          <p className="font-medium">Les avis n'ont pas pu être chargés.</p>
          <Button variant="outline" onClick={() => refetch()}>Réessayer</Button>
        </CardContent></Card>
      ) : visibles.length === 0 ? (
        <Card><CardContent className="py-14 text-center space-y-3">
          <MessageSquareQuote className="h-14 w-14 mx-auto text-muted-foreground/30" aria-hidden="true" />
          <p className="font-medium text-lg">{filtre === "masques" ? "Aucun avis masqué" : "Aucun avis"}</p>
          <p className="text-sm text-muted-foreground">Les avis laissés par les candidats sur les profils employeur apparaîtront ici.</p>
        </CardContent></Card>
      ) : (
        <ul className="space-y-3" data-testid="liste-avis-admin">
          {visibles.map((a) => (
            <li key={a.id}>
              <Card className={a.masque ? "opacity-75" : undefined}>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link href={`/${a.employeurType === "agency" ? "agencies" : "companies"}/${a.employeurId}?onglet=avis`} className="font-semibold underline-offset-2 hover:underline">
                        {a.employeurNom ?? "Employeur"}
                      </Link>
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Star className="h-4 w-4 fill-current" aria-hidden="true" />
                        <span>{a.note}/5</span>
                        <span>· {new Date(a.publieLe).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
                      </p>
                    </div>
                    {a.masque ? <Badge variant="secondary">Masqué</Badge> : <Badge>Publié</Badge>}
                  </div>
                  {a.commentaire
                    ? <p className="text-sm whitespace-pre-line rounded-md bg-muted/50 p-3">{a.commentaire}</p>
                    : <p className="text-sm text-muted-foreground">Note seule, sans commentaire.</p>}
                  <Button size="sm" variant={a.masque ? "outline" : "destructive"} disabled={moderer.isPending} onClick={() => moderer.mutate({ id: a.id, masque: !a.masque })} data-testid={`moderer-avis-${a.id}`}>
                    {a.masque ? "Rétablir" : "Masquer"}
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
