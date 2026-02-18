import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyToken } from '@/lib/auth'
import { decryptData, deriveKey, safeDecrypt } from '@/lib/encryption'

// GET /api/doctors/dashboard - Get doctor dashboard data
export async function GET(request: Request) {
    try {
        // Get auth token from header
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

        // Get today's date in local format (YYYY-MM-DD)
        // Use local date instead of UTC to match database CURRENT_DATE behavior
        const today = new Date()
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
        
        // Calculate week start (Monday) and end (Sunday) for fetching appointments
        const dayOfWeek = today.getDay()
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() + diffToMonday)
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        
        // Use local date format for week bounds
        const weekStartStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`
        const weekEndStr = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}-${String(weekEnd.getDate()).padStart(2, '0')}`

        // Get doctor info
        const { data: doctor } = await adminClient
            .from('doctores')
            .select('*')
            .eq('id', doctorId)
            .single()

        // Get this week's appointments with patient info (for calendar views)
        const { data: appointments } = await adminClient
            .from('citas')
            .select(`
                *,
                pacientes (
                    id, nombre_encrypted, nombre_iv, cedula_encrypted, cedula_iv,
                    fecha_nacimiento, tipo_sangre, codigo_acceso, alergias_encrypted, alergias_iv
                )
            `)
            .eq('doctor_id', doctorId)
            .gte('fecha_cita', weekStartStr)
            .lte('fecha_cita', weekEndStr)
            .order('fecha_cita', { ascending: true })
            .order('hora_cita', { ascending: true })

        // Decrypt patient names
        const decryptedAppointments = await Promise.all(
            (appointments || []).map(async (apt) => {
                let patientName = 'Paciente'
                let patientCedula = ''

                if (apt.pacientes?.nombre_encrypted && apt.pacientes?.nombre_iv) {
                    try {
                        patientName = await decryptData(apt.pacientes.nombre_encrypted, apt.pacientes.nombre_iv, key)
                    } catch (e) {
                        // Try placeholder format
                        if (apt.pacientes.nombre_encrypted.startsWith('enc_')) {
                            patientName = apt.pacientes.nombre_encrypted.replace('enc_', '').replace(/_/g, ' ')
                        } else {
                            console.error('Error decrypting patient name:', e)
                        }
                    }
                } else if (apt.nombre_paciente_cifrado && apt.nombre_paciente_iv) {
                    try {
                        patientName = await decryptData(apt.nombre_paciente_cifrado, apt.nombre_paciente_iv, key)
                    } catch (e) {
                        console.error('Error decrypting patient name:', e)
                    }
                }

                if (apt.pacientes?.cedula_encrypted && apt.pacientes?.cedula_iv) {
                    try {
                        patientCedula = await decryptData(apt.pacientes.cedula_encrypted, apt.pacientes.cedula_iv, key)
                    } catch (e) {
                        // Try placeholder format
                        if (apt.pacientes.cedula_encrypted.startsWith('enc_')) {
                            patientCedula = apt.pacientes.cedula_encrypted.replace('enc_', '')
                        } else {
                            console.error('Error decrypting patient cedula:', e)
                        }
                    }
                }

                return {
                    id: apt.id,
                    appointmentNumber: await safeDecrypt(apt.numero_turno, key) || apt.numero_turno,
                    time: apt.hora_cita,
                    date: apt.fecha_cita,
                    type: apt.tipo_consulta,
                    status: apt.estado,
                    priority: apt.prioridad || 5,
                    estimatedWait: apt.tiempo_espera_estimado,
                    reason: apt.motivo_consulta ? await safeDecrypt(apt.motivo_consulta, key) : null,
                    arrivalTime: apt.hora_llegada,
                    startTime: apt.hora_inicio_consulta,
                    patient: {
                        id: apt.pacientes?.id || apt.paciente_id,
                        name: patientName,
                        cedula: patientCedula,
                        dob: await safeDecrypt(apt.pacientes?.fecha_nacimiento, key),
                        bloodType: await safeDecrypt(apt.pacientes?.tipo_sangre, key),
                        accessCode: await safeDecrypt(apt.pacientes?.codigo_acceso, key),
                        allergies: apt.pacientes?.alergias_encrypted 
                            ? (apt.pacientes.alergias_encrypted.startsWith('enc_') 
                                ? apt.pacientes.alergias_encrypted.replace('enc_', '').split('_')
                                : [])
                            : []
                    }
                }
            })
        )

        // Get pending lab results to review (completed but not yet reviewed)
        const { data: pendingResults } = await adminClient
            .from('resultados_laboratorio')
            .select(`
                *,
                pacientes (id, nombre_encrypted, nombre_iv)
            `)
            .eq('ordenado_por', doctorId)
            .eq('estado', 'completado')
            .is('revisado_por', null)
            .order('fecha_completado', { ascending: false })
            .limit(10)

        // Get active orders (pendiente or en_proceso)
        const { data: activeOrders } = await adminClient
            .from('resultados_laboratorio')
            .select(`
                *,
                pacientes (id, nombre_encrypted, nombre_iv)
            `)
            .eq('ordenado_por', doctorId)
            .in('estado', ['pendiente', 'en_proceso'])
            .order('fecha_orden', { ascending: false })
            .limit(20)

        // Helper to decrypt and map lab results
        const decryptAndMapResults = async (results: any[]) => {
            return Promise.all(
                results.map(async (result) => {
                    let patientName = 'Paciente'
                    if (result.pacientes?.nombre_encrypted && result.pacientes?.nombre_iv) {
                        try {
                            patientName = await decryptData(result.pacientes.nombre_encrypted, result.pacientes.nombre_iv, key)
                        } catch (e) {
                            if (result.pacientes.nombre_encrypted.startsWith('enc_')) {
                                patientName = result.pacientes.nombre_encrypted.replace('enc_', '').replace(/_/g, ' ')
                            } else {
                                console.error('Error decrypting patient name:', e)
                            }
                        }
                    }
                    return {
                        id: result.id,
                        examName: result.nombre_examen,
                        examType: result.tipo_examen,
                        status: result.estado,
                        orderedDate: result.fecha_orden,
                        completedDate: result.fecha_completado,
                        priority: result.prioridad,
                        patientId: result.paciente_id,
                        patientName
                    }
                })
            )
        }

        const decryptedResults = await decryptAndMapResults(pendingResults || [])
        const decryptedOrders = await decryptAndMapResults(activeOrders || [])

        // Get recent prescriptions
        const { data: prescriptions } = await adminClient
            .from('recetas')
            .select(`
                *,
                pacientes (id, nombre_encrypted, nombre_iv)
            `)
            .eq('doctor_id', doctorId)
            .eq('estado', 'activa')
            .order('created_at', { ascending: false })
            .limit(10)

        // Decrypt prescription patient names
        const decryptedPrescriptions = await Promise.all(
            (prescriptions || []).map(async (rx) => {
                let patientName = 'Paciente'
                if (rx.pacientes?.nombre_encrypted && rx.pacientes?.nombre_iv) {
                    try {
                        patientName = await decryptData(rx.pacientes.nombre_encrypted, rx.pacientes.nombre_iv, key)
                    } catch (e) {
                        // Try placeholder format
                        if (rx.pacientes.nombre_encrypted.startsWith('enc_')) {
                            patientName = rx.pacientes.nombre_encrypted.replace('enc_', '').replace(/_/g, ' ')
                        } else {
                            console.error('Error decrypting patient name:', e)
                        }
                    }
                }
                
                // Extract first medication from array
                const firstMed = Array.isArray(rx.medicamentos) && rx.medicamentos.length > 0 
                    ? rx.medicamentos[0] 
                    : { nombre: '', dosis: '', frecuencia: '' }
                
                return {
                    id: rx.id,
                    medication: firstMed.nombre || 'Sin medicamento',
                    dosage: firstMed.dosis || '',
                    frequency: firstMed.frecuencia || '',
                    duration: firstMed.duracion || '',
                    medications: rx.medicamentos,
                    diagnosis: rx.diagnostico,
                    startDate: rx.fecha_emision,
                    endDate: rx.fecha_vencimiento,
                    status: rx.estado,
                    instructions: rx.indicaciones_generales,
                    patientId: rx.paciente_id,
                    patientName,
                    refillsRemaining: firstMed.recargas || 0
                }
            })
        )

        // Get unique patients for this doctor - from completed, in-progress, or past appointments
        const { data: completedPatientAppointments } = await adminClient
            .from('citas')
            .select('paciente_id, fecha_cita, estado')
            .eq('doctor_id', doctorId)
            .not('paciente_id', 'is', null)
            .or(`estado.eq.completada,estado.eq.en_progreso,fecha_cita.lt.${todayStr}`)
            .order('fecha_cita', { ascending: false })

        // Get unique patient IDs with their last visit date
        const patientLastVisit: Record<string, string> = {}
        const uniquePatientIds: string[] = []
        
        for (const apt of completedPatientAppointments || []) {
            if (apt.paciente_id && !uniquePatientIds.includes(apt.paciente_id)) {
                uniquePatientIds.push(apt.paciente_id)
                // Only count completed appointments as "visited"
                if (apt.estado === 'completada' && !patientLastVisit[apt.paciente_id]) {
                    patientLastVisit[apt.paciente_id] = apt.fecha_cita
                }
            }
        }

        // Get patient details
        const { data: patients } = await adminClient
            .from('pacientes')
            .select('*')
            .in('id', uniquePatientIds.slice(0, 20))

        // Decrypt patient data
        const decryptedPatients = await Promise.all(
            (patients || []).map(async (patient) => {
                let name = 'Paciente'
                let cedula = ''
                let email = ''
                let phone = ''
                let allergies: string[] = []

                if (patient.nombre_encrypted && patient.nombre_iv) {
                    try {
                        name = await decryptData(patient.nombre_encrypted, patient.nombre_iv, key)
                    } catch (e) {
                        if (patient.nombre_encrypted.startsWith('enc_')) {
                            name = patient.nombre_encrypted.replace('enc_', '').replace(/_/g, ' ')
                        } else {
                            console.error('Error decrypting patient name:', e)
                        }
                    }
                }
                if (patient.cedula_encrypted && patient.cedula_iv) {
                    try {
                        cedula = await decryptData(patient.cedula_encrypted, patient.cedula_iv, key)
                    } catch (e) {
                        if (patient.cedula_encrypted.startsWith('enc_')) {
                            cedula = patient.cedula_encrypted.replace('enc_', '')
                        } else {
                            console.error('Error decrypting cedula:', e)
                        }
                    }
                }
                if (patient.email_encrypted && patient.email_iv) {
                    try {
                        email = await decryptData(patient.email_encrypted, patient.email_iv, key)
                    } catch (e) {}
                }
                if (patient.telefono_encrypted && patient.telefono_iv) {
                    try {
                        phone = await decryptData(patient.telefono_encrypted, patient.telefono_iv, key)
                    } catch (e) {}
                }
                if (patient.alergias_encrypted && patient.alergias_iv) {
                    try {
                        const decrypted = await decryptData(patient.alergias_encrypted, patient.alergias_iv, key)
                        try { allergies = JSON.parse(decrypted) } catch { allergies = decrypted.split(',').map((a: string) => a.trim()) }
                    } catch (e) {
                        if (patient.alergias_encrypted.startsWith('enc_')) {
                            allergies = patient.alergias_encrypted.replace('enc_', '').split('_')
                        }
                    }
                }

                const lastVisit = patientLastVisit[patient.id] || null

                const condition = allergies.length > 0 
                    ? `Alergias: ${allergies.join(', ')}`
                    : 'Sin condiciones registradas'

                return {
                    id: patient.id,
                    name,
                    cedula,
                    email,
                    phone,
                    dob: await safeDecrypt(patient.fecha_nacimiento, key),
                    bloodType: await safeDecrypt(patient.tipo_sangre, key),
                    allergies,
                    lastVisit,
                    condition,
                    status: 'stable',
                    accessCode: await safeDecrypt(patient.codigo_acceso, key)
                }
            })
        )

        // Get notifications count
        const { count: unreadNotifications } = await adminClient
            .from('notificaciones')
            .select('*', { count: 'exact', head: true })
            .eq('tipo_destinatario', 'doctor')
            .eq('destinatario_id', doctorId)
            .eq('leida', false)

        // Filter today's appointments for stats
        const todayAppointments = decryptedAppointments.filter(a => a.date === todayStr)
        
        // Calculate stats
        const stats = {
            todayAppointments: todayAppointments.length,
            completedToday: todayAppointments.filter(a => a.status === 'completada').length,
            waitingPatients: todayAppointments.filter(a => a.status === 'confirmada' || a.status === 'en_progreso').length,
            pendingResults: decryptedResults.length,
            totalPatients: uniquePatientIds.length,
            activePrescriptions: decryptedPrescriptions.length,
            unreadNotifications: unreadNotifications || 0
        }

        // Find next appointment (today only)
        const now = new Date()
        const currentTimeStr = now.toTimeString().slice(0, 5)
        const nextAppointment = todayAppointments.find(
            a => a.time >= currentTimeStr && a.status !== 'completada' && a.status !== 'cancelada'
        )

        // Decrypt doctor name
        let doctorName = 'Doctor'
        if (doctor?.nombre_cifrado && doctor?.nombre_iv) {
            try {
                doctorName = await decryptData(doctor.nombre_cifrado, doctor.nombre_iv, key)
            } catch (e) {
                if (doctor.nombre_cifrado.startsWith('enc_')) {
                    doctorName = doctor.nombre_cifrado.replace('enc_', '').replace(/_/g, ' ')
                }
            }
        }

        return NextResponse.json({
            success: true,
            currentDate: todayStr,  // Send today's date for consistent filtering
            doctor: {
                id: doctor?.id,
                name: doctorName,
                specialty: doctor?.especialidad,
                licenseNumber: await safeDecrypt(doctor?.numero_licencia, key),
                profileImage: doctor?.foto_url
            },
            stats,
            appointments: decryptedAppointments,
            nextAppointment,
            pendingResults: decryptedResults,
            orders: decryptedOrders,
            prescriptions: decryptedPrescriptions,
            patients: decryptedPatients
        })
    } catch (error: any) {
        console.error('Dashboard error:', error)
        return NextResponse.json(
            { error: 'Error al cargar dashboard' },
            { status: 500 }
        )
    }
}
