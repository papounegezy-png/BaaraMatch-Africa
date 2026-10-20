-- Secteur d'activité des employeurs (page Employeurs) : une des 32 valeurs
-- de shared/secteurs.ts, ou null. Le remplissage depuis company_profiles.industry
-- se fait avec script/remplir-secteurs.ts (correspondances sûres seulement).
ALTER TABLE agency_profiles ADD COLUMN IF NOT EXISTS secteur text;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS secteur text;
DO $$ BEGIN
  ALTER TABLE agency_profiles ADD CONSTRAINT agency_profiles_secteur_check CHECK (secteur IN (
    'BTP et construction',
    'Mines et carrières',
    'Banque, finance et microfinance',
    'Énergie et électricité',
    'Transport, logistique et transit',
    'Informatique, IT et numérique',
    'Fintech et services numériques',
    'Agriculture, élevage et pêche',
    'Agroalimentaire',
    'Industrie et production',
    'Télécommunications',
    'ONG, humanitaire et développement',
    'Commerce, vente et distribution',
    'Comptabilité, audit et gestion',
    'Santé et pharmacie',
    'Éducation et formation',
    'Recherche, études et statistiques',
    'Consulting, conseil et expertise',
    'Hôtellerie, restauration et tourisme',
    'Marketing et communication',
    'Ressources humaines et recrutement',
    'Juridique et conformité',
    'Sécurité et gardiennage',
    'Environnement, eau et assainissement',
    'Immobilier',
    'Assurance',
    'Import-export et commerce international',
    'Automobile et maintenance',
    'Services aux entreprises',
    'Médias et audiovisuel',
    'Artisanat et textile',
    'Culture, arts et loisirs'
  ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE company_profiles ADD CONSTRAINT company_profiles_secteur_check CHECK (secteur IN (
    'BTP et construction',
    'Mines et carrières',
    'Banque, finance et microfinance',
    'Énergie et électricité',
    'Transport, logistique et transit',
    'Informatique, IT et numérique',
    'Fintech et services numériques',
    'Agriculture, élevage et pêche',
    'Agroalimentaire',
    'Industrie et production',
    'Télécommunications',
    'ONG, humanitaire et développement',
    'Commerce, vente et distribution',
    'Comptabilité, audit et gestion',
    'Santé et pharmacie',
    'Éducation et formation',
    'Recherche, études et statistiques',
    'Consulting, conseil et expertise',
    'Hôtellerie, restauration et tourisme',
    'Marketing et communication',
    'Ressources humaines et recrutement',
    'Juridique et conformité',
    'Sécurité et gardiennage',
    'Environnement, eau et assainissement',
    'Immobilier',
    'Assurance',
    'Import-export et commerce international',
    'Automobile et maintenance',
    'Services aux entreprises',
    'Médias et audiovisuel',
    'Artisanat et textile',
    'Culture, arts et loisirs'
  ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
