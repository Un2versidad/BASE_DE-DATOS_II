import { NextResponse, NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth-middleware'

async function handleGet(request: NextRequest) {
    try {
        const adminClient = createAdminClient()

        const { data: pipelines, error } = await adminClient
            .from('pipelines_etl')
            .select(`
                *,
                data_sources:fuentes_datos(*)
            `)
            .order('created_at', { ascending: false })

        if (error) throw error

        // Transformar para ajustarse a el frontend
        const transformedPipelines = (pipelines || []).map(p => ({
            id: p.id,
            name: p.nombre,
            description: p.descripcion,
            status: p.estado,
            last_run_at: p.ultima_ejecucion,
            created_at: p.created_at,
            data_sources: p.data_sources ? {
                name: p.data_sources.nombre,
                source_type: p.data_sources.tipo_fuente
            } : null
        }))

        return NextResponse.json({ pipelines: transformedPipelines })
    } catch (error) {
        console.error('Error fetching pipelines:', error)
        return NextResponse.json({ pipelines: [] })
    }
}

async function handlePost(request: NextRequest) {
    try {
        const body = await request.json()
        const { name, description, sourceId, schedule } = body

        if (!name) {
            return NextResponse.json(
                { error: 'El nombre es requerido' },
                { status: 400 }
            )
        }

        const adminClient = createAdminClient()

        const { data, error } = await adminClient
            .from('pipelines_etl')
            .insert({
                nombre: name,
                descripcion: description,
                fuente_id: sourceId,
                programacion: schedule,
                estado: 'inactive',
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ pipeline: data }, { status: 201 })
    } catch (error) {
        console.error('Error creating pipeline:', error)
        return NextResponse.json(
            { error: 'Error al crear pipeline' },
            { status: 500 }
        )
    }
}

export async function GET(request: NextRequest) {
    return withAuth(request, handleGet)
}

export async function POST(request: NextRequest) {
    return withAuth(request, handlePost)
}
