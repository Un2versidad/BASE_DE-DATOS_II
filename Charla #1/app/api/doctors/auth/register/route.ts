import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { encrypt, deriveKey, hashData } from '@/lib/encryption'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { name, email, phone, specialty, license_number, password } = body

        // Validate required fields
        if (!name || !email || !phone || !specialty || !license_number || !password) {
            return NextResponse.json(
                { error: 'Todos los campos son requeridos' },
                { status: 400 }
            )
        }

        // Validate password strength
        if (password.length < 8) {
            return NextResponse.json(
                { error: 'La contraseña debe tener al menos 8 caracteres' },
                { status: 400 }
            )
        }

        const adminClient = createAdminClient()

        // Check if email already exists in credentials
        const { data: existingEmail } = await adminClient
            .from('credenciales_doctores')
            .select('id')
            .eq('email', email.toLowerCase())
            .single()

        if (existingEmail) {
            return NextResponse.json(
                { error: 'Este email ya está registrado' },
                { status: 400 }
            )
        }

        // Check if license already exists (hash-based lookup)
        const licenseHash = await hashData(license_number)
        const { data: existingLicense } = await adminClient
            .from('doctores')
            .select('id')
            .eq('numero_licencia_hash', licenseHash)
            .single()

        if (existingLicense) {
            return NextResponse.json(
                { error: 'Este número de licencia ya está registrado' },
                { status: 400 }
            )
        }

        // Check if there's already a pending registration (hash-based lookup)
        const emailHash = await hashData(email.toLowerCase())
        const { data: existingRegistration } = await adminClient
            .from('solicitudes_registro_doctores')
            .select('id')
            .eq('email_hash', emailHash)
            .eq('estado', 'pendiente')
            .single()

        if (existingRegistration) {
            return NextResponse.json(
                { error: 'Ya existe una solicitud pendiente con este email' },
                { status: 400 }
            )
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10)

        // Encrypt PII (packed format)
        const secret = process.env.ENCRYPTION_SECRET || 'default-secret-change-in-production'
        const key = await deriveKey(secret)
        const nombreEncrypted = await encrypt(name, key)
        const telefonoEncrypted = phone ? await encrypt(phone, key) : null
        const emailEncrypted = await encrypt(email.toLowerCase(), key)
        const licenciaEncrypted = await encrypt(license_number, key)

        // Create registration request
        const { data: registration, error: regError } = await adminClient
            .from('solicitudes_registro_doctores')
            .insert({
                nombre: nombreEncrypted,
                email: emailEncrypted,
                email_hash: emailHash,
                telefono: telefonoEncrypted,
                especialidad: specialty,
                numero_licencia: licenciaEncrypted,
                numero_licencia_hash: licenseHash,
                password_hash: passwordHash,
                estado: 'pendiente'
            })
            .select()
            .single()

        if (regError) {
            console.error('Registration error:', regError)
            throw new Error('Error al crear la solicitud de registro')
        }

        // Notify admins (encrypt titulo/mensaje)
        try {
            const tituloEncrypted = await encrypt('Nueva Solicitud de Doctor', key)
            const mensajeEncrypted = await encrypt(`${name} ha solicitado registro como doctor en ${specialty}`, key)
            await adminClient.from('notificaciones').insert({
                tipo_destinatario: 'admin',
                destinatario_id: '00000000-0000-0000-0000-000000000000',
                titulo: tituloEncrypted,
                mensaje: mensajeEncrypted,
                tipo: 'aprobacion',
                referencia_tipo: 'solicitud_registro',
                referencia_id: registration.id,
                prioridad: 'alta'
            })
        } catch (e) {
            console.error('Failed to create notification:', e)
        }

        // Log security event (encrypt fields)
        try {
            const tipoEventoEnc = await encrypt('REGISTER', key)
            const descripcionEnc = await encrypt(`Solicitud de registro de doctor: ${name}`, key)
            const emailEnc = await encrypt(email, key)
            const metadatosEnc = await encrypt(JSON.stringify({ especialidad: specialty, numero_licencia: license_number }), key)
            await adminClient.from('registros_seguridad').insert({
                tipo_evento: tipoEventoEnc,
                descripcion: descripcionEnc,
                usuario_email: emailEnc,
                metadatos: metadatosEnc
            })
        } catch (e) {
            console.error('Failed to log security event:', e)
        }

        return NextResponse.json({
            success: true,
            message: 'Solicitud de registro enviada. Espere la aprobación del administrador.',
            registrationId: registration.id
        })
    } catch (error: any) {
        console.error('Doctor registration error:', error)
        return NextResponse.json(
            { error: error.message || 'Error interno del servidor' },
            { status: 500 }
        )
    }
}
