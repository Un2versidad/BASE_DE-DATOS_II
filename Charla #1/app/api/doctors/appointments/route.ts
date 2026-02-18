import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyToken } from '@/lib/auth'
import { decryptData, deriveKey, encrypt, safeDecrypt } from '@/lib/encryption'

// GET /api/doctors/appointments - Obtener citas médicas
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const date = searchParams.get('date') // YYYY-MM-DD
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')
        const status = searchParams.get('status')

        // Obtener token de autenticación del encabezado
        const authHeader = request.headers.get('authorization')
        const token = authHeader?.replace('Bearer ', '')

        if (!token) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const payload = await verifyToken(token)
        if (!payload || payload.role !== 'doctor') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const doctorId = payload.userId
        const adminClient = createAdminClient()
        const secret = process.env.ENCRYPTION_SECRET || 'default-secret-change-in-production'
        const key = await deriveKey(secret)

        let query = adminClient
            .from('citas')
            .select(`
                *,
                pacientes (
                    id, nombre_encrypted, nombre_iv, cedula_encrypted, cedula_iv,
                    fecha_nacimiento, tipo_sangre, alergias_encrypted, alergias_iv, telefono_encrypted, telefono_iv
                )
            `)
            .eq('doctor_id', doctorId)
            .order('fecha_cita', { ascending: true })
            .order('hora_cita', { ascending: true })

        if (date) {
            query = query.eq('fecha_cita', date)
        } else if (startDate && endDate) {
            query = query.gte('fecha_cita', startDate).lte('fecha_cita', endDate)
        }

        if (status) {
            query = query.eq('estado', status)
        }

        const { data: appointments, error } = await query

        if (error) throw error

        // Descifrar los datos del paciente
        const decryptedAppointments = await Promise.all(
            (appointments || []).map(async (apt) => {
                let patientName = 'Paciente'
                let patientCedula = ''
                let patientPhone = ''

                if (apt.pacientes?.nombre_encrypted && apt.pacientes?.nombre_iv) {
                    try {
                        patientName = await decryptData(apt.pacientes.nombre_encrypted, apt.pacientes.nombre_iv, key)
                    } catch (e) {}
                } else if (apt.nombre_paciente_cifrado && apt.nombre_paciente_iv) {
                    try {
                        patientName = await decryptData(apt.nombre_paciente_cifrado, apt.nombre_paciente_iv, key)
                    } catch (e) {}
                }

                if (apt.pacientes?.cedula_encrypted && apt.pacientes?.cedula_iv) {
                    try {
                        patientCedula = await decryptData(apt.pacientes.cedula_encrypted, apt.pacientes.cedula_iv, key)
                    } catch (e) {}
                }

                if (apt.pacientes?.telefono_encrypted && apt.pacientes?.telefono_iv) {
                    try {
                        patientPhone = await decryptData(apt.pacientes.telefono_encrypted, apt.pacientes.telefono_iv, key)
                    } catch (e) {}
                }

                // Descifrar campos de citas (formato comprimido en columnas normales)
                const reason = apt.motivo_consulta ? await safeDecrypt(apt.motivo_consulta, key) : null
                const notes = apt.notas ? await safeDecrypt(apt.notas, key) : null

                return {
                    id: apt.id,
                    appointmentNumber: await safeDecrypt(apt.numero_turno, key) || apt.numero_turno,
                    date: apt.fecha_cita,
                    time: apt.hora_cita,
                    type: apt.tipo_consulta,
                    department: apt.departamento,
                    status: apt.estado,
                    priority: apt.prioridad || 5,
                    estimatedWait: apt.tiempo_espera_estimado,
                    reason,
                    notes,
                    arrivalTime: apt.hora_llegada,
                    startTime: apt.hora_inicio_consulta,
                    endTime: apt.hora_fin_consulta,
                    patient: {
                        id: apt.pacientes?.id || apt.paciente_id,
                        name: patientName,
                        cedula: patientCedula,
                        phone: patientPhone,
                        dob: await safeDecrypt(apt.pacientes?.fecha_nacimiento, key),
                        bloodType: await safeDecrypt(apt.pacientes?.tipo_sangre, key),
                        allergies: apt.pacientes?.alergias_encrypted
                        ? (apt.pacientes.alergias_encrypted.startsWith('enc_')
                            ? apt.pacientes.alergias_encrypted.replace('enc_', '').split('_')
                            : [])
                        : []
                    }
                }
            })
        )

        return NextResponse.json({
            success: true,
            appointments: decryptedAppointments
        })
    } catch (error: any) {
        console.error('Get appointments error:', error)
        return NextResponse.json(
            { error: 'Error al obtener citas' },
            { status: 500 }
        )
    }
}

// PATCH /api/doctors/appointments - Actualizar el estado de la cita
export async function PATCH(request: Request) {
    try {
        const body = await request.json()
        const { appointmentId, action, notes } = body

        // Obtener token de autenticación del encabezado
        const authHeader = request.headers.get('authorization')
        const token = authHeader?.replace('Bearer ', '')

        if (!token) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const payload = await verifyToken(token)
        if (!payload || payload.role !== 'doctor') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const adminClient = createAdminClient()

        let updateData: any = {}

        // Obtener la fecha de hoy en formato local (YYYY-MM-DD)
        const today = new Date()
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

        switch (action) {
            case 'start':
                // Verifique que la cita sea para hoy antes de comenzar.
                const { data: appointmentToStart } = await adminClient
                    .from('citas')
                    .select('fecha_cita, estado')
                    .eq('id', appointmentId)
                    .eq('doctor_id', payload.userId)
                    .single()
                
                if (!appointmentToStart) {
                    return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })
                }
                
                if (appointmentToStart.fecha_cita !== todayStr) {
                    return NextResponse.json({ 
                        error: `Esta cita está programada para ${appointmentToStart.fecha_cita}, no puede iniciarla hoy (${todayStr})` 
                    }, { status: 400 })
                }
                
                if (appointmentToStart.estado !== 'programada' && appointmentToStart.estado !== 'confirmada') {
                    return NextResponse.json({ 
                        error: 'Solo puede iniciar citas programadas o confirmadas' 
                    }, { status: 400 })
                }
                
                updateData.estado = 'en_progreso'
                updateData.hora_inicio_consulta = new Date().toISOString()
                break
            case 'complete':
                updateData.estado = 'completada'
                updateData.hora_fin_consulta = new Date().toISOString()
                break
            case 'cancel':
                updateData.estado = 'cancelada'
                break
            case 'no_show':
                updateData.estado = 'no_asistio'
                break
            case 'add_notes':
                // Cifrar notas antes de guardarlas (formato comprimido)
                const notesSecret = process.env.ENCRYPTION_SECRET || 'default-secret-change-in-production'
                const notesKey = await deriveKey(notesSecret)
                updateData.notas = await encrypt(notes, notesKey)
                break
            default:
                return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
        }

        const { data, error } = await adminClient
            .from('citas')
            .update(updateData)
            .eq('id', appointmentId)
            .eq('doctor_id', payload.userId)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({
            success: true,
            appointment: data
        })
    } catch (error: any) {
        console.error('Update appointment error:', error)
        return NextResponse.json(
            { error: 'Error al actualizar cita' },
            { status: 500 }
        )
    }
}
