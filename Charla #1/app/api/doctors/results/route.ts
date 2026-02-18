import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyToken } from '@/lib/auth'
import { encryptData, deriveKey } from '@/lib/encryption'

export async function POST(request: NextRequest) {
    try {
        // Verify doctor authentication
        const authHeader = request.headers.get('Authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { success: false, error: 'Token de autenticación requerido' },
                { status: 401 }
            )
        }

        const token = authHeader.split(' ')[1]
        const payload = await verifyToken(token)
        
        if (!payload || payload.role !== 'doctor') {
            return NextResponse.json(
                { success: false, error: 'Token inválido o expirado' },
                { status: 401 }
            )
        }

        const doctorId = payload.userId
        const body = await request.json()
        const { patientId, examType, examName, resultValue, notes, isAbnormal } = body

        // Validate required fields
        if (!patientId || !examType || !examName || !resultValue) {
            return NextResponse.json(
                { success: false, error: 'Faltan campos requeridos' },
                { status: 400 }
            )
        }

        const adminClient = createAdminClient()
        const secret = process.env.ENCRYPTION_SECRET || 'default-secret-change-in-production'
        const key = await deriveKey(secret)

        // Encrypt the result value and notes
        const encryptedResult = await encryptData(resultValue, key)
        const encryptedNotes = notes ? await encryptData(notes, key) : null

        // Create the lab result with correct column names
        const { data: result, error: resultError } = await adminClient
            .from('resultados_laboratorio')
            .insert({
                paciente_id: patientId,
                ordenado_por: doctorId,
                tipo_examen: examType,
                nombre_examen: examName,
                resultados_cifrados: encryptedResult.encrypted,
                resultados_iv: encryptedResult.iv,
                notas_cifradas: encryptedNotes?.encrypted || null,
                notas_iv: encryptedNotes?.iv || null,
                estado: 'completado',
                fecha_orden: new Date().toISOString().split('T')[0],
                fecha_completado: new Date().toISOString().split('T')[0],
                requiere_seguimiento: isAbnormal || false
            })
            .select()
            .single()

        if (resultError) {
            console.error('Error creating result:', resultError)
            return NextResponse.json(
                { success: false, error: 'Error al registrar el resultado' },
                { status: 500 }
            )
        }

        // Create notification if result requires follow-up
        if (isAbnormal) {
            await adminClient
                .from('notificaciones')
                .insert({
                    tipo: 'alerta',
                    titulo: 'Resultado que requiere atención',
                    mensaje: `El resultado de ${examName} requiere seguimiento médico`,
                    destinatario_id: patientId,
                    tipo_destinatario: 'paciente',
                    referencia_id: result.id,
                    referencia_tipo: 'resultado',
                    prioridad: 'alta'
                })
        }

        return NextResponse.json({
            success: true,
            data: result
        })

    } catch (error: any) {
        console.error('Create result error:', error)
        return NextResponse.json(
            { success: false, error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}
