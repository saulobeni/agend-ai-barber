-- =====================================================================
-- 013_coupons_and_promotions.sql
-- Implementação de Cupons, Promoções Inteligentes e Métricas de Retenção
-- =====================================================================

-- 1. TIPOS ENUM
-- =====================================================================
DO $$ BEGIN
    CREATE TYPE discount_type AS ENUM ('percentage', 'fixed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE coupon_trigger_type AS ENUM (
        'manual_code',   -- Cupom com código digitado pelo cliente (ex: PROMO10)
        'off_peak',      -- Promoção automática para horários/dias ociosos
        'loyalty',       -- Promoção por fidelidade (ex: após X agendamentos)
        'retention'      -- Promoção para resgate de clientes sumidos (churn)
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. ALTERAÇÃO EM TABELAS EXISTENTES
-- =====================================================================

-- 2.1 Clientes: vínculo opcional com auth.users (profiles)
ALTER TABLE public.clients
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);

-- 2.2 Agendamentos: congelamento do preço histórico e controle de descontos
ALTER TABLE public.appointments
    ADD COLUMN IF NOT EXISTS base_price NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS final_price NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS coupon_id UUID;

-- 3. TABELA: CUPONS E PROMOÇÕES
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    code VARCHAR(50), -- Opcional caso seja promoção automática de horário ocioso
    trigger_type coupon_trigger_type NOT NULL DEFAULT 'manual_code',
    discount_type discount_type NOT NULL DEFAULT 'percentage',
    discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),

    -- Regras financeiras e limites
    min_service_value NUMERIC(10,2) DEFAULT 0.00,
    max_discount_amount NUMERIC(10,2), -- Teto de desconto em reais se for percentual
    max_uses_global INT,               -- Limite geral de utilizações (NULL = ilimitado)
    max_uses_per_client INT DEFAULT 1, -- Máximo de vezes que um cliente pode resgatar

    -- Regras analíticas de agenda (Promoções de horários/dias ociosos)
    valid_days_of_week INT[],          -- [1,2,3] = Segunda, Terça, Quarta (0 = Dom ... 6 = Sáb)
    valid_time_start TIME,             -- Início do horário promocional (ex: 13:00)
    valid_time_end TIME,               -- Fim do horário promocional (ex: 16:30)
    target_service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,

    -- Vigência e status
    starts_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Constraint única por barbearia e código (apenas quando o código existir)
CREATE UNIQUE INDEX IF NOT EXISTS uq_coupons_barbershop_code 
    ON public.coupons(barbershop_id, UPPER(code)) 
    WHERE code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_coupons_barbershop ON public.coupons(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_coupons_lookup ON public.coupons(barbershop_id, is_active, trigger_type);

-- 4. VÍNCULO DE CHAVE ESTRANGEIRA DE APPOINTMENTS PARA COUPONS
-- =====================================================================
DO $$ BEGIN
    ALTER TABLE public.appointments
        ADD CONSTRAINT fk_appointments_coupon
        FOREIGN KEY (coupon_id) REFERENCES public.coupons(id)
        ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_appointments_coupon ON public.appointments(coupon_id);

-- 5. TABELA: HISTÓRICO DE UTILIZAÇÃO DE CUPONS (AUDITORIA)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.coupon_usages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE RESTRICT,
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    discount_applied NUMERIC(10,2) NOT NULL CHECK (discount_applied >= 0),
    used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_coupon_usage_per_appointment UNIQUE (appointment_id)
);

CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon_client ON public.coupon_usages(coupon_id, client_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon_user ON public.coupon_usages(coupon_id, user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon ON public.coupon_usages(coupon_id);

-- 6. TRIGGER DE COMPATIBILIDADE: PREÇO AUTOMÁTICO NO AGENDAMENTO
-- Garante que agendamentos criados pelo código legado preencham base_price e final_price
-- =====================================================================
CREATE OR REPLACE FUNCTION public.set_appointment_pricing()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    svc_price NUMERIC(10,2);
BEGIN
    -- Se o base_price não foi passado, herda do serviço correspondente
    IF NEW.base_price IS NULL THEN
        SELECT price INTO svc_price
        FROM public.services
        WHERE id = NEW.service_id;
        
        NEW.base_price := COALESCE(svc_price, 0.00);
    END IF;

    -- Garante que discount_amount não seja nulo
    IF NEW.discount_amount IS NULL THEN
        NEW.discount_amount := 0.00;
    END IF;

    -- Calcula o final_price garantindo que não seja negativo
    IF NEW.final_price IS NULL THEN
        NEW.final_price := GREATEST(0.00, NEW.base_price - NEW.discount_amount);
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_appointment_pricing ON public.appointments;

CREATE TRIGGER trg_set_appointment_pricing
    BEFORE INSERT OR UPDATE OF service_id, base_price, discount_amount, final_price ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.set_appointment_pricing();

-- Backfill dos agendamentos históricos existentes
UPDATE public.appointments a
SET 
    base_price = s.price,
    discount_amount = 0.00,
    final_price = s.price
FROM public.services s
WHERE a.service_id = s.id
  AND a.base_price IS NULL;

-- 7. VIEWS ANALÍTICAS (MOTOR DE PROMOÇÕES INTELIGENTES)
-- =====================================================================

-- 7.1 View de Retenção de Clientes (Detecção de Ociosidade / Churn)
CREATE OR REPLACE VIEW public.view_client_retention_analysis AS
SELECT 
    c.id AS client_id,
    c.barbershop_id,
    c.name AS client_name,
    c.phone AS client_phone,
    c.user_id,
    COUNT(a.id) FILTER (WHERE a.status = 'completed') AS total_completed_appointments,
    COUNT(a.id) FILTER (WHERE a.status = 'canceled') AS total_canceled_appointments,
    MAX(a.appointment_date) AS last_appointment_date,
    CURRENT_DATE - MAX(a.appointment_date) AS days_since_last_visit,
    CASE 
        WHEN (CURRENT_DATE - MAX(a.appointment_date)) >= 60 THEN 'alto_risco'
        WHEN (CURRENT_DATE - MAX(a.appointment_date)) >= 35 THEN 'em_risco'
        WHEN (CURRENT_DATE - MAX(a.appointment_date)) <= 25 THEN 'ativo_recente'
        ELSE 'regular'
    END AS retention_status
FROM public.clients c
LEFT JOIN public.appointments a ON a.client_id = c.id
GROUP BY c.id, c.barbershop_id, c.name, c.phone, c.user_id;

-- 7.2 View de Mapa de Calor de Ocupação da Agenda (Yield Management / Happy Hour)
CREATE OR REPLACE VIEW public.view_occupancy_heatmap AS
SELECT 
    barbershop_id,
    EXTRACT(DOW FROM appointment_date)::INT AS day_of_week, -- 0 = Domingo, 1 = Segunda ... 6 = Sábado
    TO_CHAR(appointment_time, 'HH24:00') AS time_slot,
    COUNT(*) AS total_appointments,
    COUNT(*) FILTER (WHERE status = 'completed') AS completed_count,
    COUNT(*) FILTER (WHERE status = 'canceled') AS canceled_count
FROM public.appointments
GROUP BY barbershop_id, EXTRACT(DOW FROM appointment_date), TO_CHAR(appointment_time, 'HH24:00');

-- 7.3 View de Performance dos Cupons
CREATE OR REPLACE VIEW public.view_coupon_performance AS
SELECT 
    cp.id AS coupon_id,
    cp.barbershop_id,
    cp.code,
    cp.name,
    cp.trigger_type,
    cp.discount_type,
    cp.discount_value,
    cp.is_active,
    COUNT(cu.id) AS total_uses,
    COALESCE(SUM(cu.discount_applied), 0.00) AS total_discount_given,
    COALESCE(SUM(ap.final_price), 0.00) AS total_revenue_generated
FROM public.coupons cp
LEFT JOIN public.coupon_usages cu ON cu.coupon_id = cp.id
LEFT JOIN public.appointments ap ON ap.id = cu.appointment_id AND ap.status = 'completed'
GROUP BY cp.id, cp.barbershop_id, cp.code, cp.name, cp.trigger_type, cp.discount_type, cp.discount_value, cp.is_active;

-- 8. ROW LEVEL SECURITY (POLÍTICAS DE SEGURANÇA)
-- =====================================================================
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;

-- 8.1 Políticas para Cupons
DROP POLICY IF EXISTS "coupons_select_public_active" ON public.coupons;
CREATE POLICY "coupons_select_public_active"
ON public.coupons
FOR SELECT
USING (
    is_active = true 
    AND (starts_at IS NULL OR starts_at <= NOW())
    AND (expires_at IS NULL OR expires_at >= NOW())
);

DROP POLICY IF EXISTS "coupons_manage_by_owner_or_admin" ON public.coupons;
CREATE POLICY "coupons_manage_by_owner_or_admin"
ON public.coupons
FOR ALL
USING (public.can_manage_barbershop(auth.uid(), barbershop_id))
WITH CHECK (public.can_manage_barbershop(auth.uid(), barbershop_id));

-- 8.2 Políticas para Histórico de Usos (coupon_usages)
DROP POLICY IF EXISTS "coupon_usages_select_by_admin" ON public.coupon_usages;
CREATE POLICY "coupon_usages_select_by_admin"
ON public.coupon_usages
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.coupons c
        WHERE c.id = coupon_usages.coupon_id
          AND public.can_manage_barbershop(auth.uid(), c.barbershop_id)
    )
);

DROP POLICY IF EXISTS "coupon_usages_select_own" ON public.coupon_usages;
CREATE POLICY "coupon_usages_select_own"
ON public.coupon_usages
FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "coupon_usages_insert_public" ON public.coupon_usages;
CREATE POLICY "coupon_usages_insert_public"
ON public.coupon_usages
FOR INSERT
WITH CHECK (true);
