-- ==========================================
-- ADICIONA STATUS DE ATIVAÇÃO NA BARBEARIA
-- ==========================================

ALTER TABLE public.barbershops 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
