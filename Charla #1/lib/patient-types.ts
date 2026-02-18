// Tipos para el sistema de gestión de pacientes

// Representación de la base de datos (con campos cifrados)
export interface PatientDB {
    id: string
    cedula_hash: string | null
    cedula_encrypted: string
    cedula_iv: string
    nombre_encrypted: string
    nombre_iv: string
    email_encrypted: string | null
    email_iv: string | null
    telefono_encrypted: string | null
    telefono_iv: string | null
    direccion_encrypted: string | null
    direccion_iv: string | null
    codigo_acceso: string
    fecha_nacimiento: string | null
    tipo_sangre: string | null
    genero: string | null
    alergias_encrypted: string | null
    alergias_iv: string | null
    condiciones_encrypted: string | null
    condiciones_iv: string | null
    contacto_emergencia_encrypted: string | null
    contacto_emergencia_iv: string | null
    status: 'active' | 'inactive' | 'deceased'
    notas_encrypted: string | null
    notas_iv: string | null
    source: 'manual' | 'etl_import' | 'api'
    import_job_id: string | null
    created_at: string
    updated_at: string
}

// Paciente descifrado para uso de la aplicación
export interface Patient {
    id: string
    cedula: string
    nombre: string
    email: string | null
    telefono: string | null
    direccion: string | null
    codigo_acceso: string
    fecha_nacimiento: string | null
    tipo_sangre: string | null
    genero: string | null
    alergias: string | null
    condiciones: string | null
    contacto_emergencia: string | null
    status: 'active' | 'inactive' | 'deceased'
    notas: string | null
    source: 'manual' | 'etl_import' | 'api'
    created_at: string
    updated_at: string
}

// Patient decrypted for use by the application
export interface PatientFormData {
    cedula: string
    nombre: string
    email?: string
    telefono?: string
    direccion?: string
    fecha_nacimiento?: string
    tipo_sangre?: string
    genero?: string
    alergias?: string
    condiciones?: string
    contacto_emergencia?: string
    status: 'active' | 'inactive' | 'deceased'
    notas?: string
}

// Para importación ETL
export interface PatientImportData {
    cedula: string
    nombre: string
    email?: string
    telefono?: string
    direccion?: string
    fecha_nacimiento?: string
    tipo_sangre?: string
    genero?: string
    alergias?: string
    condiciones?: string
    notas?: string
}

// Estadísticas
export interface PatientStats {
    totalPatients: number
    activePatients: number
    inactivePatients: number
    etlImported: number
    manualCreated: number
    newThisWeek: number
    newThisMonth: number
}

// Import job
export interface ImportJob {
    id: string
    file_name: string
    file_type: string | null
    total_records: number
    processed_records: number
    successful_records: number
    failed_records: number
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
    error_log: any[]
    field_mapping: Record<string, any> | null
    encrypt_data: boolean
    skip_duplicates: boolean
    created_by: string | null
    started_at: string | null
    completed_at: string | null
    created_at: string
}

// Tipos de respuesta de la API
export interface ApiResponse<T> {
    data: T | null
    error: string | null
}

export interface PaginatedResponse<T> {
    data: T[]
    total: number
    page: number
    pageSize: number
    totalPages: number
}
