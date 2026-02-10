DROP DATABASE IF EXISTS XYZ;
CREATE DATABASE XYZ;
SHOW DATABASES;
USE XYZ;

-- Perfiles
CREATE TABLE perfiles
(
    id_perfil             INT PRIMARY KEY AUTO_INCREMENT,
    nombre_perfil         VARCHAR(100) NOT NULL,
    descripcion_perfil    TEXT,
    fecha_vigencia_perfil DATE         NOT NULL,
    encargado_perfil      VARCHAR(100),
    estado                VARCHAR(20) DEFAULT 'activo',
    fecha_creacion        TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);

-- Usuarios
CREATE TABLE usuarios
(
    id_usuario     INT PRIMARY KEY AUTO_INCREMENT,
    nombre         VARCHAR(100)   NOT NULL,
    apellido       VARCHAR(100)   NOT NULL,
    estado         VARCHAR(20) DEFAULT 'activo',
    contrasena     VARCHAR(255)   NOT NULL,
    cargo          VARCHAR(100)   NOT NULL,
    salario        DECIMAL(10, 2) NOT NULL,
    fecha_ingreso  DATE           NOT NULL,
    id_perfil      INT            NOT NULL,
    fecha_creacion TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FOREIGN KEY (id_perfil) REFERENCES perfiles (id_perfil)
);

-- Login
CREATE TABLE login
(
    id_login         INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario       INT         NOT NULL,
    fecha_hora_login DATETIME    NOT NULL,
    estado_login     VARCHAR(20) NOT NULL,
    CONSTRAINT FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario)
);

-- Actividades
CREATE TABLE actividades
(
    id_actividad          INT PRIMARY KEY AUTO_INCREMENT,
    fecha_actividad       DATE         NOT NULL,
    tipo_actividad        VARCHAR(100) NOT NULL,
    descripcion_actividad TEXT,
    puntos_otorgados      INT          NOT NULL,
    fecha_creacion        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Participacion_Actividades (Relación Usuario-Actividad)
CREATE TABLE participacion_actividades
(
    id_participacion    INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario          INT NOT NULL,
    id_actividad        INT NOT NULL,
    puntos_ganados      INT NOT NULL,
    fecha_participacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario),
    CONSTRAINT FOREIGN KEY (id_actividad) REFERENCES actividades (id_actividad)
);

USE XYZ;

-- INSERTAR PERFILES (10 perfiles diferentes)
INSERT INTO perfiles (nombre_perfil, descripcion_perfil, fecha_vigencia_perfil, encargado_perfil)
VALUES ('Administrador', 'Perfil con acceso total al sistema', '2024-01-01', 'Carlos Mendez'),
       ('Gerente General', 'Responsable de la gestión estratégica', '2024-01-01', 'Ana Torres'),
       ('Jefe de Área', 'Lidera un departamento específico', '2024-01-15', 'Roberto Silva'),
       ('Supervisor', 'Supervisa equipos de trabajo', '2024-02-01', 'María López'),
       ('Analista Senior', 'Análisis avanzado de datos y procesos', '2024-02-15', 'José Ramírez'),
       ('Analista Junior', 'Apoyo en análisis y reportes', '2024-03-01', 'Laura Díaz'),
       ('Coordinador', 'Coordina actividades y recursos', '2024-03-15', 'Pedro González'),
       ('Asistente', 'Soporte administrativo general', '2024-04-01', 'Carmen Ruiz'),
       ('Desarrollador', 'Desarrollo y mantenimiento de sistemas', '2024-04-15', 'Miguel Castro'),
       ('Operador', 'Operaciones diarias y tareas específicas', '2024-05-01', 'Sofía Vargas');

