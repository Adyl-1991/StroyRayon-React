export function formatPrice(value) {
  return new Intl.NumberFormat('ky-KG', {
    style: 'currency',
    currency: 'KGS',
    maximumFractionDigits: 2,
  })
    .format(value)
    .replace('KGS', 'сом')
}
