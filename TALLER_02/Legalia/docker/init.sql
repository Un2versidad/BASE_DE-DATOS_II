CREATE TABLE roles (
    id BINARY(16) PRIMARY KEY,
    name VARCHAR(30) UNIQUE NOT NULL
);

CREATE TABLE permissions (
    id BINARY(16) PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE role_permissions (
    role_id BINARY(16) NOT NULL,
    permission_id BINARY(16) NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role_permissions_role
        FOREIGN KEY (role_id) REFERENCES roles(id),
    CONSTRAINT fk_role_permissions_permission
        FOREIGN KEY (permission_id) REFERENCES permissions(id)
);

CREATE TABLE users (
    id BINARY(16) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id BINARY(16) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT chk_users_username_len CHECK (CHAR_LENGTH(username) BETWEEN 3 AND 50),
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE aseguradoras (
    id BINARY(16) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT chk_aseguradoras_nombre_len CHECK (CHAR_LENGTH(nombre) BETWEEN 2 AND 100)
);

CREATE TABLE juzgados (
    id BINARY(16) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT chk_juzgados_nombre_len CHECK (CHAR_LENGTH(nombre) BETWEEN 2 AND 100)
);

CREATE TABLE expedientes (
    id BINARY(16) PRIMARY KEY,
    aseguradora_id BINARY(16) NOT NULL,
    juzgado_id BINARY(16) NOT NULL,
    abogado VARCHAR(100) NOT NULL,
    estado ENUM('Pendiente', 'En curso', 'Cerrado') NOT NULL,
    fecha DATE NOT NULL,
    version INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT chk_expedientes_abogado_len CHECK (CHAR_LENGTH(abogado) BETWEEN 2 AND 100),
    CONSTRAINT fk_expedientes_aseguradora FOREIGN KEY (aseguradora_id) REFERENCES aseguradoras(id),
    CONSTRAINT fk_expedientes_juzgado FOREIGN KEY (juzgado_id) REFERENCES juzgados(id)
);

CREATE TABLE expediente_versions (
    id BINARY(16) PRIMARY KEY,
    expediente_id BINARY(16) NOT NULL,
    version INT NOT NULL,
    data JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_expediente_versions_expediente
        FOREIGN KEY (expediente_id) REFERENCES expedientes(id)
);

CREATE TABLE audit_log (
    id BINARY(16) PRIMARY KEY,
    user_id BINARY(16) NULL,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id BINARY(16) NOT NULL,
    changes JSON NOT NULL,
    ip VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_deleted ON users (deleted_at);
CREATE INDEX idx_aseguradoras_deleted ON aseguradoras (deleted_at);
CREATE INDEX idx_juzgados_deleted ON juzgados (deleted_at);
CREATE INDEX idx_expedientes_fecha ON expedientes (fecha);
CREATE INDEX idx_expedientes_estado ON expedientes (estado);
CREATE INDEX idx_expedientes_deleted ON expedientes (deleted_at);
CREATE INDEX idx_expediente_versions_exp ON expediente_versions (expediente_id);
CREATE INDEX idx_audit_table_record ON audit_log (table_name, record_id);

DELIMITER //

CREATE TRIGGER trg_expedientes_after_insert
AFTER INSERT ON expedientes
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (id, user_id, action, table_name, record_id, changes, ip)
    VALUES (
        UNHEX(REPLACE(UUID(), '-', '')),
        @app_user_id,
        'CREATE',
        'expedientes',
        NEW.id,
        JSON_OBJECT('new', JSON_OBJECT(
            'id', LOWER(HEX(NEW.id)),
            'aseguradora_id', LOWER(HEX(NEW.aseguradora_id)),
            'juzgado_id', LOWER(HEX(NEW.juzgado_id)),
            'abogado', NEW.abogado,
            'estado', NEW.estado,
            'fecha', NEW.fecha
        )),
        @app_user_ip
    );
END//

CREATE TRIGGER trg_expedientes_before_update
BEFORE UPDATE ON expedientes
FOR EACH ROW
BEGIN
    INSERT INTO expediente_versions (id, expediente_id, version, data)
    VALUES (
        UNHEX(REPLACE(UUID(), '-', '')),
        OLD.id,
        OLD.version,
        JSON_OBJECT(
            'id', LOWER(HEX(OLD.id)),
            'aseguradora_id', LOWER(HEX(OLD.aseguradora_id)),
            'juzgado_id', LOWER(HEX(OLD.juzgado_id)),
            'abogado', OLD.abogado,
            'estado', OLD.estado,
            'fecha', OLD.fecha,
            'version', OLD.version,
            'created_at', OLD.created_at,
            'updated_at', OLD.updated_at,
            'deleted_at', OLD.deleted_at
        )
    );

    SET NEW.version = OLD.version + 1;
    SET NEW.updated_at = NOW();

    INSERT INTO audit_log (id, user_id, action, table_name, record_id, changes, ip)
    VALUES (
        UNHEX(REPLACE(UUID(), '-', '')),
        @app_user_id,
        'UPDATE',
        'expedientes',
        OLD.id,
        JSON_OBJECT(
            'old', JSON_OBJECT(
                'aseguradora_id', LOWER(HEX(OLD.aseguradora_id)),
                'juzgado_id', LOWER(HEX(OLD.juzgado_id)),
                'abogado', OLD.abogado,
                'estado', OLD.estado,
                'fecha', OLD.fecha,
                'version', OLD.version,
                'deleted_at', OLD.deleted_at
            ),
            'new', JSON_OBJECT(
                'aseguradora_id', LOWER(HEX(NEW.aseguradora_id)),
                'juzgado_id', LOWER(HEX(NEW.juzgado_id)),
                'abogado', NEW.abogado,
                'estado', NEW.estado,
                'fecha', NEW.fecha,
                'version', NEW.version,
                'deleted_at', NEW.deleted_at
            )
        ),
        @app_user_ip
    );
END//

DELIMITER ;
