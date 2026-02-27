-- CASO 1: Sistema Empresarial de Servicios Digitales

USE servicios_digitales;

-- ============================================================
-- VISTA 1: Vista de Negocio
-- Nombre: vw_dashboard_ejecutivo
-- Propósito: Consolidar usuarios + contratos + servicios + pagos
--            para dashboards de toma de decisiones. Permite ver
--            de un vistazo el estado comercial de cada cliente.
-- ============================================================
CREATE OR REPLACE VIEW vw_dashboard_ejecutivo AS
SELECT
    u.id_usuario,
    CONCAT(u.nombre, ' ', u.apellido)               AS cliente,
    u.email,
    u.estado                                        AS estado_cuenta,
    c_geo.nombre                                    AS ciudad,
    p.nombre                                        AS pais,
    s.nombre                                        AS servicio_contratado,
    s.tipo                                          AS plan,
    s.precio_mensual,
    con.fecha_inicio                                AS inicio_contrato,
    con.fecha_fin                                   AS fin_contrato,
    con.estado                                      AS estado_contrato,
    con.auto_renovar,
    COALESCE(SUM(pa.monto), 0)                      AS total_pagado,
    COUNT(DISTINCT pa.id_pago)                      AS num_pagos,
    MAX(pa.fecha_pago)                              AS ultimo_pago,
    DATEDIFF(NOW(), con.fecha_inicio)               AS dias_como_cliente
FROM usuarios u
         INNER JOIN contratos con    ON u.id_usuario     = con.id_usuario
         INNER JOIN servicios s      ON con.id_servicio  = s.id_servicio
         LEFT  JOIN pagos pa         ON con.id_contrato  = pa.id_contrato
    AND pa.estado_pago  = 'completado'
         LEFT  JOIN ciudades c_geo   ON u.id_ciudad      = c_geo.id_ciudad
         LEFT  JOIN paises p         ON c_geo.id_pais    = p.id_pais
WHERE u.es_activo = 1
GROUP BY
    u.id_usuario, u.nombre, u.apellido, u.email, u.estado,
    c_geo.nombre, p.nombre, s.nombre, s.tipo, s.precio_mensual,
    con.id_contrato, con.fecha_inicio, con.fecha_fin, con.estado, con.auto_renovar;

-- Uso de la vista de negocio:
SELECT * FROM vw_dashboard_ejecutivo ORDER BY total_pagado DESC;
SELECT cliente, servicio_contratado, plan, total_pagado FROM vw_dashboard_ejecutivo WHERE plan = 'enterprise';
SELECT pais, COUNT(*) AS clientes, SUM(total_pagado) AS ingresos FROM vw_dashboard_ejecutivo GROUP BY pais;

-- ============================================================
-- VISTA 2: Vista de Seguridad
-- Nombre: vw_usuarios_publico
-- Propósito: Exponer datos de usuarios ocultando información
--            sensible como contraseñas, tokens de sesión, IPs
--            y detalles de autenticación. Esta vista se usa
--            para capas de aplicación que no necesitan acceder
--            a datos críticos pero sí a perfil del usuario.
-- ============================================================
CREATE OR REPLACE VIEW vw_usuarios_publico AS
SELECT
    u.id_usuario,
    u.nombre,
    u.apellido,
    -- EMAIL: mostramos versión enmascarada
    CONCAT(LEFT(u.email, 2), '***@', SUBSTRING_INDEX(u.email, '@', -1))    AS email_parcial,
    -- TELÉFONO: solo últimos 4 dígitos
    CONCAT('****-****-', RIGHT(IFNULL(u.telefono, '0000'), 4))              AS telefono_parcial,
    u.fecha_registro,
    u.estado,
    u.es_activo,
    c.nombre                                                                AS ciudad,
    p.nombre                                                                AS pais,
    -- ROLES: solo los nombres, sin permisos detallados
    GROUP_CONCAT(DISTINCT r.nombre ORDER BY r.nivel_acceso SEPARATOR ', ') AS roles,
    -- SIN: contrasena_hash, token_sesion, ip_origen, intentos_fallidos
    a.ultimo_acceso,
    a.bloqueado