-- INSERTAR USUARIOS (20 usuarios)
INSERT INTO usuarios (nombre, apellido, estado, contrasena, cargo, salario, fecha_ingreso, id_perfil)
VALUES ('Juan', 'Pérez', 'activo', 'pass123', 'Director General', 5500.00, '2022-01-15', 1),
       ('María', 'González', 'activo', 'pass456', 'Gerente de Ventas', 4200.00, '2022-03-20', 2),
       ('Carlos', 'Rodríguez', 'activo', 'pass789', 'Jefe de Producción', 3800.00, '2022-05-10', 3),
       ('Ana', 'Martínez', 'activo', 'pass321', 'Supervisora de Calidad', 3200.00, '2022-07-01', 4),
       ('Luis', 'Hernández', 'activo', 'pass654', 'Analista de Datos', 3000.00, '2022-09-15', 5),
       ('Carmen', 'López', 'activo', 'pass987', 'Analista de Recursos Humanos', 2500.00, '2023-01-10', 6),
       ('Roberto', 'García', 'activo', 'pass147', 'Coordinador de Logística', 2800.00, '2023-03-05', 7),
       ('Laura', 'Díaz', 'activo', 'pass258', 'Asistente Administrativa', 1800.00, '2023-05-20', 8),
       ('Pedro', 'Sánchez', 'activo', 'pass369', 'Desarrollador Full Stack', 3500.00, '2023-07-12', 9),
       ('Sofía', 'Ramírez', 'activo', 'pass741', 'Operadora de Producción', 2000.00, '2023-09-08', 10),
       ('Jorge', 'Torres', 'activo', 'pass852', 'Jefe de Finanzas', 4000.00, '2023-11-15', 3),
       ('Valentina', 'Castro', 'activo', 'pass963', 'Supervisora de Ventas', 3100.00, '2024-01-20', 4),
       ('Diego', 'Morales', 'activo', 'pass159', 'Analista Financiero', 2900.00, '2024-02-10', 5),
       ('Isabella', 'Vargas', 'inactivo', 'pass357', 'Analista de Marketing', 2600.00, '2024-03-15', 6),
       ('Andrés', 'Ruiz', 'activo', 'pass753', 'Coordinador de Proyectos', 3300.00, '2024-04-05', 7),
       ('Camila', 'Jiménez', 'activo', 'pass951', 'Asistente de Ventas', 1900.00, '2024-05-22', 8),
       ('Fernando', 'Ortiz', 'activo', 'pass486', 'Desarrollador Backend', 3400.00, '2024-06-18', 9),
       ('Daniela', 'Mendoza', 'activo', 'pass264', 'Operadora de Almacén', 2100.00, '2024-07-09', 10),
       ('Ricardo', 'Silva', 'activo', 'pass825', 'Gerente de Operaciones', 4500.00, '2024-08-12', 2),
       ('Gabriela', 'Núñez', 'activo', 'pass193', 'Analista de Procesos', 2700.00, '2024-09-25', 5);

-- INSERTAR ACTIVIDADES (24 actividades - 2 por mes durante 12 meses)
INSERT INTO actividades (fecha_actividad, tipo_actividad, descripcion_actividad, puntos_otorgados)
VALUES
-- Enero 2024
('2024-01-10', 'Capacitación', 'Taller de mejora continua', 50),
('2024-01-25', 'Integración', 'Actividad recreativa de equipo', 30),
-- Febrero 2024
('2024-02-08', 'Voluntariado', 'Jornada comunitaria', 40),
('2024-02-22', 'Capacitación', 'Curso de liderazgo', 60),
-- Marzo 2024
('2024-03-12', 'Deportes', 'Torneo de fútbol inter-áreas', 35),
('2024-03-28', 'Reconocimiento', 'Ceremonia de empleado del mes', 45),
-- Abril 2024
('2024-04-09', 'Capacitación', 'Workshop de innovación', 55),
('2024-04-24', 'Integración', 'Día de la familia', 25),
-- Mayo 2024
('2024-05-14', 'Salud', 'Jornada de bienestar y salud', 30),
('2024-05-29', 'Capacitación', 'Seminario de seguridad laboral', 50),
-- Junio 2024
('2024-06-11', 'Deportes', 'Competencia de atletismo', 40),
('2024-06-26', 'Voluntariado', 'Reforestación comunitaria', 45),
-- Julio 2024
('2024-07-10', 'Integración', 'Celebración aniversario empresa', 35),
('2024-07-25', 'Capacitación', 'Taller de comunicación efectiva', 50),
-- Agosto 2024
('2024-08-08', 'Reconocimiento', 'Gala de reconocimientos anuales', 70),
('2024-08-22', 'Deportes', 'Maratón corporativa', 55),
-- Septiembre 2024
('2024-09-12', 'Capacitación', 'Curso de Excel avanzado', 60),
('2024-09-27', 'Integración', 'Tarde de juegos y premiaciones', 30),
-- Octubre 2024
('2024-10-10', 'Salud', 'Campaña de prevención de salud', 35),
('2024-10-24', 'Voluntariado', 'Apoyo a fundación infantil', 50),
-- Noviembre 2024
('2024-11-13', 'Capacitación', 'Workshop de productividad', 55),
('2024-11-28', 'Deportes', 'Torneo de voleibol', 40),
-- Diciembre 2024
('2024-12-11', 'Integración', 'Fiesta de fin de año', 45),
('2024-12-20', 'Reconocimiento', 'Entrega de bonos y reconocimientos', 65);

