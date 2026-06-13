import { useEffect, useState } from 'react'
import { useCart } from '../../hooks/useCart'
import { isPurchasable } from '../../services/productService'
import { buildProductInquiryText, getWhatsAppUrl } from '../../services/whatsappService'
import { formatPrice } from '../../utils/formatPrice'
import { Button } from '../ui/Button'

export function ProductStickyCta({ product, selectedVariant }) {
  const { addToCart } = useCart()
  const [isVisible, setIsVisible] = useState(false)
  const canBuy = isPurchasable(product, selectedVariant)
  const activePrice = selectedVariant?.price ?? product.price
  const activeUnit = selectedVariant?.unit || product.unit
  const activeName = selectedVariant ? `${product.name} (${selectedVariant.size})` : product.name
  const askText = buildProductInquiryText({ product, variant: selectedVariant })

  useEffect(() => {
    function handleScroll() {
      setIsVisible(window.scrollY > 260)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <aside className={`product-sticky-cta${isVisible ? ' is-visible' : ''}`} aria-label="Товар боюнча тез аракеттер">
      <div className="product-sticky-cta__info">
        <strong>
          {formatPrice(activePrice)} / {activeUnit}
        </strong>
        <span>{activeName}</span>
        <small>Акыркы баа WhatsAppта такталат</small>
      </div>
      <div className="product-sticky-cta__actions">
        <Button disabled={!canBuy} onClick={() => addToCart(product, 1, selectedVariant)}>
          Себетке
        </Button>
        <Button href={getWhatsAppUrl(askText)} target="_blank" rel="noreferrer" variant="whatsapp">
          WhatsApp
        </Button>
      </div>
    </aside>
  )
}
