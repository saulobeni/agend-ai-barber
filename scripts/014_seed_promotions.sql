-- =====================================================================
-- 014_seed_promotions.sql
-- Dados de teste para cupons e promoções
-- =====================================================================

DO $$
DECLARE
    target_shop_id UUID;
BEGIN
    -- Seleciona a primeira barbearia cadastrada (ex: 'AgendAI Barber')
    SELECT id INTO target_shop_id FROM public.barbershops LIMIT 1;

    IF target_shop_id IS NOT NULL THEN
        -- 1. Cupom tradicional de Boas-Vindas (com código)
        INSERT INTO public.coupons (
            barbershop_id,
            name,
            description,
            code,
            trigger_type,
            discount_type,
            discount_value,
            max_uses_global,
            max_uses_per_client,
            is_active
        )
        VALUES (
            target_shop_id,
            'Boas-Vindas 15% OFF',
            'Desconto especial de primeira visita para novos clientes',
            'BEMVINDO15',
            'manual_code',
            'percentage',
            15.00,
            100,
            1,
            true
        )
        ON CONFLICT DO NOTHING;

        -- 2. Cupom promocional de valor fixo
        INSERT INTO public.coupons (
            barbershop_id,
            name,
            description,
            code,
            trigger_type,
            discount_type,
            discount_value,
            min_service_value,
            is_active
        )
        VALUES (
            target_shop_id,
            'R$ 10 OFF em Serviços Acima de R$ 40',
            'Desconto fixo de 10 reais para cortes ou combos',
            'DEZOFF',
            'manual_code',
            'fixed',
            10.00,
            40.00,
            true
        )
        ON CONFLICT DO NOTHING;

        -- 3. Promoção automática de horário ocioso (Happy Hour Terça e Quarta à tarde)
        -- Terça = 2, Quarta = 3
        INSERT INTO public.coupons (
            barbershop_id,
            name,
            description,
            code,
            trigger_type,
            discount_type,
            discount_value,
            valid_days_of_week,
            valid_time_start,
            valid_time_end,
            is_active
        )
        VALUES (
            target_shop_id,
            'Happy Hour da Barbearia (Terça e Quarta)',
            '20% de desconto em agendamentos nas terças e quartas entre 13:00 e 16:30',
            NULL,
            'off_peak',
            'percentage',
            20.00,
            ARRAY[2, 3],
            '13:00:00',
            '16:30:00',
            true
        )
        ON CONFLICT DO NOTHING;

        -- 4. Promoção de Retenção (Clientes inativos há mais de 35 dias)
        INSERT INTO public.coupons (
            barbershop_id,
            name,
            description,
            code,
            trigger_type,
            discount_type,
            discount_value,
            is_active
        )
        VALUES (
            target_shop_id,
            'Volta pra Cadeira - 25% OFF',
            'Desconto especial para clientes que não cortam há mais de 35 dias',
            'VOLTA25',
            'retention',
            'percentage',
            25.00,
            true
        )
        ON CONFLICT DO NOTHING;

    END IF;
END $$;
