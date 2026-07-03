import { ForbiddenException } from '@nestjs/common'
import { AdminRole } from '@prisma/client'

export type AdminIdentity = {
  id: string
  email: string
  role: string
}

export type AdminPermission =
  | 'orders:view'
  | 'orders:update'
  | 'products:view'
  | 'products:create'
  | 'products:content'
  | 'products:commercial'
  | 'products:active'
  | 'products:upload'
  | 'products:audit:view'

const permissionsByRole: Record<AdminRole, AdminPermission[]> = {
  [AdminRole.OWNER]: [
    'orders:view',
    'orders:update',
    'products:view',
    'products:create',
    'products:content',
    'products:commercial',
    'products:active',
    'products:upload',
    'products:audit:view',
  ],
  [AdminRole.MANAGER]: [
    'orders:view',
    'orders:update',
    'products:view',
    'products:commercial',
    'products:audit:view',
  ],
  [AdminRole.CONTENT]: [
    'products:view',
    'products:create',
    'products:content',
    'products:upload',
    'products:audit:view',
  ],
  [AdminRole.VIEWER]: [
    'orders:view',
    'products:view',
    'products:audit:view',
  ],
}

export function hasAdminPermission(admin: AdminIdentity | undefined, permission: AdminPermission) {
  const role = normalizeAdminRole(admin?.role)
  return role ? permissionsByRole[role].includes(permission) : false
}

export function assertAdminPermission(admin: AdminIdentity | undefined, permission: AdminPermission) {
  if (!hasAdminPermission(admin, permission)) {
    throw new ForbiddenException('Insufficient permissions')
  }
}

export function normalizeAdminRole(role?: string) {
  if (!role) return null
  return Object.values(AdminRole).includes(role as AdminRole) ? (role as AdminRole) : null
}

export function permissionsForRole(role?: string) {
  const normalized = normalizeAdminRole(role)
  return normalized ? permissionsByRole[normalized] : []
}
