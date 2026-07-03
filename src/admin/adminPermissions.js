export function hasAdminPermission(admin, permission) {
  return Boolean(admin?.permissions?.includes(permission))
}

export function roleLabel(role) {
  const labels = {
    OWNER: 'Владелец',
    MANAGER: 'Менеджер',
    CONTENT: 'Контент',
    VIEWER: 'Просмотр',
  }
  return labels[role] || role || 'Админ'
}
