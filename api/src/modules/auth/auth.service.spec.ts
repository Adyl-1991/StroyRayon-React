import assert from 'node:assert/strict'
import test from 'node:test'
import { UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../prisma/prisma.service'
import { AuthService } from './auth.service'
import { hashPassword } from './password.util'

const secret = 'stage19-test-secret-with-at-least-32-characters'

function configService() {
  return {
    get: (key: string) => {
      if (key === 'ADMIN_JWT_SECRET') return secret
      if (key === 'ADMIN_JWT_EXPIRES_SECONDS') return '3600'
      return undefined
    },
  } as ConfigService
}

test('admin login succeeds with a valid hashed password', async () => {
  const passwordHash = await hashPassword('correct horse battery staple')
  const prisma = {
    adminUser: {
      findUnique: () =>
        Promise.resolve({
          id: 'admin-1',
          email: 'owner@example.com',
          passwordHash,
          name: 'Owner',
          role: 'OWNER',
          isActive: true,
        }),
    },
  } as unknown as PrismaService

  const result = await new AuthService(prisma, configService()).login({
    email: 'OWNER@example.com',
    password: 'correct horse battery staple',
  })

  assert.ok(result.accessToken)
  assert.equal(result.admin.email, 'owner@example.com')
  assert.equal(result.admin.role, 'OWNER')
})

test('admin login rejects a wrong password with a safe error', async () => {
  const passwordHash = await hashPassword('correct horse battery staple')
  const prisma = {
    adminUser: {
      findUnique: () =>
        Promise.resolve({
          id: 'admin-1',
          email: 'owner@example.com',
          passwordHash,
          name: 'Owner',
          role: 'OWNER',
          isActive: true,
        }),
    },
  } as unknown as PrismaService

  await assert.rejects(
    () =>
      new AuthService(prisma, configService()).login({
        email: 'owner@example.com',
        password: 'wrong password',
      }),
    (error: unknown) =>
      error instanceof UnauthorizedException &&
      error.message === 'Invalid email or password',
  )
})
