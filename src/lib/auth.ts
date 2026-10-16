import { cookies } from 'next/headers'
import crypto from 'crypto'

const AUTH_COOKIE = 'pili_auth_session'
const AUTH_SECRET = process.env.AUTH_SECRET || 'pili_gobernacion_secret_key_2026_nds'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: string
}

function sign(payload: string): string {
  const hmac = crypto.createHmac('sha256', AUTH_SECRET)
  hmac.update(payload)
  return `${payload}.${hmac.digest('hex')}`
}

function verify(token: string): string | null {
  try {
    const lastDot = token.lastIndexOf('.')
    if (lastDot === -1) return null
    const payload = token.substring(0, lastDot)
    const signature = token.substring(lastDot + 1)
    const hmac = crypto.createHmac('sha256', AUTH_SECRET)
    hmac.update(payload)
    const expectedSignature = hmac.digest('hex')

    const sigBuf = Buffer.from(signature)
    const expBuf = Buffer.from(expectedSignature)
    if (sigBuf.length !== expBuf.length) return null

    if (crypto.timingSafeEqual(sigBuf, expBuf)) {
      return payload
    }
    return null
  } catch {
    return null
  }
}

export async function createSession(user: SessionUser) {
  const cookieStore = await cookies()
  const payload = JSON.stringify({
    ...user,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
  })
  const token = sign(payload)

  cookieStore.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60 // 30 days
  })
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(AUTH_COOKIE)?.value
    if (!token) return null

    const payloadStr = verify(token)
    if (!payloadStr) return null

    const payload = JSON.parse(payloadStr)
    if (payload.exp && Date.now() > payload.exp) {
      return null
    }

    return {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role
    }
  } catch {
    return null
  }
}

export async function destroySession() {
  const cookieStore = await cookies()
  cookieStore.delete(AUTH_COOKIE)
}
