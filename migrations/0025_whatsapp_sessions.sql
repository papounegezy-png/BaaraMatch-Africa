CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  step text NOT NULL DEFAULT 'main_menu',
  context jsonb DEFAULT '{}'::jsonb,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
