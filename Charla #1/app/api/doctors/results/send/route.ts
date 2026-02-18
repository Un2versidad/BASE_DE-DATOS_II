import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyToken } from '@/lib/auth'
import { decryptData, deriveKey, safeDecrypt, encrypt } from '@/lib/encryption'
import { sendEmail, generateResultsEmailHTML } from '@/lib/email'
import { generateLabResultHTML, generateLabResultText, LabResultPDFData } from '@/lib/pdf-results'

// POST /api/doctors/results/send - Send results to patient via email
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { resultId, patientEmail } = body

        const authHeader = request.headers.get('authorization')
        const token = authHeader?.replace('Bearer ', '')

        if (!token) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const payload = await verifyToken(token)
        if (!payload || payload.role !== 'doctor') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        if (!resultId) {
            return NextResponse.json(
                { error: 'ID del resultado es requerido' },
                { status: 400 }
            )
        }

        const adminClient = createAdminClient()

        // Get the result with patient info
        const { data: result, error: resultError } = await adminClient
            .from('resultados_laboratorio')
            .select(`
                *,
                paciente:paciente_id (
                    id,
                    nombre_encrypted,
                    nombre_iv,
                    email_encrypted,
                    email_iv,
                    codigo_acceso
                ),
                doctor_orden:ordenado_por (
                    id,
                    nombre_cifrado,
                    nombre_iv
                )
            `)
            .eq('id', resultId)
            .single()

        if (resultError || !result) {
            return NextResponse.json(
                { error: 'Resultado no encontrado' },
                { status: 404 }
            )
        }

        // Decrypt patient info
        const secret = process.env.ENCRYPTION_SECRET || 'default-secret-change-in-production'
        const key = await deriveKey(secret)

        let patientName = 'Paciente'
        let email = patientEmail
        let doctorName = 'Médico'

        try {
            if (result.paciente?.nombre_encrypted && result.paciente?.nombre_iv) {
                patientName = await decryptData(result.paciente.nombre_encrypted, result.paciente.nombre_iv, key)
            }
        } catch (e) {
            console.error('Error decrypting patient name:', e)
        }

        try {
            if (!email && result.paciente?.email_encrypted && result.paciente?.email_iv) {
                email = await decryptData(result.paciente.email_encrypted, result.paciente.email_iv, key)
            }
        } catch (e) {
            console.error('Error decrypting patient email:', e)
        }

        try {
            if (result.doctor_orden?.nombre_cifrado && result.doctor_orden?.nombre_iv) {
                doctorName = await decryptData(result.doctor_orden.nombre_cifrado, result.doctor_orden.nombre_iv, key)
            }
        } catch (e) {
            console.error('Error decrypting doctor name:', e)
        }

        if (!email) {
            return NextResponse.json(
                { error: 'No se encontró email del paciente' },
                { status: 400 }
            )
        }

        // Generate access code if not exists - decrypt from DB
        const decryptedAccessCode = await safeDecrypt(result.codigo_acceso, key) || 
            await safeDecrypt(result.paciente?.codigo_acceso, key) || 
            `RES-${result.id.substring(0, 8).toUpperCase()}`

        // Generate email HTML
        const resultsUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/resultados?code=${decryptedAccessCode}`
        
        const emailHtml = generateResultsEmailHTML({
            patientName,
            examName: result.nombre_examen,
            accessCode: decryptedAccessCode,
            resultsUrl,
            doctorName
        })

        // Send email
        const emailResult = await sendEmail({
            to: email,
            subject: `Sus resultados de ${result.nombre_examen} están disponibles - MedComLabs`,
            html: emailHtml
        })

        if (!emailResult.success) {
            return NextResponse.json(
                { error: `Error al enviar email: ${emailResult.error}` },
                { status: 500 }
            )
        }

        // Update result to mark as reviewed (revisado) always
        await adminClient
            .from('resultados_laboratorio')
            .update({
                estado: 'revisado',
                revisado_por: payload.userId
            })
            .eq('id', resultId)

        // Create notification (encrypted)
        await adminClient
            .from('notificaciones')
            .insert({
                destinatario_id: payload.userId,
                tipo_destinatario: 'doctor',
                titulo: await encrypt('Resultados enviados', key),
                mensaje: await encrypt(`Los resultados de ${result.nombre_examen} han sido enviados al paciente`, key),
                tipo: 'resultado',
                referencia_tipo: 'resultado_laboratorio',
                referencia_id: resultId
            })

        return NextResponse.json({
            success: true,
            message: 'Resultados enviados exitosamente',
            messageId: emailResult.messageId
        })
    } catch (error: any) {
        console.error('Send results error:', error)
        return NextResponse.json(
            { error: error.message || 'Error al enviar resultados' },
            { status: 500 }
        )
    }
}
