import { useCart } from '../../hooks/useCart'
import { isPurchasable } from '../../services/productService'
import { getWhatsAppUrl } from '../../services/whatsappService'
import { formatPrice } from '../../utils/formatPrice'
import { Button } from '../ui/Button'

export function ProductStickyCta({ product, selectedVariant }) {
  const { addToCart } = useCart()
  const canBuy = isPurchasable(product, selectedVariant)
  const activePrice = selectedVariant?.price ?? product.price
  const activeUnit = selectedVariant?.unit || product.unit
  const activeName = selectedVariant ? `${product.name} (${selectedVariant.size})` : product.name
  const askText = `Салам! Мен StroyRayon сайтынан ${activeName} боюнча маалымат алгым келет.`

  return (
    <aside className="product-sticky-cta" aria-label="Товар боюнча тез аракеттер">
      <div className="product-sticky-cta__info">
        <strong>
          {formatPrice(activePrice)} / {activeUnit}
        </strong>
        <span>{activeName}</span>
      </div>
      <div className="product-sticky-cta__actions">
        <Button disabled={!canBuy} onClick={() => addToCart(product, 1, selectedVariant)}>
          Корзинага
        </Button>
        <Button href={getWhatsAppUrl(askText)} target="_blank" rel="noreferrer" variant="whatsapp">
          Суроо
        </Button>
      </div>
    </aside>
  )
}
