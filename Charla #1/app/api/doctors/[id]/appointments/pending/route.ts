import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    
    try {
        const supabase = await createClient()
        
        // Contar citas pendientes
        const { count, error } = await supabase
            .from('citas')
            .select('*', { count: 'exact', head: true })
            .eq('doctor_id', id)
            .in('estado', ['programada', 'confirmada'])
        
        if (error) {
            console.error('Error counting appointments:', error)
            return NextResponse.json(
                { error: 'Error al consultar citas' },
                { status: 500 }
            )
        }
        
        return NextResponse.json({ count: count || 0 })
    } catch (error) {
        console.error('Error:', error)
        return NextResponse.json(
            { error: 'Error del servidor' },
            { status: 500 }
        )
    }
}