-- INSERTAR PARTICIPACIONES EN ACTIVIDADES

-- Usuario 1 - Juan Pérez (muy activo)
INSERT INTO participacion_actividades (id_usuario, id_actividad, puntos_ganados)
VALUES (1, 1, 50),
       (1, 2, 30),
       (1, 3, 40),
       (1, 4, 60),
       (1, 5, 35),
       (1, 6, 45),
       (1, 7, 55),
       (1, 8, 25),
       (1, 9, 30),
       (1, 10, 50),
       (1, 11, 40),
       (1, 12, 45),
       (1, 13, 35),
       (1, 14, 50),
       (1, 15, 70),
       (1, 16, 55),
       (1, 17, 60),
       (1, 18, 30),
       (1, 19, 35),
       (1, 20, 50),
       (1, 21, 55),
       (1, 22, 40),
       (1, 23, 45),
       (1, 24, 65);

-- Usuario 2 - María González (muy activa)
INSERT INTO participacion_actividades (id_usuario, id_actividad, puntos_ganados)
VALUES (2, 1, 50),
       (2, 2, 30),
       (2, 4, 60),
       (2, 5, 35),
       (2, 6, 45),
       (2, 7, 55),
       (2, 9, 30),
       (2, 10, 50),
       (2, 11, 40),
       (2, 12, 45),
       (2, 14, 50),
       (2, 15, 70),
       (2, 16, 55),
       (2, 17, 60),
       (2, 19, 35),
       (2, 20, 50),
       (2, 21, 55),
       (2, 22, 40),
       (2, 23, 45),
       (2, 24, 65);

-- Usuario 3 - Carlos Rodríguez (activo)
INSERT INTO participacion_actividades (id_usuario, id_actividad, puntos_ganados)
VALUES (3, 1, 50),
       (3, 3, 40),
       (3, 4, 60),
       (3, 6, 45),
       (3, 7, 55),
       (3, 10, 50),
       (3, 11, 40),
       (3, 13, 35),
       (3, 14, 50),
       (3, 15, 70),
       (3, 17, 60),
       (3, 19, 35),
       (3, 21, 55),
       (3, 23, 45),
       (3, 24, 65);

-- Usuario 4 - Ana Martínez (activa)
INSERT INTO participacion_actividades (id_usuario, id_actividad, puntos_ganados)
VALUES (4, 2, 30),
       (4, 3, 40),
       (4, 5, 35),
       (4, 7, 55),
       (4, 8, 25),
       (4, 9, 30),
       (4, 12, 45),
       (4, 13, 35),
       (4, 15, 70),
       (4, 16, 55),
       (4, 18, 30),
       (4, 20, 50),
       (4, 22, 40),
       (4, 24, 65);

-- Usuario 5 - Luis Hernández (moderado)
INSERT INTO participacion_actividades (id_usuario, id_actividad, puntos_ganados)
VALUES (5, 1, 50),
       (5, 4, 60),
       (5, 7, 55),
       (5, 10, 50),
       (5, 14, 50),
       (5, 15, 70),
       (5, 17, 60),
       (5, 21, 55),
       (5, 23, 45),
       (5, 24, 65);

-- Usuario 6 - Carmen López (moderada)
INSERT INTO participacion_actividades (id_usuario, id_actividad, puntos_ganados)
VALUES (6, 2, 30),
       (6, 5, 35),
       (6, 8, 25),
       (6, 9, 30),
       (6, 12, 45),
       (6, 13, 35),
       (6, 18, 30),
       (6, 20, 50),
       (6, 22, 40);

