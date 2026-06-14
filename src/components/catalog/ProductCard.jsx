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
} from '../../services/productService'
import { getWhatsAppUrl } from '../../services/whatsappService'
import { formatPrice } from '../../utils/formatPrice'
import { applyImageFallback, getProductImage } from '../../utils/imageUtils'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

export function ProductCard({ product }) {
  const { addToCart } = useCart()
  const { locale, t } = useLocale()
  const stockStatus = getStockStatus(product)
  const canBuy = isPurchasable(product)
  const hasVariants = hasProductVariants(product)
  const sizeSummary = getVariantSizeSummary(product, 5)
  const image = getProductImage(product)
  const productName = getProductTitle(product, locale)
  const shortDescription = getProductShortDescription(product, locale)
  const askText = t('productCard.askText', { name: productName })
  const tags = (product.tags || []).filter((tag) => ['hit', 'sale', 'quality', 'new'].includes(tag))
  const activeUnit = getUnitLabel(product.unit, locale)
  const packText = getLocalizedProductValue(product, 'pack', locale) || product.weight || product.size
  const minOrderText = getLocalizedProductValue(product, 'minOrder', locale)
  const commercialMeta = [packText, product.article || product.sku].filter(Boolean).slice(0, 2)

  return (
    <article className={`product-card product-card--image-${image.type || 'fallback'}`}>
      <Link to={`/product/${product.slug}`} className="product-card__image">
        <img
          src={image.src}
          alt={image.alt}
          loading="lazy"
          width={image.width}
          height={image.height}
          data-fallback-src={image.fallbackSrc}
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
          <span>{product.brand || 'StroyRayon'}</span>
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
        <p>{shortDescription}</p>
        <div className="price-row">
          <strong>{hasVariants ? `${t('common.from')} ${formatPrice(product.price)}` : formatPrice(product.price)}</strong>
          {product.oldPrice && <del>{formatPrice(product.oldPrice)}</del>}
          <span>/ {activeUnit}</span>
        </div>
        {hasVariants && sizeSummary && <p className="product-card__variants">{t('productCard.variants')}: {sizeSummary}</p>}
        <div className="rating">
          {t('productCard.rating')} {product.rating} / 5 ({product.reviewsCount})
        </div>
        {minOrderText && (
          <p className="microcopy">
            {t('productCard.minOrder')}: {minOrderText}
          </p>
        )}
        <div className="product-card__actions">
          {hasVariants ? (
            <Button to={`/product/${product.slug}`}>{t('productCard.chooseVariant')}</Button>
          ) : (
            <Button disabled={!canBuy} onClick={() => addToCart(product)}>
              {t('productCard.addToCart')}
            </Button>
          )}
          <Button to={`/product/${product.slug}`} variant="secondary">
            {t('productCard.details')}
          </Button>
          <Button className="product-card__whatsapp" href={getWhatsAppUrl(askText)} target="_blank" rel="noreferrer" variant="secondary">
            {t('productCard.checkStock')}
          </Button>
        </div>
      </div>
    </article>
  )
}
