import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { apiClient } from '@/lib/api-client'

// POST /api/admin/notificaciones: enviar notificación al médico
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { doctorId, title, message, priority = 'normal' } = body

        if (!doctorId || !title || !message) {
            return NextResponse.json(
                { error: 'Faltan campos requeridos' },
                { status: 400 }
            )
        }

        // Validar prioridad
        const validPriorities = ['baja', 'normal', 'alta', 'urgente']
        if (!validPriorities.includes(priority)) {
            return NextResponse.json(
                { error: 'Prioridad inválida' },
                { status: 400 }
            )
        }

        const adminClient = createAdminClient()

        // Verificar que el médico existe
        const { data: doctor, error: doctorError } = await adminClient
            .from('doctores')
            .select('id')
            .eq('id', doctorId)
            .single()

        if (doctorError || !doctor) {
            return NextResponse.json(
                { error: 'Doctor no encontrado' },
                { status: 404 }
            )
        }

        // Crear notificación
        const { data: notification, error } = await adminClient
            .from('notificaciones')
            .insert({
                destinatario_id: doctorId,
                tipo_destinatario: 'doctor',
                titulo: title,
                mensaje: message,
                tipo: 'sistema',
                prioridad: priority,
                leida: false
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating notification:', error)
            throw error
        }

        return NextResponse.json({
            success: true,
            notification
        })
    } catch (error: any) {
        console.error('Send notification error:', error)
        return NextResponse.json(
            { error: 'Error al enviar notificación' },
            { status: 500 }
        )
    }
}

// GET /api/admin/notificaciones: obtiene todas las notificaciones (vista de administrador).
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const doctorId = searchParams.get('doctorId')
        const limit = parseInt(searchParams.get('limit') || '50')

        const adminClient = createAdminClient()

        let query = adminClient
            .from('notificaciones')
            .select(`
                *,
                doctores:destinatario_id (nombre_cifrado, nombre_iv)
            `)
            .eq('tipo_destinatario', 'doctor')
            .order('created_at', { ascending: false })
            .limit(limit)

        if (doctorId) {
            query = query.eq('destinatario_id', doctorId)
        }

        const { data: notifications, error } = await query

        if (error) throw error

        return NextResponse.json({
            success: true,
            notifications: notifications || []
        })
    } catch (error: any) {
        console.error('Get notifications error:', error)
        return NextResponse.json(
            { error: 'Error al obtener notificaciones' },
            { status: 500 }
        )
    }
}
