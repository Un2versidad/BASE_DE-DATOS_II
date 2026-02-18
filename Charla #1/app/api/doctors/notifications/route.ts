import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

// GET /api/doctors/notifications - Get doctor notifications
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const unreadOnly = searchParams.get('unread') === 'true'
        const limit = parseInt(searchParams.get('limit') || '50')

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

        const adminClient = createAdminClient()

        let query = adminClient
            .from('notificaciones')
            .select('*')
            .eq('tipo_destinatario', 'doctor')
            .eq('destinatario_id', payload.userId)
            .order('created_at', { ascending: false })
            .limit(limit)

        if (unreadOnly) {
            query = query.eq('leida', false)
        }

        const { data: notifications, error } = await query

        if (error) throw error

        // Map database fields to frontend expected fields
        const mappedNotifications = (notifications || []).map(n => ({
            id: n.id,
            title: n.titulo,
            message: n.mensaje,
            type: n.tipo,
            priority: n.prioridad,
            is_read: n.leida,
            created_at: n.created_at,
            referencia_tipo: n.referencia_tipo,
            referencia_id: n.referencia_id
        }))

        // Get unread count
        const { count: unreadCount } = await adminClient
            .from('notificaciones')
            .select('*', { count: 'exact', head: true })
            .eq('tipo_destinatario', 'doctor')
            .eq('destinatario_id', payload.userId)
            .eq('leida', false)

        return NextResponse.json({
            success: true,
            notifications: mappedNotifications,
            unreadCount: unreadCount || 0
        })
    } catch (error: any) {
        console.error('Get notifications error:', error)
        return NextResponse.json(
            { error: 'Error al obtener notificaciones' },
            { status: 500 }
        )
    }
}

// PATCH /api/doctors/notifications - Mark notifications as read
export async function PATCH(request: Request) {
    try {
        const body = await request.json()
        const { notificationIds, markAllRead } = body

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

        const adminClient = createAdminClient()

        if (markAllRead) {
            // Mark all as read
            const { error } = await adminClient
                .from('notificaciones')
                .update({ leida: true, fecha_leida: new Date().toISOString() })
                .eq('tipo_destinatario', 'doctor')
                .eq('destinatario_id', payload.userId)
                .eq('leida', false)

            if (error) throw error
        } else if (notificationIds?.length > 0) {
            // Mark specific notifications as read
            const { error } = await adminClient
                .from('notificaciones')
                .update({ leida: true, fecha_leida: new Date().toISOString() })
                .in('id', notificationIds)
                .eq('destinatario_id', payload.userId)

            if (error) throw error
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Update notifications error:', error)
        return NextResponse.json(
            { error: 'Error al actualizar notificaciones' },
            { status: 500 }
        )
    }
}

// DELETE /api/doctors/notifications - Clear (delete) notifications
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const onlyRead = searchParams.get('onlyRead') === 'true'

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

        const adminClient = createAdminClient()

        let query = adminClient
            .from('notificaciones')
            .delete()
            .eq('tipo_destinatario', 'doctor')
            .eq('destinatario_id', payload.userId)

        if (onlyRead) {
            query = query.eq('leida', true)
        }

        const { error } = await query

        if (error) throw error

        return NextResponse.json({ success: true, message: 'Notificaciones eliminadas' })
    } catch (error: any) {
        console.error('Delete notifications error:', error)
        return NextResponse.json(
            { error: 'Error al eliminar notificaciones' },
            { status: 500 }
        )
    }
}
