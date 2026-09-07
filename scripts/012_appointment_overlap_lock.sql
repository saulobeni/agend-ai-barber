-- [P1.3] Trava contra sobreposição de horário por barbeiro
--
-- A constraint `unique_barber_schedule` (barber_id, appointment_date, appointment_time)
-- só impede o mesmo horário exato. Ela não impede que um agendamento de
-- 60 minutos às 10:00 seja sobreposto por outro criado às 10:30 para o
-- mesmo barbeiro. A validação de sobreposição hoje só existe em memória
-- (getAvailableTimes) e está sujeita a condição de corrida entre duas
-- requisições concorrentes.
--
-- Solução: guardar a duração do agendamento na própria linha (copiada do
-- serviço no momento da inserção/atualização) e usar uma constraint de
-- exclusão via GiST (btree_gist) sobre o intervalo de tempo ocupado por
-- cada barbeiro, garantida no nível do banco — inclusive sob concorrência.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- =========================
-- Duração do agendamento (congelada no momento da gravação)
-- =========================
ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS duration_minutes INT;

CREATE OR REPLACE FUNCTION public.set_appointment_duration()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.duration_minutes IS NULL THEN
        SELECT duration_minutes INTO NEW.duration_minutes
        FROM services
        WHERE id = NEW.service_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_appointment_duration ON appointments;

CREATE TRIGGER trg_set_appointment_duration
    BEFORE INSERT OR UPDATE OF service_id, duration_minutes ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.set_appointment_duration();

-- Backfill dos agendamentos existentes a partir do serviço vinculado.
UPDATE appointments a
SET duration_minutes = s.duration_minutes
FROM services s
WHERE a.service_id = s.id
    AND a.duration_minutes IS NULL;

-- =========================
-- Intervalo de tempo ocupado (gerado a partir de data + hora + duração)
-- =========================
ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS time_range tsrange
    GENERATED ALWAYS AS (
        tsrange(
            (appointment_date + appointment_time),
            (appointment_date + appointment_time
                + (COALESCE(duration_minutes, 0) || ' minutes')::interval),
            '[)'
        )
    ) STORED;

-- =========================
-- Trava de integridade contra sobreposição por barbeiro
-- (somente agendamentos ativos bloqueiam novos horários)
-- =========================
ALTER TABLE appointments
    DROP CONSTRAINT IF EXISTS no_overlapping_barber_appointments;

ALTER TABLE appointments
    ADD CONSTRAINT no_overlapping_barber_appointments
    EXCLUDE USING gist (
        barber_id WITH =,
        time_range WITH &&
    )
    WHERE (status = 'scheduled');

-- A antiga unique constraint de horário exato agora é redundante: qualquer
-- sobreposição de intervalos idênticos já é coberta pela exclusion constraint
-- acima, que também respeita agendamentos cancelados/concluídos (liberando o
-- horário), algo que a unique constraint não fazia.
ALTER TABLE appointments
    DROP CONSTRAINT IF EXISTS unique_barber_schedule;

CREATE INDEX IF NOT EXISTS idx_appointments_time_range ON appointments USING gist (time_range);
