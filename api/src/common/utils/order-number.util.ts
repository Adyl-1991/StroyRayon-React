export function createOrderNumber(date = new Date()) {
  const year = date.getFullYear()
  const timestamp = date.getTime().toString().slice(-6)
  return `SR-${year}-${timestamp}`
}
