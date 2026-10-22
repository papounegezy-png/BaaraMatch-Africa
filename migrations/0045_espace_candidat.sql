-- Espace candidat (prompt 7).

-- 1. Pays : plus de valeur par défaut « Sénégal ». Les comptes créés sans
--    pays (organisations, administrateurs, WhatsApp) le recevaient d'office,
--    d'où « Bamako, Sénégal ». Les villes maliennes passent en « Mali » ;
--    les autres lignes restent telles quelles (à vérifier au cas par cas).
ALTER TABLE users ALTER COLUMN country DROP DEFAULT;
UPDATE users SET country = 'Mali'
WHERE country = 'Sénégal'
  AND lower(trim(city)) IN (
    'bamako', 'kayes', 'sikasso', 'ségou', 'segou', 'mopti', 'koutiala', 'kati',
    'gao', 'tombouctou', 'kidal', 'koulikoro', 'kita', 'san', 'bougouni',
    'goulamina', 'kadiolo', 'nioro', 'nioro du sahel', 'djenné', 'djenne',
    'markala', 'fana', 'bla', 'kéniéba', 'kenieba', 'sadiola', 'yanfolila',
    'kolokani', 'dioïla', 'dioila', 'tominian', 'bandiagara', 'douentza', 'ménaka', 'menaka'
  );

-- 2. Candidatures : « Attendre encore » (rappel repoussé jusqu'à cette date)
--    et « Relancer » (une relance au plus tous les 30 jours).
ALTER TABLE applications ADD COLUMN IF NOT EXISTS reminder_snoozed_until timestamp;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS last_follow_up_at timestamp;
