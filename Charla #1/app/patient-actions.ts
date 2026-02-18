'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { encryptData, decryptData, deriveKey, hashData, encrypt, safeDecrypt } from '@/lib/encryption'
import type { 
    Patient, 
    PatientDB, 
    PatientFormData, 
    PatientImportData, 
    PatientStats,
    ImportJob,
    ApiResponse 
} from '@/lib/patient-types'

// Secreto de cifrado: Hay que utilizar la variable de entorno en producción.
const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || 'medcomlabs-secure-encryption-key-2024'

// Generar código de acceso
function generateAccessCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
}

async function getEncryptionKey() {
    return deriveKey(ENCRYPTION_SECRET)
}

// Descifrar el historial de un paciente
async function decryptPatient(patientDB: PatientDB): Promise<Patient> {
    const key = await getEncryptionKey()
    
    let cedula = '[Error de descifrado]'
    let nombre = '[Error de descifrado]'
    let email: string | null = null
    let telefono: string | null = null
    let direccion: string | null = null
    let alergias: string | null = null
    let condiciones: string | null = null
    let contacto_emergencia: string | null = null
    let notas: string | null = null

    try {
        cedula = await decryptData(patientDB.cedula_encrypted, patientDB.cedula_iv, key)
    } catch (e) {
        console.error('Error decrypting cedula:', e)
    }

    try {
        nombre = await decryptData(patientDB.nombre_encrypted, patientDB.nombre_iv, key)
    } catch (e) {
        console.error('Error decrypting nombre:', e)
    }

    try {
        if (patientDB.email_encrypted && patientDB.email_iv) {
            email = await decryptData(patientDB.email_encrypted, patientDB.email_iv, key)
        }
    } catch (e) {
        email = '[Error de descifrado]'
    }

    try {
        if (patientDB.telefono_encrypted && patientDB.telefono_iv) {
            telefono = await decryptData(patientDB.telefono_encrypted, patientDB.telefono_iv, key)
        }
    } catch (e) {
        telefono = '[Error de descifrado]'
    }

    try {
        if (patientDB.direccion_encrypted && patientDB.direccion_iv) {
            direccion = await decryptData(patientDB.direccion_encrypted, patientDB.direccion_iv, key)
        }
    } catch (e) {
        direccion = '[Error de descifrado]'
    }

    try {
        if (patientDB.alergias_encrypted && patientDB.alergias_iv) {
            alergias = await decryptData(patientDB.alergias_encrypted, patientDB.alergias_iv, key)
        }
    } catch (e) {
        alergias = '[Error de descifrado]'
    }

    try {
        if (patientDB.condiciones_encrypted && patientDB.condiciones_iv) {
            condiciones = await decryptData(patientDB.condiciones_encrypted, patientDB.condiciones_iv, key)
        }
    } catch (e) {
        condiciones = '[Error de descifrado]'
    }

    try {
        if (patientDB.contacto_emergencia_encrypted && patientDB.contacto_emergencia_iv) {
            contacto_emergencia = await decryptData(
                patientDB.contacto_emergencia_encrypted, 
                patientDB.contacto_emergencia_iv, 
                key
            )
        }
    } catch (e) {
        contacto_emergencia = '[Error de descifrado]'
    }

    try {
        if (patientDB.notas_encrypted && patientDB.notas_iv) {
            notas = await decryptData(patientDB.notas_encrypted, patientDB.notas_iv, key)
        }
    } catch (e) {
        notas = '[Error de descifrado]'
    }

    return {
        id: patientDB.id,
        cedula,
        nombre,
        email,
        telefono,
        direccion,
        codigo_acceso: await safeDecrypt(patientDB.codigo_acceso, key) || patientDB.codigo_acceso,
        fecha_nacimiento: await safeDecrypt(patientDB.fecha_nacimiento, key),
        tipo_sangre: await safeDecrypt(patientDB.tipo_sangre, key),
        genero: patientDB.genero,
        alergias,
        condiciones,
        contacto_emergencia,
        status: patientDB.status,
        notas,
        source: patientDB.source,
        created_at: patientDB.created_at,
        updated_at: patientDB.updated_at,
    }
}

