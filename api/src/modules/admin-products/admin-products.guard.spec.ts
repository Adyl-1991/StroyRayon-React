import assert from 'node:assert/strict'
import test from 'node:test'
import { ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { AdminAuthGuard, AdminRequest } from '../auth/admin-auth.guard'
import { AuthService } from '../auth/auth.service'

function context() {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: {} }) as Partial<AdminRequest>,
    }),
  } as ExecutionContext
}

function guard() {
  return new AdminAuthGuard({ getJwtSecret: () => 'unused-secret' } as AuthService)
}

test('product list without auth is rejected', () => {
  assert.throws(() => guard().canActivate(context()), UnauthorizedException)
})

test('product price update without auth is rejected', () => {
  assert.throws(() => guard().canActivate(context()), UnauthorizedException)
})
