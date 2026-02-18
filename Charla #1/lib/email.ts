// Servicio de correo electrónico mediante la API Resend

import { Resend } from 'resend'

interface EmailOptions {
    to: string | string[]
    subject: string
    text?: string
    html?: string
    attachments?: Array<{
        filename: string
        content: string | Buffer
        contentType?: string
    }>
    replyTo?: string
}

interface EmailResult {
    success: boolean
    messageId?: string
    error?: string
}

// Inicializar el cliente Resend
function getResendClient(): Resend | null {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
        return null
    }
    return new Resend(apiKey)
}

// Comprueba si el correo electrónico está configurado.
export function isEmailConfigured(): boolean {
    return !!process.env.RESEND_API_KEY
}

/**
 * Enviar un correo electrónico utilizando Reenviar
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
    const resend = getResendClient()
    
    // Registro para la depuración
    console.log('📧 Sending email:', {
        to: options.to,
        subject: options.subject,
        hasHtml: !!options.html
    })

    if (!resend) {
        // En desarrollo sin clave API, simular éxito
        if (process.env.NODE_ENV === 'development') {
            console.log('📧 [DEV MODE] Email simulated - configure RESEND_API_KEY for real emails')
            return { 
                success: true, 
                messageId: `mock-${Date.now()}` 
            }
        }
        return { 
            success: false, 
            error: 'Resend API key not configured. Add RESEND_API_KEY to your environment variables.' 
        }
    }

    try {
        const fromEmail = process.env.EMAIL_FROM || 'MedComLabs <onboarding@resend.dev>'
        
        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: Array.isArray(options.to) ? options.to : [options.to],
            subject: options.subject,
            text: options.text,
            html: options.html,
            replyTo: options.replyTo,
            attachments: options.attachments?.map(att => ({
                filename: att.filename,
                content: typeof att.content === 'string' 
                    ? Buffer.from(att.content, 'base64') 
                    : att.content,
                contentType: att.contentType
            }))
        })

        if (error) {
            console.error('Resend error:', error)
            return { success: false, error: error.message }
        }

        console.log('📧 Email sent successfully:', data?.id)
        return { 
            success: true, 
            messageId: data?.id 
        }
    } catch (error: any) {
        console.error('Email send error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Enviar correo electrónico de confirmación de cita
 */
export async function sendAppointmentConfirmation(data: {
    to: string
    patientName: string
    appointmentNumber: string
    department: string
    date: string
    time: string
    doctorName?: string
}): Promise<EmailResult> {
    const html = generateAppointmentConfirmationHTML(data)
    
    return sendEmail({
        to: data.to,
        subject: `Confirmación de Cita ${data.appointmentNumber} - MedComLabs`,
        html
    })
}

/**
 * Enviar correo electrónico de notificación de resultados de laboratorio.
 */
export async function sendLabResultsNotification(data: {
    to: string
    patientName: string
    examName: string
    accessCode: string
    resultsUrl: string
    doctorName: string
}): Promise<EmailResult> {
    const html = generateResultsEmailHTML(data)
    
    return sendEmail({
        to: data.to,
        subject: `Sus resultados de ${data.examName} están disponibles - MedComLabs`,
        html
    })
}

// Email Plantillas