FROM usuarios u
         LEFT JOIN ciudades c        ON u.id_ciudad  = c.id_ciudad
         LEFT JOIN paises p          ON c.id_pais    = p.id_pais
         LEFT JOIN autenticacion a   ON u.id_usuario = a.id_usuario
         LEFT JOIN usuario_roles ur  ON u.id_usuario = ur.id_usuario AND ur.activo = 1
         LEFT JOIN roles r           ON ur.id_rol    = r.id_rol
GROUP BY
    u.id_usuario, u.nombre, u.apellido, u.email, u.telefono,
    u.fecha_registro, u.estado, u.es_activo, c.nombre, p.nombre,
    a.ultimo_acceso, a.bloqueado;

-- Uso de la vista de seguridad:
SELECT * FROM vw_usuarios_publico WHERE es_activo = 1;
SELECT nombre, apellido, email_parcial, roles FROM vw_usuarios_publico WHERE bloqueado = 0;
SELECT ciudad, pais, COUNT(*) AS usuarios FROM vw_usuarios_publico GROUP BY ciudad, pais ORDER BY usuarios DESC;

-- ============================================================
-- VISTA 3: Vista de Auditoría
-- Nombre: vw_auditoria_detallada
-- Propósito: Trazabilidad completa de acciones, accesos y
--            transacciones del sistema. Útil para revisiones
--            de cumplimiento, detección de anomalías y
--            seguimiento de cambios críticos.
-- ============================================================
CREATE OR REPLACE VIEW vw_auditoria_detallada AS
SELECT
    aud.id_auditoria,
    aud.fecha_hora,
    CONCAT(IFNULL(u.nombre,'Sistema'), ' ', IFNULL(u.apellido,''))  AS usuario_responsable,
    u.email                                                          AS email_usuario,
    aud.accion                                                       AS tipo_accion,
    aud.tabla_afectada                                               AS recurso_afectado,
    aud.ip_origen,
    aud.exitoso,
    CASE aud.exitoso
        WHEN 1 THEN 'Exitoso'
        WHEN 0 THEN 'Fallido'
        END                                                             AS resultado_legible,
    aud.detalle,
    aud.user_agent,
    u.estado                                                        AS estado_cuenta_usuario,
    -- Tiempo desde el evento
    TIMESTAMPDIFF(HOUR, aud.fecha_hora, NOW())                      AS horas_desde_evento,
    CASE
        WHEN aud.accion IN ('DELETE','SOFT_DELETE')  THEN 'CRITICO'
        WHEN aud.accion IN ('UPDATE','ALTER TABLE')  THEN 'MEDIO'
        WHEN aud.exitoso = 0                         THEN 'ALERTA'
        ELSE                                              'INFO'
        END                                                             AS nivel_evento
FROM auditoria aud
         LEFT JOIN usuarios u ON aud.id_usuario = u.id_usuario;

-- Uso de la vista de auditoría:
SELECT * FROM vw_auditoria_detallada ORDER BY fecha_hora DESC LIMIT 20;
SELECT * FROM vw_auditoria_detallada WHERE nivel_evento IN ('CRITICO', 'ALERTA') ORDER BY fecha_hora DESC;
SELECT * FROM vw_auditoria_detallada WHERE exitoso = 0 AND fecha_hora >= DATE_SUB(NOW(), INTERVAL 7 DAY);
SELECT usuario_responsable, tipo_accion, COUNT(*) AS veces FROM vw_auditoria_detallada GROUP BY usuario_responsable, tipo_accion ORDER BY veces DESC;
SELECT DATE(fecha_hora) AS dia, nivel_evento, COUNT(*) AS eventos FROM vw_auditoria_detallada GROUP BY dia, nivel_evento ORDER BY dia DESC;
