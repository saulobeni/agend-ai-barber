-- =========================================================
-- SEED: um usuário funcional para cada role do sistema
-- Roles existentes (ver scripts/005, 006, 008): user, barber, admin, super_admin
-- Senha padrão para todos: 123123
-- Rode este script no SQL Editor do Supabase (Dashboard -> SQL Editor).
-- É seguro rodar mais de uma vez (idempotente).
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Função auxiliar temporária: cria (ou reaproveita) um usuário em auth.users
-- com senha já confirmada, e a identity necessária para login por email/senha.
CREATE OR REPLACE FUNCTION pg_temp.seed_auth_user(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_phone TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id FROM auth.users WHERE email = p_email;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  v_id := gen_random_uuid();

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    p_email, extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_full_name, 'phone', p_phone),
    now(), now(),
    '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_id, v_id::text,
    jsonb_build_object('sub', v_id::text, 'email', p_email),
    'email', now(), now(), now()
  );

  RETURN v_id;
END;
$$;

DO $$
DECLARE
  demo_shop_id UUID;
  v_cliente_id UUID;
  v_barbeiro_id UUID;
  v_admin_id UUID;
  v_super_id UUID;
BEGIN
  -- =========================
  -- Barbearia demo (reaproveita se já existir)
  -- =========================
  SELECT id INTO demo_shop_id FROM public.barbershops WHERE name = 'AgendAI Barber' LIMIT 1;
  IF demo_shop_id IS NULL THEN
    INSERT INTO public.barbershops (name, address, opening_time, closing_time)
    VALUES ('AgendAI Barber', 'Rua das Barbearias, 123 - Centro', '09:00', '19:00')
    RETURNING id INTO demo_shop_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.services WHERE barbershop_id = demo_shop_id) THEN
    INSERT INTO public.services (barbershop_id, name, description, price, duration_minutes) VALUES
      (demo_shop_id, 'Corte', 'Corte masculino moderno com acabamento preciso.', 45.00, 45),
      (demo_shop_id, 'Barba', 'Aparar e modelar barba com toalha quente.', 30.00, 30),
      (demo_shop_id, 'Combo', 'Corte + Barba completos.', 65.00, 60);
  END IF;

  -- =========================
  -- CLIENTE (role: user)
  -- =========================
  v_cliente_id := pg_temp.seed_auth_user('cliente@teste.com', '123123', 'Cliente Teste', '11999990001');

  INSERT INTO public.profiles (id, full_name, username, email)
  VALUES (v_cliente_id, 'Cliente Teste', 'cliente.teste', 'cliente@teste.com')
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, username = EXCLUDED.username, email = EXCLUDED.email;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_cliente_id AND role = 'user') THEN
    INSERT INTO public.user_roles (user_id, role, barbershop_id) VALUES (v_cliente_id, 'user', NULL);
  END IF;

  -- =========================
  -- BARBEIRO (role: barber, vinculado à barbearia demo)
  -- =========================
  v_barbeiro_id := pg_temp.seed_auth_user('barbeiro@teste.com', '123123', 'Barbeiro Teste', '11999990002');

  INSERT INTO public.profiles (id, full_name, username, email)
  VALUES (v_barbeiro_id, 'Barbeiro Teste', 'barbeiro.teste', 'barbeiro@teste.com')
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, username = EXCLUDED.username, email = EXCLUDED.email;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_barbeiro_id AND role = 'barber' AND barbershop_id = demo_shop_id) THEN
    INSERT INTO public.user_roles (user_id, role, barbershop_id) VALUES (v_barbeiro_id, 'barber', demo_shop_id);
  END IF;

  -- barbers.id precisa ser igual ao id do usuário logado (ver scripts/010) para as
  -- policies de RLS (auth.uid() = barber_id) funcionarem corretamente.
  INSERT INTO public.barbers (id, name, barbershop_id)
  VALUES (v_barbeiro_id, 'Barbeiro Teste', demo_shop_id)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, barbershop_id = EXCLUDED.barbershop_id;

  -- =========================
  -- ADMIN (role: admin, escopo = barbearia demo)
  -- =========================
  v_admin_id := pg_temp.seed_auth_user('admin@teste.com', '123123', 'Admin Teste', '11999990003');

  INSERT INTO public.profiles (id, full_name, username, email)
  VALUES (v_admin_id, 'Admin Teste', 'admin.teste', 'admin@teste.com')
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, username = EXCLUDED.username, email = EXCLUDED.email;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_admin_id AND role = 'admin' AND barbershop_id = demo_shop_id) THEN
    INSERT INTO public.user_roles (user_id, role, barbershop_id) VALUES (v_admin_id, 'admin', demo_shop_id);
  END IF;

  -- =========================
  -- SUPER ADMIN (role: super_admin, sem escopo de barbearia)
  -- =========================
  v_super_id := pg_temp.seed_auth_user('superadmin@teste.com', '123123', 'Super Admin Teste', '11999990004');

  INSERT INTO public.profiles (id, full_name, username, email)
  VALUES (v_super_id, 'Super Admin Teste', 'superadmin.teste', 'superadmin@teste.com')
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, username = EXCLUDED.username, email = EXCLUDED.email;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_super_id AND role = 'super_admin') THEN
    INSERT INTO public.user_roles (user_id, role, barbershop_id) VALUES (v_super_id, 'super_admin', NULL);
  END IF;
END $$;

DROP FUNCTION IF EXISTS pg_temp.seed_auth_user(TEXT, TEXT, TEXT, TEXT);

-- =========================================================
-- CREDENCIAIS CRIADAS (senha padrão: 123123)
--   Cliente:      cliente@teste.com
--   Barbeiro:     barbeiro@teste.com
--   Admin:        admin@teste.com
--   Super Admin:  superadmin@teste.com
-- =========================================================
