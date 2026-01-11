CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS email_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  master_toggle boolean NOT NULL DEFAULT false,
  marketing_emails boolean NOT NULL DEFAULT true,
  new_arrivals boolean NOT NULL DEFAULT true,
  sale_announcements boolean NOT NULL DEFAULT true,
  restock_alerts boolean NOT NULL DEFAULT true,
  wishlist_alerts boolean NOT NULL DEFAULT true,
  abandoned_cart boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_preferences_user_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_email_preferences_user ON email_preferences(user_id);

ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own email preferences" ON email_preferences;

CREATE POLICY "Users can view own email preferences"
  ON email_preferences FOR SELECT
  USING (
    auth.uid() IN (
      SELECT auth_uid FROM users WHERE users.id = email_preferences.user_id
    )
  );




