// Obtener todos los pacientes (descifrados)
export async function getPatients(): Promise<ApiResponse<Patient[]>> {
    try {
        const adminClient = createAdminClient()
        
        const { data, error } = await adminClient
            .from('pacientes')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching patients:', error)
            return { data: null, error: error.message }
        }

        if (!data || data.length === 0) {
            return { data: [], error: null }
        }

        const patients = await Promise.all(
            (data as PatientDB[]).map(decryptPatient)
        )

        return { data: patients, error: null }
    } catch (error: any) {
        console.error('getPatients error:', error)
        return { data: null, error: error.message || 'Error al obtener pacientes' }
    }
}

// Obtener un solo paciente por ID
export async function getPatient(id: string): Promise<ApiResponse<Patient>> {
    try {
        const adminClient = createAdminClient()
        
        const { data, error } = await adminClient
            .from('pacientes')
            .select('*')
            .eq('id', id)
            .single()

        if (error) {
            return { data: null, error: error.message }
        }

        const patient = await decryptPatient(data as PatientDB)
        return { data: patient, error: null }
    } catch (error: any) {
        return { data: null, error: error.message || 'Error al obtener paciente' }
    }
}

// Obtener un solo paciente por ID
export async function searchPatientByCedula(cedula: string): Promise<ApiResponse<Patient>> {
    try {
        const cedulaHash = await hashData(cedula.trim().toUpperCase())
        const adminClient = createAdminClient()
        
        const { data, error } = await adminClient
            .from('pacientes')
            .select('*')
            .eq('cedula_hash', cedulaHash)
            .single()

        if (error) {
            return { data: null, error: 'Paciente no encontrado' }
        }

        const patient = await decryptPatient(data as PatientDB)
        return { data: patient, error: null }
    } catch (error: any) {
        return { data: null, error: error.message || 'Error en la búsqueda' }
    }
}

