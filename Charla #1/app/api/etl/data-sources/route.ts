import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { encryptData, deriveKey } from '@/lib/encryption'

export async function GET() {
    try {
        const adminClient = createAdminClient()

        const { data: sources, error } = await adminClient
            .from('fuentes_datos')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error

        // Transformar para ajustarse a las expectativas del frontend
        const transformedSources = (sources || []).map(s => ({
            id: s.id,
            name: s.nombre,
            source_type: s.tipo_fuente,
            is_encrypted: s.esta_cifrado,
            is_active: s.activo,
            created_at: s.created_at
        }))

        return NextResponse.json({ sources: transformedSources })
    } catch (error) {
        console.error('Error fetching data sources:', error)
        return NextResponse.json({ sources: [] })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { name, sourceType, connectionConfig } = body

        if (!name || !sourceType) {
            return NextResponse.json(
                { error: 'Nombre y tipo de fuente son requeridos' },
                { status: 400 }
            )
        }

        const adminClient = createAdminClient()

        const { data, error } = await adminClient
            .from('fuentes_datos')
            .insert({
                nombre: name,
                tipo_fuente: sourceType,
                configuracion: connectionConfig || {},
                esta_cifrado: false,
                activo: true,
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ source: data }, { status: 201 })
    } catch (error) {
        console.error('Error creating data source:', error)
        return NextResponse.json(
            { error: 'Error al crear fuente de datos' },
            { status: 500 }
        )
    }
}
