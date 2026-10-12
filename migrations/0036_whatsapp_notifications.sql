CREATE TABLE IF NOT EXISTS whatsapp_notifications (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone text NOT NULL,
  application_id varchar,
  message text NOT NULL,
  status text NOT NULL,
  last_error text,
  created_at timestamp DEFAULT now(),
  sent_at timestamp
);
CREATE INDEX IF NOT EXISTS whatsapp_notifications_status_idx ON whatsapp_notifications (status);
CREATE INDEX IF NOT EXISTS whatsapp_notifications_phone_idx ON whatsapp_notifications (phone);