// Crear un nuevo paciente con campos cifrados
export async function createPatient(formData: PatientFormData): Promise<ApiResponse<Patient>> {
    try {
        const adminClient = createAdminClient()
        const key = await getEncryptionKey()

        // Generar hash para la búsqueda de la cédula
        const cedulaHash = await hashData(formData.cedula.trim().toUpperCase())

        // Comprueba si la cédula ya existe
        const { data: existing } = await adminClient
            .from('pacientes')
            .select('id')
            .eq('cedula_hash', cedulaHash)
            .single()

        if (existing) {
            return { data: null, error: 'Ya existe un paciente con esta cédula' }
        }

        // Cifrar todos los campos confidenciales
        const cedulaEncrypted = await encryptData(formData.cedula.trim(), key)
        const nombreEncrypted = await encryptData(formData.nombre.trim(), key)
        const emailEncrypted = formData.email ? await encryptData(formData.email.trim(), key) : null
        const telefonoEncrypted = formData.telefono ? await encryptData(formData.telefono.trim(), key) : null
        const direccionEncrypted = formData.direccion ? await encryptData(formData.direccion.trim(), key) : null
        const alergiasEncrypted = formData.alergias ? await encryptData(formData.alergias.trim(), key) : null
        const condicionesEncrypted = formData.condiciones ? await encryptData(formData.condiciones.trim(), key) : null
        const contactoEncrypted = formData.contacto_emergencia ? await encryptData(formData.contacto_emergencia.trim(), key) : null
        const notasEncrypted = formData.notas ? await encryptData(formData.notas.trim(), key) : null

        // Generar código de acceso
        const accessCode = generateAccessCode()
        const accessCodeEncrypted = await encrypt(accessCode, key)
        const accessCodeHash = await hashData(accessCode)

        const { data, error } = await adminClient
            .from('pacientes')
            .insert({
                cedula_hash: cedulaHash,
                cedula_encrypted: cedulaEncrypted.encrypted,
                cedula_iv: cedulaEncrypted.iv,
                nombre_encrypted: nombreEncrypted.encrypted,
                nombre_iv: nombreEncrypted.iv,
                email_encrypted: emailEncrypted?.encrypted || null,
                email_iv: emailEncrypted?.iv || null,
                telefono_encrypted: telefonoEncrypted?.encrypted || null,
                telefono_iv: telefonoEncrypted?.iv || null,
                direccion_encrypted: direccionEncrypted?.encrypted || null,
                direccion_iv: direccionEncrypted?.iv || null,
                fecha_nacimiento: formData.fecha_nacimiento ? await encrypt(formData.fecha_nacimiento, key) : null,
                tipo_sangre: formData.tipo_sangre ? await encrypt(formData.tipo_sangre, key) : null,
                genero: formData.genero || null,
                codigo_acceso: accessCodeEncrypted,
                codigo_acceso_hash: accessCodeHash,
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating patient:', error)
            return { data: null, error: error.message }
        }

        const patient = await decryptPatient(data as PatientDB)
        return { data: patient, error: null }
    } catch (error: any) {
        console.error('createPatient error:', error)
        return { data: null, error: error.message || 'Error al crear paciente' }
    }
}

// Actualizar un paciente
export async function updatePatient(id: string, formData: PatientFormData): Promise<ApiResponse<Patient>> {
    try {
        const adminClient = createAdminClient()
        const key = await getEncryptionKey()

        // Generar hash para la búsqueda de la cédula
        const cedulaHash = await hashData(formData.cedula.trim().toUpperCase())

        // Comprueba si la cédula ya existe para otro paciente.
        const { data: existing } = await adminClient
            .from('pacientes')
            .select('id')
            .eq('cedula_hash', cedulaHash)
            .neq('id', id)
            .single()

        if (existing) {
            return { data: null, error: 'Ya existe otro paciente con esta cédula' }
        }

        // Cifrar todos los campos confidenciales
        const cedulaEncrypted = await encryptData(formData.cedula.trim(), key)
        const nombreEncrypted = await encryptData(formData.nombre.trim(), key)
        const emailEncrypted = formData.email ? await encryptData(formData.email.trim(), key) : null
        const telefonoEncrypted = formData.telefono ? await encryptData(formData.telefono.trim(), key) : null
        const direccionEncrypted = formData.direccion ? await encryptData(formData.direccion.trim(), key) : null
        const alergiasEncrypted = formData.alergias ? await encryptData(formData.alergias.trim(), key) : null
        const condicionesEncrypted = formData.condiciones ? await encryptData(formData.condiciones.trim(), key) : null
        const contactoEncrypted = formData.contacto_emergencia ? await encryptData(formData.contacto_emergencia.trim(), key) : null
        const notasEncrypted = formData.notas ? await encryptData(formData.notas.trim(), key) : null

        const { data, error } = await adminClient
            .from('pacientes')
            .update({
                cedula_hash: cedulaHash,
                cedula_encrypted: cedulaEncrypted.encrypted,
                cedula_iv: cedulaEncrypted.iv,
                nombre_encrypted: nombreEncrypted.encrypted,
                nombre_iv: nombreEncrypted.iv,
                email_encrypted: emailEncrypted?.encrypted || null,
                email_iv: emailEncrypted?.iv || null,
                telefono_encrypted: telefonoEncrypted?.encrypted || null,
                telefono_iv: telefonoEncrypted?.iv || null,
                direccion_encrypted: direccionEncrypted?.encrypted || null,
                direccion_iv: direccionEncrypted?.iv || null,
                fecha_nacimiento: formData.fecha_nacimiento ? await encrypt(formData.fecha_nacimiento, key) : null,
                tipo_sangre: formData.tipo_sangre ? await encrypt(formData.tipo_sangre, key) : null,
                genero: formData.genero || null,
                alergias_encrypted: alergiasEncrypted?.encrypted || null,
                alergias_iv: alergiasEncrypted?.iv || null,
                condiciones_encrypted: condicionesEncrypted?.encrypted || null,
                condiciones_iv: condicionesEncrypted?.iv || null,
                contacto_emergencia_encrypted: contactoEncrypted?.encrypted || null,
                contacto_emergencia_iv: contactoEncrypted?.iv || null,
                status: formData.status,
                notas_encrypted: notasEncrypted?.encrypted || null,
                notas_iv: notasEncrypted?.iv || null,
            })
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Error updating patient:', error)
            return { data: null, error: error.message }
        }

        const patient = await decryptPatient(data as PatientDB)
        return { data: patient, error: null }
    } catch (error: any) {
        console.error('updatePatient error:', error)
        return { data: null, error: error.message || 'Error al actualizar paciente' }
    }
}

