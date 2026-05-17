import { useCart } from '../../hooks/useCart'
import { getStockLabel, getStockStatus, isPurchasable } from '../../services/productService'
import { getWhatsAppUrl } from '../../services/whatsappService'
import { formatPrice } from '../../utils/formatPrice'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

export function ProductInfo({ product }) {
  const { addToCart } = useCart()
  const stockStatus = getStockStatus(product)
  const canBuy = isPurchasable(product)
  const quickText = `Салам! Мен StroyRayon сайтынан ${product.name} боюнча маалымат алгым келет.`

  return (
    <section className="product-info">
      <div className="product-card__meta">
        <span>{product.brand || 'StroyRayon'}</span>
        <span className={`stock-pill stock-pill--${stockStatus}`}>{getStockLabel(stockStatus)}</span>
      </div>
      <h1>{product.name}</h1>
      <dl className="product-facts">
        <div>
          <dt>SKU</dt>
          <dd>{product.sku || 'Такталат'}</dd>
        </div>
        <div>
          <dt>Бренд</dt>
          <dd>{product.brand || 'Такталат'}</dd>
        </div>
        <div>
          <dt>Минималдуу заказ</dt>
          <dd>{product.minOrder || `1 ${product.unit}`}</dd>
        </div>
      </dl>
      <div className="rating">Рейтинг {product.rating} / 5, {product.reviewsCount} пикир</div>
      <div className="product-price">
        <strong>{formatPrice(product.price)}</strong>
        {product.oldPrice && <del>{formatPrice(product.oldPrice)}</del>}
        {product.isSale && <Badge tone="sale">Акция</Badge>}
      </div>
      <p>{product.description}</p>
      <div className="product-info__actions">
        <Button disabled={!canBuy} onClick={() => addToCart(product)}>
          Корзинага кошуу
        </Button>
        <Button href={getWhatsAppUrl(quickText)} target="_blank" rel="noreferrer" variant="whatsapp">
          WhatsApp аркылуу суроо берүү
        </Button>
      </div>
      {!canBuy && <p className="form-error">Бул товар азыр жок. Менеджерден аналог же келүү убактысын тактаңыз.</p>}
      <p className="microcopy">Так көлөмдү билбей жатсаңыз, менеджерге өлчөмдөрдү жибериңиз. Биз эсептеп беребиз.</p>
    </section>
  )
}
