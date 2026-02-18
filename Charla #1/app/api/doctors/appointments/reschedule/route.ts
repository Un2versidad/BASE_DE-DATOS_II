import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyToken } from '@/lib/auth'

// POST /api/doctors/appointments/reschedule - Reprogramar una cita
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { appointmentId, newDate, newTime, reason } = body

        const authHeader = request.headers.get('authorization')
        const token = authHeader?.replace('Bearer ', '')

        if (!token) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const payload = await verifyToken(token)
        if (!payload || payload.role !== 'doctor') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        if (!appointmentId || !newDate || !newTime) {
            return NextResponse.json(
                { error: 'ID de cita, nueva fecha y hora son requeridos' },
                { status: 400 }
            )
        }

        const doctorId = payload.userId
        const adminClient = createAdminClient()

        // Primero verifica que la cita exista y pertenezca a este médico.
        const { data: existingAppointment, error: findError } = await adminClient
            .from('citas')
            .select('id, estado, fecha_cita, hora_cita')
            .eq('id', appointmentId)
            .eq('doctor_id', doctorId)
            .single()

        if (findError || !existingAppointment) {
            return NextResponse.json(
                { error: 'Cita no encontrada o no autorizada' },
                { status: 404 }
            )
        }

        // Solo se permite reprogramar citas programadas o confirmadas.
        if (!['programada', 'confirmada'].includes(existingAppointment.estado)) {
            return NextResponse.json(
                { error: 'Solo se pueden reprogramar citas programadas o confirmadas' },
                { status: 400 }
            )
        }

        // Actualizar la cita
        const { data, error } = await adminClient
            .from('citas')
            .update({
                fecha_cita: newDate,
                hora_cita: newTime,
                notas: reason ? `Reprogramada: ${reason}` : null,
                estado: 'programada' // Restablecer a lo programado
            })
            .eq('id', appointmentId)
            .eq('doctor_id', doctorId)
            .select()
            .single()

        if (error) throw error

        // Crear notificación para el paciente a través de la tabla notificaciones
        try {
            if (data.paciente_id) {
                await adminClient
                    .from('notificaciones')
                    .insert({
                        destinatario_id: data.paciente_id,
                        tipo_destinatario: 'paciente',
                        titulo: 'Cita Reprogramada',
                        mensaje: `Su cita ha sido reprogramada para el ${newDate} a las ${newTime}. ${reason ? `Motivo: ${reason}` : ''}`,
                        tipo: 'cita',
                        prioridad: 'alta'
                    })
            }
        } catch (notifError) {
            console.log('Could not create patient notification:', notifError)
        }

        return NextResponse.json({
            success: true,
            appointment: {
                id: data.id,
                previousDate: existingAppointment.fecha_cita,
                previousTime: existingAppointment.hora_cita,
                newDate: data.fecha_cita,
                newTime: data.hora_cita,
                status: data.estado,
                reason: reason
            }
        })
    } catch (error: any) {
        console.error('Reschedule appointment error:', error)
        return NextResponse.json(
            { error: 'Error al reprogramar cita' },
            { status: 500 }
        )
    }
}
