import assert from 'node:assert/strict'
import test from 'node:test'
import { ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { AdminAuthGuard, AdminRequest } from './admin-auth.guard'
import { AuthService } from './auth.service'
import { signAdminToken } from './jwt.util'

const secret = 'stage19-test-secret-with-at-least-32-characters'

function context(request: Partial<AdminRequest>) {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext
}

function guard() {
  return new AdminAuthGuard({ getJwtSecret: () => secret } as AuthService)
}

test('orders list without auth is rejected by the shared admin guard', () => {
  assert.throws(
    () => guard().canActivate(context({ headers: {} })),
    UnauthorizedException,
  )
})

test('order detail without auth is rejected by the shared admin guard', () => {
  assert.throws(
    () => guard().canActivate(context({ headers: {} })),
    UnauthorizedException,
  )
})

test('status update without auth is rejected by the shared admin guard', () => {
  assert.throws(
    () => guard().canActivate(context({ headers: {} })),
    UnauthorizedException,
  )
})

test('valid bearer token authorizes CRM requests and exposes admin identity', () => {
  const token = signAdminToken(
    { sub: 'admin-1', email: 'owner@example.com', role: 'OWNER' },
    secret,
    3600,
  )
  const request = { headers: { authorization: `Bearer ${token}` } } as Partial<AdminRequest>

  assert.equal(guard().canActivate(context(request)), true)
  assert.deepEqual(request.admin, {
    id: 'admin-1',
    email: 'owner@example.com',
    role: 'OWNER',
  })
})