-- Usuario 7 - Roberto García (activo)
INSERT INTO participacion_actividades (id_usuario, id_actividad, puntos_ganados)
VALUES (7, 1, 50),
       (7, 3, 40),
       (7, 6, 45),
       (7, 10, 50),
       (7, 11, 40),
       (7, 14, 50),
       (7, 15, 70),
       (7, 19, 35),
       (7, 21, 55),
       (7, 23, 45),
       (7, 24, 65);

-- Usuario 8 - Laura Díaz (moderada)
INSERT INTO participacion_actividades (id_usuario, id_actividad, puntos_ganados)
VALUES (8, 2, 30),
       (8, 5, 35),
       (8, 8, 25),
       (8, 13, 35),
       (8, 18, 30),
       (8, 22, 40),
       (8, 23, 45);

-- Usuario 9 - Pedro Sánchez (activo)
INSERT INTO participacion_actividades (id_usuario, id_actividad, puntos_ganados)
VALUES (9, 1, 50),
       (9, 4, 60),
       (9, 7, 55),
       (9, 10, 50),
       (9, 11, 40),
       (9, 14, 50),
       (9, 15, 70),
       (9, 17, 60),
       (9, 21, 55),
       (9, 24, 65);

-- Usuario 10 - Sofía Ramírez (baja participación)
INSERT INTO participacion_actividades (id_usuario, id_actividad, puntos_ganados)
VALUES (10, 2, 30),
       (10, 8, 25),
       (10, 13, 35),
       (10, 18, 30);

-- Usuario 11 - Jorge Torres (muy activo)
INSERT INTO participacion_actividades (id_usuario, id_actividad, puntos_ganados)
VALUES (11, 1, 50),
       (11, 3, 40),
       (11, 4, 60),
       (11, 6, 45),
       (11, 7, 55),
       (11, 10, 50),
       (11, 12, 45),
       (11, 14, 50),
       (11, 15, 70),
       (11, 16, 55),
       (11, 17, 60),
       (11, 19, 35),
       (11, 21, 55),
       (11, 23, 45),
       (11, 24, 65);

-- Usuario 12 - Valentina Castro (activa)
INSERT INTO participacion_actividades (id_usuario, id_actividad, puntos_ganados)
VALUES (12, 2, 30),
       (12, 5, 35),
       (12, 7, 55),
       (12, 9, 30),
       (12, 11, 40),
       (12, 13, 35),
       (12, 15, 70),
       (12, 18, 30),
       (12, 20, 50),
       (12, 22, 40),
       (12, 24, 65);

-- Usuario 13 - Diego Morales (moderado)
INSERT INTO participacion_actividades (id_usuario, id_actividad, puntos_ganados)
VALUES (13, 1, 50),
       (13, 4, 60),
       (13, 10, 50),
       (13, 14, 50),
       (13, 17, 60),
       (13, 21, 55),
       (13, 24, 65);

-- Usuario 14 - Isabella Vargas (inactiva - baja participación)
INSERT INTO participacion_actividades (id_usuario, id_actividad, puntos_ganados)
VALUES (14, 2, 30),
       (14, 5, 35),
       (14, 8, 25);

-- Usuario 15 - Andrés Ruiz (activo)
INSERT INTO participacion_actividades (id_usuario, id_actividad, puntos_ganados)
VALUES (15, 3, 40),
       (15, 6, 45),
       (15, 7, 55),
       (15, 10, 50),
       (15, 12, 45),
       (15, 15, 70),
       (15, 16, 55),
       (15, 19, 35),
       (15, 21, 55),
       (15, 23, 45),
       (15, 24, 65);

-- Usuario 16 - Camila Jiménez (moderada)
INSERT INTO participacion_actividades (id_usuario, id_actividad, puntos_ganados)
VALUES (16, 2, 30),
       (16, 8, 25),
       (16, 13, 35),
       (16, 18, 30),
       (16, 22, 40),
       (16, 23, 45);

-- Usuario 17 - Fernando Ortiz (activo)
INSERT INTO participacion_actividades (id_usuario, id_actividad, puntos_ganados)
VALUES (17, 4, 60),
       (17, 7, 55),
       (17, 10, 50),
       (17, 11, 40),
       (17, 14, 50),
       (17, 15, 70),
       (17, 17, 60),
       (17, 21, 55),
       (17, 24, 65);

