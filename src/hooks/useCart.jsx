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
      addToCart(product, quantity = 1) {
        setItems((currentItems) => addCartItem(currentItems, product, quantity))
      },
      setQuantity(productId, quantity) {
        setItems((currentItems) => updateCartQuantity(currentItems, productId, quantity))
      },
      removeFromCart(productId) {
        setItems((currentItems) => removeCartItem(currentItems, productId))
      },
      clearCart() {
        setItems([])
      },
    }
  }, [items])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
