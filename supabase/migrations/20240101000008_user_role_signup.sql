-- =========================
-- USER ROLE FOR SIGNUP
-- =========================

ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'user';
COMMIT;
