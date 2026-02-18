import { NextResponse, NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyToken } from '@/lib/auth'
import { decryptData, encryptData, deriveKey, safeDecrypt } from '@/lib/encryption'

// Helper to get doctor ID from token
async function getDoctorIdFromToken(request: NextRequest): Promise<string | null> {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return null
    
    const token = authHeader.split(' ')[1]
    try {
        const payload = await verifyToken(token) as { userId?: string; role?: string } | null
        if (!payload || payload.role !== 'doctor') return null
        return payload.userId || null
    } catch {
        return null
    }
}

// Helper to decrypt field or extract from placeholder format
async function decryptField(encrypted: string | null, iv: string | null, key: CryptoKey): Promise<string | null> {
    if (!encrypted || !iv) return null
    
    if (encrypted.startsWith('enc_')) {
        return encrypted.replace('enc_', '').replace(/_/g, ' ')
    }
    
    try {
        return await decryptData(encrypted, iv, key)
    } catch {
        return encrypted
    }
}

// GET - Get current doctor's profile
export async function GET(request: NextRequest) {
    try {
        const doctorId = await getDoctorIdFromToken(request)
        if (!doctorId) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const adminClient = createAdminClient()
        const secret = process.env.ENCRYPTION_SECRET || 'default-secret-change-in-production'
        const key = await deriveKey(secret)

        const { data, error } = await adminClient
            .from('doctores')
            .select('*')
            .eq('id', doctorId)
            .single()

        if (error || !data) {
            return NextResponse.json({ error: 'Doctor no encontrado' }, { status: 404 })
        }

        // Decrypt sensitive fields
        const profile = {
            id: data.id,
            name: await decryptField(data.nombre_cifrado, data.nombre_iv, key),
            email: await decryptField(data.email_cifrado, data.email_iv, key),
            phone: await decryptField(data.telefono_cifrado, data.telefono_iv, key),
            specialty: data.especialidad,
            license_number: await safeDecrypt(data.numero_licencia, key),
            photo_url: data.foto_url,
            available_days: data.dias_disponibles || ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
            start_time: data.hora_inicio || '08:00',
            end_time: data.hora_fin || '17:00',
            appointment_duration: data.duracion_cita_minutos || 30,
            is_active: data.is_active,
            created_at: data.created_at
        }

        return NextResponse.json({ profile })
    } catch (error) {
        console.error('Error fetching doctor profile:', error)
        return NextResponse.json({ error: 'Error al obtener perfil' }, { status: 500 })
    }
}

// PATCH - Update current doctor's profile settings
export async function PATCH(request: NextRequest) {
    try {
        const doctorId = await getDoctorIdFromToken(request)
        if (!doctorId) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const adminClient = createAdminClient()
        const secret = process.env.ENCRYPTION_SECRET || 'default-secret-change-in-production'
        const key = await deriveKey(secret)

        const updateObject: Record<string, unknown> = {}

        // Handle availability settings (non-sensitive)
        if (body.available_days) {
            // Validate days
            const validDays = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
            const days = body.available_days.filter((d: string) => validDays.includes(d.toLowerCase()))
            if (days.length > 0) {
                updateObject.dias_disponibles = days
            }
        }

        if (body.start_time) {
            // Validate time format HH:MM
            if (/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(body.start_time)) {
                updateObject.hora_inicio = body.start_time
            }
        }

        if (body.end_time) {
            if (/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(body.end_time)) {
                updateObject.hora_fin = body.end_time
            }
        }

        if (body.appointment_duration) {
            const duration = parseInt(body.appointment_duration)
            if (duration >= 10 && duration <= 120) {
                updateObject.duracion_cita_minutos = duration
            }
        }

        // Handle encrypted fields
        if (body.phone) {
            const encrypted = await encryptData(body.phone, key)
            updateObject.telefono_cifrado = encrypted.encrypted
            updateObject.telefono_iv = encrypted.iv
        }

        if (body.photo_url) {
            updateObject.foto_url = body.photo_url
        }

        // Don't allow changing email, name, specialty, or license through this endpoint
        // Those should require admin approval

        if (Object.keys(updateObject).length === 0) {
            return NextResponse.json({ error: 'No hay campos válidos para actualizar' }, { status: 400 })
        }

        const { data, error } = await adminClient
            .from('doctores')
            .update(updateObject)
            .eq('id', doctorId)
            .select()
            .single()

        if (error) {
            console.error('Error updating doctor profile:', error)
            return NextResponse.json({ error: 'Error al actualizar perfil' }, { status: 500 })
        }

        // Return updated profile
        const profile = {
            id: data.id,
            name: await decryptField(data.nombre_cifrado, data.nombre_iv, key),
            email: await decryptField(data.email_cifrado, data.email_iv, key),
            phone: await decryptField(data.telefono_cifrado, data.telefono_iv, key),
            specialty: data.especialidad,
            license_number: await safeDecrypt(data.numero_licencia, key),
            photo_url: data.foto_url,
            available_days: data.dias_disponibles,
            start_time: data.hora_inicio,
            end_time: data.hora_fin,
            appointment_duration: data.duracion_cita_minutos,
            is_active: data.is_active
        }

        return NextResponse.json({ 
            message: 'Perfil actualizado correctamente',
            profile 
        })
    } catch (error) {
        console.error('Error updating doctor profile:', error)
        return NextResponse.json({ error: 'Error al actualizar perfil' }, { status: 500 })
    }
}
