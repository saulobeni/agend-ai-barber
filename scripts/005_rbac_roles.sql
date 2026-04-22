-- =========================
-- RBAC: ROLES E PERMISSOES
-- =========================

DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('admin', 'super_admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, role, barbershop_id)
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Cada usuario pode ver os proprios roles
DROP POLICY IF EXISTS "user_roles_select_own" ON user_roles;
CREATE POLICY "user_roles_select_own"
ON user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Funcoes auxiliares para checar super admin e evitar repetir subquery nas policies
CREATE OR REPLACE FUNCTION public.is_super_admin(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = uid
      AND ur.role = 'super_admin'
  );
$$;

-- Super admin pode visualizar e gerenciar todos os roles
DROP POLICY IF EXISTS "user_roles_select_super_admin" ON user_roles;
CREATE POLICY "user_roles_select_super_admin"
ON user_roles
FOR SELECT
USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "user_roles_insert_super_admin" ON user_roles;
CREATE POLICY "user_roles_insert_super_admin"
ON user_roles
FOR INSERT
WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "user_roles_update_super_admin" ON user_roles;
CREATE POLICY "user_roles_update_super_admin"
ON user_roles
FOR UPDATE
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "user_roles_delete_super_admin" ON user_roles;
CREATE POLICY "user_roles_delete_super_admin"
ON user_roles
FOR DELETE
USING (public.is_super_admin(auth.uid()));

-- Seeder opcional:
-- rode manualmente para promover o primeiro super admin
-- INSERT INTO public.user_roles (user_id, role, barbershop_id)
-- VALUES ('SEU_USER_ID_AQUI', 'super_admin', NULL)
-- ON CONFLICT DO NOTHING;
