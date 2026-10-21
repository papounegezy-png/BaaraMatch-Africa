import { useState } from "react";
import { Link } from "wouter";
import { ChevronDown, ChevronRight, Network, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOperationalModuleState } from "@/hooks/use-operational-module-state";

// Organigramme de l'entreprise, construit à partir de ses vraies données :
// l'annuaire des employés (département, poste, rôle) et les départements
// (responsable). Plus d'arbre fictif codé en dur.

type Employe = { id: number; name: string; department: string; position: string; role: "admin" | "manager" | "employee"; status: string };
type Departement = { id: number; name: string; manager: string; status: "active" | "inactive" };

type Groupe = { nom: string; responsable?: string; membres: Employe[] };

const SANS_DEPARTEMENT = "Sans département";
const ORDRE_ROLE: Record<Employe["role"], number> = { admin: 0, manager: 1, employee: 2 };
const LIBELLE_ROLE: Record<Employe["role"], string> = { admin: "Direction", manager: "Responsable", employee: "" };

const cle = (v: string) => v.trim().toLocaleLowerCase("fr");

/** Employés regroupés par département ; responsables d'abord, puis par nom. */
export function grouperParDepartement(employes: Employe[], departements: Departement[]): Groupe[] {
  const groupes = new Map<string, Groupe>();
  for (const d of departements.filter((d) => d.status !== "inactive" && d.name.trim())) {
    groupes.set(cle(d.name), { nom: d.name.trim(), responsable: d.manager?.trim() || undefined, membres: [] });
  }
  for (const e of employes.filter((e) => e.status !== "inactive" && e.name.trim())) {
    const nom = e.department?.trim() || SANS_DEPARTEMENT;
    const g = groupes.get(cle(nom)) ?? { nom, membres: [] };
    g.membres.push(e);
    groupes.set(cle(nom), g);
  }
  return Array.from(groupes.values())
    .map((g) => ({
      ...g,
      membres: [...g.membres].sort((a, b) => {
        const chef = (x: Employe) => (g.responsable && cle(x.name) === cle(g.responsable) ? -1 : ORDRE_ROLE[x.role] ?? 2);
        return chef(a) - chef(b) || a.name.localeCompare(b.name, "fr");
      }),
    }))
    .sort((a, b) => (a.nom === SANS_DEPARTEMENT ? 1 : b.nom === SANS_DEPARTEMENT ? -1 : a.nom.localeCompare(b.nom, "fr")));
}

const initiales = (nom: string) => nom.split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]).join("").toLocaleUpperCase("fr");

function CarteDepartement({ groupe }: { groupe: Groupe }) {
  const [ouvert, setOuvert] = useState(true);
  const Icone = ouvert ? ChevronDown : ChevronRight;
  return (
    <Card data-testid={`organigramme-${groupe.nom}`}>
      <CardHeader className="pb-3">
        <button type="button" onClick={() => setOuvert((o) => !o)} aria-expanded={ouvert} className="flex w-full items-center justify-between gap-3 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span>
            <CardTitle className="text-base">{groupe.nom}</CardTitle>
            <span className="mt-1 block text-sm text-muted-foreground">
              {groupe.responsable ? `Responsable : ${groupe.responsable}` : "Responsable non renseigné"} · {groupe.membres.length} {groupe.membres.length > 1 ? "personnes" : "personne"}
            </span>
          </span>
          <Icone className="h-4 w-4 flex-none text-muted-foreground" aria-hidden="true" />
        </button>
      </CardHeader>
      {ouvert && (
        <CardContent>
          {groupe.membres.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun employé rattaché à ce département dans l'annuaire.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {groupe.membres.map((e) => {
                const role = groupe.responsable && cle(e.name) === cle(groupe.responsable) ? "Responsable" : LIBELLE_ROLE[e.role];
                return (
                  <li key={e.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <span aria-hidden="true" className="grid h-9 w-9 flex-none place-items-center rounded-full bg-muted text-sm font-semibold">{initiales(e.name)}</span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{e.name}</span>
                      <span className="block truncate text-sm text-muted-foreground">{e.position || "Poste non renseigné"}</span>
                    </span>
                    {role && <Badge variant="secondary" className="ml-auto flex-none">{role}</Badge>}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export function OrgChart() {
  const employes = useOperationalModuleState("employee", { employees: [] as Employe[] });
  const departements = useOperationalModuleState("departments", { departments: [] as Departement[] });
  const chargement = employes.isLoadingModuleState || departements.isLoadingModuleState;
  const groupes = grouperParDepartement(employes.moduleState.employees ?? [], departements.moduleState.departments ?? []);
  const effectif = groupes.reduce((s, g) => s + g.membres.length, 0);
  const nbDepartements = groupes.filter((g) => g.nom !== SANS_DEPARTEMENT).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="titre-organigramme">Organigramme</h1>
        <p className="text-muted-foreground">Construit à partir de votre annuaire des employés et de vos départements.</p>
      </div>
      {chargement ? (
        <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}</div>
      ) : effectif === 0 && groupes.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center space-y-3" data-testid="organigramme-vide">
            <Network className="h-14 w-14 mx-auto text-muted-foreground/30" aria-hidden="true" />
            <p className="font-medium text-lg">Votre organigramme est vide</p>
            <p className="text-sm text-muted-foreground">Ajoutez vos départements et vos employés : l'organigramme se construit à partir d'eux.</p>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <Button asChild><Link href="/company/employees">Ajouter des employés</Link></Button>
              <Button asChild variant="outline"><Link href="/company/departments">Créer des départements</Link></Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" aria-hidden="true" />
            {effectif} {effectif > 1 ? "personnes" : "personne"} · {nbDepartements} {nbDepartements > 1 ? "départements" : "département"}
          </p>
          <div className="space-y-4">
            {groupes.map((g) => <CarteDepartement key={g.nom} groupe={g} />)}
          </div>
        </>
      )}
    </div>
  );
}
