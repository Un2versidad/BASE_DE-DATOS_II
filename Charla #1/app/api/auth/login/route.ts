import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { signAccessToken, signRefreshToken } from '@/lib/auth';
import { DEFAULT_USER } from '@/config/default-user';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { username, password } = body;

        if (username !== DEFAULT_USER.username || password !== DEFAULT_USER.initialPassword) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Generar tokens
        const accessToken = await signAccessToken({ username, role: DEFAULT_USER.role });
        const refreshToken = await signRefreshToken({ username, role: DEFAULT_USER.role });

        // Configurar cookies
        const cookieStore = await cookies();

        cookieStore.set('access_token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60, // 15 mins
        });

        cookieStore.set('refresh_token', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60, // 7 dias
        });

        return NextResponse.json({ success: true, mustChangePassword: DEFAULT_USER.mustChangePassword });

    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
