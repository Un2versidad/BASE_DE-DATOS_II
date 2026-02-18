import { NextResponse, NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth-middleware'
import { decryptData, deriveKey, safeDecrypt } from '@/lib/encryption'

// Helper to decrypt field or extract from placeholder format
async function decryptField(encrypted: string | null, iv: string | null, key: CryptoKey): Promise<string | null> {
    if (!encrypted || !iv) return null
    
    // Check for placeholder/demo data format (enc_value)
    if (encrypted.startsWith('enc_')) {
        // Return decoded placeholder: "enc_Dra_Maria_Garcia" -> "Dra. María García"
        return encrypted
            .replace('enc_', '')
            .replace(/_/g, ' ')
            .replace('@', '@') // Keep email format
    }
    
    try {
        return await decryptData(encrypted, iv, key)
    } catch (error) {
        console.warn('Decryption failed, returning raw value:', error)
        return encrypted
    }
}

async function handleGet(request: NextRequest) {
    try {
        const adminClient = createAdminClient()
        const secret = process.env.ENCRYPTION_SECRET || 'default-secret-change-in-production'
        const key = await deriveKey(secret)

        const { data, error } = await adminClient
            .from('doctores')
            .select('*')
            .eq('is_active', true)
            .order('nombre_cifrado', { ascending: true })

        if (error) throw error

        // Decrypt and map Spanish column names to English for frontend compatibility
        const mappedDoctors = await Promise.all((data || []).map(async doc => ({
            id: doc.id,
            name: await decryptField(doc.nombre_cifrado, doc.nombre_iv, key),
            email: await decryptField(doc.email_cifrado, doc.email_iv, key),
            phone: await decryptField(doc.telefono_cifrado, doc.telefono_iv, key),
            specialty: doc.especialidad,
            license_number: await safeDecrypt(doc.numero_licencia, key),
            is_active: doc.is_active,
            created_at: doc.created_at,
            photo_url: doc.foto_url
        })))

        return NextResponse.json({ doctors: mappedDoctors })
    } catch (error) {
        console.error('Error fetching doctors:', error)
        return NextResponse.json(
            { error: 'Error al obtener doctores' },
            { status: 500 }
        )
    }
}

export async function GET(request: NextRequest) {
    return withAuth(request, handleGet)
}
