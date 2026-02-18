import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyToken } from '@/lib/auth'
import { decryptData, deriveKey, safeDecrypt } from '@/lib/encryption'
import { generateLabResultHTML, generateLabResultText, LabResultPDFData, PrescriptionData } from '@/lib/pdf-results'

// GET /api/doctors/results/[id]/pdf - Generate PDF for a lab result
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: resultId } = await params
        console.log('[PDF Route] Generating PDF for result:', resultId)
        
        const { searchParams } = new URL(request.url)
        const format = searchParams.get('format') || 'html' // 'html' or 'text'

        const authHeader = request.headers.get('authorization')
        const token = authHeader?.replace('Bearer ', '')

        if (!token) {
            console.log('[PDF Route] No token provided')
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const payload = await verifyToken(token)
        if (!payload || payload.role !== 'doctor') {
            console.log('[PDF Route] Invalid token or not a doctor')
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        console.log('[PDF Route] Token verified for doctor:', payload.userId)

        if (!resultId) {
            return NextResponse.json(
                { error: 'ID del resultado es requerido' },
                { status: 400 }
            )
        }

        const adminClient = createAdminClient()

        // Get the result with related data
        const { data: result, error: resultError } = await adminClient
            .from('resultados_laboratorio')
            .select(`
                *,
                pacientes!paciente_id (
                    id,
                    nombre_encrypted,
                    nombre_iv,
                    fecha_nacimiento,
                    codigo_acceso
                ),
                doctor_orden:doctores!ordenado_por (
                    id,
                    nombre_cifrado,
                    nombre_iv
                ),
                doctor_revision:doctores!revisado_por (
                    id,
                    nombre_cifrado,
                    nombre_iv
                )
            `)
            .eq('id', resultId)
            .single()

        console.log('[PDF Route] Query result:', { 
            hasData: !!result, 
            error: resultError?.message,
            resultId 
        })

        if (resultError || !result) {
            console.log('[PDF Route] Result not found:', resultError)
            return NextResponse.json(
                { error: 'Resultado no encontrado' },
                { status: 404 }
            )
        }

        // Decrypt data
        const secret = process.env.ENCRYPTION_SECRET || 'default-secret-change-in-production'
        const key = await deriveKey(secret)

        let patientName = 'Paciente'
        let orderedByName = 'Médico'
        let reviewedByName = ''

        try {
            if (result.pacientes?.nombre_encrypted && result.pacientes?.nombre_iv) {
                patientName = await decryptData(result.pacientes.nombre_encrypted, result.pacientes.nombre_iv, key)
            }
        } catch (e) {
            console.error('Error decrypting patient name:', e)
        }

        try {
            if (result.doctor_orden?.nombre_cifrado && result.doctor_orden?.nombre_iv) {
                orderedByName = await decryptData(result.doctor_orden.nombre_cifrado, result.doctor_orden.nombre_iv, key)
            }
        } catch (e) {
            console.error('Error decrypting ordering doctor name:', e)
        }

        try {
            if (result.doctor_revision?.nombre_cifrado && result.doctor_revision?.nombre_iv) {
                reviewedByName = await decryptData(result.doctor_revision.nombre_cifrado, result.doctor_revision.nombre_iv, key)
            }
        } catch (e) {
            console.error('Error decrypting reviewing doctor name:', e)
        }

        // Parse results if stored as JSON
        let resultsData: LabResultPDFData['results'] = []
        try {
            if (result.valores_referencia) {
                resultsData = result.valores_referencia
            } else {
                // Create placeholder data if no detailed results
                resultsData = [{
                    parameter: result.nombre_examen,
                    value: result.resultados_cifrados ? 'Ver detalles' : 'Pendiente',
                    unit: '-',
                    referenceRange: 'N/A',
                    status: 'normal'
                }]
            }
        } catch (e) {
            console.error('Error parsing results:', e)
        }

        // Fetch active prescriptions for this patient from this doctor
        let prescriptions: PrescriptionData[] = []
        try {
            const { data: rxData } = await adminClient
                .from('recetas')
                .select('medicamentos, indicaciones_generales')
                .eq('paciente_id', result.paciente_id)
                .eq('doctor_id', payload.userId)
                .eq('estado', 'activa')
                .order('created_at', { ascending: false })
                .limit(5)

            if (rxData && rxData.length > 0) {
                prescriptions = rxData.flatMap(rx => {
                    const meds = rx.medicamentos || []
                    return meds.map((med: any) => ({
                        medicationName: med.nombre || 'Medicamento',
                        dosage: med.dosis || '',
                        frequency: med.frecuencia || '',
                        duration: med.duracion || '',
                        instructions: rx.indicaciones_generales || ''
                    }))
                })
            }
        } catch (e) {
            console.error('Error fetching prescriptions:', e)
        }

        // Format dates
        const formatDate = (dateStr: string | null) => {
            if (!dateStr) return 'N/A'
            return new Date(dateStr).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        }

        const examTypeLabels: Record<string, string> = {
            hematologia: 'Hematología',
            bioquimica: 'Bioquímica',
            microbiologia: 'Microbiología',
            urinalisis: 'Urianálisis',
            imagenologia: 'Imagenología',
            otro: 'Otro'
        }

        // Decrypt date of birth and access code
        const dateOfBirth = await safeDecrypt(result.pacientes?.fecha_nacimiento, key)
        const decryptedAccessCode = await safeDecrypt(result.codigo_acceso, key) || 
            await safeDecrypt(result.pacientes?.codigo_acceso, key) || 
            `RES-${result.id.substring(0, 8).toUpperCase()}`

        const pdfData: LabResultPDFData = {
            patientName,
            patientId: result.pacientes?.id?.substring(0, 8)?.toUpperCase() || 'N/A',
            dateOfBirth: dateOfBirth || undefined,
            examName: result.nombre_examen,
            examType: examTypeLabels[result.tipo_examen] || result.tipo_examen,
            orderDate: formatDate(result.fecha_orden),
            completionDate: formatDate(result.fecha_completado),
            orderedBy: orderedByName,
            reviewedBy: reviewedByName || undefined,
            results: resultsData,
            prescriptions: prescriptions.length > 0 ? prescriptions : undefined,
            interpretation: result.interpretacion || undefined,
            requiresFollowup: result.requiere_seguimiento || false,
            accessCode: decryptedAccessCode
        }

        if (format === 'text') {
            // Return plain text
            const text = generateLabResultText(pdfData)
            return new NextResponse(text, {
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Content-Disposition': `attachment; filename="resultado-${result.nombre_examen.replace(/\s+/g, '-')}.txt"`
                }
            })
        }

        // Return HTML (can be printed as PDF from browser)
        const html = generateLabResultHTML(pdfData)
        return new NextResponse(html, {
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Content-Disposition': `attachment; filename="resultado-${result.nombre_examen.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.html"`
            }
        })
    } catch (error: any) {
        console.error('Generate PDF error:', error)
        return NextResponse.json(
            { error: error.message || 'Error al generar PDF' },
            { status: 500 }
        )
    }
}
