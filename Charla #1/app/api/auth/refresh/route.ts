import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, signAccessToken } from '@/lib/auth';

export async function POST() {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refresh_token')?.value;

    if (!refreshToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(refreshToken);

    if (!payload) {
        return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });
    }

    // Emitir nuevo token de acceso
    const newAccessToken = await signAccessToken({
        username: payload.username,
        role: payload.role
    });

    cookieStore.set('access_token', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60, // 15 mins
    });

    return NextResponse.json({ success: true });
}
