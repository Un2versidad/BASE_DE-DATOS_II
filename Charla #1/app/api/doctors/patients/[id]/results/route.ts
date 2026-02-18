import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyToken } from '@/lib/auth'
import { decryptData, deriveKey } from '@/lib/encryption'

// GET /api/doctors/patients/[id]/results - Get all lab results for a patient
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: patientId } = await params

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

        const doctorId = payload.userId
        const adminClient = createAdminClient()
        const secret = process.env.ENCRYPTION_SECRET || 'default-secret-change-in-production'
        const key = await deriveKey(secret)

        // Get all lab results for this patient ordered by this doctor
        const { data: results, error } = await adminClient
            .from('resultados_laboratorio')
            .select(`
                *,
                pacientes (
                    id, nombre_encrypted, nombre_iv
                )
            `)
            .eq('paciente_id', patientId)
            .eq('ordenado_por', doctorId)
            .order('fecha_orden', { ascending: false })

        if (error) {
            console.error('Error fetching patient results:', error)
            return NextResponse.json({ error: 'Error al obtener resultados' }, { status: 500 })
        }

        // Map results to frontend format
        const mappedResults = await Promise.all(
            (results || []).map(async (result) => {
                let patientName = 'Paciente'

                // Decrypt patient name
                if (result.pacientes?.nombre_encrypted && result.pacientes?.nombre_iv) {
                    try {
                        patientName = await decryptData(result.pacientes.nombre_encrypted, result.pacientes.nombre_iv, key)
                    } catch (e) {
                        if (result.pacientes.nombre_encrypted.startsWith('enc_')) {
                            patientName = result.pacientes.nombre_encrypted.replace('enc_', '').replace(/_/g, ' ')
                        }
                    }
                }

                return {
                    id: result.id,
                    patientName,
                    examName: result.nombre_examen,
                    examType: result.tipo_examen,
                    status: result.estado,
                    priority: result.prioridad,
                    orderedDate: result.fecha_orden,
                    completedDate: result.fecha_completado,
                    interpretation: result.interpretacion
                }
            })
        )

        return NextResponse.json({
            success: true,
            results: mappedResults
        })
    } catch (error: any) {
        console.error('Get patient results error:', error)
        return NextResponse.json(
            { error: error.message || 'Error al obtener resultados del paciente' },
            { status: 500 }
        )
    }
}
