import { createHmac, timingSafeEqual } from 'node:crypto'

export type AdminTokenPayload = {
  sub: string
  email: string
  role: string
  iat: number
  exp: number
}

function encode(value: string) {
  return Buffer.from(value).toString('base64url')
}

function signContent(content: string, secret: string) {
  return createHmac('sha256', secret).update(content).digest('base64url')
}

export function signAdminToken(
  payload: Omit<AdminTokenPayload, 'iat' | 'exp'>,
  secret: string,
  expiresInSeconds: number,
) {
  const now = Math.floor(Date.now() / 1000)
  const header = encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = encode(JSON.stringify({ ...payload, iat: now, exp: now + expiresInSeconds }))
  const content = `${header}.${body}`
  return `${content}.${signContent(content, secret)}`
}

export function verifyAdminToken(token: string, secret: string): AdminTokenPayload | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const content = `${parts[0]}.${parts[1]}`
  const expected = Buffer.from(signContent(content, secret))
  const received = Buffer.from(parts[2])
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null

  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString()) as AdminTokenPayload
    if (!payload.sub || !payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}
