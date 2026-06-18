import assert from 'node:assert/strict'
import test from 'node:test'
import { OrderItemStockCheckStatus, ProductStockStatus } from '@prisma/client'
import { calculateLineTotal, getStockCheckStatus } from './order-pricing.util'
import { formatOrderNumber } from '../../common/utils/order-number.util'

test('line total uses the server price supplied by the product lookup', () => {
  const clientHintPrice = 1
  const serverPrice = 275
  const quantity = 3

  assert.notEqual(calculateLineTotal(clientHintPrice, quantity), calculateLineTotal(serverPrice, quantity))
  assert.equal(calculateLineTotal(serverPrice, quantity), 825)
})

test('line totals are rounded to currency precision', () => {
  assert.equal(calculateLineTotal(10.01, 3), 30.03)
})

test('order number formatting uses a fixed-width sequence', () => {
  assert.equal(formatOrderNumber(2026, 42), 'SR-2026-000042')
})

test('stock check is ok only when the available DB quantity covers the order', () => {
  assert.equal(
    getStockCheckStatus(ProductStockStatus.IN_STOCK, { quantity: 10, reservedQuantity: 2 }, 8),
    OrderItemStockCheckStatus.OK,
  )
  assert.equal(
    getStockCheckStatus(ProductStockStatus.IN_STOCK, { quantity: 10, reservedQuantity: 2 }, 9),
    OrderItemStockCheckStatus.NEEDS_CONFIRMATION,
  )
})

test('pre-order and out-of-stock products are not treated as confirmed availability', () => {
  assert.equal(
    getStockCheckStatus(ProductStockStatus.PRE_ORDER, { quantity: 0, reservedQuantity: 0 }, 1),
    OrderItemStockCheckStatus.NEEDS_CONFIRMATION,
  )
  assert.equal(
    getStockCheckStatus(ProductStockStatus.OUT_OF_STOCK, { quantity: 0, reservedQuantity: 0 }, 1),
    OrderItemStockCheckStatus.UNAVAILABLE,
  )
})
