-- Permitir owner_id nulo para barbearia demo
ALTER TABLE barbershops ALTER COLUMN owner_id DROP NOT NULL;

-- Atualizar política para permitir leitura pública
DROP POLICY IF EXISTS "barbershops_select_own" ON barbershops;
DROP POLICY IF EXISTS "barbershops_select_public" ON barbershops;
CREATE POLICY "barbershops_select_public" ON barbershops FOR SELECT USING (true);
