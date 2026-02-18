import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyToken } from '@/lib/auth'

// POST /api/doctors/lab-results/[id]/review - Mark result as reviewed
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()
        const { notes } = body

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

        const { data, error } = await adminClient
            .from('resultados_laboratorio')
            .update({
                estado: 'revisado',
                revisado_por: payload.userId,
                fecha_revisado: new Date().toISOString().split('T')[0],
                interpretacion: notes || null
            })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({
            success: true,
            result: data
        })
    } catch (error: any) {
        console.error('Review result error:', error)
        return NextResponse.json(
            { error: 'Error al marcar como revisado' },
            { status: 500 }
        )
    }
}
