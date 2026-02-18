import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyToken } from '@/lib/auth'
import { decryptData, deriveKey } from '@/lib/encryption'
import { sendEmail } from '@/lib/email'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// POST /api/doctors/orders/send - Send lab order to patient via email
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { orderId, patientId } = body

        const authHeader = request.headers.get('authorization')
        const token = authHeader?.replace('Bearer ', '')

        if (!token) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const payload = await verifyToken(token)
        if (!payload || payload.role !== 'doctor') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        if (!orderId) {
            return NextResponse.json(
                { error: 'ID de la orden es requerido' },
                { status: 400 }
            )
        }

        const adminClient = createAdminClient()
        const secret = process.env.ENCRYPTION_SECRET || 'default-secret-change-in-production'
        const key = await deriveKey(secret)

        // Get the order
        const { data: order, error: orderError } = await adminClient
            .from('resultados_laboratorio')
            .select('*')
            .eq('id', orderId)
            .single()

        if (orderError || !order) {
            return NextResponse.json(
                { error: 'Orden no encontrada' },
                { status: 404 }
            )
        }

        // Get patient info
        const { data: patient, error: patientError } = await adminClient
            .from('pacientes')
            .select('nombre_encrypted, nombre_iv, email_encrypted, email_iv')
            .eq('id', patientId || order.paciente_id)
            .single()

        if (patientError || !patient) {
            return NextResponse.json(
                { error: 'Paciente no encontrado' },
                { status: 404 }
            )
        }

        // Decrypt patient info
        let patientName = 'Paciente'
        let patientEmail = ''

        try {
            if (patient.nombre_encrypted && patient.nombre_iv) {
                patientName = await decryptData(patient.nombre_encrypted, patient.nombre_iv, key)
            }
        } catch (e) {
            console.error('Error decrypting patient name:', e)
        }

        try {
            if (patient.email_encrypted && patient.email_iv) {
                patientEmail = await decryptData(patient.email_encrypted, patient.email_iv, key)
            }
        } catch (e) {
            console.error('Error decrypting patient email:', e)
        }

        if (!patientEmail) {
            return NextResponse.json(
                { error: 'El paciente no tiene email registrado. Por favor actualice la información del paciente.' },
                { status: 400 }
            )
        }

        // Get doctor info
        const { data: doctor } = await adminClient
            .from('doctores')
            .select('nombre_cifrado, nombre_iv, especialidad')
            .eq('id', payload.userId)
            .single()

        let doctorName = 'Médico'
        let specialty = ''
        if (doctor) {
            try {
                if (doctor.nombre_cifrado && doctor.nombre_iv) {
                    doctorName = await decryptData(doctor.nombre_cifrado, doctor.nombre_iv, key)
                }
                specialty = doctor.especialidad || ''
            } catch (e) {}
        }

        const orderDate = format(new Date(order.fecha_orden), 'd MMMM yyyy', { locale: es })

        // Generate email HTML
        const emailHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Orden de Laboratorio - MedComLabs</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #0d9488;">
        <h1 style="color: #0d9488; margin: 0;">MedComLabs</h1>
        <p style="color: #666; margin: 5px 0 0;">Orden de Laboratorio</p>
    </div>
    
    <div style="padding: 30px 0;">
        <p style="font-size: 16px;">Estimado/a <strong>${patientName}</strong>,</p>
        
        <p>Su médico ha ordenado los siguientes exámenes de laboratorio:</p>
        
        <div style="background: #f0fdfa; border: 1px solid #0d9488; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h2 style="color: #0d9488; margin: 0 0 10px;">${order.nombre_examen}</h2>
            <p style="margin: 5px 0; color: #666;">
                <strong>Tipo:</strong> ${order.tipo_examen}
            </p>
            <p style="margin: 5px 0; color: #666;">
                <strong>Prioridad:</strong> 
                <span style="
                    background: ${order.prioridad === 'urgente' ? '#fef2f2' : order.prioridad === 'alta' ? '#fff7ed' : '#f0fdf4'};
                    color: ${order.prioridad === 'urgente' ? '#dc2626' : order.prioridad === 'alta' ? '#ea580c' : '#16a34a'};
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: bold;
                ">${order.prioridad.toUpperCase()}</span>
            </p>
            <p style="margin: 5px 0; color: #666;">
                <strong>Fecha de orden:</strong> ${orderDate}
            </p>
        </div>

        <div style="background: #f8fafc; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px; color: #334155;">Instrucciones:</h3>
            <ul style="margin: 0; padding-left: 20px;">
                <li>Presente esta orden en cualquier sede de MedComLabs junto con su identificación</li>
                <li>Si el examen requiere ayuno, no ingiera alimentos 8-12 horas antes</li>
                <li>Manténgase hidratado tomando agua</li>
                <li>Los resultados estarán disponibles en el portal de pacientes</li>
            </ul>
        </div>

        <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <strong>Ordenado por:</strong><br>
            ${doctorName}<br>
            <span style="color: #666; font-size: 14px;">${specialty}</span>
        </p>
    </div>
    
    <div style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 8px; margin-top: 30px;">
        <p style="margin: 0; font-size: 14px; color: #666;">
            Si tiene alguna pregunta sobre esta orden, contacte a su médico.
        </p>
    </div>
    
    <div style="text-align: center; padding-top: 30px; border-top: 1px solid #e5e7eb; margin-top: 30px;">
        <p style="color: #999; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} MedComLabs. Todos los derechos reservados.
        </p>
    </div>
</body>
</html>`

        // Send email using Resend
        const emailResult = await sendEmail({
            to: patientEmail,
            subject: `Orden de Laboratorio: ${order.nombre_examen} - MedComLabs`,
            html: emailHtml
        })

        if (!emailResult.success) {
            return NextResponse.json(
                { error: emailResult.error || 'Error al enviar email' },
                { status: 500 }
            )
        }

        // Log the action
        await adminClient
            .from('registros_seguridad')
            .insert({
                tipo_accion: 'order_sent',
                descripcion: `Orden ${order.nombre_examen} enviada a paciente por email`,
                usuario_id: payload.userId,
                tabla_afectada: 'resultados_laboratorio',
                registro_id: orderId
            })

        return NextResponse.json({
            success: true,
            message: 'Orden enviada exitosamente'
        })

    } catch (error: any) {
        console.error('Send order error:', error)
        return NextResponse.json(
            { error: 'Error al enviar orden' },
            { status: 500 }
        )
    }
}
