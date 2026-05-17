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
      quantity: clampQuantity(item.quantity),
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

export function addCartItem(items, product, quantity = 1) {
  const safeQuantity = clampQuantity(quantity)
  const existingItem = items.find((item) => item.productId === product.id)

  if (existingItem) {
    return items.map((item) =>
      item.productId === product.id ? { ...item, quantity: clampQuantity(item.quantity + safeQuantity) } : item,
    )
  }

  return [
    ...items,
    {
      productId: product.id,
      slug: product.slug,
      name: product.titleKg || product.name,
      price: product.price,
      image: product.images?.[0],
      unit: product.unit,
      quantity: safeQuantity,
    },
  ]
}

export function updateCartQuantity(items, productId, quantity) {
  const numericQuantity = Number(quantity)
  if (!Number.isFinite(numericQuantity) || numericQuantity < MIN_QUANTITY) {
    return items.filter((item) => item.productId !== productId)
  }

  return items.map((item) => (item.productId === productId ? { ...item, quantity: clampQuantity(numericQuantity) } : item))
}

export function removeCartItem(items, productId) {
  return items.filter((item) => item.productId !== productId)
}

export function getCartTotal(items) {
  return items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0)
}