// Eliminar un paciente
export async function deletePatient(id: string): Promise<{ success: boolean; error: string | null }> {
    try {
        const adminClient = createAdminClient()

        const { error } = await adminClient
            .from('pacientes')
            .delete()
            .eq('id', id)

        if (error) {
            return { success: false, error: error.message }
        }

        return { success: true, error: null }
    } catch (error: any) {
        return { success: false, error: error.message || 'Error al eliminar paciente' }
    }
}

// Obtener estadísticas de pacientes
export async function getPatientStats(): Promise<ApiResponse<PatientStats>> {
    try {
        const adminClient = createAdminClient()

        const { data, error } = await adminClient
            .from('pacientes')
            .select('status, source, created_at')

        if (error) {
            return { 
                data: {
                    totalPatients: 0,
                    activePatients: 0,
                    inactivePatients: 0,
                    etlImported: 0,
                    manualCreated: 0,
                    newThisWeek: 0,
                    newThisMonth: 0
                }, 
                error: null 
            }
        }

        const now = new Date()
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

        const stats: PatientStats = {
            totalPatients: data.length,
            activePatients: data.filter(p => p.status === 'active').length,
            inactivePatients: data.filter(p => p.status === 'inactive').length,
            etlImported: data.filter(p => p.source === 'etl_import').length,
            manualCreated: data.filter(p => p.source === 'manual').length,
            newThisWeek: data.filter(p => new Date(p.created_at) >= weekAgo).length,
            newThisMonth: data.filter(p => new Date(p.created_at) >= monthAgo).length,
        }

        return { data: stats, error: null }
    } catch (error: any) {
        return { 
            data: {
                totalPatients: 0,
                activePatients: 0,
                inactivePatients: 0,
                etlImported: 0,
                manualCreated: 0,
                newThisWeek: 0,
                newThisMonth: 0
            }, 
            error: error.message 
        }
    }
}

