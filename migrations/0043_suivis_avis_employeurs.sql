-- Profil employeur : suivi par les candidats et avis de candidats.

-- Un candidat suit un employeur (agence ou entreprise) : il est prévenu de
-- ses nouvelles offres.
CREATE TABLE IF NOT EXISTS employer_follows (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  employer_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamp DEFAULT now(),
  CONSTRAINT employer_follows_unique UNIQUE (candidate_id, employer_id)
);
CREATE INDEX IF NOT EXISTS employer_follows_employer_idx ON employer_follows (employer_id);

-- Avis d'un candidat sur un employeur : un par candidat et par employeur,
-- seulement après avoir postulé à l'une de ses offres (règle côté serveur).
-- masque : retiré par l'équipe BaaraMatch (modération).
CREATE TABLE IF NOT EXISTS employer_reviews (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  candidate_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note smallint NOT NULL CHECK (note BETWEEN 1 AND 5),
  commentaire text,
  masque boolean NOT NULL DEFAULT false,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  CONSTRAINT employer_reviews_unique UNIQUE (candidate_id, employer_id)
);
CREATE INDEX IF NOT EXISTS employer_reviews_employer_idx ON employer_reviews (employer_id);
