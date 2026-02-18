-- ============================================
-- MEDCOMLABS - 09: DATOS DE PRUEBA
-- ============================================
-- Password para todos los doctores: doctor123
-- Hash bcrypt: $2b$10$Kk1rSQmmI9u6ZlR0hz7zcuw.Rx2oQwNlncyd1HTAjj0rrnvVb017W
-- ============================================

-- DOCTORES (datos cifrados simulados)
-- Para producción, los datos se cifran via API
INSERT INTO doctores (nombre_cifrado, nombre_iv, especialidad, numero_licencia, numero_licencia_hash, email_cifrado, email_iv, telefono_cifrado, telefono_iv, dias_disponibles, hora_inicio, hora_fin)
VALUES 
    ('enc_Dra_Maria_Garcia_Lopez', 'iv_nom_d001', 'Medicina General', 'MED-2024-001', encode(digest('MED-2024-001', 'sha256'), 'hex'), 'enc_dra.garcia@medcomlabs.com', 'iv_email_d001', 'enc_+507_6001-1111', 'iv_tel_d001', '{"lunes","martes","miercoles","jueves","viernes"}', '08:00', '17:00'),
    ('enc_Dr_Carlos_Rodriguez_Perez', 'iv_nom_d002', 'Cardiología', 'MED-2024-002', encode(digest('MED-2024-002', 'sha256'), 'hex'), 'enc_dr.rodriguez@medcomlabs.com', 'iv_email_d002', 'enc_+507_6002-2222', 'iv_tel_d002', '{"lunes","miercoles","viernes"}', '09:00', '16:00'),
    ('enc_Dra_Ana_Martinez_Ruiz', 'iv_nom_d003', 'Pediatría', 'MED-2024-003', encode(digest('MED-2024-003', 'sha256'), 'hex'), 'enc_dra.martinez@medcomlabs.com', 'iv_email_d003', 'enc_+507_6003-3333', 'iv_tel_d003', '{"lunes","martes","jueves"}', '08:00', '14:00'),
    ('enc_Dr_Roberto_Hernandez_Silva', 'iv_nom_d004', 'Traumatología', 'MED-2024-004', encode(digest('MED-2024-004', 'sha256'), 'hex'), 'enc_dr.hernandez@medcomlabs.com', 'iv_email_d004', 'enc_+507_6004-4444', 'iv_tel_d004', '{"martes","jueves","viernes"}', '10:00', '18:00'),
    ('enc_Dra_Laura_Sanchez_Mendoza', 'iv_nom_d005', 'Dermatología', 'MED-2024-005', encode(digest('MED-2024-005', 'sha256'), 'hex'), 'enc_dra.sanchez@medcomlabs.com', 'iv_email_d005', 'enc_+507_6005-5555', 'iv_tel_d005', '{"lunes","miercoles","viernes"}', '08:00', '15:00'),
    ('enc_Dr_Pendiente_Aprobacion', 'iv_nom_d099', 'Medicina Interna', 'MED-2024-099', encode(digest('MED-2024-099', 'sha256'), 'hex'), 'enc_dr.pendiente@medcomlabs.com', 'iv_email_d099', 'enc_+507_6099-9999', 'iv_tel_d099', '{"lunes","martes","miercoles","jueves","viernes"}', '08:00', '17:00')
ON CONFLICT (numero_licencia_hash) DO NOTHING;

-- CREDENCIALES DE DOCTORES
-- El email aquí es en texto plano para login
INSERT INTO credenciales_doctores (doctor_id, email, password_hash, esta_aprobado, esta_activo, email_verificado, fecha_aprobacion)
VALUES
    ((SELECT id FROM doctores WHERE numero_licencia_hash = encode(digest('MED-2024-001', 'sha256'), 'hex')), 'dra.garcia@medcomlabs.com', '$2b$10$Kk1rSQmmI9u6ZlR0hz7zcuw.Rx2oQwNlncyd1HTAjj0rrnvVb017W', TRUE, TRUE, TRUE, NOW()),
    ((SELECT id FROM doctores WHERE numero_licencia_hash = encode(digest('MED-2024-002', 'sha256'), 'hex')), 'dr.rodriguez@medcomlabs.com', '$2b$10$Kk1rSQmmI9u6ZlR0hz7zcuw.Rx2oQwNlncyd1HTAjj0rrnvVb017W', TRUE, TRUE, TRUE, NOW()),
    ((SELECT id FROM doctores WHERE numero_licencia_hash = encode(digest('MED-2024-003', 'sha256'), 'hex')), 'dra.martinez@medcomlabs.com', '$2b$10$Kk1rSQmmI9u6ZlR0hz7zcuw.Rx2oQwNlncyd1HTAjj0rrnvVb017W', TRUE, TRUE, TRUE, NOW()),
    ((SELECT id FROM doctores WHERE numero_licencia_hash = encode(digest('MED-2024-004', 'sha256'), 'hex')), 'dr.hernandez@medcomlabs.com', '$2b$10$Kk1rSQmmI9u6ZlR0hz7zcuw.Rx2oQwNlncyd1HTAjj0rrnvVb017W', TRUE, TRUE, TRUE, NOW()),
    ((SELECT id FROM doctores WHERE numero_licencia_hash = encode(digest('MED-2024-005', 'sha256'), 'hex')), 'dra.sanchez@medcomlabs.com', '$2b$10$Kk1rSQmmI9u6ZlR0hz7zcuw.Rx2oQwNlncyd1HTAjj0rrnvVb017W', TRUE, TRUE, TRUE, NOW()),
    ((SELECT id FROM doctores WHERE numero_licencia_hash = encode(digest('MED-2024-099', 'sha256'), 'hex')), 'dr.pendiente@medcomlabs.com', '$2b$10$Kk1rSQmmI9u6ZlR0hz7zcuw.Rx2oQwNlncyd1HTAjj0rrnvVb017W', FALSE, TRUE, FALSE, NULL)
