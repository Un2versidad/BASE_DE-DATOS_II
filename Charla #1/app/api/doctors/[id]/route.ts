import { NextResponse, NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth-middleware'
import { logSecurityEvent, getClientIP } from '@/app/api/security-logs/route'
import { encryptData, decryptData, deriveKey, safeDecrypt } from '@/lib/encryption'

interface RouteContext {
    params: Promise<{ id: string }>
}

// Ayuda para descifrar el campo o extraerlo del formato del marcador de posición.
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

// Obtener un solo médico
async function handleGet(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params
        const adminClient = createAdminClient()
        const secret = process.env.ENCRYPTION_SECRET || 'default-secret-change-in-production'
        const key = await deriveKey(secret)

        const { data, error } = await adminClient
            .from('doctores')
            .select('*')
            .eq('id', id)
            .single()

        if (error || !data) {
            return NextResponse.json(
                { error: 'Doctor no encontrado' },
                { status: 404 }
            )
        }

        // Descifrar campos confidenciales
        const decryptedDoctor = {
            ...data,
            nombre: await decryptField(data.nombre_cifrado, data.nombre_iv, key),
            email: await decryptField(data.email_cifrado, data.email_iv, key),
            telefono: await decryptField(data.telefono_cifrado, data.telefono_iv, key),
            numero_licencia: await safeDecrypt(data.numero_licencia, key),
        }

        return NextResponse.json({ doctor: decryptedDoctor })
    } catch (error) {
        console.error('Error fetching doctor:', error)
        return NextResponse.json(
            { error: 'Error al obtener doctor' },
            { status: 500 }
        )
    }
}

// Actualizar un médico
async function handlePatch(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params
        const adminClient = createAdminClient()
        const body = await request.json()
        const ip = getClientIP(request)
        const userAgent = request.headers.get('user-agent') || undefined
        const secret = process.env.ENCRYPTION_SECRET || 'default-secret-change-in-production'
        const key = await deriveKey(secret)

        const updateObject: Record<string, any> = {}
        
        // Solo actualizar los campos proporcionados; cifrar los campos confidenciales.
        if (body.nombre) {
            const encrypted = await encryptData(body.nombre, key)
            updateObject.nombre_cifrado = encrypted.encrypted
            updateObject.nombre_iv = encrypted.iv
        }
        if (body.especialidad) updateObject.especialidad = body.especialidad
        if (body.email) {
            const encrypted = await encryptData(body.email, key)
            updateObject.email_cifrado = encrypted.encrypted
            updateObject.email_iv = encrypted.iv
        }
        if (body.telefono) {
            const encrypted = await encryptData(body.telefono, key)
            updateObject.telefono_cifrado = encrypted.encrypted
            updateObject.telefono_iv = encrypted.iv
        }
        if (body.dias_disponibles) updateObject.dias_disponibles = body.dias_disponibles
        if (body.hora_inicio) updateObject.hora_inicio = body.hora_inicio
        if (body.hora_fin) updateObject.hora_fin = body.hora_fin
        if (body.duracion_cita_minutos) updateObject.duracion_cita_minutos = body.duracion_cita_minutos
        if (typeof body.is_active === 'boolean') updateObject.is_active = body.is_active

        const { data, error } = await adminClient
            .from('doctores')
            .update(updateObject)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        // Descifrar para response
        const decryptedName = await decryptField(data.nombre_cifrado, data.nombre_iv, key)

        // Registrar evento de seguridad
        await logSecurityEvent({
            eventType: 'DOCTOR_UPDATED',
            description: `Información de doctor actualizada: ${decryptedName}`,
            userEmail: 'admin@medcomlabs.com',
            userRole: 'admin',
            ipAddress: ip,
            userAgent: userAgent,
            metadata: { doctorId: id, updatedFields: Object.keys(body) }
        })

        return NextResponse.json({
            success: true,
            doctor: { ...data, nombre: decryptedName }
        })
    } catch (error) {
        console.error('Error updating doctor:', error)
        return NextResponse.json(
            { error: 'Error al actualizar doctor' },
            { status: 500 }
        )
    }
}

// Eliminar un médico
async function handleDelete(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params
        const adminClient = createAdminClient()
        const ip = getClientIP(request)
        const userAgent = request.headers.get('user-agent') || undefined
        const secret = process.env.ENCRYPTION_SECRET || 'default-secret-change-in-production'
        const key = await deriveKey(secret)

        // Obtener información del médico antes de eliminar
        const { data: doctor } = await adminClient
            .from('doctores')
            .select('nombre_cifrado, nombre_iv, email_cifrado, email_iv, numero_licencia')
            .eq('id', id)
            .single()

        if (!doctor) {
            return NextResponse.json(
                { error: 'Doctor no encontrado' },
                { status: 404 }
            )
        }

        // Descifrar la información del médico para el registro.
        const doctorName = await decryptField(doctor.nombre_cifrado, doctor.nombre_iv, key)
        const doctorEmail = await decryptField(doctor.email_cifrado, doctor.email_iv, key)

        // Comprueba si el médico tiene citas pendientes.
        const { data: appointments } = await adminClient
            .from('citas')
            .select('id')
            .eq('doctor_id', id)
            .in('estado', ['programada', 'confirmada'])
            .limit(1)

        if (appointments && appointments.length > 0) {
            return NextResponse.json(
                { error: 'No se puede eliminar un doctor con citas pendientes. Cancele o reasigne las citas primero.' },
                { status: 400 }
            )
        }

        // Eliminar al médico
        const { error } = await adminClient
            .from('doctores')
            .delete()
            .eq('id', id)

        if (error) throw error

        // Si hubo un registro, márquelo también (utilizando las credenciales de correo electrónico).
        if (doctorEmail) {
            await adminClient
                .from('solicitudes_registro_doctores')
                .update({ estado: 'rechazado', motivo_rechazo: 'Cuenta eliminada por administrador' })
                .eq('email', doctorEmail)
        }

        // Registrar evento de seguridad
        await logSecurityEvent({
            eventType: 'DATA_DELETION',
            description: `Cuenta de doctor eliminada: ${doctorName} (${doctorEmail})`,
            userEmail: 'admin@medcomlabs.com',
            userRole: 'admin',
            ipAddress: ip,
            userAgent: userAgent,
            metadata: { 
                doctorId: id, 
                doctorName: doctorName,
                doctorEmail: doctorEmail,
                licenseNumber: await safeDecrypt(doctor.numero_licencia, key)
            }
        })

        return NextResponse.json({
            success: true,
            message: `Doctor ${doctorName} eliminado exitosamente`
        })
    } catch (error) {
        console.error('Error deleting doctor:', error)
        return NextResponse.json(
            { error: 'Error al eliminar doctor' },
            { status: 500 }
        )
    }
}

export async function GET(request: NextRequest, context: RouteContext) {
    return withAuth(request, (req) => handleGet(req, context))
}

export async function PATCH(request: NextRequest, context: RouteContext) {
    return withAuth(request, (req) => handlePatch(req, context))
}

export async function DELETE(request: NextRequest, context: RouteContext) {
    return withAuth(request, (req) => handleDelete(req, context))
}
