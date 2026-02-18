import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

export async function GET() {
    try {
        const cookieStore = await cookies()
        const accessToken = cookieStore.get('access_token')?.value

        if (!accessToken) {
            return NextResponse.json({ authenticated: false }, { status: 401 })
        }

        const payload = await verifyToken(accessToken)

        if (!payload) {
            return NextResponse.json({ authenticated: false }, { status: 401 })
        }

        return NextResponse.json({
            authenticated: true,
            user: {
                username: payload.username,
                role: payload.role,
            }
        })
    } catch (error) {
        return NextResponse.json({ authenticated: false }, { status: 401 })
    }
}
