import { Wallet } from "lucide-react";
import { OperationalModuleComingSoon } from "@/components/operational-module-coming-soon";

// Was a fully mock UI (fake payslips, fake statutory contribution rates) that
// generated a downloadable "Bulletin de paie" PDF under a fabricated employer
// identity — a legally-shaped document with no relation to the real company
// or any real payroll calculation. Gated rather than fixed with real seed
// data: real payroll (tax brackets, cotisations sociales, statutory
// deductions) varies per country and is a compliance-sensitive engine to
// build, not a data-wiring task.
export function PayrollManagement() {
  return (
    <OperationalModuleComingSoon
      icon={Wallet}
      title="Paie"
      description="Gérez les bulletins de paie et les cotisations de votre entreprise"
      reasons={[
        "Le calcul de la paie (cotisations sociales, impôts, retraite) dépend de règles fiscales propres à chaque pays et doit être fiable avant d'être proposé.",
        "En attendant, continuez à gérer votre paie avec vos outils habituels.",
      ]}
    />
  );
}
