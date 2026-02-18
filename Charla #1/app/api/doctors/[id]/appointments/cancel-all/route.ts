import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    
    try {
        const supabase = await createClient()
        
        // Cancelar todas las citas pendientes para este médico.
        const { data, error } = await supabase
            .from('citas')
            .update({ 
                estado: 'cancelada',
                notas: 'Cita cancelada automáticamente por eliminación del doctor'
            })
            .eq('doctor_id', id)
            .in('estado', ['programada', 'confirmada'])
            .select()
        
        if (error) {
            console.error('Error canceling appointments:', error)
            return NextResponse.json(
                { error: 'Error al cancelar citas' },
                { status: 500 }
            )
        }
        
        return NextResponse.json({ 
            success: true, 
            canceledCount: data?.length || 0 
        })
    } catch (error) {
        console.error('Error:', error)
        return NextResponse.json(
            { error: 'Error del servidor' },
            { status: 500 }
        )
    }
}
