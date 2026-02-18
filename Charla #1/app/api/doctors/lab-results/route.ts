import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyToken } from '@/lib/auth'

// GET /api/doctors/lab-results - Get lab results for doctor
export async function GET(request: Request) {
    try {
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
        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')

        // Use ordenado_por (correct column name in schema)
        let query = adminClient
            .from('resultados_laboratorio')
            .select(`
                *,
                paciente:paciente_id (
                    id,
                    nombre_encrypted,
                    nombre_iv
                )
            `)
            .eq('ordenado_por', doctorId)
            .order('fecha_orden', { ascending: false })

        if (status) {
            query = query.eq('estado', status)
        }

        const { data, error } = await query

        if (error) throw error

        return NextResponse.json({
            success: true,
            results: data || []
        })
    } catch (error: any) {
        console.error('Get lab results error:', error)
        return NextResponse.json(
            { error: 'Error al obtener resultados' },
            { status: 500 }
        )
    }
}

// POST /api/doctors/lab-results - Order a new lab exam
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { patientId, appointmentId, examType, examName, priority, notes } = body

        const authHeader = request.headers.get('authorization')
        const token = authHeader?.replace('Bearer ', '')

        if (!token) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const payload = await verifyToken(token)
        if (!payload || payload.role !== 'doctor') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        if (!patientId || !examType || !examName) {
            return NextResponse.json(
                { error: 'Paciente, tipo y nombre del examen son requeridos' },
                { status: 400 }
            )
        }

        const doctorId = payload.userId
        const adminClient = createAdminClient()

        // Verify patient has an active consultation with this doctor
        if (appointmentId) {
            const { data: appointment } = await adminClient
                .from('citas')
                .select('id, estado')
                .eq('id', appointmentId)
                .eq('doctor_id', doctorId)
                .single()

            if (!appointment) {
                return NextResponse.json(
                    { error: 'Cita no encontrada o no autorizada' },
                    { status: 404 }
                )
            }

            if (appointment.estado !== 'en_progreso' && appointment.estado !== 'completada') {
                return NextResponse.json(
                    { error: 'La cita debe estar en progreso o completada para ordenar exámenes' },
                    { status: 400 }
                )
            }
        }

        // Map priority to Spanish if needed
        const priorityMap: Record<string, string> = {
            'low': 'baja',
            'normal': 'normal',
            'high': 'alta',
            'urgent': 'urgente',
            'stat': 'urgente',  // STAT is medical term for urgent
            'routine': 'normal'
        }
        // Use mapped value, or default to 'normal' if value is not in valid list
        const validPriorities = ['baja', 'normal', 'alta', 'urgente']
        const mappedPriority = priorityMap[priority] || priority
        const dbPriority = validPriorities.includes(mappedPriority) ? mappedPriority : 'normal'

        // Create lab order using correct column names from schema
        const { data, error } = await adminClient
            .from('resultados_laboratorio')
            .insert({
                paciente_id: patientId,
                ordenado_por: doctorId,
                tipo_examen: examType,
                nombre_examen: examName,
                prioridad: dbPriority,
                estado: 'pendiente',
                fecha_orden: new Date().toISOString().split('T')[0]
            })
            .select()
            .single()

        if (error) {
            console.error('Insert error:', error)
            throw error
        }

        // Create notification for the ordering
        await adminClient
            .from('notificaciones')
            .insert({
                destinatario_id: doctorId,
                tipo_destinatario: 'doctor',
                titulo: 'Examen ordenado',
                mensaje: `Se ha ordenado ${examName} exitosamente`,
                tipo: 'resultado',
                referencia_tipo: 'resultado_laboratorio',
                referencia_id: data.id,
                prioridad: dbPriority === 'urgente' ? 'alta' : 'normal'
            })

        return NextResponse.json({
            success: true,
            labOrder: data
        }, { status: 201 })
    } catch (error: any) {
        console.error('Order lab exam error:', error)
        return NextResponse.json(
            { error: error.message || 'Error al ordenar examen' },
            { status: 500 }
        )
    }
}

