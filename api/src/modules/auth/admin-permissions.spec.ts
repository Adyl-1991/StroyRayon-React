import assert from 'node:assert/strict'
import test from 'node:test'
import { ForbiddenException } from '@nestjs/common'
import { assertAdminPermission, hasAdminPermission, permissionsForRole } from './admin-permissions'

test('admin permissions expose role-based capabilities', () => {
  assert.equal(hasAdminPermission({ id: '1', email: 'owner@test', role: 'OWNER' }, 'products:active'), true)
  assert.equal(hasAdminPermission({ id: '2', email: 'manager@test', role: 'MANAGER' }, 'orders:update'), true)
  assert.equal(hasAdminPermission({ id: '2', email: 'manager@test', role: 'MANAGER' }, 'products:content'), false)
  assert.equal(hasAdminPermission({ id: '3', email: 'content@test', role: 'CONTENT' }, 'products:content'), true)
  assert.equal(hasAdminPermission({ id: '3', email: 'content@test', role: 'CONTENT' }, 'products:commercial'), false)
  assert.equal(hasAdminPermission({ id: '4', email: 'viewer@test', role: 'VIEWER' }, 'products:view'), true)
  assert.equal(hasAdminPermission({ id: '4', email: 'viewer@test', role: 'VIEWER' }, 'orders:update'), false)
})

test('admin permissions reject missing or insufficient admin identity', () => {
  assert.throws(() => assertAdminPermission(undefined, 'products:view'), ForbiddenException)
  assert.throws(
    () => assertAdminPermission({ id: '4', email: 'viewer@test', role: 'VIEWER' }, 'products:create'),
    ForbiddenException,
  )
  assert.doesNotThrow(() =>
    assertAdminPermission({ id: '1', email: 'owner@test', role: 'OWNER' }, 'products:create'),
  )
})

test('permissionsForRole returns a stable serializable permissions list', () => {
  const permissions = permissionsForRole('CONTENT')

  assert.equal(permissions.includes('products:view'), true)
  assert.equal(permissions.includes('products:create'), true)
  assert.equal(permissions.includes('products:upload'), true)
  assert.equal(permissions.includes('orders:update'), false)
})
