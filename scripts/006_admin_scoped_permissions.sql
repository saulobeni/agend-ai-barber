-- =========================
-- ADMIN SCOPED PERMISSIONS
-- =========================
-- Objetivo: permitir que admin gerencie apenas dados da propria barbearia
-- sem criar novas tabelas.

DO $$
BEGIN
  ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'barber';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE OR REPLACE FUNCTION public.can_manage_barbershop(uid UUID, shop_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.barbershops bs
    WHERE bs.id = shop_id
      AND (
        bs.owner_id = uid
        OR public.is_super_admin(uid)
        OR EXISTS (
          SELECT 1
          FROM public.user_roles ur
          WHERE ur.user_id = uid
            AND ur.role = 'admin'
            AND ur.barbershop_id = shop_id
        )
      )
  );
$$;

-- user_roles: admin pode inserir admin/barber somente na propria barbearia.
DROP POLICY IF EXISTS "user_roles_insert_admin_scoped" ON user_roles;
CREATE POLICY "user_roles_insert_admin_scoped"
ON user_roles
FOR INSERT
WITH CHECK (
  role IN ('admin', 'barber')
  AND barbershop_id IS NOT NULL
  AND public.can_manage_barbershop(auth.uid(), barbershop_id)
);

DROP POLICY IF EXISTS "user_roles_select_admin_scoped" ON user_roles;
CREATE POLICY "user_roles_select_admin_scoped"
ON user_roles
FOR SELECT
USING (
  barbershop_id IS NOT NULL
  AND public.can_manage_barbershop(auth.uid(), barbershop_id)
);

-- barbers: admin da barbearia tambem pode inserir/editar/remover.
DROP POLICY IF EXISTS "barbers_insert_by_owner" ON barbers;
CREATE POLICY "barbers_insert_by_owner_or_admin" ON barbers
FOR INSERT
WITH CHECK (public.can_manage_barbershop(auth.uid(), barbershop_id));

DROP POLICY IF EXISTS "barbers_update_by_owner" ON barbers;
CREATE POLICY "barbers_update_by_owner_or_admin" ON barbers
FOR UPDATE
USING (public.can_manage_barbershop(auth.uid(), barbershop_id))
WITH CHECK (public.can_manage_barbershop(auth.uid(), barbershop_id));

DROP POLICY IF EXISTS "barbers_delete_by_owner" ON barbers;
CREATE POLICY "barbers_delete_by_owner_or_admin" ON barbers
FOR DELETE
USING (public.can_manage_barbershop(auth.uid(), barbershop_id));

-- services: admin da barbearia tambem pode inserir/editar/remover.
DROP POLICY IF EXISTS "services_insert_by_owner" ON services;
CREATE POLICY "services_insert_by_owner_or_admin" ON services
FOR INSERT
WITH CHECK (public.can_manage_barbershop(auth.uid(), barbershop_id));

DROP POLICY IF EXISTS "services_update_by_owner" ON services;
CREATE POLICY "services_update_by_owner_or_admin" ON services
FOR UPDATE
USING (public.can_manage_barbershop(auth.uid(), barbershop_id))
WITH CHECK (public.can_manage_barbershop(auth.uid(), barbershop_id));

DROP POLICY IF EXISTS "services_delete_by_owner" ON services;
CREATE POLICY "services_delete_by_owner_or_admin" ON services
FOR DELETE
USING (public.can_manage_barbershop(auth.uid(), barbershop_id));
