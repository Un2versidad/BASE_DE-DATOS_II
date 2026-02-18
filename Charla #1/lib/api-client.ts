// Cliente API con actualización automática de tokens

let isRefreshing = false
let refreshSubscribers: ((token: string) => void)[] = []

function subscribeTokenRefresh(cb: (token: string) => void) {
    refreshSubscribers.push(cb)
}

function onRefreshed(token: string) {
    refreshSubscribers.forEach(cb => cb(token))
    refreshSubscribers = []
}

async function refreshAccessToken(): Promise<boolean> {
    try {
        const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
        })

        if (response.ok) {
            return true
        }
        return false
    } catch (error) {
        console.error('Token refresh failed:', error)
        return false
    }
}

export async function apiClient(url: string, options: RequestInit = {}) {
    const defaultOptions: RequestInit = {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    }

    let response = await fetch(url, defaultOptions)

    // Si no está autorizado, intenta actualizar el token.
    if (response.status === 401) {
        if (!isRefreshing) {
            isRefreshing = true
            const refreshed = await refreshAccessToken()
            isRefreshing = false

            if (refreshed) {
                onRefreshed('refreshed')
                // Reintentar la solicitud original
                response = await fetch(url, defaultOptions)
            } else {
                // Refresh failed, redirect to login
                window.location.href = '/login?reason=session_expired'
                throw new Error('Session expired')
            }
        } else {
            // Esperar a que se complete la actualización
            await new Promise<void>((resolve) => {
                subscribeTokenRefresh(() => resolve())
            })
            // Reintentar la solicitud original
            response = await fetch(url, defaultOptions)
        }
    }

    return response
}
