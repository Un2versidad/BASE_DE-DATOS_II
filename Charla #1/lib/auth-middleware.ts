import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from './auth'

export async function withAuth(
    request: NextRequest,
    handler: (request: NextRequest, user: any) => Promise<NextResponse>
) {
    try {
        const accessToken = request.cookies.get('access_token')?.value

        if (!accessToken) {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 401 }
            )
        }

        const payload = await verifyToken(accessToken)

        if (!payload) {
            return NextResponse.json(
                { error: 'Token inválido o expirado' },
                { status: 401 }
            )
        }

        return handler(request, payload)
    } catch (error) {
        return NextResponse.json(
            { error: 'Error de autenticación' },
            { status: 401 }
        )
    }
}
