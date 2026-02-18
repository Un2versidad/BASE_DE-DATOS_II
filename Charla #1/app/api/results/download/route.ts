import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { decryptData, deriveKey, hashData, safeDecrypt } from '@/lib/encryption'
import { generateLabResultHTML, type LabResultPDFData } from '@/lib/pdf-results'

// Helper para descifrar el campo o extraerlo del formato del marcador de posición.
async function decryptField(encrypted: string | null, iv: string | null, key: CryptoKey): Promise<string | null> {
    if (!encrypted || !iv) return null
    
    // Comprueba el formato de los datos de marcador de posición/demostración (enc_value)
    if (encrypted.startsWith('enc_')) {
        return encrypted.replace('enc_', '').replace(/_/g, ' ')
    }
    
    try {
        return await decryptData(encrypted, iv, key)
    } catch (error) {
        console.warn('Decryption failed:', error)
        return null
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const resultId = searchParams.get('id')
        const accessCode = searchParams.get('accessCode')

        if (!resultId || !accessCode) {
            return NextResponse.json(
                { error: 'ID de resultado y código de acceso son requeridos' },
                { status: 400 }
            )
        }

        const adminClient = createAdminClient()
        const secret = process.env.ENCRYPTION_SECRET || 'default-secret-change-in-production'
        const key = await deriveKey(secret)

        // Obtener el resultado del laboratorio con la información del paciente y médico.
        const { data: result, error: resultError } = await adminClient
            .from('resultados_laboratorio')
            .select(`
                *,
                pacientes (*),
                doctor_ordenante:doctores!resultados_laboratorio_ordenado_por_fkey (nombre_cifrado, nombre_iv, especialidad),
                doctor_revisor:doctores!resultados_laboratorio_revisado_por_fkey (nombre_cifrado, nombre_iv)
            `)
            .eq('id', resultId)
            .single()

        if (resultError || !result) {
            return NextResponse.json(
                { error: 'Resultado no encontrado' },
                { status: 404 }
            )
        }

        // Verificar el código de acceso mediante la comparación de hash.
        const accessCodeHash = await hashData(accessCode)
        if (result.pacientes?.codigo_acceso_hash !== accessCodeHash) {
            return NextResponse.json(
                { error: 'Código de acceso inválido' },
                { status: 403 }
            )
        }

        // Comprueba si el resultado está listo.
        if (result.estado !== 'completado' && result.estado !== 'revisado') {
            return NextResponse.json(
                { error: 'El resultado aún no está disponible para descarga' },
                { status: 400 }
            )
        }

        // Descifrar información del paciente
        let patientName = 'Paciente'
        let patientCedula = ''
        
        if (result.pacientes?.nombre_encrypted && result.pacientes?.nombre_iv) {
            const decrypted = await decryptField(result.pacientes.nombre_encrypted, result.pacientes.nombre_iv, key)
            if (decrypted) patientName = decrypted
        }
        
        if (result.pacientes?.cedula_encrypted && result.pacientes?.cedula_iv) {
            const decrypted = await decryptField(result.pacientes.cedula_encrypted, result.pacientes.cedula_iv, key)
            if (decrypted) patientCedula = decrypted
        }

        // Descifrar nombres de médicos
        const doctorName = await decryptField(
            result.doctor_ordenante?.nombre_cifrado,
            result.doctor_ordenante?.nombre_iv,
            key
        ) || 'N/A'

        // Generar datos de resultados simulados basados en el tipo de examen.
        const resultItems = generateMockResultData(result.tipo_examen)

        // Descifrar fecha de nacimiento
        const dateOfBirth = await safeDecrypt(result.pacientes?.fecha_nacimiento, key)

        // Descifrar el código de acceso para mostrar el PDF.
        const decryptedAccessCode = await safeDecrypt(result.pacientes?.codigo_acceso, key)

        // Crear objeto de datos PDF que coincida con la interfaz
        const pdfData: LabResultPDFData = {
            patientName,
            patientId: patientCedula,
            dateOfBirth: dateOfBirth || undefined,
            examName: result.nombre_examen,
            examType: result.tipo_examen,
            orderDate: result.fecha_orden,
            completionDate: result.fecha_completado || '',
            orderedBy: doctorName,
            reviewedBy: undefined,
            results: resultItems.map(item => ({
                parameter: item.name,
                value: item.value,
                unit: item.unit,
                referenceRange: item.reference,
                status: item.status
            })),
            interpretation: result.interpretacion,
            requiresFollowup: false,
            accessCode: decryptedAccessCode || ''
        }

        // Generar PDF HTML
        const pdfHtml = generateLabResultHTML(pdfData)

        // Devuelve el HTML que se mostrará en una nueva pestaña para imprimir en PDF.
        return new Response(pdfHtml, {
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
            }
        })
    } catch (error) {
        console.error('Error downloading result:', error)
        return NextResponse.json(
            { error: 'Error al descargar resultado' },
            { status: 500 }
        )
    }
}

function generateMockResultData(examType: string) {
    // Generar datos ficticios realistas basados en el tipo de examen.
    switch (examType) {
        case 'hematologia':
            return [
                { name: 'Hemoglobina', value: '14.2', unit: 'g/dL', reference: '12.0 - 16.0', status: 'normal' as const },
                { name: 'Hematocrito', value: '42.5', unit: '%', reference: '36.0 - 48.0', status: 'normal' as const },
                { name: 'Glóbulos Rojos', value: '4.8', unit: 'millones/µL', reference: '4.2 - 5.4', status: 'normal' as const },
                { name: 'Glóbulos Blancos', value: '7.2', unit: 'miles/µL', reference: '4.5 - 11.0', status: 'normal' as const },
                { name: 'Plaquetas', value: '250', unit: 'miles/µL', reference: '150 - 400', status: 'normal' as const },
            ]
        case 'bioquimica':
            return [
                { name: 'Glucosa', value: '95', unit: 'mg/dL', reference: '70 - 100', status: 'normal' as const },
                { name: 'Colesterol Total', value: '185', unit: 'mg/dL', reference: '< 200', status: 'normal' as const },
                { name: 'Triglicéridos', value: '120', unit: 'mg/dL', reference: '< 150', status: 'normal' as const },
                { name: 'HDL', value: '55', unit: 'mg/dL', reference: '> 40', status: 'normal' as const },
                { name: 'LDL', value: '110', unit: 'mg/dL', reference: '< 130', status: 'normal' as const },
            ]
        case 'urinalisis':
            return [
                { name: 'pH', value: '6.0', unit: '', reference: '5.0 - 8.0', status: 'normal' as const },
                { name: 'Densidad', value: '1.020', unit: '', reference: '1.005 - 1.030', status: 'normal' as const },
                { name: 'Proteínas', value: 'Negativo', unit: '', reference: 'Negativo', status: 'normal' as const },
                { name: 'Glucosa', value: 'Negativo', unit: '', reference: 'Negativo', status: 'normal' as const },
            ]
        default:
            return [
                { name: 'Resultado', value: 'Normal', unit: '', reference: 'N/A', status: 'normal' as const },
            ]
    }
}
