import { useCart } from '../../hooks/useCart'
import { isPurchasable } from '../../services/productService'
import { getWhatsAppUrl } from '../../services/whatsappService'
import { formatPrice } from '../../utils/formatPrice'
import { Button } from '../ui/Button'

export function ProductStickyCta({ product }) {
  const { addToCart } = useCart()
  const canBuy = isPurchasable(product)
  const askText = `Салам! Мен StroyRayon сайтынан ${product.name} боюнча маалымат алгым келет.`

  return (
    <aside className="product-sticky-cta" aria-label="Товар боюнча тез аракеттер">
      <div>
        <strong>{formatPrice(product.price)}</strong>
        <span>{product.name}</span>
      </div>
      <Button disabled={!canBuy} onClick={() => addToCart(product)}>
        Корзинага
      </Button>
      <Button href={getWhatsAppUrl(askText)} target="_blank" rel="noreferrer" variant="whatsapp">
        Суроо
      </Button>
    </aside>
  )
}
