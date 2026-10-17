import { ShieldCheck, Users, Gift } from "lucide-react";

// Replaces the old fabricated stats + fake testimonials sections entirely —
// with only a handful of pilot/test accounts active, showing "12 000+
// utilisateurs" or invented quotes would be dishonest. This tells the real
// story instead: an early pilot, not a mature platform.
export function PilotProgramSection() {
  return (
    <section className="relative overflow-hidden bg-primary-dark py-16 md:py-24" aria-labelledby="pilot-program-title">
      <div className="absolute w-[420px] h-[420px] rounded-full bg-[#16386F] -top-40 -left-20 pointer-events-none" />
      <div className="absolute w-40 h-40 rounded-full border-2 border-gold/35 -bottom-10 right-10 pointer-events-none" />

      <div className="container relative mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center space-y-4 mb-10 md:mb-14">
          <span className="inline-flex items-center rounded-full border border-gold bg-baara-or px-4 py-1.5 text-xs sm:text-sm font-semibold text-baara-marine">
            Programme pilote
          </span>
          <h2 id="pilot-program-title" className="text-3xl md:text-4xl font-bold text-white">
            Nous lançons avec un premier cercle d'agences
          </h2>
          <p className="text-white/[.72] leading-relaxed">
            BaaraMatch en est à ses débuts : chaque offre est validée manuellement, chaque agence pilote est accompagnée directement,
            et le produit évolue avec les retours du terrain plutôt qu'à l'aveugle.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 max-w-3xl mx-auto">
          <div className="rounded-2xl bg-white/10 border border-white/15 p-5 text-center space-y-2">
            <ShieldCheck className="h-6 w-6 text-gold mx-auto" />
            <p className="text-sm font-medium text-white">Offres vérifiées</p>
          </div>
          <div className="rounded-2xl bg-white/10 border border-white/15 p-5 text-center space-y-2">
            <Users className="h-6 w-6 text-gold mx-auto" />
            <p className="text-sm font-medium text-white">Accompagnement direct</p>
          </div>
          <div className="rounded-2xl bg-white/10 border border-white/15 p-5 text-center space-y-2">
            <Gift className="h-6 w-6 text-gold mx-auto" />
            <p className="text-sm font-medium text-white">3 mois offerts</p>
          </div>
        </div>
      </div>
    </section>
  );
}
