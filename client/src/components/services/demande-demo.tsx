import { useId, useRef, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { apiRequest, type ApiError } from "@/lib/queryClient";
import { DECALAGE_ANCRES } from "@/components/services/selecteur-profil";
import { erreursDemandeDemo, messageEchecDemo, type DemandeDemo } from "@shared/demande-demo";

type Champ = "fullName" | "company" | "contact" | "profileType";
type Valeurs = Pick<DemandeDemo, Champ>;

const VIDE: Valeurs = { fullName: "", company: "", contact: "", profileType: "entreprise" };
const ORDRE_CHAMPS: Champ[] = ["fullName", "company", "contact", "profileType"];

const champ =
  "h-12 w-full rounded-xl border border-baara-marine/35 bg-white px-4 font-texte text-[15px] text-baara-marine placeholder:text-baara-texte/70 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-1 aria-[invalid=true]:border-red-600 " +
  "dark:border-white/30 dark:bg-white/5 dark:text-white dark:aria-[invalid=true]:border-red-400";

/**
 * Section « Demander une démo » de la page Services, branchée sur
 * POST /api/demo-requests. Quatre champs ; validation partagée avec le
 * serveur (shared/demande-demo.ts) ; champ piège invisible contre les robots.
 */
export function DemandeDemo() {
  const id = useId();
  const [valeurs, setValeurs] = useState<Valeurs>(VIDE);
  const [erreurs, setErreurs] = useState<Partial<Record<Champ, string>>>({});
  const [etat, setEtat] = useState<"repos" | "envoi" | "succes" | "echec">("repos");
  const [messageEchec, setMessageEchec] = useState("");
  const piege = useRef<HTMLInputElement>(null);
  const refs = useRef<Partial<Record<Champ, HTMLInputElement | HTMLSelectElement | null>>>({});

  const modifier = (c: Champ, v: string) => {
    setValeurs((actuel) => ({ ...actuel, [c]: v }));
    if (erreurs[c]) setErreurs((actuel) => ({ ...actuel, [c]: undefined }));
    if (etat === "succes") setEtat("repos");
  };

  const envoyer = async (e: FormEvent) => {
    e.preventDefault();
    const trouvees = erreursDemandeDemo(valeurs);
    setErreurs(trouvees);
    const premier = ORDRE_CHAMPS.find((c) => trouvees[c]);
    if (premier) {
      refs.current[premier]?.focus();
      return;
    }
    setEtat("envoi");
    try {
      await apiRequest("POST", "/api/demo-requests", { ...valeurs, siteWeb: piege.current?.value ?? "" });
      setValeurs(VIDE);
      setEtat("succes");
    } catch (erreur) {
      setMessageEchec(messageEchecDemo((erreur as Partial<ApiError>)?.status));
      setEtat("echec");
    }
  };

  const proprietes = (c: Champ) => ({
    id: `${id}-${c}`,
    name: c,
    ref: (el: HTMLInputElement | HTMLSelectElement | null) => { refs.current[c] = el; },
    "aria-invalid": !!erreurs[c],
    "aria-describedby": erreurs[c] ? `${id}-${c}-erreur` : undefined,
  });

  const erreurDe = (c: Champ) =>
    erreurs[c] && <p id={`${id}-${c}-erreur`} className="mt-1.5 font-texte text-sm text-red-700 dark:text-red-300">{erreurs[c]}</p>;

  const libelle = "mb-1.5 block font-texte text-sm font-semibold text-baara-marine dark:text-white";

  return (
    <section
      id="demo"
      aria-labelledby="titre-demo"
      className="bg-baara-clair py-16 dark:bg-baara-marine/40 min-[900px]:py-20"
      style={{ scrollMarginTop: DECALAGE_ANCRES }}
      data-testid="demande-demo"
    >
      <div className="container mx-auto grid gap-8 px-4 min-[1000px]:grid-cols-[0.8fr_1.2fr] min-[1000px]:items-start">
        <div>
          <h2 id="titre-demo" className="font-titre text-[clamp(30px,3.4vw,42px)] font-extrabold leading-tight tracking-tight text-baara-marine dark:text-white">
            Demander une démo
          </h2>
          <p className="mt-3 font-texte text-lg text-baara-texte dark:text-slate-300">On vous rappelle pour fixer un créneau.</p>
        </div>

        <form
          noValidate
          onSubmit={envoyer}
          className="grid gap-5 rounded-[20px] border border-baara-trait bg-white p-7 dark:border-white/10 dark:bg-white/[0.04] min-[900px]:grid-cols-2"
          data-testid="formulaire-demo"
        >
          <div>
            <label htmlFor={`${id}-fullName`} className={libelle}>Nom et prénom</label>
            <input {...proprietes("fullName")} className={champ} autoComplete="name" required value={valeurs.fullName} onChange={(e) => modifier("fullName", e.target.value)} />
            {erreurDe("fullName")}
          </div>
          <div>
            <label htmlFor={`${id}-company`} className={libelle}>Entreprise ou agence</label>
            <input {...proprietes("company")} className={champ} autoComplete="organization" required value={valeurs.company} onChange={(e) => modifier("company", e.target.value)} />
            {erreurDe("company")}
          </div>
          <div>
            <label htmlFor={`${id}-contact`} className={libelle}>Téléphone ou e-mail</label>
            <input {...proprietes("contact")} className={champ} autoComplete="tel" required value={valeurs.contact} onChange={(e) => modifier("contact", e.target.value)} />
            {erreurDe("contact")}
          </div>
          <div>
            <label htmlFor={`${id}-profileType`} className={libelle}>Vous êtes</label>
            <select {...proprietes("profileType")} className={champ} value={valeurs.profileType} onChange={(e) => modifier("profileType", e.target.value)}>
              <option value="entreprise">Une entreprise</option>
              <option value="agence">Une agence de placement</option>
            </select>
            {erreurDe("profileType")}
          </div>

          {/* Champ piège : invisible et hors tabulation ; un robot le remplit. */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label htmlFor={`${id}-siteWeb`}>Site web</label>
            <input id={`${id}-siteWeb`} ref={piege} name="siteWeb" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
          </div>

          <div className="space-y-3 min-[900px]:col-span-2">
            {etat === "succes" && (
              <p role="status" className="rounded-xl bg-baara-or-pale px-4 py-3 font-texte font-semibold text-baara-or-fonce" data-testid="demo-succes">
                Demande enregistrée. On vous recontacte.
              </p>
            )}
            {etat === "echec" && (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-texte text-red-800 dark:border-red-400/40 dark:bg-red-950/40 dark:text-red-200" data-testid="demo-echec">
                {messageEchec} Vos informations sont conservées.
              </p>
            )}
            <button
              type="submit"
              disabled={etat === "envoi"}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-baara-marine px-7 font-texte text-[15px] font-semibold text-white hover:bg-baara-profond disabled:cursor-wait disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-baara-bleu focus-visible:ring-offset-2 dark:bg-white dark:text-baara-marine min-[900px]:w-auto"
              data-testid="bouton-envoyer-demo"
            >
              {etat === "envoi" ? "Envoi en cours…" : etat === "echec" ? "Réessayer" : "Envoyer la demande"}
            </button>
            <p className="font-texte text-sm text-baara-texte dark:text-slate-400">
              Vos coordonnées servent uniquement à vous recontacter.{" "}
              <Link href="/privacy" className="underline underline-offset-2 hover:text-baara-marine dark:hover:text-white">Politique de confidentialité</Link>
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}
