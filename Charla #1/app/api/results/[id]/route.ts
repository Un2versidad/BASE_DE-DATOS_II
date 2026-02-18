import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { decryptData, deriveKey, hashData, safeDecrypt } from '@/lib/encryption'

// helper para descifrar el campo o extraerlo del formato del marcador de posición.
async function decryptField(encrypted: string | null, iv: string | null, key: CryptoKey): Promise<string | null> {
    if (!encrypted || !iv) return null
    
    // Comprueba el formato de los datos de marcador de posición/demostración (enc_value)
    if (encrypted.startsWith('enc_')) {
        return encrypted.replace('enc_', '').replace(/_/g, ' ')
    }
    
    try {
        return await decryptData(encrypted, iv, key)
    } catch (error) {
        console.warn('Decryption failed, returning raw value:', error)
        return encrypted
    }
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: resultId } = await params
        const { searchParams } = new URL(request.url)
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

        // Obtener el resultado del laboratorio con la información del paciente.
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
                { error: 'El resultado aún no está disponible' },
                { status: 400 }
            )
        }

        // Descifrar el nombre del paciente
        let patientName = 'Paciente'
        try {
            patientName = await decryptData(result.pacientes.nombre_encrypted, result.pacientes.nombre_iv, key)
        } catch (e) {}

        // Descifrar la cédula del paciente
        let patientCedula = ''
        try {
            patientCedula = await decryptData(result.pacientes.cedula_encrypted, result.pacientes.cedula_iv, key)
        } catch (e) {}

        // Descifrar nombres de médicos
        const doctorOrdenanteNombre = await decryptField(
            result.doctor_ordenante?.nombre_cifrado,
            result.doctor_ordenante?.nombre_iv,
            key
        )
        const doctorRevisorNombre = await decryptField(
            result.doctor_revisor?.nombre_cifrado,
            result.doctor_revisor?.nombre_iv,
            key
        )

        // Generar datos de resultados simulados basados en el tipo de examen.
        const resultData = generateMockResultData(result.tipo_examen, result.nombre_examen)

        // Devuelve los datos del resultado para la generación de PDF en el lado del cliente.
        return NextResponse.json({
            success: true,
            result: {
                id: result.id,
                examName: result.nombre_examen,
                examType: result.tipo_examen,
                status: result.estado,
                orderedDate: result.fecha_orden,
                completedDate: result.fecha_completado,
                reviewedDate: result.fecha_revision,
                orderedBy: doctorOrdenanteNombre || 'N/A',
                orderedBySpecialty: result.doctor_ordenante?.especialidad || '',
                reviewedBy: doctorRevisorNombre || 'Pendiente',
                priority: result.prioridad,
                patientName,
                patientCedula,
                patientDob: await safeDecrypt(result.pacientes?.fecha_nacimiento, key),
                patientBloodType: await safeDecrypt(result.pacientes?.tipo_sangre, key),
                data: resultData
            }
        })
    } catch (error) {
        console.error('Error getting result details:', error)
        return NextResponse.json(
            { error: 'Error al obtener resultado' },
            { status: 500 }
        )
    }
}

function generateMockResultData(examType: string, examName: string) {
    // Generar datos ficticios realistas basados en el tipo de examen.
    switch (examType) {
        case 'hematologia':
            return {
                type: 'table',
                title: 'Resultados de Hematología',
                items: [
                    { name: 'Hemoglobina', value: '14.2', unit: 'g/dL', reference: '12.0 - 16.0', status: 'normal' },
                    { name: 'Hematocrito', value: '42.5', unit: '%', reference: '36.0 - 48.0', status: 'normal' },
                    { name: 'Glóbulos Rojos', value: '4.8', unit: 'millones/µL', reference: '4.2 - 5.4', status: 'normal' },
                    { name: 'Glóbulos Blancos', value: '7.2', unit: 'miles/µL', reference: '4.5 - 11.0', status: 'normal' },
                    { name: 'Plaquetas', value: '250', unit: 'miles/µL', reference: '150 - 400', status: 'normal' },
                    { name: 'VCM', value: '88.5', unit: 'fL', reference: '80 - 100', status: 'normal' },
                    { name: 'HCM', value: '29.6', unit: 'pg', reference: '27 - 33', status: 'normal' },
                    { name: 'CHCM', value: '33.4', unit: 'g/dL', reference: '32 - 36', status: 'normal' },
                ]
            }
        case 'bioquimica':
            if (examName.toLowerCase().includes('glucosa')) {
                return {
                    type: 'table',
                    title: 'Perfil Glucémico',
                    items: [
                        { name: 'Glucosa en Ayunas', value: '95', unit: 'mg/dL', reference: '70 - 100', status: 'normal' },
                        { name: 'Hemoglobina Glicosilada (HbA1c)', value: '5.4', unit: '%', reference: '< 5.7', status: 'normal' },
                    ]
                }
            }
            return {
                type: 'table',
                title: 'Química Sanguínea',
                items: [
                    { name: 'Glucosa', value: '92', unit: 'mg/dL', reference: '70 - 100', status: 'normal' },
                    { name: 'Urea', value: '35', unit: 'mg/dL', reference: '15 - 45', status: 'normal' },
                    { name: 'Creatinina', value: '0.9', unit: 'mg/dL', reference: '0.6 - 1.2', status: 'normal' },
                    { name: 'Ácido Úrico', value: '5.5', unit: 'mg/dL', reference: '3.5 - 7.0', status: 'normal' },
                    { name: 'Colesterol Total', value: '185', unit: 'mg/dL', reference: '< 200', status: 'normal' },
                    { name: 'HDL Colesterol', value: '55', unit: 'mg/dL', reference: '> 40', status: 'normal' },
                    { name: 'LDL Colesterol', value: '110', unit: 'mg/dL', reference: '< 130', status: 'normal' },
                    { name: 'Triglicéridos', value: '120', unit: 'mg/dL', reference: '< 150', status: 'normal' },
                ]
            }
        case 'microbiologia':
            return {
                type: 'text',
                title: 'Análisis Microbiológico',
                sections: [
                    { heading: 'Muestra', content: 'Orina - Chorro medio' },
                    { heading: 'Método', content: 'Cultivo en agar' },
                    { heading: 'Resultado', content: 'Negativo para crecimiento bacteriano' },
                    { heading: 'Interpretación', content: 'No se observa crecimiento de microorganismos patógenos.' },
                ]
            }
        default:
            return {
                type: 'text',
                title: examName,
                sections: [
                    { heading: 'Resultado', content: 'Dentro de parámetros normales' },
                    { heading: 'Observaciones', content: 'Sin hallazgos significativos' },
                ]
            }
    }
}
