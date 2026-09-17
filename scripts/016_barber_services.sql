-- =========================================================
-- 016: barber_services (tabela de apoio barbeiro <-> servico)
-- Nem todo barbeiro realiza todos os servicos da barbearia.
-- Esta tabela vincula quais servicos cada barbeiro executa.
-- =========================================================

CREATE TABLE IF NOT EXISTS barber_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT barber_services_unique UNIQUE (barber_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_barber_services_barber_id ON barber_services(barber_id);
CREATE INDEX IF NOT EXISTS idx_barber_services_service_id ON barber_services(service_id);

ALTER TABLE barber_services ENABLE ROW LEVEL SECURITY;

-- Leitura publica (necessaria para filtrar barbeiros no fluxo de agendamento,
-- que roda sob o client anon/authenticated com RLS ativo, igual barbers/services).
DROP POLICY IF EXISTS "barber_services_select_public" ON barber_services;
CREATE POLICY "barber_services_select_public"
ON barber_services
FOR SELECT
USING (true);

-- Escrita restrita ao owner/admin da barbearia dona do barbeiro.
-- barber_services nao tem barbershop_id proprio, entao a checagem
-- via can_manage_barbershop precisa "passar" pelo barbeiro (barber_id),
-- buscando o barbershop_id em `barbers`.
DROP POLICY IF EXISTS "barber_services_insert_by_owner_or_admin" ON barber_services;
CREATE POLICY "barber_services_insert_by_owner_or_admin"
ON barber_services
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM barbers b
    WHERE b.id = barber_services.barber_id
      AND public.can_manage_barbershop(auth.uid(), b.barbershop_id)
  )
);

DROP POLICY IF EXISTS "barber_services_delete_by_owner_or_admin" ON barber_services;
CREATE POLICY "barber_services_delete_by_owner_or_admin"
ON barber_services
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM barbers b
    WHERE b.id = barber_services.barber_id
      AND public.can_manage_barbershop(auth.uid(), b.barbershop_id)
  )
);

-- Sem policy de UPDATE: a relacao e sempre delete+insert (ver
-- setBarberServices em app/actions/barber-services.ts).

GRANT ALL ON TABLE barber_services TO anon, authenticated, service_role;

-- =========================================================
-- BACKFILL: sem isso, todo barbeiro deixaria de aparecer para todo
-- servico ate o admin cadastrar manualmente os vinculos, quebrando
-- o agendamento de todo cliente no dia do deploy. Vinculamos cada
-- barbeiro existente a todos os servicos da MESMA barbearia
-- (comportamento atual: "todo barbeiro faz tudo"). A partir daqui
-- o admin refina removendo o que nao se aplica.
-- =========================================================
INSERT INTO barber_services (barber_id, service_id)
SELECT b.id, s.id
FROM barbers b
JOIN services s ON s.barbershop_id = b.barbershop_id
ON CONFLICT (barber_id, service_id) DO NOTHING;
