'use client'

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import Script from 'next/script'

interface HCaptchaProps {
    siteKey?: string
    onVerify: (token: string) => void
    onExpire?: () => void
    onError?: (error: string) => void
    size?: 'normal' | 'compact' | 'invisible'
    theme?: 'light' | 'dark'
    tabIndex?: number
    languageOverride?: string
}

export interface HCaptchaRef {
    execute: () => void
    reset: () => void
}

declare global {
    interface Window {
        hcaptcha: {
            render: (container: HTMLElement | string, params: any) => string
            execute: (widgetId: string | undefined, options?: any) => void
            reset: (widgetId?: string) => void
            getResponse: (widgetId?: string) => string
        }
        onHCaptchaLoad?: () => void
    }
}

const HCaptcha = forwardRef<HCaptchaRef, HCaptchaProps>(({
    siteKey,
    onVerify,
    onExpire,
    onError,
    size = 'normal',
    theme = 'light',
    tabIndex = 0,
    languageOverride
}, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const widgetIdRef = useRef<string | null>(null)
    const [isLoaded, setIsLoaded] = useState(false)
    const [isRendered, setIsRendered] = useState(false)

    // Utilizar la clave del sitio proporcionada u obtenga una del entorno.
    const actualSiteKey = siteKey || process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY || ''

    // Los callback deben adjuntarse a la ventana para que hCaptcha las llame.
    useEffect(() => {
        // Comprueba si hCaptcha ya está cargado (por ejemplo, desde la navegación).
        if (window.hcaptcha) {
            setIsLoaded(true)
        }
        
        window.onHCaptchaLoad = () => {
            setIsLoaded(true)
        }

        return () => {
            delete window.onHCaptchaLoad
        }
    }, [])

    // Renderizar el widget una vez que se haya cargado el script.
    useEffect(() => {
        if (!isLoaded || !containerRef.current || isRendered || !actualSiteKey) return

        try {
            const widgetId = window.hcaptcha.render(containerRef.current, {
                sitekey: actualSiteKey,
                size,
                theme,
                tabindex: tabIndex,
                hl: languageOverride,
                callback: (token: string) => {
                    onVerify(token)
                },
                'expired-callback': () => {
                    onExpire?.()
                },
                'error-callback': (error: string) => {
                    onError?.(error)
                }
            })
            widgetIdRef.current = widgetId
            setIsRendered(true)
        } catch (error) {
            console.error('Error rendering hCaptcha:', error)
            onError?.('Failed to render captcha')
        }
    }, [isLoaded, actualSiteKey, size, theme, tabIndex, languageOverride, onVerify, onExpire, onError, isRendered])

    // Exponer métodos mediante ref
    useImperativeHandle(ref, () => ({
        execute: () => {
            if (widgetIdRef.current && window.hcaptcha) {
                window.hcaptcha.execute(widgetIdRef.current)
            }
        },
        reset: () => {
            if (widgetIdRef.current && window.hcaptcha) {
                window.hcaptcha.reset(widgetIdRef.current)
            }
        }
    }), [])

    // No renderizar si no hay clave del sitio
    if (!actualSiteKey) {
        if (process.env.NODE_ENV === 'development') {
            return (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
                    ⚠️ hCaptcha no configurado (NEXT_PUBLIC_HCAPTCHA_SITEKEY)
                </div>
            )
        }
        return null
    }

    return (
        <>
            <Script
                src="https://js.hcaptcha.com/1/api.js?onload=onHCaptchaLoad&render=explicit"
                strategy="afterInteractive"
            />
            <div ref={containerRef} className="h-captcha-container" />
        </>
    )
})

HCaptcha.displayName = 'HCaptcha'

export default HCaptcha

// Gancho para usar hCaptcha con modo invisible
export function useHCaptcha() {
    const [token, setToken] = useState<string | null>(null)
    const [isVerified, setIsVerified] = useState(false)
    const captchaRef = useRef<HCaptchaRef>(null)

    const execute = async (): Promise<string | null> => {
        return new Promise((resolve) => {
            if (captchaRef.current) {
                captchaRef.current.execute()
                // El token se establecerá mediante la llamada de retorno onVerify.
                const checkToken = setInterval(() => {
                    if (token) {
                        clearInterval(checkToken)
                        resolve(token)
                    }
                }, 100)
                // Tiempo de espera tras 60 segundos
                setTimeout(() => {
                    clearInterval(checkToken)
                    resolve(null)
                }, 60000)
            } else {
                resolve(null)
            }
        })
    }

    const reset = () => {
        setToken(null)
        setIsVerified(false)
        captchaRef.current?.reset()
    }

    const onVerify = (newToken: string) => {
        setToken(newToken)
        setIsVerified(true)
    }

    const onExpire = () => {
        setToken(null)
        setIsVerified(false)
    }

    return {
        token,
        isVerified,
        execute,
        reset,
        captchaRef,
        onVerify,
        onExpire,
    }
}
