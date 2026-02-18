import crypto from 'crypto'

// hCaptcha configuración
const HCAPTCHA_SECRET = process.env.HCAPTCHA_SECRET_KEY || ''
const HCAPTCHA_SITEKEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY || ''
const HCAPTCHA_VERIFY_URL = 'https://hcaptcha.com/siteverify'

export interface HCaptchaVerifyResponse {
    success: boolean
    challenge_ts?: string
    hostname?: string
    credit?: boolean
    'error-codes'?: string[]
    score?: number
    score_reason?: string[]
}

/**
 * Verificar el token hCaptcha del lado del servidor.
 * @param token: el token de respuesta hCaptcha del frontend.
 * @param remoteip: dirección IP opcional del usuario.
 * @returns: si el captcha es válido.
 */
export async function verifyHCaptcha(
    token: string, 
    remoteip?: string
): Promise<{ success: boolean; error?: string }> {
    if (!HCAPTCHA_SECRET) {
        // Si no se ha configurado ninguna clave secreta, omitir la verificación en desarrollo.
        if (process.env.NODE_ENV === 'development') {
            console.warn('hCaptcha secret key not configured, skipping verification in development')
            return { success: true }
        }
        return { success: false, error: 'hCaptcha not configured' }
    }

    if (!token) {
        return { success: false, error: 'No captcha token provided' }
    }

    try {
        const params = new URLSearchParams({
            secret: HCAPTCHA_SECRET,
            response: token,
            ...(remoteip && { remoteip })
        })

        const response = await fetch(HCAPTCHA_VERIFY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.toString()
        })

        const data: HCaptchaVerifyResponse = await response.json()

        if (data.success) {
            return { success: true }
        }

        const errorCodes = data['error-codes'] || []
        const errorMessages: Record<string, string> = {
            'missing-input-secret': 'Missing secret key',
            'invalid-input-secret': 'Invalid secret key',
            'missing-input-response': 'Missing captcha response',
            'invalid-input-response': 'Invalid captcha response',
            'bad-request': 'Bad request',
            'invalid-or-already-seen-response': 'Captcha already used',
            'sitekey-secret-mismatch': 'Site key and secret don\'t match',
            'not-using-dummy-passcode': 'Test code used in production'
        }

        const errors = errorCodes.map(code => errorMessages[code] || code)
        return { success: false, error: errors.join(', ') }
    } catch (error) {
        console.error('hCaptcha verification error:', error)
        return { success: false, error: 'Failed to verify captcha' }
    }
}

/**
 * Generar un hash para almacenar tokens captcha verificados.
 */
export function hashCaptchaToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Comprueba si estamos en modo desarrollo sin hCaptcha configurado.
 */
export function isCaptchaEnabled(): boolean {
    return Boolean(HCAPTCHA_SECRET && HCAPTCHA_SITEKEY)
}

/**
 * Obtener la clave pública del sitio para el frontend.
 */
export function getHCaptchaSiteKey(): string {
    return HCAPTCHA_SITEKEY
}
