import { Link } from 'react-router-dom'
import { useCart } from '../../hooks/useCart'
import { useLocale } from '../../i18n/LocaleContext'
import {
  getBadgeLabel,
  getLocalizedProductValue,
  getProductShortDescription,
  getProductTitle,
  getStockLabel,
  getStockStatus,
  getUnitLabel,
  getVariantSizeSummary,
  hasProductVariants,
  isPurchasable,
  isRedundantProductText,
} from '../../services/productService'
import { getWhatsAppUrl } from '../../services/whatsappService'
import { formatPrice } from '../../utils/formatPrice'
import { applyImageFallback, getOptimizedProductImage, getProductImage } from '../../utils/imageUtils'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

export function ProductCard({ product }) {
  const { addToCart } = useCart()
  const { locale, t } = useLocale()
  const stockStatus = getStockStatus(product)
  const canBuy = isPurchasable(product)
  const hasVariants = hasProductVariants(product)
  const hasPrice = Number(product.price) > 0
  const sizeSummary = getVariantSizeSummary(product, 5)
  const image = getOptimizedProductImage(getProductImage(product), 'card')
  const productName = getProductTitle(product, locale)
  const shortDescription = getProductShortDescription(product, locale)
  const askText = t('productCard.askText', { name: productName })
  const tags = (product.tags || []).filter((tag) => ['hit', 'sale', 'quality', 'new'].includes(tag))
  const activeUnit = getUnitLabel(product.unit, locale)
  const packText = getLocalizedProductValue(product, 'pack', locale) || product.weight || product.size
  const minOrderText = getLocalizedProductValue(product, 'minOrder', locale)
  const visibleDescription = isRedundantProductText(shortDescription, productName) ? '' : shortDescription
  const visiblePackText = isRedundantProductText(packText, productName) ? '' : packText
  const visibleMinOrderText = isRedundantProductText(
    minOrderText,
    productName,
    visiblePackText,
    visibleDescription,
  ) ? '' : minOrderText
  const commercialMeta = [...new Set([visiblePackText, product.article || product.sku].filter(Boolean))].slice(0, 2)
  const hasReviews = Number(product.rating) > 0 && Number(product.reviewsCount) > 0
  const isNew = tags.includes('new')

  return (
    <article className={`product-card product-card--image-${image.type || 'fallback'}`}>
      <Link to={`/product/${product.slug}`} className="product-card__image">
        <img
          src={image.src}
          srcSet={image.srcSet || undefined}
          sizes={image.sizes || undefined}
          alt={image.alt}
          loading="lazy"
          decoding="async"
          width={image.width}
          height={image.height}
          data-fallback-src={image.fallbackSrc}
          data-placeholder-src={image.placeholderSrc}
          data-fallback-alt={image.alt || productName}
          data-image-type={image.type || 'fallback'}
          onError={(event) => applyImageFallback(event, 'product')}
        />
        <div className="product-card__badges">
          {tags.slice(0, 2).map((tag) => (
            <Badge key={tag} tone={tag === 'sale' ? 'sale' : 'neutral'}>
              {getBadgeLabel(tag, locale)}
            </Badge>
          ))}
        </div>
      </Link>
      <div className="product-card__body">
        <div className="product-card__meta">
          {product.brand && <span>{product.brand}</span>}
          <span className={`stock-pill stock-pill--${stockStatus}`}>{getStockLabel(stockStatus, locale)}</span>
        </div>
        <h3>
          <Link to={`/product/${product.slug}`}>{productName}</Link>
        </h3>
        {commercialMeta.length > 0 && (
          <div className="product-card__commercial-meta">
            {commercialMeta.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        )}
        {visibleDescription && <p>{visibleDescription}</p>}
        <div className="price-row">
          <strong>{hasPrice ? (hasVariants ? `${t('common.from')} ${formatPrice(product.price)}` : formatPrice(product.price)) : t('product.priceNotSet')}</strong>
          {hasPrice && product.oldPrice && <del>{formatPrice(product.oldPrice)}</del>}
          {hasPrice && <span>/ {activeUnit}</span>}
        </div>
        {hasVariants && sizeSummary && <p className="product-card__variants">{t('productCard.variants')}: {sizeSummary}</p>}
        {hasReviews && (
          <div className="rating">
            {t('productCard.rating')} {product.rating} / 5 ({product.reviewsCount})
          </div>
        )}
        {!hasReviews && isNew && <div className="product-card__new-note">{t('productCard.newProduct')}</div>}
        {visibleMinOrderText && (
          <p className="microcopy">
            {t('productCard.minOrder')}: {visibleMinOrderText}
          </p>
        )}
        <div className="product-card__actions">
          {!hasPrice ? (
            <Button
              className="product-card__inquiry"
              href={getWhatsAppUrl(askText)}
              target="_blank"
              rel="noreferrer"
              variant="whatsapp"
            >
              {t('productCard.askPrice')}
            </Button>
          ) : hasVariants ? (
            <Button to={`/product/${product.slug}`}>{t('productCard.chooseVariant')}</Button>
          ) : (
            <Button disabled={!canBuy} onClick={() => addToCart(product)}>
              {t('productCard.addToCart')}
            </Button>
          )}
          <Button className="product-card__details" to={`/product/${product.slug}`} variant="secondary">
            {t('productCard.details')}
          </Button>
          {hasPrice && (
            <Button className="product-card__whatsapp" href={getWhatsAppUrl(askText)} target="_blank" rel="noreferrer" variant="secondary">
              {t('productCard.checkStock')}
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}
