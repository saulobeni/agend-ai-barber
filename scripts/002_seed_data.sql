-- Inserir barbearia padrão
INSERT INTO barbershops (id, name, address, phone, opening_time, closing_time)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'AgendAI Barber',
  'Rua Principal, 123 - Centro',
  '(11) 99999-9999',
  '09:00',
  '19:00'
) ON CONFLICT (id) DO NOTHING;

-- Inserir serviços padrão
INSERT INTO services (barbershop_id, name, description, duration_minutes, price, icon, is_active)
VALUES 
  (
    '00000000-0000-0000-0000-000000000001',
    'Corte',
    'Corte masculino moderno com acabamento preciso e estilização personalizada.',
    45,
    45.00,
    'scissors',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Barba',
    'Aparar e modelar barba com toalha quente e produtos premium.',
    30,
    30.00,
    'razor',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Combo',
    'Corte + Barba completos com tratamento VIP e finalização impecável.',
    60,
    65.00,
    'combo',
    true
  )
ON CONFLICT DO NOTHING;
