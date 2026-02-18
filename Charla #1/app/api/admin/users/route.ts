import { NextResponse, NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { logSecurityEvent, getClientIP } from '@/app/api/security-logs/route'
import { deriveKey, safeDecrypt } from '@/lib/encryption'

// Buscar usuarios para el panel de administración
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    
    if (!search || search.length < 3) {
        return NextResponse.json(
            { success: false, error: 'La búsqueda debe tener al menos 3 caracteres' },
            { status: 400 }
        )
    }

    try {
        const adminClient = createAdminClient()
        const searchLower = search.toLowerCase()

        // Buscar usuarios para el panel de administración
        const { data: credentials, error: credError } = await adminClient
            .from('credenciales_doctores')
            .select(`
                id,
                email,
                esta_activo,
                esta_aprobado,
                created_at,
                doctor_id,
                doctores (
                    id,
                    especialidad,
                    numero_licencia
                )
            `)
            .ilike('email', `%${searchLower}%`)
            .limit(10)

        if (credError) {
            console.error('Error searching credentials:', credError)
            return NextResponse.json(
                { success: false, error: 'Error al buscar usuarios' },
                { status: 500 }
            )
        }

        const secret = process.env.ENCRYPTION_SECRET || 'default-secret-change-in-production'
        const key = await deriveKey(secret)

        // Asignar credenciales al formato de usuario
        const users = await Promise.all((credentials || []).map(async c => {
            const doctor = c.doctores as any
            return {
                id: c.id,
                doctor_id: c.doctor_id,
                email: c.email,
                name: c.email.split('@')[0],
                specialty: doctor?.especialidad || 'Doctor',
                license: await safeDecrypt(doctor?.numero_licencia, key),
                role: 'doctor',
                status: c.esta_activo ? 'activo' : 'inactivo',
                approved: c.esta_aprobado,
                created_at: c.created_at
            }
        }))

        return NextResponse.json({
            success: true,
            users
        })
    } catch (error) {
        console.error('Error searching users:', error)
        return NextResponse.json(
            { success: false, error: 'Error al buscar usuarios' },
            { status: 500 }
        )
    }
}
