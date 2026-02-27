-- CASO 1: Sistema Empresarial de Servicios Digitales

CREATE DATABASE IF NOT EXISTS servicios_digitales
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE servicios_digitales;

-- 1. paises
CREATE TABLE IF NOT EXISTS paises
(
    id_pais    INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nombre     VARCHAR(100) NOT NULL,
    codigo_iso CHAR(3)      NOT NULL,
    activo     TINYINT(1)   NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
    CONSTRAINT uq_codigo_iso UNIQUE (codigo_iso)
);

-- 2. ciudades
CREATE TABLE IF NOT EXISTS ciudades
(
    id_ciudad INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nombre    VARCHAR(100) NOT NULL,
    id_pais   INT UNSIGNED NOT NULL,
    activo    TINYINT(1)   NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
    CONSTRAINT fk_ciu_pais FOREIGN KEY (id_pais)
        REFERENCES paises (id_pais) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- 3. roles
CREATE TABLE IF NOT EXISTS roles
(
    id_rol       INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nombre       VARCHAR(50)  NOT NULL,
    descripcion  VARCHAR(200),
    nivel_acceso INT          NOT NULL DEFAULT 1 CHECK (nivel_acceso BETWEEN 1 AND 10),
    es_admin     TINYINT(1)   NOT NULL DEFAULT 0 CHECK (es_admin IN (0, 1)),
    CONSTRAINT uq_rol_nombre UNIQUE (nombre)
);

-- 4. usuarios
CREATE TABLE IF NOT EXISTS usuarios
(
    id_usuario     INT UNSIGNED                            NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nombre         VARCHAR(50)                             NOT NULL,
    apellido       VARCHAR(50)                             NOT NULL,
    email          VARCHAR(100)                            NOT NULL,
    telefono       VARCHAR(20),
    fecha_registro DATE                                    NOT NULL DEFAULT (CURRENT_DATE),
    id_ciudad      INT UNSIGNED,
    estado         ENUM ('activo','inactivo','suspendido') NOT NULL DEFAULT 'activo',
    es_activo      TINYINT(1)                              NOT NULL DEFAULT 1 CHECK (es_activo IN (0, 1)),
    CONSTRAINT uq_email UNIQUE (email),
    CONSTRAINT fk_usr_ciudad FOREIGN KEY (id_ciudad)
        REFERENCES ciudades (id_ciudad) ON UPDATE CASCADE ON DELETE SET NULL
);

-- 5. autenticacion
CREATE TABLE IF NOT EXISTS autenticacion
(
    id_auth           INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    id_usuario        INT UNSIGNED NOT NULL,
    contrasena_hash   VARCHAR(255) NOT NULL,
    token_sesion      VARCHAR(500),
    ultimo_acceso     DATETIME,
    intentos_fallidos INT          NOT NULL DEFAULT 0 CHECK (intentos_fallidos >= 0),
    bloqueado         TINYINT(1)   NOT NULL DEFAULT 0 CHECK (bloqueado IN (0, 1)),
    CONSTRAINT uq_auth_usuario UNIQUE (id_usuario),
    CONSTRAINT fk_auth_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE CASCADE
);

-- 6. usuario_roles
CREATE TABLE IF NOT EXISTS usuario_roles
(
    id_usr_rol       INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    id_usuario       INT UNSIGNED NOT NULL,
    id_rol           INT UNSIGNED NOT NULL,
    fecha_asignacion DATE         NOT NULL DEFAULT (CURRENT_DATE),
    activo           TINYINT(1)   NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
    CONSTRAINT uq_usr_rol UNIQUE (id_usuario, id_rol),
    CONSTRAINT fk_ur_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_ur_rol FOREIGN KEY (id_rol)
        REFERENCES roles (id_rol) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- 7. permisos
CREATE TABLE IF NOT EXISTS permisos
(
    id_permiso INT UNSIGNED                                NOT NULL AUTO_INCREMENT PRIMARY KEY,
    id_rol     INT UNSIGNED                                NOT NULL,
    recurso    VARCHAR(100)                                NOT NULL,
    accion     ENUM ('leer','escribir','eliminar','admin') NOT NULL DEFAULT 'leer',
    permitido  TINYINT(1)                                  NOT NULL DEFAULT 1 CHECK (permitido IN (0, 1)),
    CONSTRAINT uq_permiso UNIQUE (id_rol, recurso, accion),
    CONSTRAINT fk_per_rol FOREIGN KEY (id_rol)
        REFERENCES roles (id_rol) ON UPDATE CASCADE ON DELETE CASCADE
);

-- 8. servicios
CREATE TABLE IF NOT EXISTS servicios
(
    id_servicio    INT UNSIGNED                       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nombre         VARCHAR(100)                       NOT NULL,
    descripcion    TEXT,
    precio_mensual DECIMAL(10, 2)                     NOT NULL CHECK (precio_mensual >= 0),
    tipo           ENUM ('basico','pro','enterprise') NOT NULL DEFAULT 'basico',
    activo         TINYINT(1)                         NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
    max_usuarios   INT                                NOT NULL DEFAULT 1 CHECK (max_usuarios > 0),
    CONSTRAINT uq_svc_nombre UNIQUE (nombre)
);

-- 9. contratos
CREATE TABLE IF NOT EXISTS contratos
(
    id_contrato  INT UNSIGNED                                    NOT NULL AUTO_INCREMENT PRIMARY KEY,
    id_usuario   INT UNSIGNED                                    NOT NULL,
    id_servicio  INT UNSIGNED                                    NOT NULL,
    fecha_inicio DATE                                            NOT NULL,
    fecha_fin    DATE,
    estado       ENUM ('activo','cancelado','vencido','pausado') NOT NULL DEFAULT 'activo',
    auto_renovar TINYINT(1)                                      NOT NULL DEFAULT 1 CHECK (auto_renovar IN (0, 1)),
    CONSTRAINT fk_con_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_con_servicio FOREIGN KEY (id_servicio)
        REFERENCES servicios (id_servicio) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_fechas CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);

-- 10. pagos
CREATE TABLE IF NOT EXISTS pagos
(
    id_pago      INT UNSIGNED                                                  NOT NULL AUTO_INCREMENT PRIMARY KEY,
    id_contrato  INT UNSIGNED                                                  NOT NULL,
    id_usuario   INT UNSIGNED                                                  NOT NULL,
    monto        DECIMAL(10, 2)                                                NOT NULL CHECK (monto > 0),
    fecha_pago   DATETIME                                                      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metodo_pago  ENUM ('tarjeta','transferencia','efectivo','paypal','cripto') NOT NULL DEFAULT 'tarjeta',
    estado_pago  ENUM ('completado','pendiente','fallido','reembolsado')       NOT NULL DEFAULT 'pendiente',
    es_reembolso TINYINT(1)                                                    NOT NULL DEFAULT 0 CHECK (es_reembolso IN (0, 1)),
    referencia   VARCHAR(100),
    CONSTRAINT uq_referencia UNIQUE (referencia),
    CONSTRAINT fk_pag_contrato FOREIGN KEY (id_contrato)
        REFERENCES contratos (id_contrato) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_pag_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- 11. auditoria
CREATE TABLE IF NOT EXISTS auditoria
(
    id_auditoria   INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    id_usuario     INT UNSIGNED,
    accion         VARCHAR(100) NOT NULL,
    tabla_afectada VARCHAR(50),
    ip_origen      VARCHAR(45),
    fecha_hora     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    exitoso        TINYINT(1)   NOT NULL DEFAULT 1 CHECK (exitoso IN (0, 1)),
    detalle        TEXT,
    user_agent     VARCHAR(255),
    CONSTRAINT fk_aud_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE SET NULL
);

-- Índices
CREATE INDEX idx_usuarios_email ON usuarios (email);
CREATE INDEX idx_contratos_usuario ON contratos (id_usuario);
CREATE INDEX idx_contratos_estado ON contratos (estado);
CREATE INDEX idx_pagos_fecha ON pagos (fecha_pago);
CREATE INDEX idx_pagos_estado ON pagos (estado_pago);
CREATE INDEX idx_auditoria_usuario ON auditoria (id_usuario);
CREATE INDEX idx_auditoria_fecha ON auditoria (fecha_hora);
