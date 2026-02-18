import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    
    try {
        const { newDoctorId } = await request.json()
        
        if (!newDoctorId) {
            return NextResponse.json(
                { error: 'Se requiere el ID del nuevo doctor' },
                { status: 400 }
            )
        }
        
        const supabase = await createClient()
        
        // Verificar que el nuevo médico existe y está activo.
        const { data: newDoctor, error: doctorError } = await supabase
            .from('doctores')
            .select('id, nombre, is_active')
            .eq('id', newDoctorId)
            .single()
        
        if (doctorError || !newDoctor) {
            return NextResponse.json(
                { error: 'El doctor seleccionado no existe' },
                { status: 404 }
            )
        }
        
        if (!newDoctor.is_active) {
            return NextResponse.json(
                { error: 'El doctor seleccionado no está activo' },
                { status: 400 }
            )
        }
        
        // Reasignar todas las citas pendientes al nuevo médico.
        const { data, error } = await supabase
            .from('citas')
            .update({ 
                doctor_id: newDoctorId,
                notas: `Cita reasignada al Dr. ${newDoctor.nombre}`
            })
            .eq('doctor_id', id)
            .in('estado', ['programada', 'confirmada'])
            .select()
        
        if (error) {
            console.error('Error reassigning appointments:', error)
            return NextResponse.json(
                { error: 'Error al reasignar citas' },
                { status: 500 }
            )
        }
        
        return NextResponse.json({ 
            success: true, 
            reassignedCount: data?.length || 0,
            newDoctorName: newDoctor.nombre
        })
    } catch (error) {
        console.error('Error:', error)
        return NextResponse.json(
            { error: 'Error del servidor' },
            { status: 500 }
        )
    }
}
