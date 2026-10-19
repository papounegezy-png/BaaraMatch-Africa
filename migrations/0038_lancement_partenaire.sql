-- Offre de lancement : chaque agence est en plan Partenaire pendant 60 jours
-- (règle dans shared/plans.ts). Les codes d'invitation passent aussi à 60 jours.
ALTER TABLE invitation_codes ALTER COLUMN trial_days SET DEFAULT 60;

-- Agences déjà inscrites en Standard : 60 jours d'essai à partir d'aujourd'hui.
-- Les Partenaires choisies à la main (sans date de fin) ne changent pas.
-- Les prospects pas encore repris démarrent leur essai à la reprise du compte.
UPDATE agency_profiles a
SET subscription_plan = 'partner',
    subscription_updated_at = now(),
    partner_trial_ends_at = now() + interval '60 days'
FROM users u
WHERE u.id = a.user_id
  AND COALESCE(u.is_prospect, false) = false
  AND COALESCE(a.subscription_plan, 'standard') <> 'partner';
