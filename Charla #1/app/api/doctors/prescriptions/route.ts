import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyToken } from '@/lib/auth'
import { encryptData, deriveKey } from '@/lib/encryption'

// POST /api/doctors/prescriptions - Create new prescription
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { 
            patientId, 
            appointmentId,
            medicationName, 
            dosage, 
            frequency, 
            duration, 
            instructions,
            refillsAllowed,
            startDate,
            endDate 
        } = body

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

        if (!patientId || !medicationName || !dosage || !frequency) {
            return NextResponse.json(
                { error: 'Faltan campos requeridos' },
                { status: 400 }
            )
        }

        const adminClient = createAdminClient()

        const { data, error } = await adminClient
            .from('recetas')
            .insert({
                paciente_id: patientId,
                doctor_id: payload.userId,
                cita_id: appointmentId || null,
                medicamentos: [{
                    nombre: medicationName,
                    dosis: dosage,
                    frecuencia: frequency,
                    duracion: duration,
                    recargas: refillsAllowed || 0
                }],
                indicaciones_generales: instructions,
                diagnostico: '',
                fecha_emision: startDate || new Date().toISOString().split('T')[0],
                fecha_vencimiento: endDate || null,
                estado: 'activa'
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({
            success: true,
            prescription: data
        })
    } catch (error: any) {
        console.error('Create prescription error:', error)
        return NextResponse.json(
            { error: 'Error al crear receta' },
            { status: 500 }
        )
    }
}

// GET /api/doctors/prescriptions - Get doctor's prescriptions
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const patientId = searchParams.get('patientId')
        const status = searchParams.get('status')

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
            .from('recetas')
            .select(`
                *,
                pacientes (id, nombre_cifrado, nombre_iv)
            `)
            .eq('doctor_id', payload.userId)
            .order('created_at', { ascending: false })

        if (patientId) {
            query = query.eq('paciente_id', patientId)
        }
        if (status) {
            query = query.eq('estado', status)
        }

        const { data, error } = await query

        if (error) throw error

        return NextResponse.json({
            success: true,
            prescriptions: data
        })
    } catch (error: any) {
        console.error('Get prescriptions error:', error)
        return NextResponse.json(
            { error: 'Error al obtener recetas' },
            { status: 500 }
        )
    }
}

// DELETE /api/doctors/prescriptions - Delete a prescription
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const prescriptionId = searchParams.get('id')

        if (!prescriptionId) {
            return NextResponse.json({ error: 'ID de receta requerido' }, { status: 400 })
        }

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

        // Verify ownership before deleting
        const { data: existing } = await adminClient
            .from('recetas')
            .select('id, doctor_id')
            .eq('id', prescriptionId)
            .single()

        if (!existing) {
            return NextResponse.json({ error: 'Receta no encontrada' }, { status: 404 })
        }

        if (existing.doctor_id !== payload.userId) {
            return NextResponse.json({ error: 'No autorizado para eliminar esta receta' }, { status: 403 })
        }

        const { error } = await adminClient
            .from('recetas')
            .delete()
            .eq('id', prescriptionId)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Delete prescription error:', error)
        return NextResponse.json(
            { error: 'Error al eliminar receta' },
            { status: 500 }
        )
    }
}

// PATCH /api/doctors/prescriptions - Update a prescription
export async function PATCH(request: Request) {
    try {
        const body = await request.json()
        const { 
            id,
            medicationName, 
            dosage, 
            frequency, 
            duration, 
            instructions,
            refillsAllowed 
        } = body

        if (!id) {
            return NextResponse.json({ error: 'ID de receta requerido' }, { status: 400 })
        }

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

        // Verify ownership before updating
        const { data: existing } = await adminClient
            .from('recetas')
            .select('id, doctor_id, medicamentos, indicaciones_generales')
            .eq('id', id)
            .single() as { data: any }

        if (!existing) {
            return NextResponse.json({ error: 'Receta no encontrada' }, { status: 404 })
        }

        if (existing.doctor_id !== payload.userId) {
            return NextResponse.json({ error: 'No autorizado para editar esta receta' }, { status: 403 })
        }

        // Build updated medications array
        const updatedMedications = [{
            nombre: medicationName || existing.medicamentos?.[0]?.nombre || '',
            dosis: dosage || existing.medicamentos?.[0]?.dosis || '',
            frecuencia: frequency || existing.medicamentos?.[0]?.frecuencia || '',
            duracion: duration || existing.medicamentos?.[0]?.duracion || '',
            recargas: refillsAllowed !== undefined ? refillsAllowed : (existing.medicamentos?.[0]?.recargas || 0)
        }]

        // Update prescription
        const { data, error } = await adminClient
            .from('recetas')
            .update({
                medicamentos: updatedMedications,
                indicaciones_generales: instructions !== undefined ? instructions : existing.indicaciones_generales,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({
            success: true,
            prescription: data
        })
    } catch (error: any) {
        console.error('Update prescription error:', error)
        return NextResponse.json(
            { error: 'Error al actualizar receta' },
            { status: 500 }
        )
    }
}
