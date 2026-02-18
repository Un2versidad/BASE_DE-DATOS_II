import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function proxy(request: NextRequest) {
    const accessToken = request.cookies.get('access_token')?.value
    const refreshToken = request.cookies.get('refresh_token')?.value

    // Rutas protegidas que requieren autenticación
    const protectedPaths = ['/dashboard']
    const isProtectedPath = protectedPaths.some(path => 
        request.nextUrl.pathname.startsWith(path)
    )

    if (isProtectedPath) {
        // No hay ningún token de acceso
        if (!accessToken && !refreshToken) {
            const loginUrl = new URL('/login', request.url)
            loginUrl.searchParams.set('from', request.nextUrl.pathname)
            return NextResponse.redirect(loginUrl)
        }

        // Intenta verificar el token de acceso.
        if (accessToken) {
            const payload = await verifyToken(accessToken)
            if (payload) {
                // El token es válido, permitir el acceso.
                return NextResponse.next()
            }
        }

        // Token de acceso no válido/caducado, intente actualizar el token.
        if (refreshToken) {
            const payload = await verifyToken(refreshToken)
            if (payload) {
                // El token de actualización es válido, redirigir al punto final de actualización.
                // El punto final de actualización establecerá un nuevo token de acceso.
                const response = NextResponse.next()
                response.headers.set('x-middleware-refresh', 'true')
                return response
            }
        }

        // Ambos tokens no son válidos, redirigir al inicio de sesión
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('from', request.nextUrl.pathname)
        loginUrl.searchParams.set('reason', 'session_expired')
        
        const response = NextResponse.redirect(loginUrl)
        response.cookies.delete('access_token')
        response.cookies.delete('refresh_token')
        return response
    }

    // Redirigir a los usuarios autenticados fuera de la página de inicio de sesión.
    if (request.nextUrl.pathname === '/login') {
        if (accessToken) {
            const payload = await verifyToken(accessToken)
            if (payload) {
                return NextResponse.redirect(new URL('/dashboard', request.url))
            }
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Coincide con todas las rutas de solicitud excepto aquellas que comienzan con:
         * - api (rutas API)
         * - _next/static (archivos estáticos)
         * - _next/image (archivos de optimización de imágenes)
         * - favicon.ico (archivo favicon)
         * - archivos públicos (imágenes, etc.)
         * - citas, resultados (páginas públicas)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|citas|resultados|.*\\..*).*)',
    ],
}
