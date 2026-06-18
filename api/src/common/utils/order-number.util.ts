export function formatOrderNumber(year: number, sequence: number) {
  return `SR-${year}-${String(sequence).padStart(6, '0')}`
}
