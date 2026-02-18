import { SignJWT, jwtVerify } from 'jose';

const SECRET_KEY = process.env.JWT_SECRET || 'medcom-labs-super-secret-key-change-in-prod';
const REFRESH_SECRET_KEY = process.env.JWT_REFRESH_SECRET || 'medcom-labs-refresh-secret-key-change-in-prod';
const key = new TextEncoder().encode(SECRET_KEY);
const refreshKey = new TextEncoder().encode(REFRESH_SECRET_KEY);

// Token de acceso - corta duración (1 hora)
export async function signAccessToken(payload: any) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(key);
}

// Token de refresco - larga duración (7 días)
export async function signRefreshToken(payload: any) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(refreshKey);
}

// Verificar token de acceso
export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, key);
    return payload;
  } catch (error) {
    return null;
  }
}

// Verificar token de refresco
export async function verifyRefreshToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, refreshKey);
    return payload;
  } catch (error) {
    return null;
  }
}

// Tipo para el payload del token
export interface TokenPayload {
  userId: string;
  email: string;
  role: 'doctor' | 'admin' | 'patient';
  name?: string;
  specialty?: string;
  iat?: number;
  exp?: number;
}
