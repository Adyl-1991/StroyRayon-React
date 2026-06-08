import { getProductImage } from '../utils/imageUtils'

const CART_KEY = 'stroyrayon_cart'
const MIN_QUANTITY = 1
const MAX_QUANTITY = 999

function canUseStorage() {
  return typeof window !== 'undefined' && window.localStorage
}

export function readCart() {
  if (!canUseStorage()) return []

  try {
    const parsedCart = JSON.parse(window.localStorage.getItem(CART_KEY)) || []
    if (!Array.isArray(parsedCart)) return []

    return parsedCart.filter(isValidCartItem).map((item) => ({
      ...item,
      cartItemId: item.cartItemId || item.productId,
      quantity: clampQuantity(item.quantity),
      price: Number(item.price || 0),
    }))
  } catch {
    return []
  }
}

function clampQuantity(quantity) {
  const numericQuantity = Number(quantity)
  if (!Number.isFinite(numericQuantity)) return MIN_QUANTITY

  return Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, Math.floor(numericQuantity)))
}

function isValidCartItem(item) {
  return (
    item &&
    typeof item === 'object' &&
    typeof item.productId === 'string' &&
    item.productId.length > 0 &&
    typeof item.slug === 'string' &&
    item.slug.length > 0 &&
    typeof item.name === 'string' &&
    item.name.length > 0 &&
    Number.isFinite(Number(item.price)) &&
    Number(item.price) >= 0 &&
    typeof item.unit === 'string' &&
    item.unit.length > 0 &&
    Number.isFinite(Number(item.quantity)) &&
    Number(item.quantity) >= MIN_QUANTITY
  )
}

export function saveCart(items) {
  if (!canUseStorage()) return
  window.localStorage.setItem(CART_KEY, JSON.stringify(items))
}

function getVariantKey(variant) {
  return variant?.sku || variant?.id || variant?.size || ''
}

function getCartItemId(product, variant) {
  const variantKey = getVariantKey(variant)
  return variantKey ? `${product.id}:${variantKey}` : product.id
}

export function addCartItem(items, product, quantity = 1, variant = null) {
  const safeQuantity = clampQuantity(quantity)
  const cartItemId = getCartItemId(product, variant)
  const existingItem = items.find((item) => (item.cartItemId || item.productId) === cartItemId)

  if (existingItem) {
    return items.map((item) =>
      (item.cartItemId || item.productId) === cartItemId
        ? { ...item, cartItemId, quantity: clampQuantity(item.quantity + safeQuantity) }
        : item,
    )
  }

  return [
    ...items,
    {
      cartItemId,
      productId: product.id,
      slug: product.slug,
      name: product.titleKg || product.name,
      price: Number(variant?.price ?? product.price ?? 0),
      image: getProductImage(product, variant || 'main'),
      unit: variant?.unit || product.unit,
      quantity: safeQuantity,
      sku: variant?.sku || product.sku,
      variantId: variant?.id,
      variantSize: variant?.size,
      variantSku: variant?.sku,
      packageInfo: variant?.packageInfo || product.packageInfoKg || product.minOrder,
    },
  ]
}

export function updateCartQuantity(items, cartItemId, quantity) {
  const numericQuantity = Number(quantity)
  if (!Number.isFinite(numericQuantity) || numericQuantity < MIN_QUANTITY) {
    return items.filter((item) => (item.cartItemId || item.productId) !== cartItemId)
  }

  return items.map((item) =>
    (item.cartItemId || item.productId) === cartItemId
      ? { ...item, cartItemId, quantity: clampQuantity(numericQuantity) }
      : item,
  )
}

export function removeCartItem(items, cartItemId) {
  return items.filter((item) => (item.cartItemId || item.productId) !== cartItemId)
}

export function getCartTotal(items) {
  return items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0)
}
