import { NextResponse, NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { decryptData, deriveKey } from '@/lib/encryption'

// Helper to decrypt field or extract from placeholder format
async function decryptField(encrypted: string | null, iv: string | null, key: CryptoKey): Promise<string | null> {
    if (!encrypted || !iv) return null
    
    // Check for placeholder/demo data format (enc_value)
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

// Public endpoint - no authentication required
// Returns doctors filtered by specialty for appointment booking
export async function GET(request: NextRequest) {
    try {
        const adminClient = createAdminClient()
        const { searchParams } = new URL(request.url)
        const specialty = searchParams.get('specialty')
        
        const secret = process.env.ENCRYPTION_SECRET || 'default-secret-change-in-production'
        const key = await deriveKey(secret)

        let query = adminClient
            .from('doctores')
            .select(`
                id,
                nombre_cifrado,
                nombre_iv,
                especialidad,
                foto_url,
                dias_disponibles,
                hora_inicio,
                hora_fin
            `)
            .eq('is_active', true)

        // Filter by specialty if provided
        if (specialty) {
            query = query.eq('especialidad', specialty)
        }

        // Also check if doctor has approved credentials
        const { data: credenciales } = await adminClient
            .from('credenciales_doctores')
            .select('doctor_id')
            .eq('esta_aprobado', true)
            .eq('esta_activo', true)

        const approvedDoctorIds = new Set((credenciales || []).map(c => c.doctor_id))

        const { data, error } = await query.order('nombre_cifrado', { ascending: true })

        if (error) throw error

        // Filter to only approved doctors and decrypt names
        const mappedDoctors = await Promise.all(
            (data || [])
                .filter(doc => approvedDoctorIds.has(doc.id))
                .map(async doc => ({
                    id: doc.id,
                    name: await decryptField(doc.nombre_cifrado, doc.nombre_iv, key),
                    specialty: doc.especialidad,
                    photo_url: doc.foto_url,
                    available_days: doc.dias_disponibles,
                    start_time: doc.hora_inicio,
                    end_time: doc.hora_fin
                }))
        )

        return NextResponse.json({ 
            doctors: mappedDoctors,
            count: mappedDoctors.length
        })
    } catch (error) {
        console.error('Error fetching public doctors:', error)
        return NextResponse.json(
            { error: 'Error al obtener doctores' },
            { status: 500 }
        )
    }
}
