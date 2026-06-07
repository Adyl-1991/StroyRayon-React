import { useEffect, useMemo, useState } from 'react'
import {
  addCartItem,
  getCartTotal,
  readCart,
  removeCartItem,
  saveCart,
  updateCartQuantity,
} from '../services/cartService'
import { CartContext } from './cartContext'

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => readCart())

  useEffect(() => {
    saveCart(items)
  }, [items])

  const value = useMemo(() => {
    const total = getCartTotal(items)
    const count = items.reduce((sum, item) => sum + item.quantity, 0)

    return {
      items,
      total,
      count,
      addToCart(product, quantity = 1, variant = null) {
        setItems((currentItems) => addCartItem(currentItems, product, quantity, variant))
      },
      setQuantity(cartItemId, quantity) {
        setItems((currentItems) => updateCartQuantity(currentItems, cartItemId, quantity))
      },
      removeFromCart(cartItemId) {
        setItems((currentItems) => removeCartItem(currentItems, cartItemId))
      },
      clearCart() {
        setItems([])
      },
    }
  }, [items])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
