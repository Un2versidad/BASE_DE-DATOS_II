-- MEDCOMLABS - ESQUEMA
-- Base de datos moderna con ETL y cifrado AES-256-GCM

-- EXTENSIONES NECESARIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- FUNCIONES DE UTILIDAD

-- Función para actualizar timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para generar código de acceso (6 caracteres)
CREATE OR REPLACE FUNCTION generate_access_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- TABLA: pacientes (CIFRADA)
DROP TABLE IF EXISTS pacientes CASCADE;
CREATE TABLE pacientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificación (CIFRADA + HASH para búsqueda)
    cedula_hash TEXT NOT NULL UNIQUE,
    cedula_encrypted TEXT NOT NULL,
    cedula_iv TEXT NOT NULL,
    
    -- Nombre (CIFRADO)
    nombre_encrypted TEXT NOT NULL,
    nombre_iv TEXT NOT NULL,
    
    -- Email (CIFRADO)
    email_encrypted TEXT,
    email_iv TEXT,
    
    -- Teléfono (CIFRADO)
    telefono_encrypted TEXT,
    telefono_iv TEXT,
    
    -- Dirección (CIFRADA)
    direccion_encrypted TEXT,
    direccion_iv TEXT,
    
    -- Código de acceso para portal de resultados (CIFRADO + HASH)
    codigo_acceso TEXT NOT NULL DEFAULT generate_access_code(), -- cifrado empaquetado iv.data
    codigo_acceso_hash TEXT NOT NULL UNIQUE DEFAULT '',
    
    -- Información médica básica (CIFRADA)
    fecha_nacimiento TEXT, -- cifrado empaquetado iv.data
    tipo_sangre TEXT, -- cifrado empaquetado iv.data
    genero TEXT CHECK (genero IN ('masculino', 'femenino', 'otro')),
    
    -- Alergias y condiciones (CIFRADAS)
    alergias_encrypted TEXT,
    alergias_iv TEXT,
    condiciones_encrypted TEXT,
    condiciones_iv TEXT,
    
    -- Contacto de emergencia (CIFRADO)
    contacto_emergencia_encrypted TEXT,
    contacto_emergencia_iv TEXT,
    
    -- Notas médicas (CIFRADAS)
    notas_encrypted TEXT,
    notas_iv TEXT,
    
    -- Estado
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deceased')),
    
    -- Origen del registro
    source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'etl_import', 'api')),
    import_job_id UUID,
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para pacientes
CREATE INDEX idx_pacientes_cedula_hash ON pacientes(cedula_hash);
CREATE INDEX idx_pacientes_codigo_acceso ON pacientes(codigo_acceso_hash);
CREATE INDEX idx_pacientes_status ON pacientes(status);
CREATE INDEX idx_pacientes_source ON pacientes(source);
CREATE INDEX idx_pacientes_created ON pacientes(created_at DESC);

-- Trigger para updated_at
CREATE TRIGGER tr_pacientes_updated
    BEFORE UPDATE ON pacientes
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- TABLA: doctores (PARCIALMENTE CIFRADA)
DROP TABLE IF EXISTS doctores CASCADE;
CREATE TABLE doctores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Nombre (CIFRADO)
    nombre_cifrado TEXT NOT NULL,
    nombre_iv TEXT NOT NULL,
    
    -- Información profesional
    especialidad TEXT NOT NULL,
    numero_licencia TEXT NOT NULL, -- cifrado empaquetado iv.data
    numero_licencia_hash TEXT NOT NULL UNIQUE DEFAULT '',
    
    -- Email (CIFRADO)
    email_cifrado TEXT,
    email_iv TEXT,
    
    -- Teléfono (CIFRADO)
    telefono_cifrado TEXT,
    telefono_iv TEXT,
    
    -- Foto de perfil (URL pública)
    foto_url TEXT,
    
    -- Disponibilidad
    dias_disponibles TEXT[] DEFAULT '{"lunes","martes","miercoles","jueves","viernes"}',
    hora_inicio TIME DEFAULT '08:00',
    hora_fin TIME DEFAULT '17:00',
    duracion_cita_minutos INTEGER DEFAULT 30,
    
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_doctores_especialidad ON doctores(especialidad);
CREATE INDEX idx_doctores_activo ON doctores(is_active);
CREATE INDEX idx_doctores_licencia ON doctores(numero_licencia_hash);

