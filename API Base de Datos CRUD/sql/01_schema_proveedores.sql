CREATE DATABASE IF NOT EXISTS proveedores_db;
USE proveedores_db;

CREATE TABLE IF NOT EXISTS proveedores (
  id INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(120) NOT NULL,
  ruc VARCHAR(40) NOT NULL UNIQUE,
  telefono VARCHAR(30) NULL,
  email VARCHAR(120) NULL,
  direccion VARCHAR(255) NULL,
  estado ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

INSERT INTO proveedores (nombre, ruc, telefono, email, direccion, estado) VALUES
  ('Servicios Industriales del Istmo', '1550123-1-12345', '+50760000001', 'contacto@serviciosistmo.com', 'Via Espana, Panama', 'ACTIVO'),
  ('Importadora del Pacifico', '1550123-1-54321', '+50760000002', 'ventas@importadorapacifico.com', 'Calle 50, Panama', 'ACTIVO');