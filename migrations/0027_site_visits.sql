CREATE TABLE IF NOT EXISTS site_visits (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id varchar NOT NULL,
  date timestamp NOT NULL,
  country text,
  first_seen_at timestamp NOT NULL,
  last_seen_at timestamp NOT NULL,
  page_views integer NOT NULL DEFAULT 1,
  created_at timestamp DEFAULT now(),
  CONSTRAINT site_visits_visitor_date_unique UNIQUE (visitor_id, date)
);

CREATE INDEX IF NOT EXISTS site_visits_date_idx ON site_visits (date);
CREATE INDEX IF NOT EXISTS site_visits_country_idx ON site_visits (country);
