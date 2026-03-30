-- Insert demo barbershop
INSERT INTO barbershops (name, address)
VALUES ('AgendAI Barber', 'Rua das Barbearias, 123 - Centro')
ON CONFLICT DO NOTHING;

-- Insert services for the demo barbershop
INSERT INTO services (barbershop_id, name, description, price, duration_minutes, icon)
SELECT 
  b.id,
  s.name,
  s.description,
  s.price,
  s.duration_minutes,
  s.icon
FROM barbershops b
CROSS JOIN (
  VALUES 
    ('Corte', 'Corte masculino moderno com acabamento preciso e estilização personalizada.', 45.00, 45, 'scissors'),
    ('Barba', 'Aparar e modelar barba com toalha quente e produtos premium.', 30.00, 30, 'razor'),
    ('Combo', 'Corte + Barba completos com tratamento VIP e finalização impecável.', 65.00, 60, 'combo')
) AS s(name, description, price, duration_minutes, icon)
WHERE b.name = 'AgendAI Barber'
ON CONFLICT DO NOTHING;
