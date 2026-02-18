import { NextResponse, NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { encryptData, deriveKey, decryptData, encrypt, safeDecrypt as safeDecryptPacked, hashData } from '@/lib/encryption'
import { calculatePriority } from '@/lib/operations-research/scheduling'
import { withAuth } from '@/lib/auth-middleware'
import { verifyHCaptcha, isCaptchaEnabled } from '@/lib/hcaptcha'

// Helper para crear un hash determinista para búsquedas consultables.
async function createSearchableHash(value: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(value.toLowerCase().trim())
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Helper para generar el código de acceso
function generateAccessCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
}

async function handleGet(request: NextRequest) {
    try {
        const adminClient = createAdminClient()
        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')

        let query = adminClient
            .from('citas')
            .select('*')
            .order('fecha_cita', { ascending: true })
            .order('hora_cita', { ascending: true })

        if (status) {
            query = query.eq('estado', status)
        }

        const { data, error } = await query

        if (error) throw error

        // Descifrar campos cifrados
        const secret = process.env.ENCRYPTION_SECRET || 'default-secret-change-in-production'
        const key = await deriveKey(secret)

        const mappedAppointments = await Promise.all((data || []).map(async (apt) => {
            const reason = await safeDecryptPacked(apt.motivo_consulta, key)
            const notes = await safeDecryptPacked(apt.notas, key)
            const turno = await safeDecryptPacked(apt.numero_turno, key)

            return {
                id: apt.id,
                appointment_number: turno || apt.numero_turno,
                department: apt.departamento,
                appointment_date: apt.fecha_cita,
                appointment_time: apt.hora_cita,
                date: apt.fecha_cita,
                time: apt.hora_cita,
                type: apt.tipo_consulta,
                consultation_type: apt.tipo_consulta,
                status: apt.estado,
                priority: apt.prioridad,
                estimated_wait: apt.tiempo_espera_estimado,
                estimated_wait_time: apt.tiempo_espera_estimado,
                doctor_id: apt.doctor_id,
                patient_id: apt.paciente_id,
                reason,
                notes,
                created_at: apt.created_at
            }
        }))

        return NextResponse.json({ appointments: mappedAppointments })
    } catch (error) {
        console.error('Error fetching appointments:', error)
        return NextResponse.json(
            { error: 'Error al obtener citas' },
            { status: 500 }
        )
    }
}

export async function GET(request: NextRequest) {
    return withAuth(request, handleGet)
}

export async function POST(request: Request) {
    try {
        const body = await request.json()

        // Obtener la IP del cliente para la verificación del captcha
        const forwarded = request.headers.get('x-forwarded-for')
        const clientIp = forwarded ? forwarded.split(',')[0].trim() : 'unknown'

        // Verificar hCaptcha si está habilitado
        if (isCaptchaEnabled()) {
            const captchaToken = body.captchaToken
            if (!captchaToken) {
                return NextResponse.json(
                    { error: 'Por favor complete la verificación de seguridad' },
                    { status: 400 }
                )
            }

            const captchaResult = await verifyHCaptcha(captchaToken, clientIp)
            if (!captchaResult.success) {
                return NextResponse.json(
                    { error: 'Verificación de seguridad fallida. Por favor intente nuevamente.' },
                    { status: 400 }
                )
            }
        }

        // Validar campos obligatorios
        const requiredFields = ['department', 'date', 'time', 'type', 'name', 'cedula', 'phone']
        for (const field of requiredFields) {
            if (!body[field]) {
                return NextResponse.json(
                    { error: `El campo ${field} es requerido` },
                    { status: 400 }
                )
            }
        }

        // Validar que la fecha sea futura (utilizar la comparación de cadenas de fecha para evitar problemas de zona horaria)
        const appointmentDateStr = body.date // YYYY-MM-DD
        
        // Obtener la fecha local para compararla.
        const now = new Date()
        const localTodayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
        
        if (appointmentDateStr < localTodayStr) {
            return NextResponse.json(
                { error: 'No puede agendar citas en fechas pasadas' },
                { status: 400 }
            )
        }

        const adminClient = createAdminClient()

        // Derivar clave de cifrado
        const secret = process.env.ENCRYPTION_SECRET || 'default-secret-change-in-production'
        const key = await deriveKey(secret)

        // Crear un hash de la cédula que se pueda buscar para realizar consultas.
        const cedulaHash = await createSearchableHash(body.cedula)
        
        // Intenta encontrar un paciente existente por el hash de la cédula.
        const { data: existingPatients } = await adminClient
            .from('pacientes')
            .select('id, cedula_hash')
            .eq('cedula_hash', cedulaHash)
            .limit(1)

        let patientId: string

        if (existingPatients && existingPatients.length > 0) {
            // Si el paciente existe: actualizar el correo electrónico y el tipo de sangre si se han proporcionado.
            patientId = existingPatients[0].id
            console.log('Found existing patient:', patientId)

            const updateFields: Record<string, any> = {}

            if (body.email) {
                const emailEncrypted = await encryptData(body.email, key)
                updateFields.email_encrypted = emailEncrypted.encrypted
                updateFields.email_iv = emailEncrypted.iv
            }

            if (body.bloodType && body.bloodType !== 'unknown') {
                const bloodTypeEncrypted = await encrypt(body.bloodType, key)
                updateFields.tipo_sangre = bloodTypeEncrypted
            }

            if (Object.keys(updateFields).length > 0) {
                await adminClient
                    .from('pacientes')
                    .update(updateFields)
                    .eq('id', patientId)
            }
        } else {
            // Crear nuevo paciente
            const nameEncrypted = await encryptData(body.name, key)
            const cedulaEncrypted = await encryptData(body.cedula, key)
            const phoneEncrypted = await encryptData(body.phone, key)
            const accessCode = generateAccessCode()
            const accessCodeEncrypted = await encrypt(accessCode, key)
            const accessCodeHash = await hashData(accessCode)

            // Cifrar campos opcionales
            let emailFields: Record<string, string> = {}
            if (body.email) {
                const emailEncrypted = await encryptData(body.email, key)
                emailFields = {
                    email_encrypted: emailEncrypted.encrypted,
                    email_iv: emailEncrypted.iv,
                }
            }

            let bloodTypeField: Record<string, string> = {}
            if (body.bloodType && body.bloodType !== 'unknown') {
                const bloodTypeEncrypted = await encrypt(body.bloodType, key)
                bloodTypeField = { tipo_sangre: bloodTypeEncrypted }
            }

            const { data: newPatient, error: patientError } = await adminClient
                .from('pacientes')
                .insert({
                    cedula_encrypted: cedulaEncrypted.encrypted,
                    cedula_iv: cedulaEncrypted.iv,
                    cedula_hash: cedulaHash,
                    nombre_encrypted: nameEncrypted.encrypted,
                    nombre_iv: nameEncrypted.iv,
                    telefono_encrypted: phoneEncrypted.encrypted,
                    telefono_iv: phoneEncrypted.iv,
                    codigo_acceso: accessCodeEncrypted,
                    codigo_acceso_hash: accessCodeHash,
                    ...emailFields,
                    ...bloodTypeField,
                    status: 'active'
                })
                .select('id')
                .single()

            if (patientError) {
                console.error('Error creating patient:', patientError)
                // Si cedula_hash está duplicado, intenta encontrar el existente.
                if (patientError.code === '23505') {
                    const { data: foundPatient } = await adminClient
                        .from('pacientes')
                        .select('id')
                        .eq('cedula_hash', cedulaHash)
                        .single()
                    if (foundPatient) {
                        patientId = foundPatient.id
                    } else {
                        throw patientError
                    }
                } else {
                    throw patientError
                }
            } else {
                patientId = newPatient.id
                console.log('Created new patient:', patientId)
            }
        }

        let doctorId: string | null = null

        // Primero comprueba si se ha seleccionado un médico específico.
        if (body.doctor_id && body.doctor_id !== 'auto' && body.doctor_id !== '') {
            doctorId = body.doctor_id
            console.log('Using selected doctor:', doctorId)
        } else {
            // Asignación automática: buscar un médico disponible con la especialidad adecuada.
            // Primero, obtener todos los médicos activos con la especialidad
            const { data: doctors, error: doctorError } = await adminClient
                .from('doctores')
                .select('id')
                .eq('especialidad', body.department)
                .eq('is_active', true)

            if (doctorError) {
                console.error('Error finding doctors:', doctorError)
            }

            if (doctors && doctors.length > 0) {
                // Comprueba qué médicos tienen credenciales aprobadas.
                const doctorIds = doctors.map(d => d.id)
                
                const { data: approvedCreds } = await adminClient
                    .from('credenciales_doctores')
                    .select('doctor_id')
                    .in('doctor_id', doctorIds)
                    .eq('esta_aprobado', true)
                    .eq('esta_activo', true)

                if (approvedCreds && approvedCreds.length > 0) {
                    // Elija el primer médico aprobado.
                    doctorId = approvedCreds[0].doctor_id
                    console.log('Auto-assigned doctor:', doctorId)
                } else {
                    // No hay médicos aprobados, utilice cualquier médico activo.
                    doctorId = doctors[0].id
                    console.log('Using unapproved doctor (no approved available):', doctorId)
                }
            } else {
                console.log('No doctors found for specialty:', body.department)
            }
        }

        const priority = calculatePriority(body.type, body.department)
        const appointmentNumber = `MCL-${Date.now().toString().slice(-6)}`
        const turnoEncrypted = await encrypt(appointmentNumber, key)
        const turnoHash = await hashData(appointmentNumber)

        // Cifrar los datos de los pacientes para el registro de citas (copia de seguridad/desnormalizado).
        const nameEncryptedForAppt = await encryptData(body.name, key)
        const cedulaEncryptedForAppt = await encryptData(body.cedula, key)
        const phoneEncryptedForAppt = await encryptData(body.phone, key)

        // Cifrar motivo_consulta si se proporciona
        const motivoText = body.notes || body.reason || null
        const motivoEncrypted = motivoText ? await encrypt(motivoText, key) : null

        const { data, error } = await adminClient
            .from('citas')
            .insert({
                numero_turno: turnoEncrypted,
                numero_turno_hash: turnoHash,
                paciente_id: patientId,
                doctor_id: doctorId,
                departamento: body.department,
                fecha_cita: body.date,
                hora_cita: body.time,
                tipo_consulta: body.type,
                motivo_consulta: motivoEncrypted,
                // Almacenar también los datos cifrados de los pacientes en la cita para un acceso rápido.
                nombre_paciente_cifrado: nameEncryptedForAppt.encrypted,
                nombre_paciente_iv: nameEncryptedForAppt.iv,
                cedula_paciente_cifrada: cedulaEncryptedForAppt.encrypted,
                cedula_paciente_iv: cedulaEncryptedForAppt.iv,
                telefono_paciente_cifrado: phoneEncryptedForAppt.encrypted,
                telefono_paciente_iv: phoneEncryptedForAppt.iv,
                estado: 'programada',
                prioridad: priority,
                tiempo_espera_estimado: 15,
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating appointment:', error)
            throw error
        }

        console.log('Appointment created:', {
            id: data.id,
            appointmentNumber,
            patientId: data.paciente_id,
            doctorId: data.doctor_id,
            department: data.departamento
        })

        return NextResponse.json({
            success: true,
            appointment: {
                id: data.id,
                appointmentNumber: appointmentNumber,
                department: data.departamento,
                date: data.fecha_cita,
                time: data.hora_cita,
                type: data.tipo_consulta,
                status: data.estado,
                priority: data.prioridad,
                estimatedWaitTime: data.tiempo_espera_estimado,
                patientId: data.paciente_id,
                doctorId: data.doctor_id
            }
        }, { status: 201 })
    } catch (error) {
        console.error('Error creating appointment:', error)
        return NextResponse.json(
            { error: 'Error al crear la cita' },
            { status: 500 }
        )
    }
}
