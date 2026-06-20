import { Link } from 'react-router-dom'
import { useLocale } from '../../i18n/LocaleContext'
import { getProductBySlug, getProductTitle, getUnitLabel, normalizeKgText } from '../../services/productService'
import { formatPrice } from '../../utils/formatPrice'
import { applyImageFallback, resolveImage } from '../../utils/imageUtils'

export function CartItem({ item, setQuantity, removeFromCart }) {
  const { locale, t } = useLocale()
  const cartItemId = item.cartItemId || item.productId
  const product = getProductBySlug(item.slug)
  const name = product ? getProductTitle(product, locale) : locale === 'ru' ? item.titleRu || item.name : item.titleKg || item.name
  const unit = getUnitLabel(item.unitKg || item.unit, locale)
  const packageInfo = locale === 'ru' ? item.packageInfoRu : normalizeKgText(item.packageInfo)
  const image = resolveImage(item.image, { alt: name, src: '/images/placeholders/product-placeholder.svg', width: 82, height: 82 })

  return (
    <article className="cart-item">
      <img
        src={image.src}
        alt={image.alt}
        loading="lazy"
        width="82"
        height="82"
        data-fallback-src={image.fallbackSrc}
        onError={(event) => applyImageFallback(event, 'product')}
      />
      <div className="cart-item__details">
        <h3>
          <Link to={`/product/${item.slug}`}>{name}</Link>
        </h3>
        {item.variantSize && (
          <p className="cart-item__variant">
            {t('cart.size')}: {item.variantSize}
            {item.variantSku ? ` · SKU: ${item.variantSku}` : ''}
          </p>
        )}
        {packageInfo && <p className="cart-item__variant">{t('cart.package')}: {packageInfo}</p>}
        <p>
          {formatPrice(item.price)} / {unit}
        </p>
      </div>
      <div className="quantity-control" aria-label={t('cart.quantity', { name })}>
        <button type="button" onClick={() => setQuantity(cartItemId, item.quantity - 1)}>
          -
        </button>
        <span>{item.quantity}</span>
        <button type="button" onClick={() => setQuantity(cartItemId, item.quantity + 1)}>
          +
        </button>
      </div>
      <strong className="cart-item__total">{formatPrice(item.price * item.quantity)}</strong>
      <button className="cart-item__remove" type="button" onClick={() => removeFromCart(cartItemId)}>
        {t('cart.remove')}
      </button>
    </article>
  )
}
