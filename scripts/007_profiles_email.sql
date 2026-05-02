-- =========================
-- PROFILES: EMAIL COLUMN
-- =========================
-- Necessario para refletir o email de login do Auth dentro de profiles.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Opcionalmente garante unicidade quando preenchido.
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_unique
ON public.profiles (email)
WHERE email IS NOT NULL;
