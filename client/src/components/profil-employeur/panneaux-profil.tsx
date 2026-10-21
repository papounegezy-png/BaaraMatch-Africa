import type { ReactNode } from "react";
import { Link } from "wouter";
import { ChevronRight, ExternalLink, Globe, Mail, Phone } from "lucide-react";
import { CarteOffre } from "@/components/offres/carte-offre";
import { PaginationOffres } from "@/components/offres/resultats-offres";
import { boutonPlein } from "@/components/listes/etats-liste";
import { libelleLieuSimple } from "@/lib/employeurs";
import { libelleDate } from "@/lib/offres";
import { formatJobTitle } from "@/lib/format-job-title";
import type { Offre } from "@shared/offre";
import type { ProfilEmployeur } from "@/types/profil-employeur";
import { idOnglet, idPanneau, type Onglet } from "./onglets-profil";

const lienTexte = "rounded-sm font-texte text-[15px] font-semibold text-baara-bleu underline underline-offset-4 hover:text-baara-marine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu dark:text-baara-moyen";

/** Panneau d'un onglet : fond papier, filet au-dessus. */
export function Panneau({ onglet, children }: { onglet: Onglet; children: ReactNode }) {
  return (
    <div
      role="tabpanel"
      id={idPanneau(onglet)}
      aria-labelledby={idOnglet(onglet)}
      tabIndex={0}
      className="border-t-[1.5px] border-baara-trait bg-baara-papier px-4 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-baara-bleu dark:border-white/10 dark:bg-baara-profond min-[900px]:px-8 min-[900px]:py-7"
      data-testid={`panneau-${onglet}`}
    >
      {children}
    </div>
  );
}

