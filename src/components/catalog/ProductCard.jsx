import { Link } from 'react-router-dom'
import { useCart } from '../../hooks/useCart'
import { BADGE_LABELS, getStockLabel, getStockStatus, isPurchasable } from '../../services/productService'
import { getWhatsAppUrl } from '../../services/whatsappService'
import { formatPrice } from '../../utils/formatPrice'
import { applyImageFallback, getProductImage } from '../../utils/imageUtils'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

export function ProductCard({ product }) {
  const { addToCart } = useCart()
  const stockStatus = getStockStatus(product)
  const canBuy = isPurchasable(product)
  const image = getProductImage(product)
  const askText = `Салам! Мен StroyRayon сайтынан ${product.name} боюнча маалымат алгым келет.`
  const tags = product.tags || []

  return (
    <article className="product-card">
      <Link to={`/product/${product.slug}`} className="product-card__image">
        <img
          src={image.src}
          alt={image.alt}
          loading="lazy"
          width={image.width}
          height={image.height}
          onError={(event) => applyImageFallback(event, 'product')}
        />
        <div className="product-card__badges">
          {tags.slice(0, 2).map((tag) => (
            <Badge key={tag} tone={tag === 'sale' ? 'sale' : 'neutral'}>
              {BADGE_LABELS[tag] || tag}
            </Badge>
          ))}
        </div>
      </Link>
      <div className="product-card__body">
        <div className="product-card__meta">
          <span>{product.brand || 'StroyRayon'}</span>
          <span className={`stock-pill stock-pill--${stockStatus}`}>{getStockLabel(stockStatus)}</span>
        </div>
        <h3>
          <Link to={`/product/${product.slug}`}>{product.name}</Link>
        </h3>
        <p>{product.shortDescription || product.description}</p>
        <div className="price-row">
          <strong>{formatPrice(product.price)}</strong>
          {product.oldPrice && <del>{formatPrice(product.oldPrice)}</del>}
          <span>/ {product.unit}</span>
        </div>
        <div className="rating">Рейтинг {product.rating} / 5 ({product.reviewsCount})</div>
        {product.minOrder && <p className="microcopy">Минималдуу заказ: {product.minOrder}</p>}
        <div className="product-card__actions">
          <Button disabled={!canBuy} onClick={() => addToCart(product)}>
            Корзинага кошуу
          </Button>
          <Button to={`/product/${product.slug}`} variant="secondary">
            Кененирээк
          </Button>
          <Button className="product-card__whatsapp" href={getWhatsAppUrl(askText)} target="_blank" rel="noreferrer" variant="secondary">
            Наличиени тактоо
          </Button>
        </div>
      </div>
    </article>
  )
}
