import { createHmac, timingSafeEqual } from 'node:crypto'

type ResetPayload = { sub: string; email: string; exp: number }

function signature(value: string, secret: string) {
  return createHmac('sha256', secret).update(value).digest('base64url')
}

export function createPasswordResetToken(payload: Omit<ResetPayload, 'exp'>, secret: string, passwordHash: string) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 900 })).toString('base64url')
  return `${body}.${signature(body, `${secret}:${passwordHash}`)}`
}

export function verifyPasswordResetToken(token: string, secret: string, passwordHash: string): ResetPayload | null {
  const [body, receivedSignature, ...extra] = token.split('.')
  if (!body || !receivedSignature || extra.length) return null
  const expected = Buffer.from(signature(body, `${secret}:${passwordHash}`))
  const received = Buffer.from(receivedSignature)
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as ResetPayload
    return payload.sub && payload.email && payload.exp > Math.floor(Date.now() / 1000) ? payload : null
  } catch {
    return null
  }
}