// Importar pacientes desde ETL (con cifrado)
export async function importPatients(
    data: PatientImportData[], 
    fileName: string
): Promise<{ job: ImportJob | null; error: string | null }> {
    try {
        const adminClient = createAdminClient()
        const key = await getEncryptionKey()

        // Crear tarea de importación
        const { data: jobData, error: jobError } = await adminClient
            .from('import_jobs')
            .insert({
                file_name: fileName,
                file_type: fileName.endsWith('.json') ? 'json' : 'csv',
                total_records: data.length,
                status: 'processing',
                started_at: new Date().toISOString(),
            })
            .select()
            .single()

        if (jobError) {
            return { job: null, error: jobError.message }
        }

        const job = jobData as ImportJob
        let successCount = 0
        let failedCount = 0
        const errors: any[] = []

        // Procesar cada registro
        for (const record of data) {
            try {
                // Validar campos obligatorios
                if (!record.cedula || !record.nombre) {
                    failedCount++
                    errors.push({ record, error: 'Cédula y nombre son requeridos' })
                    continue
                }

                // Generar hash para la búsqueda de la cédula
                const cedulaHash = await hashData(record.cedula.trim().toUpperCase())

                // Comprueba si la cédula ya existe
                const { data: existing } = await adminClient
                    .from('pacientes')
                    .select('id')
                    .eq('cedula_hash', cedulaHash)
                    .single()

                if (existing) {
                    failedCount++
                    errors.push({ record, error: 'duplicado', isDuplicate: true })
                    continue
                }

                // Cifrar todos los campos confidenciales
                const cedulaEncrypted = await encryptData(record.cedula.trim(), key)
                const nombreEncrypted = await encryptData(record.nombre.trim(), key)
                const emailEncrypted = record.email ? await encryptData(record.email.trim(), key) : null
                const telefonoEncrypted = record.telefono ? await encryptData(record.telefono.trim(), key) : null
                const direccionEncrypted = record.direccion ? await encryptData(record.direccion.trim(), key) : null
                const alergiasEncrypted = record.alergias ? await encryptData(record.alergias.trim(), key) : null
                const condicionesEncrypted = record.condiciones ? await encryptData(record.condiciones.trim(), key) : null
                const notasEncrypted = record.notas ? await encryptData(record.notas.trim(), key) : null

                // Generar código de acceso
                const importAccessCode = generateAccessCode()
                const importAccessCodeEncrypted = await encrypt(importAccessCode, key)
                const importAccessCodeHash = await hashData(importAccessCode)

                // Insertar paciente
                const { error: insertError } = await adminClient
                    .from('pacientes')
                    .insert({
                        cedula_hash: cedulaHash,
                        cedula_encrypted: cedulaEncrypted.encrypted,
                        cedula_iv: cedulaEncrypted.iv,
                        nombre_encrypted: nombreEncrypted.encrypted,
                        nombre_iv: nombreEncrypted.iv,
                        email_encrypted: emailEncrypted?.encrypted || null,
                        email_iv: emailEncrypted?.iv || null,
                        telefono_encrypted: telefonoEncrypted?.encrypted || null,
                        telefono_iv: telefonoEncrypted?.iv || null,
                        direccion_encrypted: direccionEncrypted?.encrypted || null,
                        direccion_iv: direccionEncrypted?.iv || null,
                        fecha_nacimiento: record.fecha_nacimiento ? await encrypt(record.fecha_nacimiento, key) : null,
                        tipo_sangre: record.tipo_sangre ? await encrypt(record.tipo_sangre, key) : null,
                        genero: record.genero || null,
                        alergias_encrypted: alergiasEncrypted?.encrypted || null,
                        alergias_iv: alergiasEncrypted?.iv || null,
                        condiciones_encrypted: condicionesEncrypted?.encrypted || null,
                        condiciones_iv: condicionesEncrypted?.iv || null,
                        status: 'active',
                        notas_encrypted: notasEncrypted?.encrypted || null,
                        notas_iv: notasEncrypted?.iv || null,
                        codigo_acceso: importAccessCodeEncrypted,
                        codigo_acceso_hash: importAccessCodeHash,
                        source: 'etl_import',
                        import_job_id: job.id,
                    })

                if (insertError) {
                    failedCount++
                    errors.push({ record, error: insertError.message })
                } else {
                    successCount++
                }
            } catch (recordError: any) {
                failedCount++
                errors.push({ record, error: recordError.message })
            }
        }

        // Actualizar trabajo con resultados
        const duplicateCount = errors.filter((e: any) => e.isDuplicate).length
        const realFailures = failedCount - duplicateCount
        
        // Determinar estado: «completado» o «fallido» (la restricción de la base de datos solo permite estos).
        // Almacenar la información duplicada en error_log para que la interfaz de usuario la interprete.
        let finalStatus = 'completed'
        if (successCount === 0 && realFailures > 0) {
            finalStatus = 'failed'
        }
        // Nota: cuando todos son duplicados, el estado es «completado» (procesado correctamente, solo que no hay registros nuevos).
        
        const { error: updateError } = await adminClient
            .from('import_jobs')
            .update({
                processed_records: data.length,
                successful_records: successCount,
                failed_records: failedCount,
                status: finalStatus,
                error_log: errors.length > 0 ? errors : null,
                completed_at: new Date().toISOString(),
            })
            .eq('id', job.id)
        
        if (updateError) {
            console.error('Error updating import job:', updateError)
        }

        // Obtener trabajo actualizado
        const { data: updatedJob } = await adminClient
            .from('import_jobs')
            .select()
            .eq('id', job.id)
            .single()

        return { job: updatedJob as ImportJob, error: null }
    } catch (error: any) {
        console.error('importPatients error:', error)
        return { job: null, error: error.message || 'Error en la importación' }
    }
}

