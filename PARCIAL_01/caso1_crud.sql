-- CASO 1: Sistema Empresarial de Servicios Digitales

USE servicios_digitales;

-- ============================================================
-- C - CREATE (Inserción de un nuevo usuario)
-- Propósito: Registrar un nuevo usuario en el sistema
-- ============================================================
INSERT INTO usuarios (nombre, apellido, email, telefono, fecha_registro, id_ciudad, estado, es_activo)
VALUES ('Fernando', 'Vargas', 'fernando.vargas@nuevaempresa.com', '+507-6200-0099', CURRENT_DATE, 1, 'activo', 1);

-- También registramos su autenticación inmediatamente (práctica real)
INSERT INTO autenticacion (id_usuario, contrasena_hash, intentos_fallidos, bloqueado)
VALUES (LAST_INSERT_ID(), '$2b$12$hashfernandovargas123456789abcde', 0, 0);

-- Le asignamos un rol de cliente por defecto
INSERT INTO usuario_roles (id_usuario, id_rol, fecha_asignacion, activo)
VALUES ((SELECT id_usuario FROM usuarios WHERE email = 'fernando.vargas@nuevaempresa.com'), 9, CURRENT_DATE, 1);

-- Registro en auditoría
INSERT INTO auditoria (id_usuario, accion, tabla_afectada, ip_origen, fecha_hora, exitoso, detalle)
VALUES (13, 'INSERT', 'usuarios', '192.168.1.1', NOW(), 1, 'Nuevo usuario creado: fernando.vargas@nuevaempresa.com');

-- ============================================================
-- R - READ (Consultas filtradas)
-- Propósito: Leer información de usuarios con criterios específicos
-- ============================================================

-- Consulta 1: Usuarios activos con sus ciudades y países
SELECT
    u.id_usuario,
    CONCAT(u.nombre, ' ', u.apellido)   AS nombre_completo,
    u.email,
    u.estado,
    c.nombre                            AS ciudad,
    p.nombre                            AS pais,
    u.fecha_registro
FROM usuarios u
         LEFT JOIN ciudades c ON u.id_ciudad = c.id_ciudad
         LEFT JOIN paises p   ON c.id_pais   = p.id_pais
WHERE u.es_activo = 1
ORDER BY u.fecha_registro DESC;

-- Consulta 2: Usuarios con sus contratos activos y servicios
SELECT
    CONCAT(u.nombre, ' ', u.apellido)   AS usuario,
    s.nombre                            AS servicio,
    s.tipo                              AS plan,
    con.fecha_inicio,
    con.fecha_fin,
    con.estado                          AS estado_contrato,
    s.precio_mensual
FROM contratos con
         INNER JOIN usuarios u   ON con.id_usuario  = u.id_usuario
         INNER JOIN servicios s  ON con.id_servicio = s.id_servicio
WHERE con.estado = 'activo'
ORDER BY u.apellido;

-- Consulta 3: Resumen de pagos por usuario (últimos 12 meses)
SELECT
    CONCAT(u.nombre, ' ', u.apellido)   AS usuario,
    COUNT(pa.id_pago)                   AS total_pagos,
    SUM(pa.monto)                       AS monto_total,
    MAX(pa.fecha_pago)                  AS ultimo_pago
FROM usuarios u
         INNER JOIN pagos pa ON u.id_usuario = pa.id_usuario
WHERE pa.estado_pago = 'completado'
  AND pa.fecha_pago >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
GROUP BY u.id_usuario
ORDER BY monto_total DESC;

-- ============================================================
-- U - UPDATE (Actualización controlada)
    -- Propósito: Actualizar datos específicos de usuarios
-- ============================================================

-- Actualización 1: Cambiar teléfono de usuario (autoservicio normal)
UPDATE usuarios
SET telefono = '+507-6999-0099'
WHERE email = 'carlos.rodriguez@email.com';

-- Actualización 2: Cambiar estado de un usuario a suspendido (acción administrativa)
UPDATE usuarios
SET estado = 'suspendido', es_activo = 0
WHERE id_usuario = 11;

-- Registrar en auditoría el cambio
INSERT INTO auditoria (id_usuario, accion, tabla_afectada, ip_origen, fecha_hora, exitoso, detalle)
VALUES (13, 'UPDATE', 'usuarios', '192.168.1.1', NOW(), 1,
        'Suspension de cuenta usuario id=11 por politica de inactividad');

-- Actualización 3: Bloquear autenticación de usuario con intentos fallidos
UPDATE autenticacion
SET bloqueado = 1, intentos_fallidos = intentos_fallidos + 1
WHERE id_usuario = (SELECT id_usuario FROM usuarios WHERE email = 'pedro.hernandez@tech.com');

-- ============================================================
-- D - DELETE (Eliminación - justificada)
-- Propósito: "Eliminar" un usuario de forma segura
-- Justificación: Se usa eliminación (soft delete) en lugar de física
-- porque los usuarios tienen contratos y pagos asociados.
-- Eliminar físicamente violaría la integridad referencial y perdería
-- el historial de auditoría, lo cual es crítico para cumplimiento legal.
-- ============================================================

-- ELIMINACIÓN ( preserva historial)
UPDATE usuarios
SET estado = 'inactivo', es_activo = 0
WHERE email = 'fernando.vargas@nuevaempresa.com';

UPDATE autenticacion
SET bloqueado = 1, token_sesion = NULL
WHERE id_usuario = (SELECT id_usuario FROM usuarios WHERE email = 'fernando.vargas@nuevaempresa.com');

-- Registrar baja en auditoría
INSERT INTO auditoria (id_usuario, accion, tabla_afectada, ip_origen, fecha_hora, exitoso, detalle)
VALUES (13, 'SOFT_DELETE', 'usuarios', '192.168.1.1', NOW(), 1,
        'Baja logica de usuario: fernando.vargas@nuevaempresa.com - solicitud propia');

-- Si se quisiera eliminar físicamente (SOLO para registros de prueba sin relaciones):
-- DELETE FROM usuarios WHERE email = 'test@delete.com' AND id_usuario NOT IN (SELECT id_usuario FROM contratos);
