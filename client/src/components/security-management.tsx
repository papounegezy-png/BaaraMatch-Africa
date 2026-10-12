import { ShieldCheck } from "lucide-react";
import { OperationalModuleComingSoon } from "@/components/operational-module-coming-soon";

// Was a fully mock UI (fake action logs, fake backup records, fake GDPR
// request tracker). Unlike a CRUD module, these can't be made honest by
// simply clearing the seed data to an empty state — an audit log or backup
// record only means something if the system actually generated it, and no
// real event logging or backup pipeline exists yet. Gated until that
// backend infrastructure is built.
export function SecurityManagement() {
  return (
    <OperationalModuleComingSoon
      icon={ShieldCheck}
      title="Sécurité"
      description="Historique des actions, sauvegardes et conformité RGPD"
      reasons={[
        "Le suivi ne peut être affiché honnêtement que si le système enregistre réellement les actions et sauvegardes — ce n'est pas encore le cas.",
      ]}
    />
  );
}