// Obtener el historial de trabajos de importación
export async function getImportJobs(): Promise<ApiResponse<ImportJob[]>> {
    try {
        const adminClient = createAdminClient()

        const { data, error } = await adminClient
            .from('import_jobs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20)

        if (error) {
            return { data: null, error: error.message }
        }

        return { data: data as ImportJob[], error: null }
    } catch (error: any) {
        return { data: null, error: error.message }
    }
}

// Borrar el historial de trabajos de importación (eliminar trabajos atascados/antiguos)
export async function clearImportHistory(): Promise<{ success: boolean; error: string | null }> {
    try {
        const adminClient = createAdminClient()

        // Eliminar todos los trabajos de importación
        const { error } = await adminClient
            .from('import_jobs')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000')

        if (error) {
            return { success: false, error: error.message }
        }

        return { success: true, error: null }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// Tipo de importación de resultados de laboratorio
export interface LabResultImportData {
    paciente_cedula: string
    nombre_examen: string
    tipo_examen: string
    estado?: string
    prioridad?: string
    fecha_orden: string
    fecha_completado?: string
    resultados?: Record<string, any>
    interpretacion?: string
    notas?: string
}

// Importar resultados de laboratorio desde ETL
export async function importLabResults(
    data: LabResultImportData[], 
    fileName: string
): Promise<{ job: ImportJob | null; error: string | null }> {
    try {
        const adminClient = createAdminClient()
        const key = await getEncryptionKey()

        // Crear tarea de importación
        const { data: jobData, error: jobError } = await adminClient
            .from('import_jobs')
            .insert({
                file_name: fileName,
                file_type: fileName.endsWith('.json') ? 'json' : 'csv',
                total_records: data.length,
                status: 'processing',
                started_at: new Date().toISOString(),
            })
            .select()
            .single()

        if (jobError) {
            return { job: null, error: jobError.message }
        }

        const job = jobData as ImportJob
        let successCount = 0
        let failedCount = 0
        const errors: any[] = []

        // Procesar cada resultado de laboratorio
        for (const record of data) {
            try {
                // Process each laboratory result
                if (!record.paciente_cedula || !record.nombre_examen || !record.tipo_examen) {
                    failedCount++
                    errors.push({ record, error: 'Cédula paciente, nombre y tipo de examen son requeridos' })
                    continue
                }

                // Buscar paciente por hash de cédula
                const cedulaHash = await hashData(record.paciente_cedula.trim().toUpperCase())
                const { data: patient, error: patientError } = await adminClient
                    .from('pacientes')
                    .select('id')
                    .eq('cedula_hash', cedulaHash)
                    .single()

                if (patientError || !patient) {
                    failedCount++
                    errors.push({ record, error: `Paciente no encontrado: ${record.paciente_cedula}` })
                    continue
                }

                // Cifrar los resultados y las notas, si se proporcionan.
                const resultadosEncrypted = record.resultados 
                    ? await encryptData(JSON.stringify(record.resultados), key) 
                    : null
                const notasEncrypted = record.notas 
                    ? await encryptData(record.notas.trim(), key) 
                    : null

                // Insertar resultado de laboratorio
                const { error: insertError } = await adminClient
                    .from('resultados_laboratorio')
                    .insert({
                        paciente_id: patient.id,
                        nombre_examen: record.nombre_examen,
                        tipo_examen: record.tipo_examen,
                        estado: record.estado || 'completado',
                        prioridad: record.prioridad || 'normal',
                        fecha_orden: record.fecha_orden,
                        fecha_completado: record.fecha_completado || record.fecha_orden,
                        resultados_cifrados: resultadosEncrypted?.encrypted || null,
                        resultados_iv: resultadosEncrypted?.iv || null,
                        notas_cifradas: notasEncrypted?.encrypted || null,
                        notas_iv: notasEncrypted?.iv || null,
                        interpretacion: record.interpretacion || null,
                    })

                if (insertError) {
                    failedCount++
                    errors.push({ record, error: insertError.message })
                } else {
                    successCount++
                }
            } catch (recordError: any) {
                failedCount++
                errors.push({ record, error: recordError.message })
            }
        }

        // Actualizar trabajo con resultados
        let finalStatus = 'completed'
        if (successCount === 0 && failedCount > 0) {
            finalStatus = 'failed'
        }

        const { error: updateError } = await adminClient
            .from('import_jobs')
            .update({
                processed_records: data.length,
                successful_records: successCount,
                failed_records: failedCount,
                status: finalStatus,
                error_log: errors.length > 0 ? errors : null,
                completed_at: new Date().toISOString(),
            })
            .eq('id', job.id)

        if (updateError) {
            console.error('Error updating import job:', updateError)
        }

        // Obtener trabajo actualizado
        const { data: updatedJob } = await adminClient
            .from('import_jobs')
            .select()
            .eq('id', job.id)
            .single()

        return { job: updatedJob as ImportJob, error: null }
    } catch (error: any) {
        console.error('importLabResults error:', error)
        return { job: null, error: error.message || 'Error en la importación de resultados' }
    }
}

// Pacientes de demostración iniciales (para pruebas)
export async function seedDemoPatients(): Promise<{ success: boolean; count: number; error: string | null }> {
    try {
        const adminClient = createAdminClient()
        const key = await getEncryptionKey()

        const demoPatients: PatientImportData[] = [
            {
                cedula: '001-1234567-1',
                nombre: 'María García López',
                email: 'maria.garcia@email.com',
                telefono: '809-555-0101',
                direccion: 'Calle Principal #123, Santo Domingo',
                fecha_nacimiento: '1985-03-15',
                tipo_sangre: 'A+',
                genero: 'femenino',
                alergias: 'Penicilina',
                condiciones: 'Hipertensión leve',
                notas: 'Paciente regular, control mensual'
            },
            {
                cedula: '002-2345678-2',
                nombre: 'Juan Rodríguez Pérez',
                email: 'juan.rodriguez@email.com',
                telefono: '809-555-0102',
                direccion: 'Av. Independencia #456, Santiago',
                fecha_nacimiento: '1978-07-22',
                tipo_sangre: 'O+',
                genero: 'masculino',
                alergias: 'Ninguna conocida',
                condiciones: 'Diabetes tipo 2',
                notas: 'Seguimiento trimestral'
            },
            {
                cedula: '003-3456789-3',
                nombre: 'Ana Martínez Cruz',
                email: 'ana.martinez@email.com',
                telefono: '809-555-0103',
                direccion: 'Calle Los Álamos #789, La Romana',
                fecha_nacimiento: '1992-11-08',
                tipo_sangre: 'B+',
                genero: 'femenino',
                notas: 'Primera consulta'
            },
            {
                cedula: '004-4567890-4',
                nombre: 'Pedro Sánchez Reyes',
                email: 'pedro.sanchez@email.com',
                telefono: '809-555-0104',
                direccion: 'Av. 27 de Febrero #321, Santo Domingo',
                fecha_nacimiento: '1965-01-30',
                tipo_sangre: 'AB-',
                genero: 'masculino',
                alergias: 'Aspirina, Sulfas',
                condiciones: 'Cardiopatía, Colesterol alto',
                notas: 'Paciente de alto riesgo - monitoreo constante'
            },
            {
                cedula: '005-5678901-5',
                nombre: 'Carmen Fernández Díaz',
                email: 'carmen.fernandez@email.com',
                telefono: '809-555-0105',
                direccion: 'Calle El Sol #654, Puerto Plata',
                fecha_nacimiento: '1988-05-12',
                tipo_sangre: 'O-',
                genero: 'femenino',
                notas: 'Embarazo - control prenatal'
            }
        ]

        let createdCount = 0

        for (const patient of demoPatients) {
            const cedulaHash = await hashData(patient.cedula.trim().toUpperCase())

            // Saltar si ya existe
            const { data: existing } = await adminClient
                .from('pacientes')
                .select('id')
                .eq('cedula_hash', cedulaHash)
                .single()

            if (existing) continue

            // Cifrar todos los campos confidenciales
            const cedulaEncrypted = await encryptData(patient.cedula.trim(), key)
            const nombreEncrypted = await encryptData(patient.nombre.trim(), key)
            const emailEncrypted = patient.email ? await encryptData(patient.email.trim(), key) : null
            const telefonoEncrypted = patient.telefono ? await encryptData(patient.telefono.trim(), key) : null
            const direccionEncrypted = patient.direccion ? await encryptData(patient.direccion.trim(), key) : null
            const alergiasEncrypted = patient.alergias ? await encryptData(patient.alergias.trim(), key) : null
            const condicionesEncrypted = patient.condiciones ? await encryptData(patient.condiciones.trim(), key) : null
            const notasEncrypted = patient.notas ? await encryptData(patient.notas.trim(), key) : null

            // Generar código de acceso
            const seedAccessCode = generateAccessCode()
            const seedAccessCodeEncrypted = await encrypt(seedAccessCode, key)
            const seedAccessCodeHash = await hashData(seedAccessCode)

            const { error } = await adminClient
                .from('pacientes')
                .insert({
                    cedula_hash: cedulaHash,
                    cedula_encrypted: cedulaEncrypted.encrypted,
                    cedula_iv: cedulaEncrypted.iv,
                    nombre_encrypted: nombreEncrypted.encrypted,
                    nombre_iv: nombreEncrypted.iv,
                    email_encrypted: emailEncrypted?.encrypted || null,
                    email_iv: emailEncrypted?.iv || null,
                    telefono_encrypted: telefonoEncrypted?.encrypted || null,
                    telefono_iv: telefonoEncrypted?.iv || null,
                    direccion_encrypted: direccionEncrypted?.encrypted || null,
                    direccion_iv: direccionEncrypted?.iv || null,
                    fecha_nacimiento: patient.fecha_nacimiento ? await encrypt(patient.fecha_nacimiento, key) : null,
                    tipo_sangre: patient.tipo_sangre ? await encrypt(patient.tipo_sangre, key) : null,
                    genero: patient.genero || null,
                    alergias_encrypted: alergiasEncrypted?.encrypted || null,
                    alergias_iv: alergiasEncrypted?.iv || null,
                    condiciones_encrypted: condicionesEncrypted?.encrypted || null,
                    condiciones_iv: condicionesEncrypted?.iv || null,
                    status: 'active',
                    notas_encrypted: notasEncrypted?.encrypted || null,
                    notas_iv: notasEncrypted?.iv || null,
                    codigo_acceso: seedAccessCodeEncrypted,
                    codigo_acceso_hash: seedAccessCodeHash,
                    source: 'manual',
                })

            if (!error) {
                createdCount++
            }
        }

        return { success: true, count: createdCount, error: null }
    } catch (error: any) {
        console.error('seedDemoPatients error:', error)
        return { success: false, count: 0, error: error.message }
    }
}
