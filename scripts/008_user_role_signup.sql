-- =========================
-- USER ROLE FOR SIGNUP
-- =========================

DO $$
BEGIN
  ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'user';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
