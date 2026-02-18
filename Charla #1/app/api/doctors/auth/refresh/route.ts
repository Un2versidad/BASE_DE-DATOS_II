import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@/lib/auth'
import { decryptData, deriveKey } from '@/lib/encryption'
import { cookies } from 'next/headers'

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

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies()
        const refreshToken = cookieStore.get('doctor_refresh_token')?.value

        if (!refreshToken) {
            return NextResponse.json(
                { 
                    success: false,
                    error: 'No se encontró token de sesión',
                    type: 'no_token'
                },
                { status: 401 }
            )
        }

        // Verificar el refresh token
        const payload = await verifyRefreshToken(refreshToken)
        
        if (!payload) {
            return NextResponse.json(
                { 
                    success: false,
                    error: 'Sesión expirada. Por favor inicie sesión nuevamente.',
                    type: 'expired'
                },
                { status: 401 }
            )
        }

        const adminClient = createAdminClient()
        const secret = process.env.ENCRYPTION_SECRET || 'default-secret-change-in-production'
        const key = await deriveKey(secret)

        // Verificar que el refresh token coincida con el almacenado
        const { data: credenciales, error } = await adminClient
            .from('credenciales_doctores')
            .select(`
                *,
                doctores (*)
            `)
            .eq('doctor_id', payload.userId)
            .eq('refresh_token', refreshToken)
            .single()

        if (error || !credenciales) {
            return NextResponse.json(
                { 
                    success: false,
                    error: 'Sesión inválida. Por favor inicie sesión nuevamente.',
                    type: 'invalid'
                },
                { status: 401 }
            )
        }

        // Verificar si el token ha expirado en la base de datos
        if (credenciales.refresh_token_expira && new Date(credenciales.refresh_token_expira) < new Date()) {
            return NextResponse.json(
                { 
                    success: false,
                    error: 'Sesión expirada. Por favor inicie sesión nuevamente.',
                    type: 'expired'
                },
                { status: 401 }
            )
        }

        // Verificar si la cuenta sigue activa y aprobada
        if (!credenciales.esta_activo) {
            return NextResponse.json(
                { 
                    success: false,
                    error: 'Su cuenta ha sido desactivada.',
                    type: 'inactive'
                },
                { status: 403 }
            )
        }

        if (!credenciales.esta_aprobado) {
            return NextResponse.json(
                { 
                    success: false,
                    error: 'Su cuenta ha sido suspendida pendiente de revisión.',
                    type: 'not_approved'
                },
                { status: 403 }
            )
        }

        // Generar nuevos tokens
        // Decrypt doctor's name
        const doctorNombre = await decryptField(
            credenciales.doctores?.nombre_cifrado,
            credenciales.doctores?.nombre_iv,
            key
        )
        
        const tokenPayload = {
            userId: credenciales.doctor_id,
            email: credenciales.email,
            role: 'doctor',
            name: doctorNombre,
            specialty: credenciales.doctores?.especialidad
        }

        const newAccessToken = await signAccessToken(tokenPayload)
        const newRefreshToken = await signRefreshToken(tokenPayload)
        const refreshTokenExpira = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

        // Actualizar refresh token en la base de datos (rotación de tokens)
        await adminClient
            .from('credenciales_doctores')
            .update({
                refresh_token: newRefreshToken,
                refresh_token_expira: refreshTokenExpira
            })
            .eq('id', credenciales.id)

        const response = NextResponse.json({
            success: true,
            accessToken: newAccessToken,
            expiresIn: 3600,
            user: {
                id: credenciales.doctor_id,
                email: credenciales.email,
                nombre: doctorNombre,
                especialidad: credenciales.doctores?.especialidad,
                foto: credenciales.doctores?.foto_url,
                role: 'doctor'
            }
        })

        // Actualizar cookie con nuevo refresh token
        response.cookies.set('doctor_refresh_token', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60,
            path: '/'
        })

        return response
    } catch (error) {
        console.error('Error al refrescar token:', error)
        return NextResponse.json(
            { 
                success: false,
                error: 'Error interno del servidor',
                type: 'server_error'
            },
            { status: 500 }
        )
    }
}
