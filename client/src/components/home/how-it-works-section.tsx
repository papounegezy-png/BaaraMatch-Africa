const steps = [
  {
    title: "Créez votre profil",
    description: "Candidat ou employeur, configurez votre profil en quelques minutes.",
    circleClass: "bg-primary-dark text-white",
  },
  {
    title: "Recevez des correspondances pertinentes",
    description: "Compétences, ville et expérience comparées pour vous proposer les offres les plus proches de votre profil.",
    circleClass: "bg-primary-dark text-white",
  },
  {
    title: "Recrutez ou postulez",
    description: "Passez à l'action rapidement avec un parcours fluide et orienté résultats.",
    // Marine on gold = 6.0:1; white on gold was 2.4:1.
    circleClass: "bg-gold text-primary-dark",
  },
];

export function HowItWorksSection() {
  return (
    <section id="comment-ca-marche" className="scroll-mt-24 py-16 md:py-24" aria-labelledby="how-it-works-title">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-3 mb-10 md:mb-14">
          <h2 id="how-it-works-title" className="text-3xl md:text-4xl font-bold">Comment ça marche</h2>
        </div>

        <ol className="relative grid gap-6 md:grid-cols-3 max-w-5xl mx-auto list-none">
          <div className="hidden md:block absolute left-[16.5%] right-[16.5%] top-6 h-px bg-border" aria-hidden="true" />
          {steps.map((step, index) => (
            <li key={step.title} className="relative text-center space-y-3">
              <div className={`mx-auto h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold ${step.circleClass}`}>
                {index + 1}
              </div>
              <h3 className="text-lg font-semibold">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