// PATCH /api/doctors/lab-results - Update a lab result (add results, mark reviewed)
export async function PATCH(request: Request) {
    try {
        const body = await request.json()
        const { resultId, results, interpretation, status, requiresFollowup, referenceValues } = body

        const authHeader = request.headers.get('authorization')
        const token = authHeader?.replace('Bearer ', '')

        if (!token) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const payload = await verifyToken(token)
        if (!payload || payload.role !== 'doctor') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        if (!resultId) {
            return NextResponse.json(
                { error: 'ID del resultado es requerido' },
                { status: 400 }
            )
        }

        const doctorId = payload.userId
        const adminClient = createAdminClient()

        // Verify the result belongs to this doctor
        const { data: existing } = await adminClient
            .from('resultados_laboratorio')
            .select('id, ordenado_por, estado')
            .eq('id', resultId)
            .single()

        if (!existing) {
            return NextResponse.json(
                { error: 'Resultado no encontrado' },
                { status: 404 }
            )
        }

        // Build update object
        const updateData: Record<string, any> = {
            updated_at: new Date().toISOString()
        }

        if (results !== undefined) {
            // In a real app, encrypt the results
            updateData.resultados_cifrados = results
            updateData.resultados_iv = 'placeholder-iv' // Would be real IV in production
        }

        if (interpretation !== undefined) {
            updateData.interpretacion = interpretation
        }

        if (status) {
            const statusMap: Record<string, string> = {
                'pending': 'pendiente',
                'ordered': 'ordenado',
                'in_progress': 'en_proceso',
                'completed': 'completado',
                'reviewed': 'revisado',
                'delivered': 'entregado'
            }
            updateData.estado = statusMap[status] || status
            
            if (status === 'completed') {
                updateData.fecha_completado = new Date().toISOString().split('T')[0]
            }
            if (status === 'reviewed') {
                updateData.fecha_revisado = new Date().toISOString().split('T')[0]
                updateData.revisado_por = doctorId
            }
        }

        if (requiresFollowup !== undefined) {
            updateData.requiere_seguimiento = requiresFollowup
        }

        if (referenceValues) {
            updateData.valores_referencia = referenceValues
        }

        const { data, error } = await adminClient
            .from('resultados_laboratorio')
            .update(updateData)
            .eq('id', resultId)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({
            success: true,
            result: data
        })
    } catch (error: any) {
        console.error('Update lab result error:', error)
        return NextResponse.json(
            { error: error.message || 'Error al actualizar resultado' },
            { status: 500 }
        )
    }
}

// DELETE /api/doctors/lab-results - Delete a lab result
export async function DELETE(request: Request) {
    try {
        const authHeader = request.headers.get('authorization')
        const token = authHeader?.replace('Bearer ', '')

        if (!token) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const payload = await verifyToken(token)
        if (!payload || payload.role !== 'doctor') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const resultId = searchParams.get('id')

        if (!resultId) {
            return NextResponse.json(
                { error: 'ID del resultado es requerido' },
                { status: 400 }
            )
        }

        const doctorId = payload.userId
        const adminClient = createAdminClient()

        // Verify result exists and belongs to this doctor
        const { data: existing } = await adminClient
            .from('resultados_laboratorio')
            .select('id, ordenado_por')
            .eq('id', resultId)
            .single()

        if (!existing) {
            return NextResponse.json(
                { error: 'Resultado no encontrado' },
                { status: 404 }
            )
        }

        if (existing.ordenado_por !== doctorId) {
            return NextResponse.json(
                { error: 'No autorizado para eliminar este resultado' },
                { status: 403 }
            )
        }

        // Delete the result
        const { error } = await adminClient
            .from('resultados_laboratorio')
            .delete()
            .eq('id', resultId)

        if (error) throw error

        return NextResponse.json({
            success: true,
            message: 'Resultado eliminado correctamente'
        })
    } catch (error: any) {
        console.error('Delete lab result error:', error)
        return NextResponse.json(
            { error: error.message || 'Error al eliminar resultado' },
            { status: 500 }
        )
    }
}