CREATE TRIGGER tr_doctores_updated
    BEFORE UPDATE ON doctores
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- TABLA: credenciales_doctores  
DROP TABLE IF EXISTS credenciales_doctores CASCADE;
CREATE TABLE credenciales_doctores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID REFERENCES doctores(id) ON DELETE CASCADE,
    
    -- Credenciales
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    
    -- Tokens
    refresh_token TEXT,
    refresh_token_expira TIMESTAMPTZ,
    
    -- Estado de cuenta
    esta_aprobado BOOLEAN DEFAULT FALSE,
    esta_activo BOOLEAN DEFAULT TRUE,
    fecha_aprobacion TIMESTAMPTZ,
    aprobado_por UUID,
    motivo_rechazo TEXT,
    
    -- Verificación
    email_verificado BOOLEAN DEFAULT FALSE,
    token_verificacion TEXT,
    
    -- Seguridad
    intentos_fallidos INTEGER DEFAULT 0,
    bloqueado_hasta TIMESTAMPTZ,
    ultimo_login TIMESTAMPTZ,
    ultimo_ip TEXT,
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_credenciales_email ON credenciales_doctores(email);
CREATE INDEX idx_credenciales_doctor ON credenciales_doctores(doctor_id);
CREATE INDEX idx_credenciales_aprobado ON credenciales_doctores(esta_aprobado);

CREATE TRIGGER tr_credenciales_updated
    BEFORE UPDATE ON credenciales_doctores
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- TABLA: solicitudes_registro_doctores
DROP TABLE IF EXISTS solicitudes_registro_doctores CASCADE;
CREATE TABLE solicitudes_registro_doctores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Datos de solicitud (cifrados en formato empaquetado iv.data)
    nombre TEXT, -- cifrado empaquetado
    email TEXT NOT NULL, -- cifrado empaquetado iv.data
    email_hash TEXT NOT NULL UNIQUE DEFAULT '', -- hash para verificación de duplicados
    password_hash TEXT NOT NULL,
    especialidad TEXT NOT NULL,
    numero_licencia TEXT NOT NULL, -- cifrado empaquetado iv.data
    numero_licencia_hash TEXT NOT NULL DEFAULT '', -- hash para búsqueda
    telefono TEXT, -- cifrado empaquetado
    
    -- Estado
    estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
    motivo_rechazo TEXT, -- cifrado empaquetado iv.data
    
    -- Procesamiento
    revisado_por UUID,
    fecha_revision TIMESTAMPTZ,
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_solicitudes_estado ON solicitudes_registro_doctores(estado);
CREATE INDEX idx_solicitudes_email ON solicitudes_registro_doctores(email_hash);

