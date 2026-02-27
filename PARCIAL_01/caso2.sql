-- CASO 2: Sistema de Punto de Ventas

CREATE DATABASE IF NOT EXISTS punto_ventas
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE punto_ventas;

-- 1. lineasproductos
CREATE TABLE IF NOT EXISTS lineasproductos
(
    id_linea_producto INT                                                            NOT NULL AUTO_INCREMENT,
    nombre_linea      VARCHAR(50)                                                    NOT NULL,
    texto_descripcion TEXT,
    html_descripcion  TEXT,
    imagen            VARCHAR(255),
    categoria         ENUM ('vehiculos','accesorios','electronica','oficina','otro') NOT NULL DEFAULT 'otro',
    destacado         TINYINT(1)                                                     NOT NULL DEFAULT 0 CHECK (destacado IN (0, 1)),
    PRIMARY KEY (id_linea_producto),
    CONSTRAINT uq_linea_nom UNIQUE (nombre_linea)
);

-- 2. productos
CREATE TABLE IF NOT EXISTS productos
(
    id_producto       VARCHAR(15)                                              NOT NULL,
    nombre_producto   VARCHAR(70)                                              NOT NULL,
    id_linea_producto INT                                                      NOT NULL,
    escala            VARCHAR(10)                                              NOT NULL,
    cantidad          INT                                                      NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
    precio_venta      DECIMAL(10, 2)                                           NOT NULL CHECK (precio_venta >= 0),
    msrp              DECIMAL(10, 2)                                           NOT NULL CHECK (msrp >= 0),
    estado_inventario ENUM ('disponible','agotado','descontinuado','preventa') NOT NULL DEFAULT 'disponible',
    es_nuevo          TINYINT(1)                                               NOT NULL DEFAULT 1 CHECK (es_nuevo IN (0, 1)),
    PRIMARY KEY (id_producto),
    CONSTRAINT uq_prod_nombre UNIQUE (nombre_producto),
    CONSTRAINT fk_prod_linea FOREIGN KEY (id_linea_producto)
        REFERENCES lineasproductos (id_linea_producto)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

-- 3. oficinas
CREATE TABLE IF NOT EXISTS oficinas
(
    id_oficina    VARCHAR(10)                                        NOT NULL,
    ciudad        VARCHAR(50)                                        NOT NULL,
    telefono      VARCHAR(50)                                        NOT NULL,
    direccion     VARCHAR(100),
    departamento  VARCHAR(50),
    pais          VARCHAR(50)                                        NOT NULL,
    codigo_postal VARCHAR(15),
    continente    VARCHAR(20),
    tipo_oficina  ENUM ('principal','regional','sucursal','virtual') NOT NULL DEFAULT 'sucursal',
    activa        TINYINT(1)                                         NOT NULL DEFAULT 1 CHECK (activa IN (0, 1)),
    PRIMARY KEY (id_oficina)
);

-- 4. empleados
CREATE TABLE IF NOT EXISTS empleados
(
    documento   INT                                                   NOT NULL,
    apellido    VARCHAR(50)                                           NOT NULL,
    nombre      VARCHAR(50)                                           NOT NULL,
    extension   VARCHAR(10),
    email       VARCHAR(100)                                          NOT NULL,
    id_oficina  VARCHAR(10)                                           NOT NULL,
    jefe        INT,
    cargo       VARCHAR(50),
    nivel_cargo ENUM ('junior','senior','lider','gerente','director') NOT NULL DEFAULT 'junior',
    activo      TINYINT(1)                                            NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
    PRIMARY KEY (documento),
    CONSTRAINT uq_emp_email UNIQUE (email),
    CONSTRAINT fk_emp_oficina FOREIGN KEY (id_oficina)
        REFERENCES oficinas (id_oficina) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_emp_jefe FOREIGN KEY (jefe)
        REFERENCES empleados (documento) ON UPDATE CASCADE ON DELETE SET NULL
);

-- 5. clientes
CREATE TABLE IF NOT EXISTS clientes
(
    id_cliente       INT                                                         NOT NULL AUTO_INCREMENT,
    empresa          VARCHAR(50)                                                 NOT NULL,
    apellido         VARCHAR(50)                                                 NOT NULL,
    nombre           VARCHAR(50)                                                 NOT NULL,
    telefono         VARCHAR(50),
    direccion        VARCHAR(100),
    ciudad           VARCHAR(50),
    departamento     VARCHAR(50),
    codigo_postal    VARCHAR(15),
    pais             VARCHAR(50)                                                 NOT NULL,
    empleado_atiende INT,
    limite_credito   DECIMAL(12, 2),
    tipo_cliente     ENUM ('minorista','mayorista','corporativo','distribuidor') NOT NULL DEFAULT 'minorista',
    vip              TINYINT(1)                                                  NOT NULL DEFAULT 0 CHECK (vip IN (0, 1)),
    PRIMARY KEY (id_cliente),
    CONSTRAINT fk_cli_empleado FOREIGN KEY (empleado_atiende)
        REFERENCES empleados (documento) ON UPDATE CASCADE ON DELETE SET NULL
);

-- 6. ordenes
CREATE TABLE IF NOT EXISTS ordenes
(
    id_orden             INT                                    NOT NULL AUTO_INCREMENT,
    fecha_recibido       DATE                                   NOT NULL,
    fecha_limite_entrega DATE                                   NOT NULL,
    fecha_entrega        DATE,
    estado               VARCHAR(20)                            NOT NULL DEFAULT 'En Proceso',
    observacion          TEXT,
    id_cliente           INT                                    NOT NULL,
    prioridad            ENUM ('baja','media','alta','urgente') NOT NULL DEFAULT 'media',
    enviado              TINYINT(1)                             NOT NULL DEFAULT 0 CHECK (enviado IN (0, 1)),
    PRIMARY KEY (id_orden),
    CONSTRAINT fk_ord_cliente FOREIGN KEY (id_cliente)
        REFERENCES clientes (id_cliente) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_fechas_ord CHECK (fecha_entrega IS NULL OR fecha_entrega >= fecha_recibido)
);

-- 7. detallesordenes
CREATE TABLE IF NOT EXISTS detallesordenes
(
    id_orden         INT                                           NOT NULL,
    id_producto      VARCHAR(15)                                   NOT NULL,
    cantidad_pedida  INT                                           NOT NULL CHECK (cantidad_pedida > 0),
    valor_unitario   DECIMAL(10, 2)                                NOT NULL CHECK (valor_unitario >= 0),
    orden_entrega    INT,
    aplica_descuento ENUM ('sin_descuento','5%','10%','15%','20%') NOT NULL DEFAULT 'sin_descuento',
    entregado        TINYINT(1)                                    NOT NULL DEFAULT 0 CHECK (entregado IN (0, 1)),
    PRIMARY KEY (id_orden, id_producto),
    CONSTRAINT fk_det_orden FOREIGN KEY (id_orden)
        REFERENCES ordenes (id_orden) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_det_producto FOREIGN KEY (id_producto)
        REFERENCES productos (id_producto) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- 8. pagos
CREATE TABLE IF NOT EXISTS pagos
(
    id_cliente     INT                                                            NOT NULL,
    numero_factura VARCHAR(50)                                                    NOT NULL,
    fecha_pago     DATE                                                           NOT NULL,
    total_pago     DECIMAL(12, 2)                                                 NOT NULL CHECK (total_pago > 0),
    metodo_pago    ENUM ('efectivo','tarjeta','cheque','transferencia','credito') NOT NULL DEFAULT 'efectivo',
    confirmado     TINYINT(1)                                                     NOT NULL DEFAULT 1 CHECK (confirmado IN (0, 1)),
    PRIMARY KEY (id_cliente, numero_factura),
    CONSTRAINT uq_num_factura UNIQUE (numero_factura),
    CONSTRAINT fk_pag_cliente FOREIGN KEY (id_cliente)
        REFERENCES clientes (id_cliente) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- lineasproductos (20 registros)
INSERT INTO lineasproductos
VALUES (1, 'Motocicletas', 'Motos clasicas y modernas a escala', '/lineas/motos.html', '/img/motos.jpg', 'vehiculos',
        1),
       (2, 'Carros Clasicos', 'Coleccion de autos clasicos en miniatura', '/lineas/clasicos.html', '/img/clasicos.jpg',
        'vehiculos', 1),
       (3, 'Aviones', 'Modelos de aviacion civil y militar', '/lineas/aviones.html', '/img/aviones.jpg', 'vehiculos',
        0),
       (4, 'Barcos', 'Embarcaciones a escala coleccionables', '/lineas/barcos.html', '/img/barcos.jpg', 'vehiculos', 0),
       (5, 'Trenes', 'Locomotoras y vagones a escala', '/lineas/trenes.html', '/img/trenes.jpg', 'vehiculos', 0),
       (6, 'Camiones y Buses', 'Vehiculos pesados a escala', '/lineas/camiones.html', '/img/camiones.jpg', 'vehiculos',
        0),
       (7, 'Autos de Carrera', 'Formulas 1 y GT coleccionables', '/lineas/racing.html', '/img/racing.jpg', 'vehiculos',
        1),
       (8, 'SUVs y Pickups', 'Vehiculos de trabajo y aventura', '/lineas/suv.html', '/img/suv.jpg', 'vehiculos', 0),
       (9, 'Accesorios', 'Vitrinas, bases y accesorios para coleccion', '/lineas/acc.html', '/img/acc.jpg',
        'accesorios', 0),
       (10, 'Edicion Limitada', 'Piezas exclusivas de edicion numerada', '/lineas/ltd.html', '/img/ltd.jpg',
        'vehiculos', 1),
       (11, 'Autos Deportivos', 'Supercars y roadsters en miniatura', '/lineas/sport.html', '/img/sport.jpg',
        'vehiculos', 1),
       (12, 'Militares', 'Vehiculos y aeronaves militares historicas', '/lineas/mil.html', '/img/mil.jpg', 'vehiculos',
        0),
       (13, 'Autos Electricos', 'Modelos de vehiculos electricos modernos', '/lineas/ev.html', '/img/ev.jpg',
        'vehiculos', 1),
       (14, 'Vintage 1900-1940', 'Vehiculos de epoca anterior a la WWII', '/lineas/vintage.html', '/img/vintage.jpg',
        'vehiculos', 0),
       (15, 'Buses Urbanos', 'Autobuses de ciudades del mundo', '/lineas/bus.html', '/img/bus.jpg', 'vehiculos', 0),
       (16, 'Helicópteros', 'Helicopteros civiles y militares a escala', '/lineas/heli.html', '/img/heli.jpg',
        'vehiculos', 0),
       (17, 'Caravanas', 'Autocaravanas y remolques a escala', '/lineas/caravana.html', '/img/caravana.jpg',
        'vehiculos', 0),
       (18, 'Electronica', 'Miniaturas de gadgets y electrodomesticos', '/lineas/elec.html', '/img/elec.jpg',
        'electronica', 0),
       (19, 'Oficina Deco', 'Figuras decorativas para escritorio', '/lineas/deco.html', '/img/deco.jpg', 'oficina', 0),
       (20, 'Pistas y Dioramas', 'Ambientaciones y pistas para exponer', '/lineas/pistas.html', '/img/pistas.jpg',
        'accesorios', 1);

-- productos (20 registros)
INSERT INTO productos
VALUES ('P001', 'Harley Davidson Ultimate Chopper 1:10', 1, '1:10', 7933, 48.99, 95.70, 'disponible', 1),
       ('P002', 'Honda S800 1965 1:18', 2, '1:18', 9987, 53.90, 100.32, 'disponible', 1),
       ('P003', 'Dodge Viper GTS 2002 1:18', 2, '1:18', 8347, 49.95, 81.27, 'disponible', 0),
       ('P004', 'Red Alert Signal Helicopter 1:24', 3, '1:24', 5765, 32.77, 67.71, 'disponible', 1),
       ('P005', 'USS Constellation USS-64 1:700', 4, '1:700', 3920, 33.97, 57.34, 'disponible', 0),
       ('P006', 'American Airlines B767 1:200', 3, '1:200', 5765, 37.61, 118.94, 'disponible', 1),
       ('P007', 'Ferrari Enzo 2002 F1 1:18', 7, '1:18', 3003, 95.59, 207.80, 'disponible', 1),
       ('P008', 'McLaren P1 GTR 2015 1:18', 7, '1:18', 2540, 85.68, 176.46, 'disponible', 1),
       ('P009', 'Ford F-150 Raptor 2022 1:24', 8, '1:24', 6000, 45.99, 90.00, 'disponible', 1),
       ('P010', 'Chevrolet Silverado 2022 1:24', 8, '1:24', 4500, 42.99, 84.00, 'disponible', 1),
       ('P011', 'Vitrina Giratoria LED para 6 piezas', 9, 'N/A', 1200, 29.99, 59.99, 'disponible', 1),
       ('P012', 'Bugatti Veyron Edicion Oro 2023 1:18', 10, '1:18', 150, 245.00, 499.99, 'preventa', 1),
       ('P013', 'Lamborghini Huracan STO 1:18', 11, '1:18', 2200, 89.99, 185.00, 'disponible', 1),
       ('P014', 'Jeep Wrangler Rubicon 2023 1:24', 8, '1:24', 3500, 44.50, 88.00, 'disponible', 1),
       ('P015', 'Boeing B-17 Flying Fortress 1:72', 3, '1:72', 1800, 55.00, 110.00, 'disponible', 0),
       ('P016', 'Pista Diorama Ciudad 60x90cm', 20, 'N/A', 400, 79.99, 159.99, 'disponible', 1),
       ('P017', 'Tesla Model S Plaid 2023 1:18', 13, '1:18', 4000, 69.99, 139.99, 'disponible', 1),
       ('P018', 'Panzer IV Ausf H 1:35', 12, '1:35', 2900, 42.00, 84.99, 'disponible', 0),
       ('P019', 'Ford Model T 1908 1:18', 14, '1:18', 1500, 38.00, 75.00, 'agotado', 0),
       ('P020', 'Base Giratoria para Vitrinas 360', 9, 'N/A', 600, 15.99, 29.99, 'disponible', 1);

-- oficinas (20 registros)
INSERT INTO oficinas
VALUES ('OF01', 'Ciudad de Panama', '+507-300-1000', 'Ave. Balboa 123', 'Panama', 'Panama', '0801', 'SurAmerica',
        'principal', 1),
       ('OF02', 'Bogota', '+57-1-300-2000', 'Calle 72 No.10-07', 'Cundinamarca', 'Colombia', '110311', 'SurAmerica',
        'regional', 1),
       ('OF03', 'Ciudad de Mexico', '+52-55-300-3000', 'Paseo Reforma 500', 'CDMX', 'Mexico', '06600', 'NorteAmer',
        'regional', 1),
       ('OF04', 'Miami', '+1-305-300-4000', 'Brickell Ave 1000', 'Florida', 'USA', '33131', 'NorteAmer', 'regional', 1),
       ('OF05', 'Madrid', '+34-91-300-5000', 'Gran Via 20', 'Madrid', 'Espana', '28013', 'Europa', 'sucursal', 1),
       ('OF06', 'Lima', '+51-1-300-6000', 'Av Javier Prado 500', 'Lima', 'Peru', '15046', 'SurAmerica', 'sucursal', 1),
       ('OF07', 'Santiago', '+56-2-300-7000', 'Av Providencia 1000', 'Providencia', 'Chile', '7500000', 'SurAmerica',
        'sucursal', 1),
       ('OF08', 'Sao Paulo', '+55-11-300-8000', 'Av Paulista 1500', 'SP', 'Brasil', '01310', 'SurAmerica', 'sucursal',
        1),
       ('OF09', 'Buenos Aires', '+54-11-300-9000', 'Florida 500', 'CABA', 'Argentina', 'C1005', 'SurAmerica',
        'sucursal', 1),
       ('OF10', 'Colon Panama', '+507-300-1010', 'Zona Libre Lote 20', 'Colon', 'Panama', '0701', 'SurAmerica',
        'virtual', 1),
       ('OF11', 'Guadalajara', '+52-33-300-1100', 'Av Vallarta 3000', 'Jalisco', 'Mexico', '44100', 'NorteAmer',
        'sucursal', 1),
       ('OF12', 'Monterrey', '+52-81-300-1200', 'Av Garza 500', 'Nuevo Leon', 'Mexico', '64000', 'NorteAmer',
        'sucursal', 1),
       ('OF13', 'Medellin', '+57-4-300-1300', 'El Poblado Cra 35', 'Antioquia', 'Colombia', '050021', 'SurAmerica',
        'sucursal', 1),
       ('OF14', 'Quito', '+593-2-300-1400', 'Av Amazonas N35', 'Pichincha', 'Ecuador', '170136', 'SurAmerica',
        'sucursal', 1),
       ('OF15', 'Barcelona', '+34-93-300-1500', 'Passeig de Gracia 90', 'Cataluna', 'Espana', '08008', 'Europa',
        'sucursal', 1),
       ('OF16', 'New York', '+1-212-300-1600', '5th Ave 1500', 'New York', 'USA', '10036', 'NorteAmer', 'sucursal', 1),
       ('OF17', 'Toronto', '+1-416-300-1700', 'Bay St 100', 'Ontario', 'Canada', 'M5H2', 'NorteAmer', 'sucursal', 1),
       ('OF18', 'Londres', '+44-20-300-1800', 'Oxford St 200', 'England', 'UK', 'W1D', 'Europa', 'sucursal', 1),
       ('OF19', 'Paris', '+33-1-300-1900', 'Champs Elysees 50', 'Ile de Fr.', 'Francia', '75008', 'Europa', 'sucursal',
        1),
       ('OF20', 'Tokio', '+81-3-300-2000', 'Shinjuku Ave 100', 'Tokyo', 'Japon', '160-00', 'Asia', 'virtual', 1);

-- empleados (20 registros)
INSERT INTO empleados
VALUES (10001, 'Murphy', 'Diane', 'x5800', 'dmurphy@empresa.com', 'OF01', NULL, 'Presidente', 'director', 1),
       (10002, 'Patterson', 'Mary', 'x4611', 'mpatterson@empresa.com', 'OF01', 10001, 'VP Ventas', 'director', 1),
       (10003, 'Firrelli', 'Jeff', 'x9273', 'jfirrelli@empresa.com', 'OF04', 10002, 'Representante', 'senior', 1),
       (10004, 'Patterson', 'William', 'x4871', 'wpatterson@empresa.com', 'OF06', 10002, 'Representante', 'senior', 1),
       (10005, 'Bondur', 'Gerard', 'x5408', 'gbondur@empresa.com', 'OF05', 10002, 'Gerente de Ventas', 'gerente', 1),
       (10006, 'Jones', 'Barry', 'x102', 'bjones@empresa.com', 'OF04', 10003, 'Representante', 'junior', 1),
       (10007, 'Ruiz', 'Ana', 'x3291', 'aruiz@empresa.com', 'OF02', 10005, 'Representante', 'senior', 1),
       (10008, 'Chen', 'Jenny', 'x1999', 'jchen@empresa.com', 'OF03', 10005, 'Representante', 'junior', 1),
       (10009, 'Hernandez', 'Loui', 'x2200', 'lhernandez@empresa.com', 'OF01', 10002, 'Gerente de Ventas', 'gerente',
        1),
       (10010, 'Castro', 'Martin', 'x3421', 'mcastro@empresa.com', 'OF07', 10005, 'Representante', 'junior', 1),
       (10011, 'Bott', 'Larry', 'x2311', 'lbott@empresa.com', 'OF08', 10005, 'Representante', 'senior', 1),
       (10012, 'King', 'Tom', 'x7322', 'tking@empresa.com', 'OF09', 10005, 'Representante', 'junior', 1),
       (10013, 'Nishi', 'Mami', 'x101', 'mnishi@empresa.com', 'OF20', 10002, 'Representante Asia', 'senior', 1),
       (10014, 'Gerard', 'Martin', 'x2332', 'mgerard@empresa.com', 'OF19', 10005, 'Representante', 'junior', 1),
       (10015, 'Thompson', 'Leslie', 'x4065', 'lthompson@empresa.com', 'OF16', 10005, 'Representante', 'senior', 1),
       (10016, 'Vanauf', 'George', 'x4102', 'gvanauf@empresa.com', 'OF04', 10003, 'Representante', 'junior', 1),
       (10017, 'Castillo', 'Ricardo', 'x5501', 'rcastillo@empresa.com', 'OF11', 10005, 'Gerente Regional', 'lider', 1),
       (10018, 'Silva', 'Beatriz', 'x6601', 'bsilva@empresa.com', 'OF08', 10005, 'Representante', 'junior', 1),
       (10019, 'Rossi', 'Marco', 'x7701', 'mrossi@empresa.com', 'OF15', 10005, 'Representante', 'junior', 1),
       (10020, 'Brown', 'Catherine', 'x8801', 'cbrown@empresa.com', 'OF18', 10002, 'Gerente Europa', 'lider', 1);

-- clientes (20 registros)
INSERT INTO clientes
VALUES (101, 'Atelier', 'Schmitt', 'Carine', '40.32.2555', 'Rue Royale 54', 'Nantes', NULL, '44000', 'Francia', 10003,
        21000.00, 'minorista', 0),
       (102, 'Signal', 'King', 'Jean', '7025551838', '8489 Strong St', 'Las Vegas', 'NV', '83030', 'USA', 10006,
        71800.00, 'mayorista', 1),
       (103, 'Techno', 'Ferguson', 'Peter', '2035551845', '537 Long Ln', 'Melbourne', NULL, '3004', 'Australia', NULL,
        85000.00, 'corporativo', 0),
       (104, 'Auto Int', 'Ponschateau', 'Roland', '40.32.4555', 'Ingolstadter 56', 'Graz', NULL, '8010', 'Austria',
        10005, 48700.00, 'distribuidor', 1),
       (105, 'Mini Wh', 'Young', 'Julie', '6175559555', '78934 Hillside Dr', 'Boston', 'MA', '51003', 'USA', 10003,
        90700.00, 'mayorista', 1),
       (106, 'Diecast', 'La Clair', 'Janine', '40.67.8555', 'Rue Banyluls 67', 'Lyon', NULL, '69004', 'Francia', 10007,
        60300.00, 'mayorista', 0),
       (107, 'Gifts4U', 'Nelson', 'Susan', '0800-GIFT', '2603 Main St', 'Bruxelas', NULL, '1000', 'Belgica', 10008,
        32200.00, 'minorista', 0),
       (108, 'Diecast3', 'Sequeira', 'Paulo', '2175559555', 'Rua Santos 456', 'Sao Paulo', NULL, '01310', 'Brasil',
        10011, 59700.00, 'mayorista', 1),
       (109, 'Panama C', 'Gonzalez', 'Rosa', '507-6100-01', 'Av Central 100', 'Ciu Panama', NULL, '0801', 'Panama',
        10009, 75000.00, 'corporativo', 1),
       (110, 'Chile Mo', 'Morales', 'Eduardo', '56-2-555-01', 'Los Leones 500', 'Santiago', NULL, '7500', 'Chile',
        10010, 42000.00, 'distribuidor', 0),
       (111, 'Lima Cla', 'Torres', 'Lourdes', '51-1-555-01', 'Av Arequipa 10', 'Lima', NULL, '15046', 'Peru', 10004,
        38000.00, 'minorista', 0),
       (112, 'BogCol', 'Ramirez', 'Jorge', '57-1-555-01', 'Carrera 7 N20', 'Bogota', 'Cundinam', '110000', 'Colombia',
        10007, 55000.00, 'mayorista', 1),
       (113, 'MexScale', 'Vargas', 'Lucia', '52-55-55501', 'Insurgentes 300', 'Cdad Mexico', NULL, '06600', 'Mexico',
        10008, 48000.00, 'mayorista', 1),
       (114, 'ArgCol', 'Fernandez', 'Diego', '54-11-55501', 'Corrientes 1800', 'Buenos Aires', NULL, 'C1042',
        'Argentina', 10018, 35000.00, 'minorista', 0),
       (115, 'EspModel', 'Garcia', 'Isabel', '34-91-55501', 'Gran Via 45', 'Madrid', NULL, '28013', 'Espana', 10019,
        95000.00, 'distribuidor', 1),
       (116, 'GBToys', 'Williams', 'Robert', '44-20-55501', 'Oxford St 90', 'Londres', NULL, 'W1D 2', 'UK', 10020,
        68000.00, 'mayorista', 1),
       (117, 'USADie', 'Johnson', 'Michael', '1-212-55501', '5th Ave 500', 'New York', 'NY', '10036', 'USA', 10015,
        120000.00, 'corporativo', 1),
       (118, 'CANScale', 'Brown', 'Emma', '1-416-55501', 'Bay St 55', 'Toronto', 'Ontario', 'M5H', 'Canada', 10017,
        44000.00, 'minorista', 0),
       (119, 'JapMin', 'Tanaka', 'Kenji', '81-3-55501', 'Shinjuku 20', 'Tokio', NULL, '16000', 'Japon', 10013, 88000.00,
        'distribuidor', 1),
       (120, 'ECUDie', 'Moreta', 'Carlos', '593-2-55501', 'Amazonas N10', 'Quito', NULL, '17010', 'Ecuador', 10014,
        29000.00, 'minorista', 0);

-- ordenes (20 registros)
INSERT INTO ordenes
VALUES (10100, '2024-01-06', '2024-01-13', '2024-01-10', 'Entregado', 'Pedido estandar', 101, 'media', 1),
       (10101, '2024-01-09', '2024-01-18', '2024-01-11', 'Entregado', NULL, 102, 'alta', 1),
       (10102, '2024-01-10', '2024-01-18', '2024-01-14', 'Entregado', 'Pago verificado ok', 103, 'media', 1),
       (10103, '2024-01-29', '2024-02-07', '2024-02-02', 'Entregado', NULL, 104, 'baja', 1),
       (10104, '2024-01-31', '2024-02-09', '2024-02-01', 'Entregado', 'Entregado antes de plazo', 105, 'alta', 1),
       (10105, '2024-02-11', '2024-02-21', NULL, 'En Proceso', 'Pendiente verificacion', 106, 'media', 0),
       (10106, '2024-02-17', '2024-02-24', '2024-02-20', 'Entregado', NULL, 107, 'baja', 1),
       (10107, '2024-02-24', '2024-03-03', NULL, 'En Proceso', NULL, 108, 'urgente', 0),
       (10108, '2024-03-03', '2024-03-12', '2024-03-08', 'Entregado', NULL, 109, 'alta', 1),
       (10109, '2024-03-09', '2024-03-18', NULL, 'Pendiente', 'Esperando stock', 110, 'media', 0),
       (10110, '2024-03-15', '2024-03-22', '2024-03-20', 'Entregado', NULL, 111, 'baja', 1),
       (10111, '2024-03-21', '2024-03-28', NULL, 'En Proceso', NULL, 112, 'media', 0),
       (10112, '2024-04-05', '2024-04-12', '2024-04-10', 'Entregado', 'Envio express', 113, 'alta', 1),
       (10113, '2024-04-10', '2024-04-20', NULL, 'Pendiente', 'Cliente ausente', 114, 'baja', 0),
       (10114, '2024-04-15', '2024-04-22', '2024-04-21', 'Entregado', 'Distribuidor prioritario', 115, 'urgente', 1),
       (10115, '2024-05-01', '2024-05-10', '2024-05-08', 'Entregado', NULL, 116, 'media', 1),
       (10116, '2024-05-05', '2024-05-15', NULL, 'En Proceso', 'Retenido en aduana', 117, 'alta', 0),
       (10117, '2024-05-20', '2024-05-27', '2024-05-25', 'Entregado', NULL, 118, 'baja', 1),
       (10118, '2024-06-01', '2024-06-10', NULL, 'Pendiente', 'Confirmacion pendiente', 119, 'media', 0),
       (10119, '2024-06-10', '2024-06-17', '2024-06-15', 'Entregado', NULL, 120, 'baja', 1);

-- detallesordenes (20 registros)
INSERT INTO detallesordenes
VALUES (10100, 'P001', 30, 50.00, 1, '5%', 1),
       (10100, 'P007', 5, 100.00, 2, '10%', 1),
       (10101, 'P002', 25, 55.00, 1, 'sin_descuento', 1),
       (10101, 'P003', 50, 50.00, 2, '5%', 1),
       (10102, 'P004', 22, 35.00, 1, 'sin_descuento', 1),
       (10103, 'P005', 49, 35.00, 1, '5%', 1),
       (10104, 'P006', 20, 40.00, 1, '10%', 1),
       (10104, 'P011', 10, 30.00, 2, 'sin_descuento', 1),
       (10105, 'P008', 40, 88.00, 1, '5%', 0),
       (10106, 'P009', 15, 46.00, 1, 'sin_descuento', 1),
       (10107, 'P010', 28, 43.00, 1, '10%', 0),
       (10108, 'P012', 2, 250.00, 1, 'sin_descuento', 1),
       (10109, 'P001', 12, 49.00, 1, '5%', 0),
       (10110, 'P007', 3, 96.00, 1, '15%', 1),
       (10111, 'P003', 35, 50.00, 1, 'sin_descuento', 0),
       (10112, 'P013', 10, 90.00, 1, '10%', 1),
       (10113, 'P014', 18, 44.50, 1, 'sin_descuento', 0),
       (10114, 'P015', 8, 55.00, 1, '5%', 1),
       (10115, 'P017', 20, 70.00, 1, 'sin_descuento', 1),
       (10116, 'P018', 25, 42.00, 1, '10%', 0);

-- pagos (20 registros)
INSERT INTO pagos
VALUES (101, 'FAC-2024-001', '2024-01-10', 2016.16, 'tarjeta', 1),
       (102, 'FAC-2024-002', '2024-01-15', 3049.37, 'transferencia', 1),
       (103, 'FAC-2024-003', '2024-01-20', 832.25, 'tarjeta', 1),
       (104, 'FAC-2024-004', '2024-02-05', 1785.37, 'cheque', 1),
       (105, 'FAC-2024-005', '2024-02-10', 861.81, 'transferencia', 1),
       (106, 'FAC-2024-006', '2024-02-25', 2465.00, 'tarjeta', 0),
       (107, 'FAC-2024-007', '2024-02-22', 694.50, 'efectivo', 1),
       (108, 'FAC-2024-008', '2024-03-05', 1204.00, 'transferencia', 1),
       (109, 'FAC-2024-009', '2024-03-10', 500.00, 'tarjeta', 1),
       (110, 'FAC-2024-010', '2024-03-18', 129.00, 'efectivo', 1),
       (111, 'FAC-2024-011', '2024-03-22', 288.00, 'credito', 1),
       (112, 'FAC-2024-012', '2024-03-28', 1750.00, 'transferencia', 1),
       (113, 'FAC-2024-013', '2024-04-12', 900.00, 'tarjeta', 1),
       (114, 'FAC-2024-014', '2024-04-20', 356.00, 'efectivo', 0),
       (115, 'FAC-2024-015', '2024-04-22', 5225.00, 'transferencia', 1),
       (116, 'FAC-2024-016', '2024-05-10', 2800.00, 'tarjeta', 1),
       (117, 'FAC-2024-017', '2024-05-20', 1400.00, 'transferencia', 0),
       (118, 'FAC-2024-018', '2024-05-27', 792.00, 'cheque', 1),
       (119, 'FAC-2024-019', '2024-06-12', 1260.00, 'tarjeta', 0),
       (120, 'FAC-2024-020', '2024-06-17', 588.00, 'efectivo', 1);

-- DESCRIBE de cada tabla
DESCRIBE lineasproductos;
DESCRIBE productos;
DESCRIBE oficinas;
DESCRIBE empleados;
DESCRIBE clientes;
DESCRIBE ordenes;
DESCRIBE detallesordenes;
DESCRIBE pagos;
