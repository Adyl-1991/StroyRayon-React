import { OrderItemStockCheckStatus, ProductStockStatus } from '@prisma/client'

type StockInput = {
  quantity: number
  reservedQuantity: number
} | null

export function getStockCheckStatus(
  stockStatus: ProductStockStatus,
  stock: StockInput,
  requestedQuantity: number,
) {
  if (stockStatus === ProductStockStatus.OUT_OF_STOCK) {
    return OrderItemStockCheckStatus.UNAVAILABLE
  }

  if (!stock || stockStatus === ProductStockStatus.PRE_ORDER) {
    return OrderItemStockCheckStatus.NEEDS_CONFIRMATION
  }

  const availableQuantity = Math.max(stock.quantity - stock.reservedQuantity, 0)
  return requestedQuantity <= availableQuantity
    ? OrderItemStockCheckStatus.OK
    : OrderItemStockCheckStatus.NEEDS_CONFIRMATION
}

export function calculateLineTotal(unitPrice: number, quantity: number) {
  return Math.round((unitPrice * quantity + Number.EPSILON) * 100) / 100
}
