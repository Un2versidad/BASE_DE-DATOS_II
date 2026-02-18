import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyToken } from '@/lib/auth'
import { decryptData, deriveKey } from '@/lib/encryption'
import { sendEmail } from '@/lib/email'

// POST /api/doctors/prescriptions/send - Send prescription by email
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { prescriptionId, patientId } = body

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

        if (!prescriptionId || !patientId) {
            return NextResponse.json(
                { error: 'Faltan campos requeridos' },
                { status: 400 }
            )
        }

        const adminClient = createAdminClient()

        // Get prescription with doctor info
        const { data: prescription, error: rxError } = await adminClient
            .from('recetas')
            .select(`
                *,
                doctores (nombre_cifrado, nombre_iv, especialidad)
            `)
            .eq('id', prescriptionId)
            .eq('doctor_id', payload.userId)
            .single()

        if (rxError || !prescription) {
            return NextResponse.json(
                { error: 'Receta no encontrada' },
                { status: 404 }
            )
        }

        // Get patient data including email
        const { data: patient, error: patientError } = await adminClient
            .from('pacientes')
            .select('*')
            .eq('id', patientId)
            .single()

        if (patientError || !patient) {
            return NextResponse.json(
                { error: 'Paciente no encontrado' },
                { status: 404 }
            )
        }

        // Decrypt patient email
        const key = await deriveKey(process.env.ENCRYPTION_SECRET || 'default-secret-change-in-production')
        let patientEmail = ''
        let patientName = 'Paciente'
        let doctorName = 'Doctor'

        if (patient.email_encrypted && patient.email_iv) {
            try {
                patientEmail = await decryptData(patient.email_encrypted, patient.email_iv, key)
            } catch (e) {
                console.error('Error decrypting patient email:', e)
            }
        }

        if (patient.nombre_encrypted && patient.nombre_iv) {
            try {
                patientName = await decryptData(patient.nombre_encrypted, patient.nombre_iv, key)
            } catch (e) {
                if (patient.nombre_encrypted.startsWith('enc_')) {
                    patientName = patient.nombre_encrypted.replace('enc_', '').replace(/_/g, ' ')
                }
            }
        }

        if (prescription.doctores?.nombre_cifrado && prescription.doctores?.nombre_iv) {
            try {
                doctorName = await decryptData(prescription.doctores.nombre_cifrado, prescription.doctores.nombre_iv, key)
            } catch (e) {
                if (prescription.doctores.nombre_cifrado.startsWith('enc_')) {
                    doctorName = prescription.doctores.nombre_cifrado.replace('enc_', '').replace(/_/g, ' ')
                }
            }
        }

        if (!patientEmail) {
            return NextResponse.json(
                { error: 'El paciente no tiene correo registrado' },
                { status: 400 }
            )
        }

        // Format medications
        const medications = Array.isArray(prescription.medicamentos) 
            ? prescription.medicamentos 
            : []

        const medicationsList = medications.map((med: any) => 
            `• ${med.nombre || 'Medicamento'}: ${med.dosis || ''} - ${med.frecuencia || ''} ${med.duracion ? `por ${med.duracion}` : ''}`
        ).join('\n')


        // Enviar receta real por correo usando Resend
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Receta Médica - MedComLabs</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 2px 12px #0001; overflow: hidden; }
        .header { background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); padding: 30px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 28px; letter-spacing: 1px; }
        .content { padding: 32px; }
        .section-title { color: #0d9488; font-size: 18px; margin-bottom: 12px; font-weight: 600; }
        .info-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        .info-table td { padding: 8px 0; color: #222; }
        .info-table .label { color: #64748b; width: 160px; font-size: 15px; }
        .med-list { background: #f0f9ff; border-radius: 8px; padding: 16px; margin-bottom: 18px; font-size: 15px; }
        .instructions { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 14px 18px; border-radius: 6px; color: #92400e; margin-bottom: 18px; }
        .footer { background: #f8fafc; padding: 18px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 13px; color: #94a3b8; }
        .footer strong { color: #0d9488; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Receta Médica</h1>
        </div>
        <div class="content">
            <div class="section-title">Datos del Paciente</div>
            <table class="info-table">
                <tr><td class="label">Paciente:</td><td>${patientName}</td></tr>
                <tr><td class="label">Fecha de emisión:</td><td>${prescription.fecha_emision}</td></tr>
                <tr><td class="label">Fecha de vencimiento:</td><td>${prescription.fecha_vencimiento || 'Sin vencimiento'}</td></tr>
            </table>
            <div class="section-title">Médico Responsable</div>
            <table class="info-table">
                <tr><td class="label">Nombre:</td><td>Dr(a). ${doctorName}</td></tr>
                <tr><td class="label">Especialidad:</td><td>${prescription.doctores?.especialidad || 'General'}</td></tr>
            </table>
            <div class="section-title">Medicamentos</div>
            <div class="med-list">${medicationsList || 'No especificados'}</div>
            <div class="section-title">Instrucciones</div>
            <div class="instructions">${prescription.indicaciones_generales || 'Ninguna'}</div>
        </div>
        <div class="footer">
            <p>Esta receta fue generada electrónicamente por <strong>MedComLabs</strong>.</p>
            <p>© ${new Date().getFullYear()} MedComLabs - Sistema Hospitalario</p>
            <p>Este correo contiene información médica protegida.</p>
        </div>
    </div>
</body>
</html>
        `
        const emailResult = await sendEmail({
            to: patientEmail,
            subject: 'Nueva receta médica - MedComLabs',
            html
        })
        if (!emailResult.success) {
            return NextResponse.json({ error: `Error al enviar email: ${emailResult.error}` }, { status: 500 })
        }

        // Create notification for patient
        await adminClient.from('notificaciones').insert({
            tipo_destinatario: 'paciente',
            destinatario_id: patientId,
            titulo: 'Nueva Receta Médica',
            mensaje: `El Dr. ${doctorName} le ha enviado una receta médica`,
            tipo: 'sistema',
            leida: false
        })

        return NextResponse.json({
            success: true,
            message: 'Receta enviada por correo'
        })
    } catch (error: any) {
        console.error('Send prescription email error:', error)
        return NextResponse.json(
            { error: 'Error al enviar receta por correo' },
            { status: 500 }
        )
    }
}
