export function formatPrice(value) {
  return new Intl.NumberFormat('ky-KG', {
    style: 'currency',
    currency: 'KGS',
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace('KGS', 'сом')
}
