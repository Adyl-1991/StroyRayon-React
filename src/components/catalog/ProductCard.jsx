import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../../hooks/useCart'
import { useLocale } from '../../i18n/LocaleContext'
import {
  getDefaultVariant,
  getProductTitle,
  getUnitLabel,
  normalizeKgText,
} from '../../services/productService'
import { formatPrice } from '../../utils/formatPrice'
import { applyImageFallback, getOptimizedProductImage, getProductImage } from '../../utils/imageUtils'
import { Button } from '../ui/Button'

export function ProductCard({ product }) {
  const { addToCart } = useCart()
  const { locale, t } = useLocale()
  const [quantity, setQuantity] = useState(1)
  const activeVariant = getDefaultVariant(product)
  const activePrice = Number(activeVariant?.price ?? product.price ?? 0)
  const activeUnit = getUnitLabel(activeVariant?.unit || product.unit, locale)
  const activeSku = activeVariant?.sku || product.sku || product.article
  const hasPrice = activePrice > 0
  const image = getOptimizedProductImage(getProductImage(product), 'card')
  const productName = getProductTitle(product, locale)
  const imageAlt = locale === 'ru' ? productName : normalizeKgText(image.alt || productName)
  const clampQuantity = (value) => Math.min(999, Math.max(1, Math.floor(Number(value) || 1)))
  const changeQuantity = (value) => setQuantity(clampQuantity(value))
  const handleAddToCart = () => addToCart(product, quantity, activeVariant)

  return (
    <article className={`product-card product-card--image-${image.type || 'fallback'}`}>
      <Link to={`/product/${product.slug}`} className="product-card__image">
        <img
          src={image.src}
          srcSet={image.srcSet || undefined}
          sizes={image.sizes || undefined}
          alt={imageAlt}
          loading="lazy"
          decoding="async"
          width={image.width}
          height={image.height}
          data-fallback-src={image.fallbackSrc}
          data-placeholder-src={image.placeholderSrc}
          data-fallback-alt={imageAlt}
          data-image-type={image.type || 'fallback'}
          onError={(event) => applyImageFallback(event, 'product')}
        />
      </Link>
      <div className="product-card__body">
        <h3>
          <Link to={`/product/${product.slug}`}>{productName}</Link>
        </h3>
        <p className="product-card__article">
          {t('product.sku')}: {activeSku}
        </p>
        <div className="price-row product-card__price">
          <strong>{hasPrice ? formatPrice(activePrice) : t('product.priceNotSet')}</strong>
          {hasPrice && <span>/ {activeUnit}</span>}
        </div>
        <p className="product-card__availability">{t('productCard.availabilityCheck')}</p>
        <div className="product-card__purchase">
          <div className="product-card__quantity" aria-label={t('productCard.quantity')}>
            <button type="button" onClick={() => changeQuantity(quantity - 1)} aria-label={t('productCard.decreaseQuantity')}>
              −
            </button>
            <input
              type="number"
              min="1"
              max="999"
              step="1"
              value={quantity}
              onChange={(event) => changeQuantity(event.target.value)}
              aria-label={t('productCard.quantity')}
            />
            <button type="button" onClick={() => changeQuantity(quantity + 1)} aria-label={t('productCard.increaseQuantity')}>
              +
            </button>
          </div>
          <Button onClick={handleAddToCart}>{t('productCard.addToCart')}</Button>
        </div>
      </div>
    </article>
  )
}