/** Bloc blanc à titre h2, filet marine de 2 px au-dessus du titre. */
export function Bloc({ titre, children, testId }: { titre: string; children: ReactNode; testId?: string }) {
  return (
    <section className="rounded-[20px] border-[1.5px] border-baara-trait bg-white px-[26px] py-6 dark:border-white/10 dark:bg-white/[0.04]" data-testid={testId}>
      <h2 className="border-t-2 border-baara-marine pt-3 font-titre text-xl font-bold text-baara-marine dark:border-white/60 dark:text-white">{titre}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const texteVide = "font-texte text-[15px] text-baara-texte dark:text-slate-300";

/** Chiffres clés : jamais « N/A » ni « 0 ». */
export function ChiffresCles({ profil, nombreOffres }: { profil: ProfilEmployeur; nombreOffres: number | undefined }) {
  const ville = profil.ville ? libelleLieuSimple(profil.ville) : undefined;
  const lignes: [string, ReactNode | undefined, string][] = [
    ["Année de création", profil.anneeCreation, "Non renseignée"],
    ["Secteur", profil.secteur, "Non renseigné"],
    ["Ville", ville, "Non renseignée"],
    ["Offres publiées", nombreOffres === undefined ? undefined : nombreOffres > 0 ? nombreOffres : "Aucune", "Non renseigné"],
  ];
  return (
    <Bloc titre="Chiffres clés" testId="chiffres-cles">
      <dl className="grid grid-cols-2 gap-x-[18px] gap-y-[22px]">
        {lignes.map(([libelle, valeur, absent]) => (
          <div key={libelle} className="min-w-0">
            <dt className="font-texte text-sm text-baara-texte dark:text-slate-300">{libelle}</dt>
            <dd className={`mt-1 [overflow-wrap:anywhere] ${valeur === undefined ? "font-texte text-[15px] font-medium text-baara-texte dark:text-slate-300" : "font-titre text-lg font-bold tabular-nums text-baara-marine dark:text-white"}`}>
              {valeur ?? absent}
            </dd>
          </div>
        ))}
      </dl>
    </Bloc>
  );
}

/** Aucune offre : quoi faire, selon que l'on suit déjà l'employeur. */
export function AucuneOffreProfil({ suivi, avecLien = false }: { suivi: boolean; avecLien?: boolean }) {
  return (
    <div data-testid="aucune-offre-active">
      <p className="font-texte text-[15px] font-bold text-baara-marine dark:text-white">Aucune offre pour le moment</p>
      <p className={`mt-1 ${texteVide}`}>
        {suivi ? "Vous serez prévenu de sa prochaine offre." : "Suivez cet employeur pour être prévenu de sa prochaine offre."}
      </p>
      {avecLien && <Link href="/jobs" className={`mt-5 ${boutonPlein}`}>Voir toutes les offres</Link>}
    </div>
  );
}

const DESCRIPTION_VIDE = "Cet employeur n'a pas encore ajouté de description.";

export function PanneauApercu({ profil, offres, total, suivi, onVoirOffres, onLirePlus }: {
  profil: ProfilEmployeur;
  offres: Offre[] | undefined;
  total: number | undefined;
  suivi: boolean;
  onVoirOffres: () => void;
  onLirePlus: () => void;
}) {
  const longue = (profil.description?.length ?? 0) > 420;
  return (
    <Panneau onglet="apercu">
      {/* Colonne principale et colonne latérale de 300 px, empilées sous 900 px. */}
      <div className="flex flex-wrap gap-5">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-5">
          <Bloc titre="À propos" testId="bloc-a-propos">
            {profil.description ? (
              <>
                <p className={`whitespace-pre-line font-texte text-base leading-relaxed text-baara-marine dark:text-slate-100 ${longue ? "line-clamp-5" : ""}`}>{profil.description}</p>
                {longue && <button type="button" onClick={onLirePlus} className={`mt-3 inline-flex min-h-11 items-center ${lienTexte}`}>Lire la suite</button>}
              </>
            ) : (
              <p className={texteVide}>{DESCRIPTION_VIDE}</p>
            )}
          </Bloc>
          <Bloc titre="Offres actives" testId="bloc-offres-actives">
            {offres === undefined ? null : offres.length === 0 ? (
              <AucuneOffreProfil suivi={suivi} />
            ) : (
              <>
                <ul className="divide-y divide-baara-trait dark:divide-white/10">
                  {offres.map((o) => (
                    <li key={o.id}>
                      <Link href={`/jobs/${o.id}`} className="group flex min-h-14 items-center gap-3 rounded-lg py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu">
                        <span className="min-w-0 flex-1">
                          <span className="block font-titre text-base font-bold text-baara-marine group-hover:underline dark:text-white">{formatJobTitle(o.titre)}</span>
                          <span className="mt-0.5 block font-texte text-sm text-baara-texte dark:text-slate-300">
                            {[o.contrat, o.ville ? libelleLieuSimple(o.ville) : null, libelleDate(o.publieLe)].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 flex-none text-baara-marine dark:text-white" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
                {(total ?? 0) > offres.length && (
                  <button type="button" onClick={onVoirOffres} className={`mt-3 inline-flex min-h-11 items-center ${lienTexte}`}>
                    Voir les {total} offres
                  </button>
                )}
              </>
            )}
          </Bloc>
        </div>
        <div className="min-w-0 flex-[1_1_300px]">
          <ChiffresCles profil={profil} nombreOffres={total} />
        </div>
      </div>
    </Panneau>
  );
}

export function PanneauOffres({ offres, page, nbPages, onPage, suivi, enregistrees, peutEnregistrer, onEnregistrer }: {
  offres: Offre[] | undefined;
  page: number;
  nbPages: number;
  onPage: (p: number) => void;
  suivi: boolean;
  enregistrees: Set<string>;
  peutEnregistrer: boolean;
  onEnregistrer: (id: string) => void;
}) {
  return (
    <Panneau onglet="offres">
      {offres === undefined ? null : offres.length === 0 ? (
        <div className="rounded-[20px] border-[1.5px] border-baara-trait bg-white px-[26px] py-6 dark:border-white/10 dark:bg-white/[0.04]">
          <AucuneOffreProfil suivi={suivi} avecLien />
        </div>
      ) : (
        <>
          <ul className="space-y-4" data-testid="liste-offres-employeur">
            {offres.map((o) => (
              <li key={o.id}>
                <CarteOffre offre={o} enregistree={enregistrees.has(o.id)} onEnregistrer={onEnregistrer} afficherEnregistrer={peutEnregistrer} />
              </li>
            ))}
          </ul>
          <PaginationOffres page={page} nbPages={nbPages} onPage={onPage} />
        </>
      )}
    </Panneau>
  );
}

export function PanneauAPropos({ profil }: { profil: ProfilEmployeur }) {
  const coordonnees = [
    profil.siteWeb && { icone: Globe, contenu: (
      <a href={profil.siteWeb.startsWith("http") ? profil.siteWeb : `https://${profil.siteWeb}`} target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-11 items-center gap-1.5 ${lienTexte}`}>
        {profil.siteWeb.replace(/^https?:\/\//, "")}
        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="sr-only"> (nouvel onglet)</span>
      </a>
    ), libelle: "Site web" },
    profil.email && { icone: Mail, contenu: <a href={`mailto:${profil.email}`} className={`inline-flex min-h-11 items-center ${lienTexte}`}>{profil.email}</a>, libelle: "E-mail" },
    profil.telephone && { icone: Phone, contenu: <a href={`tel:${profil.telephone.replace(/\s+/g, "")}`} className={`inline-flex min-h-11 items-center ${lienTexte}`}>{profil.telephone}</a>, libelle: "Téléphone" },
  ].filter(Boolean) as { icone: typeof Globe; contenu: ReactNode; libelle: string }[];
  return (
    <Panneau onglet="a-propos">
      <div className="flex flex-col gap-5">
        <Bloc titre="À propos" testId="description-complete">
          <p className={profil.description ? "whitespace-pre-line font-texte text-base leading-relaxed text-baara-marine dark:text-slate-100" : texteVide}>
            {profil.description ?? DESCRIPTION_VIDE}
          </p>
        </Bloc>
        {coordonnees.length > 0 && (
          <Bloc titre="Coordonnées" testId="coordonnees">
            <dl className="space-y-1">
              {coordonnees.map(({ icone: Icone, contenu, libelle }) => (
                <div key={libelle} className="flex items-center gap-3">
                  <dt className="flex items-center gap-2 font-texte text-sm text-baara-texte dark:text-slate-300">
                    <Icone className="h-4 w-4 text-baara-bleu dark:text-baara-moyen" aria-hidden="true" />
                    <span className="sr-only">{libelle}</span>
                  </dt>
                  <dd className="min-w-0 [overflow-wrap:anywhere]">{contenu}</dd>
                </div>
              ))}
            </dl>
          </Bloc>
        )}
      </div>
    </Panneau>
  );
}

/** Avis : contenu au prompt 6 (fonctionnalité à créer). */
export function PanneauAvis() {
  return (
    <Panneau onglet="avis">
      <div className="rounded-[20px] border-[1.5px] border-baara-trait bg-white px-[26px] py-6 dark:border-white/10 dark:bg-white/[0.04]" data-testid="avis-vide">
        <p className="font-texte text-[15px] font-bold text-baara-marine dark:text-white">Pas encore d'avis</p>
        <p className={`mt-1 ${texteVide}`}>Les avis de candidats apparaîtront ici.</p>
      </div>
    </Panneau>
  );
}