export function generateResultsEmailHTML(data: {
    patientName: string
    examName: string
    accessCode: string
    resultsUrl: string
    doctorName: string
}): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sus Resultados Médicos - MedComLabs</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); padding: 30px; text-align: center; }
        .header img { height: 50px; }
        .header h1 { color: white; margin: 15px 0 0 0; font-size: 24px; }
        .content { padding: 30px; }
        .greeting { font-size: 18px; color: #333; margin-bottom: 20px; }
        .message { color: #666; line-height: 1.6; margin-bottom: 25px; }
        .code-box { background: #f0f9ff; border: 2px dashed #0d9488; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0; }
        .code-label { color: #666; font-size: 14px; margin-bottom: 8px; }
        .code { font-size: 32px; font-weight: bold; color: #0d9488; letter-spacing: 4px; }
        .btn { display: inline-block; background: #0d9488; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 20px 0; }
        .btn:hover { background: #0f766e; }
        .info { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
        .info p { margin: 0; color: #92400e; font-size: 14px; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0; }
        .footer p { color: #94a3b8; font-size: 12px; margin: 5px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏥 MedComLabs</h1>
        </div>
        <div class="content">
            <p class="greeting">Estimado/a <strong>${data.patientName}</strong>,</p>
            <p class="message">
                Sus resultados del examen <strong>${data.examName}</strong> ya están disponibles. 
                Fueron revisados por el/la <strong>Dr(a). ${data.doctorName}</strong>.
            </p>
            
            <div class="code-box">
                <p class="code-label">Su código de acceso:</p>
                <p class="code">${data.accessCode}</p>
            </div>
            
            <p style="text-align: center;">
                <a href="${data.resultsUrl}" class="btn">Ver Mis Resultados</a>
            </p>
            
            <div class="info">
                <p>⚠️ <strong>Importante:</strong> Este código es personal e intransferible. 
                No lo comparta con nadie. Caduca en 7 días.</p>
            </div>
            
            <p class="message">
                Si tiene preguntas sobre sus resultados, por favor contacte a su médico directamente 
                o llame a nuestra línea de atención al paciente.
            </p>
        </div>
        <div class="footer">
            <p>Este es un mensaje automático, por favor no responda a este correo.</p>
            <p>© ${new Date().getFullYear()} MedComLabs - Sistema Hospitalario</p>
            <p>Este correo contiene información médica protegida.</p>
        </div>
    </div>
</body>
</html>
    `.trim()
}

export function generateAppointmentConfirmationHTML(data: {
    patientName: string
    appointmentNumber: string
    department: string
    date: string
    time: string
    doctorName?: string
}): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmación de Cita - MedComLabs</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%); padding: 30px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .content { padding: 30px; }
        .success { background: #dcfce7; border: 1px solid #86efac; border-radius: 8px; padding: 15px; text-align: center; margin-bottom: 25px; }
        .success span { font-size: 48px; }
        .details { background: #f8fafc; border-radius: 8px; padding: 20px; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { color: #64748b; font-size: 14px; }
        .detail-value { color: #1e293b; font-weight: 500; }
        .appointment-number { font-size: 24px; font-weight: bold; color: #3b82f6; text-align: center; margin: 20px 0; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0; }
        .footer p { color: #94a3b8; font-size: 12px; margin: 5px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏥 Confirmación de Cita</h1>
        </div>
        <div class="content">
            <div class="success">
                <span>✅</span>
                <h2 style="color: #16a34a; margin: 10px 0 0 0;">¡Cita Confirmada!</h2>
            </div>
            
            <p class="appointment-number">Turno: ${data.appointmentNumber}</p>
            
            <p>Estimado/a <strong>${data.patientName}</strong>,</p>
            <p>Su cita ha sido agendada exitosamente. A continuación los detalles:</p>
            
            <div class="details">
                <div class="detail-row">
                    <span class="detail-label">📅 Fecha</span>
                    <span class="detail-value">${data.date}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">🕐 Hora</span>
                    <span class="detail-value">${data.time}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">🏥 Departamento</span>
                    <span class="detail-value">${data.department}</span>
                </div>
                ${data.doctorName ? `
                <div class="detail-row">
                    <span class="detail-label">👨‍⚕️ Médico</span>
                    <span class="detail-value">Dr(a). ${data.doctorName}</span>
                </div>
                ` : ''}
            </div>
            
            <p style="margin-top: 25px; color: #666;">
                Por favor llegue 15 minutos antes de su cita con su documento de identidad.
            </p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} MedComLabs - Sistema Hospitalario</p>
        </div>
    </div>
</body>
</html>
    `.trim()
}
