import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { decryptData, deriveKey, hashData } from '@/lib/encryption'

// Helper para descifrar o extraer datos de demostración
async function decryptOrExtractDemo(encrypted: string | null, iv: string | null, key: CryptoKey): Promise<string | null> {
    if (!encrypted) return null
    
    // Gestionar los datos de demostración/marcadores de posición que comienzan por enc_
    if (encrypted.startsWith('enc_')) {
        return encrypted.replace('enc_', '').replace(/_/g, ' ')
    }
    
    // Intenta el descifrado real
    if (iv) {
        try {
            return await decryptData(encrypted, iv, key)
        } catch {
            return encrypted
        }
    }
    
    return encrypted
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { cedula, accessCode } = body

        if (!cedula || !accessCode) {
            return NextResponse.json(
                { error: 'Cédula y código de acceso son requeridos' },
                { status: 400 }
            )
        }

        const adminClient = createAdminClient()

        // Derivar clave de cifrado
        const secret = process.env.ENCRYPTION_SECRET || 'default-secret-change-in-production'
        const key = await deriveKey(secret)

        // Buscar paciente por hash del código de acceso
        const accessCodeHash = await hashData(accessCode)
        const { data: patients, error: patientError } = await adminClient
            .from('pacientes')
            .select('*')
            .eq('codigo_acceso_hash', accessCodeHash)

        if (patientError) throw patientError

        if (!patients || patients.length === 0) {
            return NextResponse.json(
                { error: 'Código de acceso inválido' },
                { status: 404 }
            )
        }

        // Verificar que la cédula coincida (descifrar y comparar)
        let matchedPatient = null
        for (const patient of patients) {
            try {
                // Utiliza los nombres de columna correctos: cedula_encrypted, cedula_iv
                const decryptedCedula = await decryptOrExtractDemo(
                    patient.cedula_encrypted,
                    patient.cedula_iv,
                    key
                )
                if (decryptedCedula === cedula) {
                    matchedPatient = patient
                    break
                }
            } catch (e) {
                continue
            }
        }

        if (!matchedPatient) {
            return NextResponse.json(
                { error: 'Cédula no coincide con el código de acceso' },
                { status: 404 }
            )
        }

        // Descifrar el nombre del paciente utilizando los nombres de columna correctos.
        const patientName = await decryptOrExtractDemo(
            matchedPatient.nombre_encrypted,
            matchedPatient.nombre_iv,
            key
        )

        // Obtener los resultados de laboratorio de este paciente.
        const { data: results, error: resultsError } = await adminClient
            .from('resultados_laboratorio')
            .select('*')
            .eq('paciente_id', matchedPatient.id)
            .order('fecha_orden', { ascending: false })

        if (resultsError) throw resultsError

        // Formatear resultados
        const formattedResults = results?.map(result => ({
            id: result.id,
            examName: result.nombre_examen,
            examType: result.tipo_examen,
            status: result.estado,
            orderedDate: result.fecha_orden,
            completedDate: result.fecha_completado,
            canDownload: (result.estado === 'completado' || result.estado === 'revisado'),
        })) || []

        return NextResponse.json({
            success: true,
            patient: {
                name: patientName,
                cedula: cedula,
            },
            results: formattedResults,
        })
    } catch (error) {
        console.error('Error fetching results:', error)
        return NextResponse.json(
            { error: 'Error al consultar resultados' },
            { status: 500 }
        )
    }
}
