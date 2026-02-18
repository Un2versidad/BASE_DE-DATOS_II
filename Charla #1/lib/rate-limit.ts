import { createAdminClient } from '@/lib/supabase/server'

export interface RateLimitConfig {
    maxRequests: number      // Número máximo de solicitudes permitidas
    windowMinutes: number    // Ventana de tiempo en minutos
}

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
    appointment_create: { maxRequests: 5, windowMinutes: 60 },       // 5 citas por hora
    result_check: { maxRequests: 10, windowMinutes: 5 },             // 10 comprobaciones de resultados cada 5 minutos
    doctor_registration: { maxRequests: 3, windowMinutes: 60 },      // 3 registros por hora por IP
    login_attempt: { maxRequests: 5, windowMinutes: 15 },            // 5 intentos de login por 15 minutos
    prescription_create: { maxRequests: 20, windowMinutes: 60 },     // 20 recetas por hora
    lab_order: { maxRequests: 30, windowMinutes: 60 },               // 30 órdenes de laboratorio por hora
    ai_chat: { maxRequests: 30, windowMinutes: 5 },                  // 30 mensajes de IA por 5 minutos
}

/**
 * Comprueba si una acción tiene límite de frecuencia.
 * @param identificador: dirección IP, ID de usuario u otro identificador único.
 * @param acción: tipo de acción que se está realizando.
 * @returns Indica si la acción está permitida (verdadero) o tiene límite de frecuencia (falso).
 */
export async function checkRateLimit(
    identifier: string,
    action: keyof typeof RATE_LIMITS
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const config = RATE_LIMITS[action]
    if (!config) {
        return { allowed: true, remaining: Infinity, resetAt: new Date() }
    }

    const adminClient = createAdminClient()
    const windowStart = new Date(Date.now() - config.windowMinutes * 60 * 1000)

    // Obtener el recuento actual
    const { data: existing } = await adminClient
        .from('rate_limits')
        .select('count, window_start')
        .eq('identifier', identifier)
        .eq('action_type', action)
        .single()

    // Si no hay ningún registro o ventana caducada, esto está permitido y el recuento se restablece.
    if (!existing || new Date(existing.window_start) < windowStart) {
        // Insertar con nuevo recuento
        await adminClient
            .from('rate_limits')
            .upsert({
                identifier,
                action_type: action,
                count: 1,
                window_start: new Date().toISOString()
            }, {
                onConflict: 'identifier,action_type'
            })

        return {
            allowed: true,
            remaining: config.maxRequests - 1,
            resetAt: new Date(Date.now() + config.windowMinutes * 60 * 1000)
        }
    }

    // Comprueba si está por debajo del límite
    if (existing.count < config.maxRequests) {
        // Incrementar recuento
        await adminClient
            .from('rate_limits')
            .update({ count: existing.count + 1 })
            .eq('identifier', identifier)
            .eq('action_type', action)

        return {
            allowed: true,
            remaining: config.maxRequests - existing.count - 1,
            resetAt: new Date(new Date(existing.window_start).getTime() + config.windowMinutes * 60 * 1000)
        }
    }

    // Rate limited
    return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(new Date(existing.window_start).getTime() + config.windowMinutes * 60 * 1000)
    }
}

/**
 * Obtener el límite de velocidad restante para mostrarlo.
 */
export async function getRateLimitStatus(
    identifier: string,
    action: keyof typeof RATE_LIMITS
): Promise<{ remaining: number; resetAt: Date | null }> {
    const config = RATE_LIMITS[action]
    if (!config) {
        return { remaining: Infinity, resetAt: null }
    }

    const adminClient = createAdminClient()
    const windowStart = new Date(Date.now() - config.windowMinutes * 60 * 1000)

    const { data: existing } = await adminClient
        .from('rate_limits')
        .select('count, window_start')
        .eq('identifier', identifier)
        .eq('action_type', action)
        .single()

    if (!existing || new Date(existing.window_start) < windowStart) {
        return { remaining: config.maxRequests, resetAt: null }
    }

    return {
        remaining: Math.max(0, config.maxRequests - existing.count),
        resetAt: new Date(new Date(existing.window_start).getTime() + config.windowMinutes * 60 * 1000)
    }
}

/**
 * Limpiar entradas caducadas del límite de velocidad (ejecutar periódicamente)
 */
export async function cleanupExpiredRateLimits(): Promise<number> {
    const adminClient = createAdminClient()
    
    // Eliminar entradas más antiguas que la ventana más larga (1 hora) + búfer
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000)
    
    const { error } = await adminClient
        .from('rate_limits')
        .delete()
        .lt('window_start', cutoff.toISOString())

    return error ? 0 : 1
}
