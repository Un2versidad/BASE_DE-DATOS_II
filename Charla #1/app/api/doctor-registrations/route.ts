import { NextResponse, NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth-middleware'
import { logSecurityEvent, getClientIP } from '@/app/api/security-logs/route'
import { checkRateLimit } from '@/lib/rate-limit'
import { verifyHCaptcha, isCaptchaEnabled } from '@/lib/hcaptcha'
import { encrypt, safeDecrypt, deriveKey, hashData } from '@/lib/encryption'
import bcrypt from 'bcryptjs'

// Obtener todos los registros de médicos (para el administrador)
async function handleGet(request: NextRequest) {
    try {
        const adminClient = createAdminClient()
        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')

        let query = adminClient
            .from('solicitudes_registro_doctores')
            .select('*')
            .order('created_at', { ascending: false })

        if (status) {
            query = query.eq('estado', status)
        }

        const { data, error } = await query

        if (error) throw error

        // Descifrar la información de identificación personal para su visualización por parte del administrador.
        const secret = process.env.ENCRYPTION_SECRET || 'default-secret-change-in-production'
        const key = await deriveKey(secret)

        const mappedRegistrations = await Promise.all((data || []).map(async (reg) => {
            // Descifrar campos PII (formato comprimido en columnas normales)
            let name = reg.nombre ? await safeDecrypt(reg.nombre, key) : ''
            let email = reg.email ? await safeDecrypt(reg.email, key) : ''
            let phone = reg.telefono ? await safeDecrypt(reg.telefono, key) : ''

            return {
                id: reg.id,
                name,
                email,
                phone,
                specialty: reg.especialidad,
                license_number: reg.numero_licencia ? await safeDecrypt(reg.numero_licencia, key) : '',
                status: reg.estado === 'pendiente' ? 'pending' : reg.estado === 'aprobado' ? 'approved' : 'rejected',
                rejection_reason: reg.motivo_rechazo ? await safeDecrypt(reg.motivo_rechazo, key) : null,
                created_at: reg.created_at,
                reviewed_at: reg.fecha_revision
            }
        }))

        return NextResponse.json({ registrations: mappedRegistrations })
    } catch (error) {
        console.error('Error fetching doctor registrations:', error)
        return NextResponse.json(
            { error: 'Error al obtener solicitudes' },
            { status: 500 }
        )
    }
}