ON CONFLICT (email) DO NOTHING;

-- SOLICITUD DE REGISTRO PENDIENTE
INSERT INTO solicitudes_registro_doctores (nombre, email, email_hash, password_hash, especialidad, numero_licencia, numero_licencia_hash, telefono, estado)
VALUES 
    ('Dr. Juan Pérez Gómez', 'dr.perez@gmail.com', encode(digest('dr.perez@gmail.com', 'sha256'), 'hex'), '$2b$10$Kk1rSQmmI9u6ZlR0hz7zcuw.Rx2oQwNlncyd1HTAjj0rrnvVb017W', 'Neurología', 'MED-2024-010', encode(digest('MED-2024-010', 'sha256'), 'hex'), '+507 6010-0000', 'pendiente')
ON CONFLICT (email_hash) DO NOTHING;

-- PACIENTES (datos cifrados simulados)
INSERT INTO pacientes (cedula_hash, cedula_encrypted, cedula_iv, nombre_encrypted, nombre_iv, email_encrypted, email_iv, telefono_encrypted, telefono_iv, codigo_acceso, codigo_acceso_hash, fecha_nacimiento, tipo_sangre, alergias_encrypted, alergias_iv)
VALUES 
    ('hash_8-888-1111', 'enc_8-888-1111', 'iv_ced_001', 'enc_Juan_Pérez_López', 'iv_nom_001', 'enc_juan@email.com', 'iv_email_001', 'enc_+507_6111_1111', 'iv_tel_001', 'ACC001', encode(digest('ACC001', 'sha256'), 'hex'), '1985-03-15', 'O+', 'enc_Penicilina', 'iv_alerg_001'),
    ('hash_8-888-2222', 'enc_8-888-2222', 'iv_ced_002', 'enc_María_González_Ruiz', 'iv_nom_002', 'enc_maria@email.com', 'iv_email_002', 'enc_+507_6222_2222', 'iv_tel_002', 'ACC002', encode(digest('ACC002', 'sha256'), 'hex'), '1990-07-22', 'A+', NULL, NULL),
    ('hash_8-888-3333', 'enc_8-888-3333', 'iv_ced_003', 'enc_Carlos_Rodríguez_Díaz', 'iv_nom_003', 'enc_carlos@email.com', 'iv_email_003', 'enc_+507_6333_3333', 'iv_tel_003', 'ACC003', encode(digest('ACC003', 'sha256'), 'hex'), '1978-11-08', 'B-', 'enc_Aspirina_Mariscos', 'iv_alerg_003'),
    ('hash_8-888-4444', 'enc_8-888-4444', 'iv_ced_004', 'enc_Ana_Martínez_Soto', 'iv_nom_004', 'enc_ana@email.com', 'iv_email_004', 'enc_+507_6444_4444', 'iv_tel_004', 'ACC004', encode(digest('ACC004', 'sha256'), 'hex'), '1995-01-30', 'AB+', NULL, NULL)
ON CONFLICT (cedula_hash) DO NOTHING;

-- CITAS (usando subqueries para obtener IDs)
INSERT INTO citas (numero_turno, numero_turno_hash, paciente_id, doctor_id, departamento, fecha_cita, hora_cita, tipo_consulta, estado, prioridad, motivo_consulta)
SELECT 
    'TUR-2026-001',
    encode(digest('TUR-2026-001', 'sha256'), 'hex'),
    (SELECT id FROM pacientes WHERE codigo_acceso_hash = encode(digest('ACC001', 'sha256'), 'hex')),
    (SELECT id FROM doctores WHERE numero_licencia_hash = encode(digest('MED-2024-001', 'sha256'), 'hex')),
    'Medicina General',
    CURRENT_DATE,
    '09:00'::TIME,
    'control',
    'programada',
    5,
    'Control rutinario'