-- Usuario 18 - Daniela Mendoza (baja participación)
INSERT INTO participacion_actividades (id_usuario, id_actividad, puntos_ganados)
VALUES (18, 5, 35),
       (18, 9, 30),
       (18, 13, 35),
       (18, 18, 30);

-- Usuario 19 - Ricardo Silva (muy activo)
INSERT INTO participacion_actividades (id_usuario, id_actividad, puntos_ganados)
VALUES (19, 1, 50),
       (19, 3, 40),
       (19, 4, 60),
       (19, 6, 45),
       (19, 7, 55),
       (19, 10, 50),
       (19, 11, 40),
       (19, 12, 45),
       (19, 14, 50),
       (19, 15, 70),
       (19, 16, 55),
       (19, 17, 60),
       (19, 20, 50),
       (19, 21, 55),
       (19, 23, 45),
       (19, 24, 65);

-- Usuario 20 - Gabriela Núñez (moderada)
INSERT INTO participacion_actividades (id_usuario, id_actividad, puntos_ganados)
VALUES (20, 4, 60),
       (20, 7, 55),
       (20, 10, 50),
       (20, 14, 50),
       (20, 17, 60),
       (20, 21, 55),
       (20, 24, 65);

-- INSERTAR REGISTROS DE LOGIN (100 registros)

INSERT INTO login (id_usuario, fecha_hora_login, estado_login)
VALUES
-- Usuario 1 - Juan Pérez
(1, '2024-01-02 08:15:00', 'exitoso'),
(1, '2024-01-09 08:20:00', 'exitoso'),
(1, '2024-01-24 08:10:00', 'exitoso'),
(1, '2024-02-05 08:18:00', 'exitoso'),
(1, '2024-02-21 08:25:00', 'exitoso'),
(1, '2024-03-11 08:12:00', 'exitoso'),
(1, '2024-03-27 08:22:00', 'exitoso'),
(1, '2024-04-08 08:30:00', 'exitoso'),

-- Usuario 2 - María González
(2, '2024-01-03 09:00:00', 'exitoso'),
(2, '2024-01-08 09:05:00', 'exitoso'),
(2, '2024-01-23 09:10:00', 'fallido'),
(2, '2024-01-23 09:15:00', 'exitoso'),
(2, '2024-02-07 09:00:00', 'exitoso'),
(2, '2024-02-20 09:08:00', 'exitoso'),
(2, '2024-03-10 09:12:00', 'exitoso'),
(2, '2024-03-25 09:05:00', 'exitoso'),

-- Usuario 3 - Carlos Rodríguez
(3, '2024-01-04 07:45:00', 'exitoso'),
(3, '2024-01-10 07:50:00', 'exitoso'),
(3, '2024-01-25 07:55:00', 'exitoso'),
(3, '2024-02-08 08:00:00', 'exitoso'),
(3, '2024-02-22 07:58:00', 'exitoso'),
(3, '2024-03-12 08:05:00', 'exitoso'),
(3, '2024-03-28 08:10:00', 'exitoso'),

-- Usuario 4 - Ana Martínez
(4, '2024-01-05 08:30:00', 'exitoso'),
(4, '2024-01-11 08:35:00', 'fallido'),
(4, '2024-01-11 08:40:00', 'exitoso'),
(4, '2024-02-02 08:32:00', 'exitoso'),
(4, '2024-02-21 08:38:00', 'exitoso'),
(4, '2024-03-07 08:42:00', 'exitoso'),
(4, '2024-03-26 08:35:00', 'exitoso'),

-- Usuario 5 - Luis Hernández
(5, '2024-01-08 09:20:00', 'exitoso'),
(5, '2024-01-15 09:25:00', 'exitoso'),
(5, '2024-02-06 09:22:00', 'exitoso'),
(5, '2024-02-23 09:28:00', 'exitoso'),
(5, '2024-03-13 09:30:00', 'exitoso'),
(5, '2024-04-02 09:18:00', 'exitoso'),