CREATE TRIGGER tr_solicitudes_updated
    BEFORE UPDATE ON solicitudes_registro_doctores
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- TABLA: citas
DROP TABLE IF EXISTS citas CASCADE;
CREATE TABLE citas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Número de turno único (CIFRADO + HASH)
    numero_turno TEXT NOT NULL, -- cifrado empaquetado iv.data
    numero_turno_hash TEXT NOT NULL UNIQUE DEFAULT '',
    
    -- Relaciones
    paciente_id UUID REFERENCES pacientes(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctores(id) ON DELETE SET NULL,
    
    -- Información de la cita
    departamento TEXT NOT NULL,
    fecha_cita DATE NOT NULL,
    hora_cita TIME NOT NULL,
    tipo_consulta TEXT NOT NULL CHECK (tipo_consulta IN ('primera_vez', 'control', 'emergencia', 'seguimiento')),
    
    -- Para citas sin paciente registrado (CIFRADO)
    nombre_paciente_cifrado TEXT,
    nombre_paciente_iv TEXT,
    cedula_paciente_cifrada TEXT,
    cedula_paciente_iv TEXT,
    telefono_paciente_cifrado TEXT,
    telefono_paciente_iv TEXT,
    
    -- Estado
    estado TEXT DEFAULT 'programada' CHECK (estado IN ('programada', 'confirmada', 'en_progreso', 'completada', 'cancelada', 'no_asistio')),
    prioridad INTEGER DEFAULT 5 CHECK (prioridad BETWEEN 1 AND 10),
    tiempo_espera_estimado INTEGER,
    
    -- Timestamps de consulta
    hora_llegada TIMESTAMPTZ,
    hora_inicio_consulta TIMESTAMPTZ,
    hora_fin_consulta TIMESTAMPTZ,
    
    -- Notas (cifradas en formato empaquetado iv.data)
    motivo_consulta TEXT, -- cifrado empaquetado iv.data
    notas TEXT, -- cifrado empaquetado iv.data
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_citas_fecha ON citas(fecha_cita);
CREATE INDEX idx_citas_doctor ON citas(doctor_id);
CREATE INDEX idx_citas_paciente ON citas(paciente_id);
CREATE INDEX idx_citas_estado ON citas(estado);
CREATE INDEX idx_citas_doctor_fecha ON citas(doctor_id, fecha_cita);

CREATE TRIGGER tr_citas_updated
    BEFORE UPDATE ON citas
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- TABLA: resultados_laboratorio (CIFRADA)
DROP TABLE IF EXISTS resultados_laboratorio CASCADE;
CREATE TABLE resultados_laboratorio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relación
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    
    -- Información del examen
    nombre_examen TEXT NOT NULL,
    tipo_examen TEXT NOT NULL CHECK (tipo_examen IN ('hematologia', 'bioquimica', 'microbiologia', 'urinalisis', 'imagenologia', 'otro')),
    
    -- Resultados (CIFRADOS)
    resultados_cifrados TEXT,
    resultados_iv TEXT,
    
    -- Estado
    estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_proceso', 'completado', 'revisado')),
    prioridad TEXT DEFAULT 'normal' CHECK (prioridad IN ('baja', 'normal', 'alta', 'urgente')),
    
    -- Fechas
    fecha_orden DATE NOT NULL,
    fecha_completado DATE,
    fecha_revisado DATE,
    
    -- Doctores
    ordenado_por UUID REFERENCES doctores(id),
    revisado_por UUID REFERENCES doctores(id),
    
    -- Notas (CIFRADAS)
    notas_cifradas TEXT,
    notas_iv TEXT,
    
    -- Interpretación
    interpretacion TEXT,
    requiere_seguimiento BOOLEAN DEFAULT FALSE,
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_resultados_paciente ON resultados_laboratorio(paciente_id);
CREATE INDEX idx_resultados_estado ON resultados_laboratorio(estado);
CREATE INDEX idx_resultados_fecha ON resultados_laboratorio(fecha_orden DESC);

CREATE TRIGGER tr_resultados_updated
    BEFORE UPDATE ON resultados_laboratorio
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- TABLA: recetas
DROP TABLE IF EXISTS recetas CASCADE;
CREATE TABLE recetas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relaciones
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctores(id),
    cita_id UUID REFERENCES citas(id),
    
    -- Medicamentos (JSONB)
    medicamentos JSONB NOT NULL,
    
    -- Diagnóstico
    diagnostico TEXT,
    
    -- Vigencia
    fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_vencimiento DATE,
    
    -- Estado
    estado TEXT DEFAULT 'activa' CHECK (estado IN ('activa', 'dispensada', 'vencida', 'cancelada')),
    
    -- Notas
    indicaciones_generales TEXT,
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recetas_paciente ON recetas(paciente_id);
CREATE INDEX idx_recetas_doctor ON recetas(doctor_id);
CREATE INDEX idx_recetas_estado ON recetas(estado);

CREATE TRIGGER tr_recetas_updated
    BEFORE UPDATE ON recetas
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- TABLA: notas_medicas (CIFRADAS)
DROP TABLE IF EXISTS notas_medicas CASCADE;
CREATE TABLE notas_medicas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relaciones
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctores(id),
    cita_id UUID REFERENCES citas(id),
    
    -- Contenido (CIFRADO si confidencial)
    titulo TEXT,
    contenido TEXT,
    contenido_cifrado TEXT,
    contenido_iv TEXT,
    es_confidencial BOOLEAN DEFAULT FALSE,
    
    -- Tipo
    tipo TEXT DEFAULT 'consulta' CHECK (tipo IN ('consulta', 'evolucion', 'interconsulta', 'alta', 'otro')),
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notas_paciente ON notas_medicas(paciente_id);
CREATE INDEX idx_notas_doctor ON notas_medicas(doctor_id);

CREATE TRIGGER tr_notas_updated
    BEFORE UPDATE ON notas_medicas
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- TABLA: notificaciones
DROP TABLE IF EXISTS notificaciones CASCADE;
CREATE TABLE notificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Destinatario
    destinatario_id UUID NOT NULL,
    tipo_destinatario TEXT NOT NULL CHECK (tipo_destinatario IN ('doctor', 'admin', 'paciente')),
    
    -- Contenido (CIFRADO)
    titulo TEXT NOT NULL, -- cifrado empaquetado iv.data
    mensaje TEXT NOT NULL, -- cifrado empaquetado iv.data
    tipo TEXT NOT NULL CHECK (tipo IN ('cita', 'resultado', 'sistema', 'recordatorio', 'alerta', 'aprobacion')),
    
    -- Referencia
    referencia_tipo TEXT,
    referencia_id UUID,
    
    -- Estado
    leida BOOLEAN DEFAULT FALSE,
    fecha_leida TIMESTAMPTZ,
    
    -- Prioridad
    prioridad TEXT DEFAULT 'normal' CHECK (prioridad IN ('baja', 'normal', 'alta', 'urgente')),
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notificaciones_destinatario ON notificaciones(destinatario_id);
CREATE INDEX idx_notificaciones_no_leidas ON notificaciones(destinatario_id, leida) WHERE NOT leida;

-- TABLA: registros_seguridad
DROP TABLE IF EXISTS registros_seguridad CASCADE;
CREATE TABLE registros_seguridad (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Evento (CIFRADO)
    tipo_evento TEXT NOT NULL, -- cifrado empaquetado iv.data
    descripcion TEXT NOT NULL, -- cifrado empaquetado iv.data
    
    -- Usuario
    usuario_id UUID,
    usuario_email TEXT, -- cifrado empaquetado iv.data
    usuario_tipo TEXT,
    
    -- Detalles técnicos
    direccion_ip TEXT,
    user_agent TEXT, -- cifrado empaquetado iv.data
    
    -- Datos adicionales
    metadatos TEXT, -- cifrado empaquetado iv.data (era JSONB)
    
    -- Resultado
    exitoso BOOLEAN DEFAULT TRUE,
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_seguridad_usuario ON registros_seguridad(usuario_id);
CREATE INDEX idx_seguridad_fecha ON registros_seguridad(created_at DESC);
-- tipo_evento está cifrado, no se puede indexar directamente

-- TABLAS ETL
-- Fuentes de datos
DROP TABLE IF EXISTS fuentes_datos CASCADE;
CREATE TABLE fuentes_datos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    tipo_fuente TEXT NOT NULL CHECK (tipo_fuente IN ('csv', 'json', 'api', 'database', 'excel')),
    configuracion JSONB,
    esta_cifrado BOOLEAN DEFAULT FALSE,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pipelines ETL
DROP TABLE IF EXISTS pipelines_etl CASCADE;
CREATE TABLE pipelines_etl (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    descripcion TEXT,
    fuente_id UUID REFERENCES fuentes_datos(id) ON DELETE SET NULL,
    estado TEXT DEFAULT 'inactive' CHECK (estado IN ('active', 'inactive', 'error', 'running')),
    programacion TEXT,
    ultima_ejecucion TIMESTAMPTZ,
    proxima_ejecucion TIMESTAMPTZ,
    configuracion JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jobs de importación
DROP TABLE IF EXISTS import_jobs CASCADE;
CREATE TABLE import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Información del archivo
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('csv', 'json', 'xlsx')),
    
    -- Estadísticas
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    successful_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    
    -- Estado
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    
    -- Errores
    error_log JSONB DEFAULT '[]',
    
    -- Mapeo de campos
    field_mapping JSONB,
    
    -- Opciones
    encrypt_data BOOLEAN DEFAULT TRUE,
    skip_duplicates BOOLEAN DEFAULT TRUE,
    
    -- Usuario
    created_by UUID,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_import_jobs_status ON import_jobs(status);
CREATE INDEX idx_import_jobs_created ON import_jobs(created_at DESC);

-- Logs de pipeline
DROP TABLE IF EXISTS logs_pipeline CASCADE;
CREATE TABLE logs_pipeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID REFERENCES pipelines_etl(id) ON DELETE CASCADE,
    import_job_id UUID REFERENCES import_jobs(id) ON DELETE CASCADE,
    nivel TEXT DEFAULT 'info' CHECK (nivel IN ('debug', 'info', 'warning', 'error', 'critical')),
    mensaje TEXT NOT NULL,
    metadatos JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_logs_pipeline ON logs_pipeline(pipeline_id);
CREATE INDEX idx_logs_job ON logs_pipeline(import_job_id);
CREATE INDEX idx_logs_nivel ON logs_pipeline(nivel);

-- ROW LEVEL SECURITY (RLS)
-- Habilitar RLS en todas las tablas principales
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctores ENABLE ROW LEVEL SECURITY;
ALTER TABLE credenciales_doctores ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_registro_doctores ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas ENABLE ROW LEVEL SECURITY;
ALTER TABLE resultados_laboratorio ENABLE ROW LEVEL SECURITY;
ALTER TABLE recetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas_medicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_seguridad ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuentes_datos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipelines_etl ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs_pipeline ENABLE ROW LEVEL SECURITY;

-- Políticas para service_role (usado por el backend con SUPABASE_SERVICE_ROLE_KEY)
-- service_role tiene acceso completo a todas las tablas
CREATE POLICY "service_role_pacientes" ON pacientes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_doctores" ON doctores FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_credenciales" ON credenciales_doctores FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_solicitudes" ON solicitudes_registro_doctores FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_citas" ON citas FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_resultados" ON resultados_laboratorio FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_recetas" ON recetas FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_notas" ON notas_medicas FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_notificaciones" ON notificaciones FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_seguridad" ON registros_seguridad FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_fuentes" ON fuentes_datos FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_pipelines" ON pipelines_etl FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_import_jobs" ON import_jobs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_logs" ON logs_pipeline FOR ALL TO service_role USING (true) WITH CHECK (true);

-- COMENTARIOS DE DOCUMENTACIÓN
COMMENT ON TABLE pacientes IS 'Pacientes con todos los datos sensibles cifrados AES-256-GCM (codigo_acceso, fecha_nacimiento, tipo_sangre incluidos)';
COMMENT ON TABLE doctores IS 'Doctores con datos personales y numero_licencia cifrados';
COMMENT ON TABLE import_jobs IS 'Jobs de importación ETL con seguimiento de progreso';
COMMENT ON TABLE registros_seguridad IS 'Auditoría completa con campos sensibles cifrados (tipo_evento, descripcion, email, metadatos, user_agent)';
COMMENT ON TABLE notificaciones IS 'Notificaciones con titulo y mensaje cifrados';
COMMENT ON TABLE solicitudes_registro_doctores IS 'Solicitudes con email, numero_licencia y motivo_rechazo cifrados';
COMMENT ON TABLE pipelines_etl IS 'Pipelines de procesamiento ETL';
COMMENT ON TABLE fuentes_datos IS 'Fuentes de datos para importación ETL';