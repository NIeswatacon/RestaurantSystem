import { SignJWT, jwtVerify, JWTPayload as JoseJWTPayload } from 'jose';
import { cookies } from 'next/headers';

const secretKey = process.env.SESSION_SECRET;
if (!secretKey) {
  throw new Error('SESSION_SECRET is not defined in environment variables');
}
const key = new TextEncoder().encode(secretKey);

export interface UsuarioLogado {
  id: number;
  nome: string;
  email: string;
  role: string;
}

export interface SessionPayload extends JoseJWTPayload {
  usuario: UsuarioLogado;
  expiresAt: string; // string ISO
}

export async function encrypt(payload: SessionPayload) {
  const payloadToSign = {
    ...payload,
    expiresAt: new Date(payload.expiresAt).toISOString(),
  };

  return new SignJWT(payloadToSign)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .sign(key);
}

export async function decrypt(session: string | undefined = ''): Promise<SessionPayload | null> {
  if (!session) {
    return null;
  }
  try {
    const { payload } = await jwtVerify(session, key, {
      algorithms: ['HS256'],
    });

    if (payload && typeof payload.usuario === 'object' && payload.usuario !== null && typeof payload.expiresAt === 'string') {
      return {
        ...payload,
        usuario: payload.usuario as UsuarioLogado,
        expiresAt: payload.expiresAt,
      } as SessionPayload;
    }
    return null;
  } catch (error) {
    console.error('Failed to verify session:', error);
    return null;
  }
}

export async function criarSessao(usuario: UsuarioLogado) {
  const expiresAtDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 dia

  const sessionPayload: SessionPayload = {
    usuario,
    expiresAt: expiresAtDate.toISOString(),
  };

  const session = await encrypt(sessionPayload);

  const cookieStore = await cookies(); // ✅ await aqui
  cookieStore.set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAtDate,
    sameSite: 'lax',
    path: '/',
  });
}

export async function getUsuarioLogado(): Promise<UsuarioLogado | null> {
  const cookieStore = await cookies(); // ✅ await
  const sessionCookie = cookieStore.get('session')?.value;

  if (!sessionCookie) {
    return null;
  }

  const decryptedSession = await decrypt(sessionCookie);

  if (decryptedSession && decryptedSession.usuario) {
    return decryptedSession.usuario;
  }
  return null;
}

export async function deleteSession() {
  const cookieStore = await cookies(); // ✅ await
  cookieStore.delete('session');
}