-- Usuario 6 - Carmen López
(6, '2024-01-10 10:00:00', 'exitoso'),
(6, '2024-01-17 10:05:00', 'exitoso'),
(6, '2024-02-09 10:02:00', 'fallido'),
(6, '2024-02-09 10:10:00', 'exitoso'),
(6, '2024-02-27 10:08:00', 'exitoso'),
(6, '2024-03-14 10:12:00', 'exitoso'),

-- Usuario 7 - Roberto García
(7, '2024-03-06 08:45:00', 'exitoso'),
(7, '2024-03-15 08:50:00', 'exitoso'),
(7, '2024-04-05 08:48:00', 'exitoso'),
(7, '2024-04-20 08:52:00', 'exitoso'),
(7, '2024-05-10 08:55:00', 'exitoso'),

-- Usuario 8 - Laura Díaz
(8, '2024-05-22 09:30:00', 'exitoso'),
(8, '2024-06-05 09:35:00', 'exitoso'),
(8, '2024-06-20 09:32:00', 'exitoso'),
(8, '2024-07-08 09:38:00', 'exitoso'),

-- Usuario 9 - Pedro Sánchez
(9, '2024-07-13 10:15:00', 'exitoso'),
(9, '2024-07-25 10:20:00', 'exitoso'),
(9, '2024-08-07 10:18:00', 'fallido'),
(9, '2024-08-07 10:22:00', 'exitoso'),
(9, '2024-08-21 10:25:00', 'exitoso'),

-- Usuario 10 - Sofía Ramírez
(10, '2024-09-10 11:00:00', 'exitoso'),
(10, '2024-09-25 11:05:00', 'exitoso'),
(10, '2024-10-09 11:02:00', 'exitoso'),

-- Usuario 11 - Jorge Torres
(11, '2024-11-16 08:00:00', 'exitoso'),
(11, '2024-11-20 08:05:00', 'exitoso'),
(11, '2024-12-03 08:08:00', 'exitoso'),
(11, '2024-12-15 08:10:00', 'exitoso'),

-- Usuario 12 - Valentina Castro
(12, '2024-01-21 09:40:00', 'exitoso'),
(12, '2024-02-04 09:45:00', 'exitoso'),
(12, '2024-02-18 09:42:00', 'exitoso'),
(12, '2024-03-05 09:48:00', 'exitoso'),
(12, '2024-03-19 09:50:00', 'exitoso'),

-- Usuario 13 - Diego Morales
(13, '2024-02-11 10:30:00', 'exitoso'),
(13, '2024-02-25 10:35:00', 'exitoso'),
(13, '2024-03-10 10:32:00', 'fallido'),
(13, '2024-03-10 10:38:00', 'exitoso'),
(13, '2024-04-01 10:40:00', 'exitoso'),

-- Usuario 14 - Isabella Vargas (menos activa)
(14, '2024-03-16 11:15:00', 'exitoso'),
(14, '2024-04-02 11:20:00', 'exitoso'),
(14, '2024-05-05 11:18:00', 'exitoso'),

-- Usuario 15 - Andrés Ruiz
(15, '2024-04-06 08:20:00', 'exitoso'),
(15, '2024-04-22 08:25:00', 'exitoso'),
(15, '2024-05-12 08:22:00', 'exitoso'),
(15, '2024-05-28 08:28:00', 'exitoso'),
(15, '2024-06-10 08:30:00', 'exitoso'),

-- Usuario 16 - Camila Jiménez
(16, '2024-05-23 09:50:00', 'exitoso'),
(16, '2024-06-08 09:55:00', 'fallido'),
(16, '2024-06-08 10:00:00', 'exitoso'),
(16, '2024-06-24 09:58:00', 'exitoso'),
(16, '2024-07-11 10:02:00', 'exitoso'),

-- Usuario 17 - Fernando Ortiz
(17, '2024-06-19 10:45:00', 'exitoso'),
(17, '2024-07-03 10:50:00', 'exitoso'),
(17, '2024-07-18 10:48:00', 'exitoso'),
(17, '2024-08-05 10:52:00', 'exitoso'),

-- Usuario 18 - Daniela Mendoza
(18, '2024-07-10 11:30:00', 'exitoso'),
(18, '2024-07-26 11:35:00', 'exitoso'),
(18, '2024-08-12 11:32:00', 'exitoso'),

