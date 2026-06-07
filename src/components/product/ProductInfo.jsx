import { useCart } from '../../hooks/useCart'
import {
  getDefaultVariant,
  getProductVariants,
  getStockLabel,
  getStockStatus,
  isPurchasable,
} from '../../services/productService'
import { getWhatsAppUrl } from '../../services/whatsappService'
import { formatPrice } from '../../utils/formatPrice'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

export function ProductInfo({ product, selectedVariant, onVariantChange }) {
  const { addToCart } = useCart()
  const variants = getProductVariants(product)
  const activeVariant = selectedVariant || getDefaultVariant(product)
  const stockStatus = activeVariant ? getStockStatus(activeVariant) : getStockStatus(product)
  const canBuy = isPurchasable(product, activeVariant)
  const activePrice = activeVariant?.price ?? product.price
  const activeUnit = activeVariant?.unit || product.unit
  const activeSku = activeVariant?.sku || product.sku
  const activeMinOrder = activeVariant?.packageInfo || product.minOrder || `1 ${activeUnit}`
  const quickName = activeVariant ? `${product.name} (${activeVariant.size})` : product.name
  const quickText = `Салам! Мен StroyRayon сайтынан ${quickName} боюнча маалымат алгым келет.`

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
          <dd>{activeSku || 'Такталат'}</dd>
        </div>
        <div>
          <dt>Бренд</dt>
          <dd>{product.brand || 'Такталат'}</dd>
        </div>
        <div>
          <dt>Минималдуу заказ</dt>
          <dd>{activeMinOrder}</dd>
        </div>
      </dl>
      <div className="rating">
        Рейтинг {product.rating} / 5, {product.reviewsCount} пикир
      </div>
      <div className="product-price">
        <strong>{formatPrice(activePrice)}</strong>
        {product.oldPrice && <del>{formatPrice(product.oldPrice)}</del>}
        <span>/ {activeUnit}</span>
        {product.isSale && <Badge tone="sale">Акция</Badge>}
      </div>
      {variants.length > 0 && (
        <fieldset className="variant-selector">
          <legend>Өлчөмдү тандаңыз</legend>
          <div className="variant-selector__grid">
            {variants.map((variant) => {
              const variantStock = getStockStatus(variant)
              const isActive = activeVariant?.id === variant.id

              return (
                <button
                  key={variant.id}
                  type="button"
                  className={`variant-option${isActive ? ' is-active' : ''}`}
                  disabled={variantStock === 'out_of_stock'}
                  onClick={() => onVariantChange?.(variant.id)}
                >
                  <span>{variant.size}</span>
                  <small>
                    {formatPrice(variant.price)} / {variant.unit}
                  </small>
                  <em>{getStockLabel(variantStock)}</em>
                </button>
              )
            })}
          </div>
        </fieldset>
      )}
      <p>{product.description}</p>
      <div className="product-info__actions">
        <Button disabled={!canBuy} onClick={() => addToCart(product, 1, activeVariant)}>
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
