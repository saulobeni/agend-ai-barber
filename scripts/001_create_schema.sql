-- =========================
-- EXTENSÕES
-- =========================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================
-- ENUMS
-- =========================
DO $$ BEGIN
    CREATE TYPE appointment_status AS ENUM ('scheduled', 'completed', 'canceled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('cash', 'pix', 'card');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =========================
-- TABELA: perfis de usuários (proprietários)
-- Referencia auth.users do Supabase
-- =========================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(50),
    full_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- =========================
-- TABELA: barbearia
-- =========================
CREATE TABLE IF NOT EXISTS barbershops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    address TEXT,
    opening_time TIME NOT NULL DEFAULT '09:00',
    closing_time TIME NOT NULL DEFAULT '18:00',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE barbershops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "barbershops_select_own" ON barbershops FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "barbershops_insert_own" ON barbershops FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "barbershops_update_own" ON barbershops FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "barbershops_delete_own" ON barbershops FOR DELETE USING (auth.uid() = owner_id);
-- Permitir leitura pública para clientes
CREATE POLICY "barbershops_select_public" ON barbershops FOR SELECT USING (true);

-- =========================
-- TABELA: clientes
-- =========================
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Proprietário pode ver clientes da sua barbearia
CREATE POLICY "clients_select_by_owner" ON clients FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM barbershops WHERE barbershops.id = clients.barbershop_id AND barbershops.owner_id = auth.uid()
    ));
CREATE POLICY "clients_insert_public" ON clients FOR INSERT WITH CHECK (true);
CREATE POLICY "clients_update_by_owner" ON clients FOR UPDATE 
    USING (EXISTS (
        SELECT 1 FROM barbershops WHERE barbershops.id = clients.barbershop_id AND barbershops.owner_id = auth.uid()
    ));

-- =========================
-- TABELA: barbeiros (profissionais)
-- =========================
CREATE TABLE IF NOT EXISTS barbers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "barbers_select_public" ON barbers FOR SELECT USING (true);
CREATE POLICY "barbers_insert_by_owner" ON barbers FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM barbershops WHERE barbershops.id = barbers.barbershop_id AND barbershops.owner_id = auth.uid()
    ));
CREATE POLICY "barbers_update_by_owner" ON barbers FOR UPDATE 
    USING (EXISTS (
        SELECT 1 FROM barbershops WHERE barbershops.id = barbers.barbershop_id AND barbershops.owner_id = auth.uid()
    ));
CREATE POLICY "barbers_delete_by_owner" ON barbers FOR DELETE 
    USING (EXISTS (
        SELECT 1 FROM barbershops WHERE barbershops.id = barbers.barbershop_id AND barbershops.owner_id = auth.uid()
    ));

-- =========================
-- TABELA: serviços
-- =========================
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "services_select_public" ON services FOR SELECT USING (true);
CREATE POLICY "services_insert_by_owner" ON services FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM barbershops WHERE barbershops.id = services.barbershop_id AND barbershops.owner_id = auth.uid()
    ));
CREATE POLICY "services_update_by_owner" ON services FOR UPDATE 
    USING (EXISTS (
        SELECT 1 FROM barbershops WHERE barbershops.id = services.barbershop_id AND barbershops.owner_id = auth.uid()
    ));
CREATE POLICY "services_delete_by_owner" ON services FOR DELETE 
    USING (EXISTS (
        SELECT 1 FROM barbershops WHERE barbershops.id = services.barbershop_id AND barbershops.owner_id = auth.uid()
    ));

-- =========================
-- TABELA: agendamentos
-- =========================
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id),
    service_id UUID REFERENCES services(id),
    barber_id UUID REFERENCES barbers(id),
    barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status appointment_status DEFAULT 'scheduled',
    cancel_token UUID DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_barber_schedule UNIQUE (barber_id, appointment_date, appointment_time)
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appointments_select_public" ON appointments FOR SELECT USING (true);
CREATE POLICY "appointments_insert_public" ON appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "appointments_update_by_owner" ON appointments FOR UPDATE 
    USING (EXISTS (
        SELECT 1 FROM barbershops WHERE barbershops.id = appointments.barbershop_id AND barbershops.owner_id = auth.uid()
    ) OR true);
CREATE POLICY "appointments_delete_by_owner" ON appointments FOR DELETE 
    USING (EXISTS (
        SELECT 1 FROM barbershops WHERE barbershops.id = appointments.barbershop_id AND barbershops.owner_id = auth.uid()
    ));

-- =========================
-- TABELA: bloqueios (folgas/intervalos)
-- =========================
CREATE TABLE IF NOT EXISTS blocked_times (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barber_id UUID REFERENCES barbers(id) ON DELETE CASCADE,
    block_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CHECK (end_time > start_time)
);

ALTER TABLE blocked_times ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blocked_times_select_public" ON blocked_times FOR SELECT USING (true);
CREATE POLICY "blocked_times_insert_by_owner" ON blocked_times FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM barbers 
        JOIN barbershops ON barbershops.id = barbers.barbershop_id 
        WHERE barbers.id = blocked_times.barber_id AND barbershops.owner_id = auth.uid()
    ));
CREATE POLICY "blocked_times_update_by_owner" ON blocked_times FOR UPDATE 
    USING (EXISTS (
        SELECT 1 FROM barbers 
        JOIN barbershops ON barbershops.id = barbers.barbershop_id 
        WHERE barbers.id = blocked_times.barber_id AND barbershops.owner_id = auth.uid()
    ));
CREATE POLICY "blocked_times_delete_by_owner" ON blocked_times FOR DELETE 
    USING (EXISTS (
        SELECT 1 FROM barbers 
        JOIN barbershops ON barbershops.id = barbers.barbershop_id 
        WHERE barbers.id = blocked_times.barber_id AND barbershops.owner_id = auth.uid()
    ));

-- =========================
-- TABELA: pagamentos (fluxo de caixa)
-- =========================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
    method payment_method NOT NULL,
    paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_select_by_owner" ON payments FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM appointments 
        JOIN barbershops ON barbershops.id = appointments.barbershop_id 
        WHERE appointments.id = payments.appointment_id AND barbershops.owner_id = auth.uid()
    ));
CREATE POLICY "payments_insert_by_owner" ON payments FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM appointments 
        JOIN barbershops ON barbershops.id = appointments.barbershop_id 
        WHERE appointments.id = payments.appointment_id AND barbershops.owner_id = auth.uid()
    ));
CREATE POLICY "payments_update_by_owner" ON payments FOR UPDATE 
    USING (EXISTS (
        SELECT 1 FROM appointments 
        JOIN barbershops ON barbershops.id = appointments.barbershop_id 
        WHERE appointments.id = payments.appointment_id AND barbershops.owner_id = auth.uid()
    ));

-- =========================
-- ÍNDICES (performance)
-- =========================
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_barber ON appointments(barber_id);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
CREATE INDEX IF NOT EXISTS idx_appointments_barbershop ON appointments(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_services_barbershop ON services(barbershop_id);

-- =========================
-- TRIGGER: auto-criar perfil
-- =========================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NULL)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
