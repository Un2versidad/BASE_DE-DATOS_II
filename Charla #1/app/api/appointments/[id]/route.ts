import { NextResponse, NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth-middleware'
import { logSecurityEvent, getClientIP } from '@/app/api/security-logs/route'

interface RouteContext {
    params: Promise<{ id: string }>
}

// Actualizar una cita (editar, confirmar llegada, cancelar)
async function handlePatch(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params
        const adminClient = createAdminClient()
        const body = await request.json()
        const ip = getClientIP(request)
        const userAgent = request.headers.get('user-agent') || undefined

        // Obtener la cita actual
        const { data: appointment, error: fetchError } = await adminClient
            .from('citas')
            .select('*')
            .eq('id', id)
            .single()

        if (fetchError || !appointment) {
            return NextResponse.json(
                { error: 'Cita no encontrada' },
                { status: 404 }
            )
        }

        const { action, ...updateData } = body

        let newStatus = appointment.estado
        let eventType = 'APPOINTMENT_UPDATED'
        let eventDescription = `Cita ${appointment.numero_turno} actualizada`

        switch (action) {
            case 'confirm_arrival':
                if (appointment.estado === 'cancelada') {
                    return NextResponse.json(
                        { error: 'No se puede confirmar una cita cancelada' },
                        { status: 400 }
                    )
                }
                newStatus = 'confirmada'
                eventType = 'APPOINTMENT_ARRIVAL_CONFIRMED'
                eventDescription = `Llegada confirmada para cita ${appointment.numero_turno}`
                break

            case 'start_consultation':
                if (appointment.estado !== 'confirmada') {
                    return NextResponse.json(
                        { error: 'La cita debe estar confirmada antes de iniciar consulta' },
                        { status: 400 }
                    )
                }
                newStatus = 'en_progreso'
                eventType = 'APPOINTMENT_IN_PROGRESS'
                eventDescription = `Consulta iniciada para cita ${appointment.numero_turno}`
                break

            case 'complete':
                newStatus = 'completada'
                eventType = 'APPOINTMENT_COMPLETED'
                eventDescription = `Cita ${appointment.numero_turno} completada`
                break

            case 'cancel':
                if (appointment.estado === 'completada') {
                    return NextResponse.json(
                        { error: 'No se puede cancelar una cita completada' },
                        { status: 400 }
                    )
                }
                newStatus = 'cancelada'
                eventType = 'APPOINTMENT_CANCELLED'
                eventDescription = `Cita ${appointment.numero_turno} cancelada. Motivo: ${updateData.cancellation_reason || 'No especificado'}`
                break

            case 'no_show':
                newStatus = 'no_asistio'
                eventType = 'APPOINTMENT_NO_SHOW'
                eventDescription = `Paciente no se presentó a cita ${appointment.numero_turno}`
                break

            case 'edit':
                // Permitir la edición de campos específicos
                eventType = 'APPOINTMENT_EDITED'
                eventDescription = `Cita ${appointment.numero_turno} editada`
                break

            default:
                // Solo actualiza los campos proporcionados.
                break
        }

        // Crear objeto de actualización
        const updateObject: Record<string, any> = {
            estado: newStatus
        }

        // Añadir campos opcionales para editar
        if (updateData.fecha_cita) updateObject.fecha_cita = updateData.fecha_cita
        if (updateData.hora_cita) updateObject.hora_cita = updateData.hora_cita
        if (updateData.departamento) updateObject.departamento = updateData.departamento
        if (updateData.tipo_consulta) updateObject.tipo_consulta = updateData.tipo_consulta
        if (updateData.prioridad) updateObject.prioridad = updateData.prioridad
        // Cifrar las notas si se proporcionan.
        if (updateData.notas || updateData.notas_medicas || updateData.notes) {
            const secret = process.env.ENCRYPTION_SECRET || 'default-secret-change-in-production'
            const { deriveKey, encrypt } = await import('@/lib/encryption')
            const key = await deriveKey(secret)
            const notesText = updateData.notas || updateData.notas_medicas || updateData.notes
            updateObject.notas = await encrypt(notesText, key)
        }
        if (updateData.doctor_id) updateObject.doctor_id = updateData.doctor_id
        if (updateData.tiempo_espera_estimado) updateObject.tiempo_espera_estimado = updateData.tiempo_espera_estimado

        // Actualizar la cita
        const { data, error } = await adminClient
            .from('citas')
            .update(updateObject)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        // Registrar evento de seguridad
        await logSecurityEvent({
            eventType,
            description: eventDescription,
            userEmail: 'admin@medcomlabs.com',
            userRole: 'admin',
            ipAddress: ip,
            userAgent: userAgent,
            metadata: {
                appointmentId: id,
                appointmentNumber: appointment.numero_turno,
                previousStatus: appointment.estado,
                newStatus,
                action
            }
        })

        return NextResponse.json({
            success: true,
            message: eventDescription,
            appointment: data
        })
    } catch (error) {
        console.error('Error updating appointment:', error)
        return NextResponse.json(
            { error: 'Error al actualizar la cita' },
            { status: 500 }
        )
    }
}

// Eliminar una cita
async function handleDelete(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params
        const adminClient = createAdminClient()
        const ip = getClientIP(request)
        const userAgent = request.headers.get('user-agent') || undefined

        // Obtener información sobre la cita antes de eliminarla
        const { data: appointment } = await adminClient
            .from('citas')
            .select('numero_turno')
            .eq('id', id)
            .single()

        const { error } = await adminClient
            .from('citas')
            .delete()
            .eq('id', id)

        if (error) throw error

        // Registrar evento de seguridad
        await logSecurityEvent({
            eventType: 'DATA_DELETION',
            description: `Cita ${appointment?.numero_turno || id} eliminada`,
            userEmail: 'admin@medcomlabs.com',
            userRole: 'admin',
            ipAddress: ip,
            userAgent: userAgent,
            metadata: { appointmentId: id }
        })

        return NextResponse.json({
            success: true,
            message: 'Cita eliminada exitosamente'
        })
    } catch (error) {
        console.error('Error deleting appointment:', error)
        return NextResponse.json(
            { error: 'Error al eliminar la cita' },
            { status: 500 }
        )
    }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
    return withAuth(request, (req) => handlePatch(req, context))
}

export async function DELETE(request: NextRequest, context: RouteContext) {
    return withAuth(request, (req) => handleDelete(req, context))
}