-- Usuario 19 - Ricardo Silva
(19, '2024-08-13 07:30:00', 'exitoso'),
(19, '2024-08-27 07:35:00', 'exitoso'),
(19, '2024-09-11 07:32:00', 'exitoso'),
(19, '2024-09-26 07:38:00', 'exitoso'),

-- Usuario 20 - Gabriela Núñez
(20, '2024-09-26 08:50:00', 'exitoso'),
(20, '2024-10-11 08:55:00', 'exitoso'),
(20, '2024-10-25 08:52:00', 'exitoso'),
(20, '2024-11-10 08:58:00', 'exitoso');

-- Índices
CREATE INDEX idx_usuario_perfil ON usuarios (id_perfil);
CREATE INDEX idx_login_usuario ON login (id_usuario);
CREATE INDEX idx_login_fecha ON login (fecha_hora_login);
CREATE INDEX idx_participacion_usuario ON participacion_actividades (id_usuario);
CREATE INDEX idx_participacion_actividad ON participacion_actividades (id_actividad);
CREATE INDEX idx_actividades_fecha ON actividades (fecha_actividad);

-- VISTA 1: Desempeño de Colaboradores

CREATE OR REPLACE VIEW v_DesempenoColaboradores AS
SELECT u.id_usuario,
       CONCAT(u.nombre, ' ', u.apellido)            AS nombre_completo,
       u.cargo,
       u.salario,
       u.fecha_ingreso,
       COALESCE(SUM(p.puntos_ganados), 0)           AS total_puntos_fidelizacion_acumulados,
       COALESCE(ROUND(AVG(p.puntos_ganados), 2), 0) AS promedio_puntos_por_actividad,
       CASE
           WHEN COALESCE(SUM(p.puntos_ganados), 0) > 500 THEN 'Excelente'
           WHEN COALESCE(SUM(p.puntos_ganados), 0) BETWEEN 200 AND 500 THEN 'Bueno'
           ELSE 'Regular'
           END                                      AS estado_fidelizacion,
       COALESCE(
               DATEDIFF(
                       NOW(),
                       (SELECT MAX(l.fecha_hora_login)
                        FROM login l
                        WHERE l.id_usuario = u.id_usuario
                          AND l.estado_login = 'exitoso')
               ),
               999
       )                                            AS dias_desde_ultimo_login
FROM usuarios u
         LEFT JOIN participacion_actividades p ON u.id_usuario = p.id_usuario
GROUP BY u.id_usuario,
         u.nombre,
         u.apellido,
         u.cargo,
         u.salario,
         u.fecha_ingreso;

-- VISTA 2: Actividades por Perfil

CREATE OR REPLACE VIEW v_actividadesPorPerfil AS
SELECT pr.id_perfil,
       pr.nombre_perfil,
       pr.descripcion_perfil,
       COUNT(DISTINCT u.id_usuario)                 AS cantidad_usuarios_con_este_perfil,
       COUNT(p.id_participacion)                    AS total_actividades_participadas_por_perfil,
       COALESCE(ROUND(AVG(p.puntos_ganados), 2), 0) AS promedio_puntos_por_usuario_en_este_perfil,
       ROUND(
               (COUNT(p.id_participacion) * 100.0) /
               (SELECT COUNT(*) FROM participacion_actividades),
               2
       )                                            AS porcentaje_participacion_total
FROM perfiles pr
         LEFT JOIN usuarios u ON pr.id_perfil = u.id_perfil
         LEFT JOIN participacion_actividades p ON u.id_usuario = p.id_usuario
GROUP BY pr.id_perfil,
         pr.nombre_perfil,
         pr.descripcion_perfil;

-- VISTA 3: Historial de Login

CREATE OR REPLACE VIEW v_historialLoginDetallado AS
SELECT l.id_login,
       u.nombre   AS nombre_usuario,
       u.apellido AS apellido_usuario,
       u.cargo    AS cargo_usuario,
       l.fecha_hora_login,
       l.estado_login,
       TIMESTAMPDIFF(
               MINUTE,
               (SELECT MAX(l2.fecha_hora_login)
                FROM login l2
                WHERE l2.id_usuario = l.id_usuario
                  AND l2.fecha_hora_login < l.fecha_hora_login),
               l.fecha_hora_login
       )          AS tiempo_desde_anterior_login
