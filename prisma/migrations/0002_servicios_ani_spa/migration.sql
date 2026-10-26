-- Servicios iniciales de Ani Spa. Solo inserta los que no existen (por nombre),
-- así no duplica servicios que el admin ya haya creado.
-- priceCents = 0 se muestra como "Precio a consultar" hasta que el admin lo edite.
INSERT INTO "Service" ("id", "name", "description", "durationMin", "priceCents", "active")
SELECT gen_random_uuid(), v.name, v.description, v.duration, v.price, true
FROM (VALUES
  ('Masaje relajante',          'Movimientos suaves y aceites esenciales para soltar el estrés y descansar profundo.', 60, 0),
  ('Masaje descontracturante',  'Trabajo profundo en espalda, cuello y hombros para liberar contracturas.',            60, 0),
  ('Drenaje linfático',         'Técnica manual suave que ayuda a reducir la retención de líquidos y la hinchazón.',  60, 0),
  ('Masaje deportivo',          'Para antes o después de entrenar: mejora la recuperación y la movilidad muscular.',  60, 0),
  ('Masaje facial',             'Relaja la musculatura del rostro, mejora la circulación y da luminosidad a la piel.', 45, 0),
  ('Envolturas',                'Envoltura corporal hidratante y detox que nutre la piel de pies a cabeza.',          60, 0),
  ('Terapias alternativas',     'Terapias complementarias para equilibrar cuerpo y mente.',                           60, 0),
  ('Desintoxicación iónica',    'Baño de pies iónico que ayuda a eliminar toxinas y renovar la energía.',              30, 500000),
  ('Stretching terapéutico',    'Estiramientos asistidos para ganar flexibilidad, aliviar tensión y prevenir lesiones.', 60, 1500000)
) AS v(name, description, duration, price)
WHERE NOT EXISTS (SELECT 1 FROM "Service" s WHERE lower(s."name") = lower(v.name));
