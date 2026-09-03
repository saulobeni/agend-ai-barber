-- =========================================================
-- SEED: barbearia demo + serviços padrão
-- Corrigido: as colunas `phone` (barbershops) e `icon`/`is_active`
-- (services) nunca existiram no schema real (ver 001_create_schema.sql),
-- por isso a versão anterior deste script sempre falhava.
-- Idempotente por nome, então é seguro rodar mais de uma vez.
-- =========================================================

DO $$
DECLARE
  demo_shop_id UUID;
BEGIN
  SELECT id INTO demo_shop_id FROM public.barbershops WHERE name = 'AgendAI Barber' LIMIT 1;

  IF demo_shop_id IS NULL THEN
    INSERT INTO public.barbershops (name, address, opening_time, closing_time)
    VALUES ('AgendAI Barber', 'Rua Principal, 123 - Centro', '09:00', '19:00')
    RETURNING id INTO demo_shop_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.services WHERE barbershop_id = demo_shop_id) THEN
    INSERT INTO public.services (barbershop_id, name, description, duration_minutes, price) VALUES
      (demo_shop_id, 'Corte', 'Corte masculino moderno com acabamento preciso e estilização personalizada.', 45, 45.00),
      (demo_shop_id, 'Barba', 'Aparar e modelar barba com toalha quente e produtos premium.', 30, 30.00),
      (demo_shop_id, 'Combo', 'Corte + Barba completos com tratamento VIP e finalização impecável.', 60, 65.00);
  END IF;
END $$;
