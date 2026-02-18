import { NextResponse, NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { logSecurityEvent, getClientIP } from '@/app/api/security-logs/route'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
    const ip = getClientIP(request)
    const userAgent = request.headers.get('user-agent') || undefined
    
    try {
        const body = await request.json()
        const { userId, userEmail, newPassword } = body

        // Validar entrada
        if (!userId || !newPassword) {
            return NextResponse.json(
                { success: false, error: 'Datos incompletos' },
                { status: 400 }
            )
        }

        // Validar la que la contraseña cumpla con requisitos mínimos (ejemplo: al menos 8 caracteres)
        if (newPassword.length < 8) {
            return NextResponse.json(
                { success: false, error: 'La contraseña debe tener al menos 8 caracteres' },
                { status: 400 }
            )
        }

        const adminClient = createAdminClient()

        // Hash la nueva contraseña
        const hashedPassword = await bcrypt.hash(newPassword, 12)

        // Actualizar contraseña en la tabla credenciales_doctores
        const { error: updateError } = await adminClient
            .from('credenciales_doctores')
            .update({ 
                password_hash: hashedPassword,
                updated_at: new Date().toISOString(),
                // Restablecer intentos fallidos de restablecimiento de contraseña
                intentos_fallidos: 0,
                bloqueado_hasta: null
            })
            .eq('id', userId)

        if (updateError) {
            console.error('Error updating password:', updateError)
            
            await logSecurityEvent({
                eventType: 'PASSWORD_RESET_FAILED',
                description: `Failed to reset password for user: ${userEmail}`,
                ipAddress: ip,
                userAgent,
                success: false,
                metadata: { userId, error: updateError.message }
            })

            return NextResponse.json(
                { success: false, error: 'Error al actualizar contraseña' },
                { status: 500 }
            )
        }

        // Registrar restablecimiento de contraseña exitoso
        await logSecurityEvent({
            eventType: 'PASSWORD_RESET',
            description: `Password reset by admin for user: ${userEmail}`,
            ipAddress: ip,
            userAgent,
            success: true,
            metadata: { userId, userEmail }
        })

        return NextResponse.json({
            success: true,
            message: 'Contraseña actualizada exitosamente'
        })
    } catch (error) {
        console.error('Error resetting password:', error)
        
        await logSecurityEvent({
            eventType: 'PASSWORD_RESET_FAILED',
            description: 'Error during password reset operation',
            ipAddress: ip,
            userAgent,
            success: false,
            metadata: { error: String(error) }
        })

        return NextResponse.json(
            { success: false, error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}
