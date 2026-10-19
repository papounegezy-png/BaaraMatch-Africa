import { EnteteAccueil } from "@/components/home/entete-accueil";
import { BandeauServices } from "@/components/services/bandeau-services";
import { SelecteurProfil, DECALAGE_ANCRES } from "@/components/services/selecteur-profil";
import { PanneauProfil } from "@/components/services/panneau-profil";
import { OffreLancement } from "@/components/services/offre-lancement";
import { Faq } from "@/components/services/faq";
import { DemandeDemo } from "@/components/services/demande-demo";
import { ordreProfils } from "@/donnees/services";
import { useProfilServices } from "@/hooks/use-profil-services";
import { useMetaPage } from "@/hooks/use-meta-page";

// Ordre de la page : en-tête, bandeau, sélecteur, panneau du profil, offre de
// lancement, questions fréquentes, demande de démo ; le pied de page
// (PiedAccueil) vient de PublicLayout, comme sur l'accueil.
export default function ServicesPage() {
  const { profil, tick, choisirProfil } = useProfilServices();
  useMetaPage({
    titre: "Services — BaaraMatch",
    description: "Ce que BaaraMatch apporte aux candidats, aux entreprises et aux agences de placement, avec 2 mois gratuits au lancement.",
  });
  return (
    <div className="min-h-screen bg-baara-papier dark:bg-baara-profond">
      <EnteteAccueil />
      <BandeauServices />
      <SelecteurProfil profil={profil} onChoisir={choisirProfil} />
      {/* Ancres des profils, juste avant le panneau, décalées sous l'en-tête et
          le sélecteur collants. */}
      {ordreProfils.map((p) => (
        <span key={p} id={p} aria-hidden="true" className="block h-0" style={{ scrollMarginTop: DECALAGE_ANCRES }} />
      ))}
      <PanneauProfil profil={profil} tick={tick} />
      <OffreLancement />
      <Faq />
      <DemandeDemo />
    </div>
  );
}
