import { apiPost } from './client'

export function createOrder(payload) {
  return apiPost('/orders', payload)
}
