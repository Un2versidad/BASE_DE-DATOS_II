import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { signAccessToken, signRefreshToken } from '@/lib/auth'
import { decryptData, deriveKey } from '@/lib/encryption'
import bcrypt from 'bcryptjs'

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
        const body = await request.json()
        const { email, password } = body

        if (!email || !password) {
            return NextResponse.json(
                { 
                    success: false,
                    error: 'Email y contraseña son requeridos',
                    type: 'validation'
                },
                { status: 400 }
            )
        }

        const adminClient = createAdminClient()
        const secret = process.env.ENCRYPTION_SECRET || 'default-secret-change-in-production'
        const key = await deriveKey(secret)

        // Buscar credenciales del doctor por email
        const { data: credenciales, error: credError } = await adminClient
            .from('credenciales_doctores')
            .select(`
                *,
                doctores (*)
            `)
            .eq('email', email.toLowerCase().trim())
            .single()

        if (credError || !credenciales) {
            // Registrar intento fallido
            await registrarEventoSeguridad(adminClient, {
                tipo: 'LOGIN_FAILED',
                descripcion: `Intento de login fallido - email no encontrado: ${email}`,
                email: email,
                exitoso: false
            })

            return NextResponse.json(
                { 
                    success: false,
                    error: 'El correo electrónico no está registrado en el sistema',
                    type: 'not_found'
                },
                { status: 401 }
            )
        }

        // Verificar si la cuenta está bloqueada
        if (credenciales.bloqueado_hasta && new Date(credenciales.bloqueado_hasta) > new Date()) {
            return NextResponse.json(
                { 
                    success: false,
                    error: 'Cuenta bloqueada temporalmente. Intente más tarde.',
                    type: 'blocked',
                    bloqueadoHasta: credenciales.bloqueado_hasta
                },
                { status: 403 }
            )
        }

        // Verificar si la cuenta está activa
        if (!credenciales.esta_activo) {
            return NextResponse.json(
                { 
                    success: false,
                    error: 'Su cuenta ha sido desactivada. Contacte al administrador.',
                    type: 'inactive'
                },
                { status: 403 }
            )
        }

        // Verificar si la cuenta está aprobada
        if (!credenciales.esta_aprobado) {
            return NextResponse.json(
                { 
                    success: false,
                    error: 'Su cuenta aún no ha sido aprobada por el administrador. Recibirá una notificación cuando sea aprobada.',
                    type: 'not_approved'
                },
                { status: 403 }
            )
        }

        // Verificar contraseña
        const passwordValido = await bcrypt.compare(password, credenciales.password_hash)
        
        if (!passwordValido) {
            // Incrementar intentos fallidos
            const nuevosIntentos = (credenciales.intentos_fallidos || 0) + 1
            const actualizacion: any = { intentos_fallidos: nuevosIntentos }
            
            // Bloquear después de 5 intentos
            if (nuevosIntentos >= 5) {
                actualizacion.bloqueado_hasta = new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 min
            }

            await adminClient
                .from('credenciales_doctores')
                .update(actualizacion)
                .eq('id', credenciales.id)

            await registrarEventoSeguridad(adminClient, {
                tipo: 'LOGIN_FAILED',
                descripcion: `Contraseña incorrecta para: ${email}. Intento ${nuevosIntentos}/5`,
                usuarioId: credenciales.doctor_id,
                email: email,
                exitoso: false
            })

            return NextResponse.json(
                { 
                    success: false,
                    error: nuevosIntentos >= 5 
                        ? 'Cuenta bloqueada por múltiples intentos fallidos. Intente en 30 minutos.'
                        : `Contraseña incorrecta. ${5 - nuevosIntentos} intentos restantes.`,
                    type: 'invalid_password',
                    intentosRestantes: Math.max(0, 5 - nuevosIntentos)
                },
                { status: 401 }
            )
        }

        // Login exitoso - resetear intentos fallidos
        // Decrypt doctor's encrypted fields
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

        const accessToken = await signAccessToken(tokenPayload)
        const refreshToken = await signRefreshToken(tokenPayload)

        // Calcular expiración del refresh token (7 días)
        const refreshTokenExpira = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

        // Actualizar credenciales
        await adminClient
            .from('credenciales_doctores')
            .update({
                ultimo_login: new Date().toISOString(),
                refresh_token: refreshToken,
                refresh_token_expira: refreshTokenExpira,
                intentos_fallidos: 0,
                bloqueado_hasta: null
            })
            .eq('id', credenciales.id)

        // Registrar evento de seguridad
        await registrarEventoSeguridad(adminClient, {
            tipo: 'LOGIN',
            descripcion: `Login exitoso: ${doctorNombre}`,
            usuarioId: credenciales.doctor_id,
            email: email,
            exitoso: true
        })

        const response = NextResponse.json({
            success: true,
            message: `¡Bienvenido/a, ${doctorNombre}!`,
            user: {
                id: credenciales.doctor_id,
                email: credenciales.email,
                nombre: doctorNombre,
                especialidad: credenciales.doctores?.especialidad,
                foto: credenciales.doctores?.foto_url,
                role: 'doctor'
            },
            accessToken,
            expiresIn: 3600 // 1 hora
        })

        // Establecer refresh token en cookie HTTP-only
        response.cookies.set('doctor_refresh_token', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60, // 7 días
            path: '/'
        })

        return response
    } catch (error: any) {
        console.error('Error en login de doctor:', error)
        return NextResponse.json(
            { 
                success: false,
                error: 'Error interno del servidor. Por favor intente más tarde.',
                type: 'server_error'
            },
            { status: 500 }
        )
    }
}

// Función auxiliar para registrar eventos de seguridad
async function registrarEventoSeguridad(
    client: any, 
    datos: {
        tipo: string
        descripcion: string
        usuarioId?: string
        email?: string
        exitoso?: boolean
        metadatos?: any
    }
) {
    try {
        await client.from('registros_seguridad').insert({
            tipo_evento: datos.tipo,
            descripcion: datos.descripcion,
            usuario_id: datos.usuarioId,
            usuario_email: datos.email,
            usuario_tipo: 'doctor',
            exitoso: datos.exitoso ?? true,
            metadatos: datos.metadatos
        })
    } catch (e) {
        console.error('Error al registrar evento de seguridad:', e)
    }
}
