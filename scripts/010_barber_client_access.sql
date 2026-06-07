-- Permite que barbeiros visualizem clientes vinculados aos seus agendamentos.

DROP POLICY IF EXISTS "clients_select_by_barber_appointments" ON clients;
CREATE POLICY "clients_select_by_barber_appointments"
ON clients
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.client_id = clients.id
      AND a.barber_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.appointments a
    JOIN public.barbers b ON b.id = a.barber_id
    WHERE a.client_id = clients.id
      AND b.id = auth.uid()
  )
);