WHERE NOT EXISTS (SELECT 1 FROM citas WHERE numero_turno_hash = encode(digest('TUR-2026-001', 'sha256'), 'hex'));

INSERT INTO citas (numero_turno, numero_turno_hash, paciente_id, doctor_id, departamento, fecha_cita, hora_cita, tipo_consulta, estado, prioridad, motivo_consulta)
SELECT 
    'TUR-2026-002',
    encode(digest('TUR-2026-002', 'sha256'), 'hex'),
    (SELECT id FROM pacientes WHERE codigo_acceso_hash = encode(digest('ACC002', 'sha256'), 'hex')),
    (SELECT id FROM doctores WHERE numero_licencia_hash = encode(digest('MED-2024-001', 'sha256'), 'hex')),
    'Medicina General',
    CURRENT_DATE,
    '09:30'::TIME,
    'primera_vez',
    'confirmada',
    5,
    'Dolor de cabeza frecuente'
WHERE NOT EXISTS (SELECT 1 FROM citas WHERE numero_turno_hash = encode(digest('TUR-2026-002', 'sha256'), 'hex'));

INSERT INTO citas (numero_turno, numero_turno_hash, paciente_id, doctor_id, departamento, fecha_cita, hora_cita, tipo_consulta, estado, prioridad, motivo_consulta)
SELECT 
    'TUR-2026-003',
    encode(digest('TUR-2026-003', 'sha256'), 'hex'),
    (SELECT id FROM pacientes WHERE codigo_acceso_hash = encode(digest('ACC003', 'sha256'), 'hex')),
    (SELECT id FROM doctores WHERE numero_licencia_hash = encode(digest('MED-2024-002', 'sha256'), 'hex')),
    'Cardiología',
    CURRENT_DATE,
    '10:00'::TIME,
    'control',
    'programada',
    7,
    'Seguimiento hipertensión'
WHERE NOT EXISTS (SELECT 1 FROM citas WHERE numero_turno_hash = encode(digest('TUR-2026-003', 'sha256'), 'hex'));

INSERT INTO citas (numero_turno, numero_turno_hash, paciente_id, doctor_id, departamento, fecha_cita, hora_cita, tipo_consulta, estado, prioridad, motivo_consulta)
SELECT 
    'TUR-2026-004',
    encode(digest('TUR-2026-004', 'sha256'), 'hex'),
    (SELECT id FROM pacientes WHERE codigo_acceso_hash = encode(digest('ACC004', 'sha256'), 'hex')),
    (SELECT id FROM doctores WHERE numero_licencia_hash = encode(digest('MED-2024-003', 'sha256'), 'hex')),
    'Pediatría',
    CURRENT_DATE + 1,
    '08:30'::TIME,
    'emergencia',
    'programada',
    8,
    'Fiebre alta'
WHERE NOT EXISTS (SELECT 1 FROM citas WHERE numero_turno_hash = encode(digest('TUR-2026-004', 'sha256'), 'hex'));

INSERT INTO citas (numero_turno, numero_turno_hash, paciente_id, doctor_id, departamento, fecha_cita, hora_cita, tipo_consulta, estado, prioridad, motivo_consulta)
SELECT 
    'TUR-2026-005',
    encode(digest('TUR-2026-005', 'sha256'), 'hex'),
    (SELECT id FROM pacientes WHERE codigo_acceso_hash = encode(digest('ACC001', 'sha256'), 'hex')),
    (SELECT id FROM doctores WHERE numero_licencia_hash = encode(digest('MED-2024-001', 'sha256'), 'hex')),
    'Medicina General',
    CURRENT_DATE + 2,
    '11:00'::TIME,
    'seguimiento',
    'programada',
    4,
    'Revisión de exámenes'
WHERE NOT EXISTS (SELECT 1 FROM citas WHERE numero_turno_hash = encode(digest('TUR-2026-005', 'sha256'), 'hex'));

-- RESULTADOS DE LABORATORIO
INSERT INTO resultados_laboratorio (paciente_id, nombre_examen, tipo_examen, estado, prioridad, fecha_orden, fecha_completado, ordenado_por, interpretacion)
SELECT 
    (SELECT id FROM pacientes WHERE codigo_acceso_hash = encode(digest('ACC001', 'sha256'), 'hex')),
    'Hemograma Completo',
    'hematologia',
    'completado',
    'normal',
    CURRENT_DATE - 5,
    CURRENT_DATE - 3,
    (SELECT id FROM doctores WHERE numero_licencia_hash = encode(digest('MED-2024-001', 'sha256'), 'hex')),
    'Valores dentro de parámetros normales';

