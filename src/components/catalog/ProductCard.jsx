import { Link } from 'react-router-dom'
import { useCart } from '../../hooks/useCart'
import { useLocale } from '../../i18n/LocaleContext'
import { getStockStatus, getVariantSizeSummary, hasProductVariants, isPurchasable } from '../../services/productService'
import { getWhatsAppUrl } from '../../services/whatsappService'
import { formatPrice } from '../../utils/formatPrice'
import { applyImageFallback, getProductImage } from '../../utils/imageUtils'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

const stockLabels = {
  kg: { in_stock: 'Бар', low_stock: 'Аз калды', pre_order: 'Заказ менен', out_of_stock: 'Жок' },
  ru: { in_stock: 'В наличии', low_stock: 'Мало', pre_order: 'Под заказ', out_of_stock: 'Нет в наличии' },
}

const badgeLabels = {
  kg: { hit: 'Хит', sale: 'Акция', quality: 'Сапаттуу', new: 'Жаңы' },
  ru: { hit: 'Хит', sale: 'Акция', quality: 'Качество', new: 'Новинка' },
}

export function ProductCard({ product }) {
  const { addToCart } = useCart()
  const { locale, t } = useLocale()
  const stockStatus = getStockStatus(product)
  const canBuy = isPurchasable(product)
  const hasVariants = hasProductVariants(product)
  const sizeSummary = getVariantSizeSummary(product, 5)
  const image = getProductImage(product)
  const productName = product.name || product.titleKg || product.title
  const askText = t('productCard.askText', { name: productName })
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
          data-fallback-src={image.fallbackSrc}
          onError={(event) => applyImageFallback(event, 'product')}
        />
        <div className="product-card__badges">
          {tags.slice(0, 2).map((tag) => (
            <Badge key={tag} tone={tag === 'sale' ? 'sale' : 'neutral'}>
              {badgeLabels[locale][tag] || tag}
            </Badge>
          ))}
        </div>
      </Link>
      <div className="product-card__body">
        <div className="product-card__meta">
          <span>{product.brand || 'StroyRayon'}</span>
        </div>
        <h3>
          <Link to={`/product/${product.slug}`}>{productName}</Link>
        </h3>
        <p>{product.shortDescription || product.description}</p>
        <div className="price-row">
          <strong>{hasVariants ? `${locale === 'kg' ? 'баштап ' : 'от '}${formatPrice(product.price)}` : formatPrice(product.price)}</strong>
          {product.oldPrice && <del>{formatPrice(product.oldPrice)}</del>}
          <span>/ {product.unit}</span>
        </div>
        {hasVariants && sizeSummary && <p className="product-card__variants">Өлчөмдөр: {sizeSummary}</p>}
        <span className={`stock-pill stock-pill--${stockStatus}`}>{stockLabels[locale][stockStatus] || stockStatus}</span>
        <div className="rating">
          {t('productCard.rating')} {product.rating} / 5 ({product.reviewsCount})
        </div>
        {product.minOrder && (
          <p className="microcopy">
            {t('productCard.minOrder')}: {product.minOrder}
          </p>
        )}
        <div className="product-card__actions">
          {hasVariants ? (
            <Button to={`/product/${product.slug}`}>Вариант тандоо</Button>
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