FROM login l
         INNER JOIN usuarios u ON l.id_usuario = u.id_usuario
ORDER BY l.fecha_hora_login DESC;

-- Mostrar algunas filas de cada vista para verificar
SELECT 'v_DesempenoColaboradores' AS info;
SELECT *
FROM v_DesempenoColaboradores
LIMIT 5;

SELECT 'v_actividadesPorPerfil' AS info;
SELECT *
FROM v_actividadesPorPerfil
LIMIT 5;

SELECT 'v_historialLoginDetallado' AS info;
SELECT *
FROM v_historialLoginDetallado
LIMIT 10;

-- Top 5 Colaboradores con Mejor Desempeño
SELECT d.nombre_completo,
       MAX(d.cargo)                                AS cargo,
       SUM(COALESCE(p.puntos_ganados, 0))          AS puntos_ultimo_trimestre,
       MAX(d.total_puntos_fidelizacion_acumulados) AS puntos_totales,
       MAX(d.estado_fidelizacion)                  AS estado_fidelizacion
FROM v_DesempenoColaboradores d
         JOIN usuarios u
              ON d.id_usuario = u.id_usuario
         LEFT JOIN participacion_actividades p
                   ON u.id_usuario = p.id_usuario
         LEFT JOIN actividades a
                   ON p.id_actividad = a.id_actividad
                       AND a.fecha_actividad >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
GROUP BY d.nombre_completo
ORDER BY puntos_ultimo_trimestre DESC
LIMIT 5;

-- Perfiles con Menor Participación
SELECT nombre_perfil,
       descripcion_perfil,
       cantidad_usuarios_con_este_perfil,
       total_actividades_participadas_por_perfil,
       promedio_puntos_por_usuario_en_este_perfil,
       porcentaje_participacion_total,
       CASE
           WHEN total_actividades_participadas_por_perfil = 0 THEN 'CRÍTICO - Sin participación'
           WHEN porcentaje_participacion_total < 3 THEN 'URGENTE - Muy baja participación'
           WHEN porcentaje_participacion_total < 5 THEN 'ATENCIÓN - Baja participación'
           ELSE 'MONITOREAR'
           END AS nivel_prioridad
FROM v_actividadesPorPerfil
ORDER BY total_actividades_participadas_por_perfil ASC,
         porcentaje_participacion_total ASC
LIMIT 5;

-- Usuarios Inactivos en el Sistema
SELECT nombre_completo,
       cargo   AS ultimo_cargo,
       dias_desde_ultimo_login,
       total_puntos_fidelizacion_acumulados,
       estado_fidelizacion,
       CASE
           WHEN dias_desde_ultimo_login > 90 THEN 'ALERTA ALTA - Más de 3 meses inactivo'
           WHEN dias_desde_ultimo_login > 60 THEN 'ALERTA MEDIA - Más de 2 meses inactivo'
           WHEN dias_desde_ultimo_login > 30 THEN 'ALERTA BAJA - Más de 1 mes inactivo'
           END AS nivel_alerta
FROM v_DesempenoColaboradores
WHERE dias_desde_ultimo_login > 30
ORDER BY dias_desde_ultimo_login DESC;

-- Reporte Mensual de Logins

SELECT DATE_FORMAT(fecha_hora_login, '%Y-%m')               AS mes,
       COUNT(CASE WHEN estado_login = 'exitoso' THEN 1 END) AS logins_exitosos,
       COUNT(CASE WHEN estado_login = 'fallido' THEN 1 END) AS logins_fallidos,
       COUNT(*)                                             AS total_intentos,
       ROUND(
               (COUNT(CASE WHEN estado_login = 'exitoso' THEN 1 END) * 100.0) / COUNT(*),
               2
       )                                                    AS porcentaje_exito,
       ROUND(
               (COUNT(CASE WHEN estado_login = 'fallido' THEN 1 END) * 100.0) / COUNT(*),
               2
       )                                                    AS porcentaje_fallo
FROM v_historialLoginDetallado
GROUP BY DATE_FORMAT(fecha_hora_login, '%Y-%m')
ORDER BY mes DESC;