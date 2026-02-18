import { NextResponse, NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth-middleware'
import { logSecurityEvent, getClientIP } from '@/app/api/security-logs/route'
import { encrypt, encryptData, safeDecrypt, deriveKey, hashData } from '@/lib/encryption'

interface RouteContext {
    params: Promise<{ id: string }>
}

// Aprobar o rechazar el registro de un médico.
async function handlePatch(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params
        const adminClient = createAdminClient() // Utilizar el cliente de admin para todas las operaciones.
        const body = await request.json()
        const ip = getClientIP(request)
        const userAgent = request.headers.get('user-agent') || undefined
        
        // Derivar clave de cifrado
        const secret = process.env.ENCRYPTION_SECRET || 'default-secret-change-in-production'
        const key = await deriveKey(secret)

        const { action, rejectionReason } = body

        if (!['approve', 'reject'].includes(action)) {
            return NextResponse.json(
                { error: 'Acción inválida. Use "approve" o "reject"' },
                { status: 400 }
            )
        }

        // Obtener el registro
        const { data: registration, error: fetchError } = await adminClient
            .from('solicitudes_registro_doctores')
            .select('*')
            .eq('id', id)
            .single()

        if (fetchError || !registration) {
            return NextResponse.json(
                { error: 'Solicitud no encontrada' },
                { status: 404 }
            )
        }

        if (registration.estado !== 'pendiente') {
            return NextResponse.json(
                { error: 'Esta solicitud ya fue procesada' },
                { status: 400 }
            )
        }

        if (action === 'approve') {
            // Descifrar los datos de registro (formato comprimido en columnas normales)
            let regName = registration.nombre ? await safeDecrypt(registration.nombre, key) ?? '' : ''
            let regEmail = registration.email ? await safeDecrypt(registration.email, key) ?? '' : ''
            let regPhone = registration.telefono ? await safeDecrypt(registration.telefono, key) ?? '' : ''
            let regLicense = registration.numero_licencia ? await safeDecrypt(registration.numero_licencia, key) ?? '' : ''

            // Cifrar los datos confidenciales de los médicos (formato de dos columnas para la tabla doctores)
            const nombreEncrypted = await encryptData(regName, key)
            const emailEncrypted = await encryptData(regEmail, key)
            const telefonoEncrypted = regPhone 
                ? await encryptData(regPhone, key)
                : { encrypted: null, iv: null }

            // Cifrar número_licencia (formato comprimido + hash para búsqueda)
            const licenciaEncrypted = regLicense ? await encrypt(regLicense, key) : ''
            const licenciaHash = regLicense ? await hashData(regLicense) : ''
            
            // Crear la cuenta del médico utilizando el cliente administrador para bypass del RLS.
            const { data: newDoctor, error: doctorError } = await adminClient
                .from('doctores')
                .insert({
                    nombre_cifrado: nombreEncrypted.encrypted,
                    nombre_iv: nombreEncrypted.iv,
                    email_cifrado: emailEncrypted.encrypted,
                    email_iv: emailEncrypted.iv,
                    telefono_cifrado: telefonoEncrypted.encrypted,
                    telefono_iv: telefonoEncrypted.iv,
                    especialidad: registration.especialidad,
                    numero_licencia: licenciaEncrypted,
                    numero_licencia_hash: licenciaHash,
                    is_active: true
                })
                .select()
                .single()

            if (doctorError) {
                console.error('Error creating doctor:', doctorError)
                return NextResponse.json(
                    { error: 'Error al crear cuenta de doctor' },
                    { status: 500 }
                )
            }

            // Crear credenciales utilizando el cliente administrador
            await adminClient
                .from('credenciales_doctores')
                .insert({
                    doctor_id: newDoctor.id,
                    email: regEmail,
                    password_hash: registration.password_hash,
                    esta_aprobado: true,
                    esta_activo: true,
                    email_verificado: true,
                    fecha_aprobacion: new Date().toISOString()
                })

            // Actualizar el estado del registro utilizando el cliente administrador.
            await adminClient
                .from('solicitudes_registro_doctores')
                .update({
                    estado: 'aprobado',
                    fecha_revision: new Date().toISOString()
                })
                .eq('id', id)

            // Registrar evento de seguridad
            await logSecurityEvent({
                eventType: 'DOCTOR_REGISTRATION_APPROVED',
                description: `Solicitud de registro aprobada: ${regName} (${regEmail})`,
                userEmail: 'admin@medcomlabs.com',
                userRole: 'admin',
                ipAddress: ip,
                userAgent: userAgent,
                metadata: { 
                    doctorId: newDoctor.id,
                    registrationId: registration.id 
                }
            })

            return NextResponse.json({
                success: true,
                message: 'Doctor aprobado y cuenta creada exitosamente',
                doctor: newDoctor
            })
        } else {
            // Reject the registration
            if (!rejectionReason) {
                return NextResponse.json(
                    { error: 'Debe proporcionar un motivo de rechazo' },
                    { status: 400 }
                )
            }

            // Descifrar nombre/correo electrónico para el registro (formato comprimido)
            let regName = registration.nombre ? await safeDecrypt(registration.nombre, key) : ''
            let regEmail = registration.email ? await safeDecrypt(registration.email, key) : ''

            // Cifrar motivo_rechazo (formato comprimido)
            const motivoEncrypted = rejectionReason ? await encrypt(rejectionReason, key) : ''

            await adminClient
                .from('solicitudes_registro_doctores')
                .update({
                    estado: 'rechazado',
                    fecha_revision: new Date().toISOString(),
                    motivo_rechazo: motivoEncrypted
                })
                .eq('id', id)

            // Log de evento de seguridad
            await logSecurityEvent({
                eventType: 'DOCTOR_REGISTRATION_REJECTED',
                description: `Solicitud de registro rechazada: ${regName} (${regEmail}) - Motivo: ${rejectionReason}`,
                userEmail: 'admin@medcomlabs.com',
                userRole: 'admin',
                ipAddress: ip,
                userAgent: userAgent,
                metadata: { 
                    registrationId: registration.id,
                    rejectionReason 
                }
            })

            return NextResponse.json({
                success: true,
                message: 'Solicitud rechazada'
            })
        }
    } catch (error) {
        console.error('Error processing registration:', error)
        return NextResponse.json(
            { error: 'Error al procesar solicitud' },
            { status: 500 }
        )
    }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
    return withAuth(request, (req) => handlePatch(req, context))
}