// Crear nuevo registro de médico
async function handlePost(request: NextRequest) {
    try {
        const adminClient = createAdminClient()
        const body = await request.json()
        const ip = getClientIP(request)
        const userAgent = request.headers.get('user-agent') || undefined

        // Limitación de velocidad: 3 registros por hora por IP.
        const rateLimitResult = await checkRateLimit(ip, 'doctor_registration')
        if (!rateLimitResult.allowed) {
            await logSecurityEvent({
                eventType: 'registro',
                description: 'Rate limit exceeded for doctor registration',
                ipAddress: ip,
                userAgent: userAgent,
                success: false,
                metadata: { email: body.email }
            })
            return NextResponse.json(
                { 
                    error: 'Ha excedido el límite de registros. Por favor intente más tarde.',
                    retryAfter: rateLimitResult.resetAt
                },
                { status: 429 }
            )
        }

        // Verificar hCaptcha si está habilitado
        if (isCaptchaEnabled()) {
            const captchaToken = body.captchaToken
            if (!captchaToken) {
                return NextResponse.json(
                    { error: 'Por favor complete la verificación de seguridad' },
                    { status: 400 }
                )
            }

            const captchaResult = await verifyHCaptcha(captchaToken, ip)
            if (!captchaResult.success) {
                await logSecurityEvent({
                    eventType: 'registro',
                    description: 'hCaptcha verification failed',
                    ipAddress: ip,
                    userAgent: userAgent,
                    success: false,
                    metadata: { email: body.email, captchaError: captchaResult.error }
                })
                return NextResponse.json(
                    { error: 'Verificación de seguridad fallida. Por favor intente nuevamente.' },
                    { status: 400 }
                )
            }
        }

        // Validar campos obligatorios
        const requiredFields = ['name', 'email', 'phone', 'specialty', 'license_number', 'password']
        for (const field of requiredFields) {
            if (!body[field]) {
                return NextResponse.json(
                    { error: `El campo ${field} es requerido` },
                    { status: 400 }
                )
            }
        }

        // Validar formato de correo electrónico
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(body.email)) {
            return NextResponse.json(
                { error: 'Formato de email inválido' },
                { status: 400 }
            )
        }

        // Validar la seguridad de la contraseña
        if (body.password.length < 8) {
            return NextResponse.json(
                { error: 'La contraseña debe tener al menos 8 caracteres' },
                { status: 400 }
            )
        }

        // Comprueba si el correo electrónico o la licencia ya existen (utilizando hash).
        const emailHash = await hashData(body.email)
        const licenseHash = await hashData(body.license_number)

        const { data: existingByEmail } = await adminClient
            .from('solicitudes_registro_doctores')
            .select('id')
            .eq('email_hash', emailHash)
            .single()

        const { data: existingByLicense } = await adminClient
            .from('solicitudes_registro_doctores')
            .select('id')
            .eq('numero_licencia_hash', licenseHash)
            .single()

        if (existingByEmail || existingByLicense) {
            return NextResponse.json(
                { error: 'Ya existe una solicitud con este email o número de licencia' },
                { status: 400 }
            )
        }

        // Comprueba también la tabla de médicos (utilizando hash).
        const { data: existingDoctorEmail } = await adminClient
            .from('doctores')
            .select('id')
            .eq('email_hash', emailHash)
            .single()

        const { data: existingDoctorLicense } = await adminClient
            .from('doctores')
            .select('id')
            .eq('numero_licencia_hash', licenseHash)
            .single()

        if (existingDoctorEmail || existingDoctorLicense) {
            return NextResponse.json(
                { error: 'Ya existe un doctor registrado con este email o número de licencia' },
                { status: 400 }
            )
        }

        // Hash de contraseña con bcrypt
        const passwordHash = await bcrypt.hash(body.password, 10)

        // Cifrar la información de identificación personal (formato comprimido)
        const secret = process.env.ENCRYPTION_SECRET || 'default-secret-change-in-production'
        const key = await deriveKey(secret)
        const nombreEncrypted = await encrypt(body.name, key)
        const telefonoEncrypted = body.phone ? await encrypt(body.phone, key) : null

        // Cifrar el correo electrónico y el número de licencia (formato comprimido + hash para búsqueda)
        const emailEncrypted = await encrypt(body.email, key)
        const licenciaEncrypted = await encrypt(body.license_number, key)

        // Crear solicitud de registro
        const { data, error } = await adminClient
            .from('solicitudes_registro_doctores')
            .insert({
                nombre: nombreEncrypted,
                email: emailEncrypted,
                email_hash: emailHash,
                telefono: telefonoEncrypted,
                especialidad: body.specialty,
                numero_licencia: licenciaEncrypted,
                numero_licencia_hash: licenseHash,
                password_hash: passwordHash,
                estado: 'pendiente'
            })
            .select()
            .single()

        if (error) throw error

        // Registrar evento de seguridad
        await logSecurityEvent({
            eventType: 'DOCTOR_REGISTRATION_REQUEST',
            description: `Nueva solicitud de registro de doctor: ${body.name} (${body.email})`,
            userEmail: body.email,
            userRole: 'doctor',
            ipAddress: ip,
            userAgent: userAgent,
            metadata: { 
                specialty: body.specialty,
                license_number: body.license_number 
            }
        })

        return NextResponse.json({
            success: true,
            message: 'Solicitud enviada. Espere la aprobación del administrador.',
            registrationId: data.id
        }, { status: 201 })
    } catch (error) {
        console.error('Error creating doctor registration:', error)
        return NextResponse.json(
            { error: 'Error al crear solicitud de registro' },
            { status: 500 }
        )
    }
}

export async function GET(request: NextRequest) {
    return withAuth(request, handleGet)
}

export async function POST(request: NextRequest) {
    // El registro es público, no se requiere autenticación.
    return handlePost(request)
}