INSERT INTO resultados_laboratorio (paciente_id, nombre_examen, tipo_examen, estado, prioridad, fecha_orden, fecha_completado, ordenado_por, interpretacion)
SELECT 
    (SELECT id FROM pacientes WHERE codigo_acceso_hash = encode(digest('ACC001', 'sha256'), 'hex')),
    'Glucosa en Ayunas',
    'bioquimica',
    'completado',
    'normal',
    CURRENT_DATE - 5,
    CURRENT_DATE - 3,
    (SELECT id FROM doctores WHERE numero_licencia_hash = encode(digest('MED-2024-001', 'sha256'), 'hex')),
    'Glucosa: 95 mg/dL - Normal';

INSERT INTO resultados_laboratorio (paciente_id, nombre_examen, tipo_examen, estado, prioridad, fecha_orden, ordenado_por)
SELECT 
    (SELECT id FROM pacientes WHERE codigo_acceso_hash = encode(digest('ACC002', 'sha256'), 'hex')),
    'Perfil Lipídico',
    'bioquimica',
    'pendiente',
    'alta',
    CURRENT_DATE - 1,
    (SELECT id FROM doctores WHERE numero_licencia_hash = encode(digest('MED-2024-001', 'sha256'), 'hex'));

INSERT INTO resultados_laboratorio (paciente_id, nombre_examen, tipo_examen, estado, prioridad, fecha_orden, ordenado_por)
SELECT 
    (SELECT id FROM pacientes WHERE codigo_acceso_hash = encode(digest('ACC003', 'sha256'), 'hex')),
    'Electrocardiograma',
    'otro',
    'en_proceso',
    'urgente',
    CURRENT_DATE,
    (SELECT id FROM doctores WHERE numero_licencia_hash = encode(digest('MED-2024-002', 'sha256'), 'hex'));

INSERT INTO resultados_laboratorio (paciente_id, nombre_examen, tipo_examen, estado, prioridad, fecha_orden, fecha_completado, ordenado_por, interpretacion)
SELECT 
    (SELECT id FROM pacientes WHERE codigo_acceso_hash = encode(digest('ACC004', 'sha256'), 'hex')),
    'Examen de Orina',
    'urinalisis',
    'completado',
    'normal',
    CURRENT_DATE - 2,
    CURRENT_DATE - 1,
    (SELECT id FROM doctores WHERE numero_licencia_hash = encode(digest('MED-2024-003', 'sha256'), 'hex')),
    'Sin alteraciones';

-- NOTIFICACIONES DE BIENVENIDA
INSERT INTO notificaciones (destinatario_id, tipo_destinatario, titulo, mensaje, tipo, prioridad, leida)
SELECT 
    id,
    'doctor',
    'Bienvenida al sistema',
    'Bienvenido(a) al sistema MedComLabs. Su especialidad: ' || especialidad || '.',
    'sistema',
    'normal',
    FALSE
FROM doctores
WHERE numero_licencia_hash IN (
    encode(digest('MED-2024-001', 'sha256'), 'hex'),
    encode(digest('MED-2024-002', 'sha256'), 'hex'),
    encode(digest('MED-2024-003', 'sha256'), 'hex')
);

-- VERIFICACIÓN
DO $$
DECLARE
    v_doctores INTEGER;
    v_pacientes INTEGER;
    v_citas INTEGER;
    v_credenciales INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_doctores FROM doctores;
    SELECT COUNT(*) INTO v_pacientes FROM pacientes;
    SELECT COUNT(*) INTO v_citas FROM citas;
    SELECT COUNT(*) INTO v_credenciales FROM credenciales_doctores;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Datos de prueba insertados correctamente';
    RAISE NOTICE 'Resumen:';
    RAISE NOTICE '   - Doctores: %', v_doctores;
    RAISE NOTICE '   - Credenciales: %', v_credenciales;
    RAISE NOTICE '   - Pacientes: %', v_pacientes;
    RAISE NOTICE '   - Citas: %', v_citas;
    RAISE NOTICE '';
    RAISE NOTICE 'CREDENCIALES DE PRUEBA:';
    RAISE NOTICE '   Email: dra.garcia@medcomlabs.com | Password: doctor123 (APROBADA)';
    RAISE NOTICE '   Email: dr.rodriguez@medcomlabs.com | Password: doctor123 (APROBADA)';
    RAISE NOTICE '   Email: dr.pendiente@medcomlabs.com | Password: doctor123 (NO APROBADA)';
END $$;
