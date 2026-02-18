import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
    try {
        const cookieStore = await cookies()
        
        // Eliminar ambos tokens
        cookieStore.delete('access_token')
        cookieStore.delete('refresh_token')

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json(
            { error: 'Error al cerrar sesión' },
            { status: 500 }
        )
    }
}
