import { useCart } from '../../hooks/useCart'
import { useLocale } from '../../i18n/LocaleContext'
import {
  getDefaultVariant,
  getLocalizedProductValue,
  getProductTitle,
  getStockLabel,
  getStockStatus,
  getUnitLabel,
  isPurchasable,
  isRedundantProductText,
} from '../../services/productService'
import { buildProductInquiryText, getWhatsAppUrl } from '../../services/whatsappService'
import { formatPrice } from '../../utils/formatPrice'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { ProductVariants } from './ProductVariants'

export function ProductInfo({ product, selectedVariant, onVariantChange, summarySpecs = [] }) {
  const { addToCart } = useCart()
  const { locale, t } = useLocale()
  const activeVariant = selectedVariant || getDefaultVariant(product)
  const stockStatus = activeVariant ? getStockStatus(activeVariant) : getStockStatus(product)
  const canBuy = isPurchasable(product, activeVariant)
  const activePrice = activeVariant?.price ?? product.price
  const hasActivePrice = Number(activePrice) > 0
  const activeUnit = getUnitLabel(activeVariant?.unit || product.unit, locale)
  const activeSku = activeVariant?.sku || product.sku
  const productName = getProductTitle(product, locale)
  const quickText = buildProductInquiryText({ product: { ...product, name: productName }, variant: activeVariant, locale })
  const facts = [
    { label: t('product.sku'), value: activeSku || product.article },
    { label: t('product.brand'), value: product.brand },
    { label: t('product.productType'), value: getLocalizedProductValue(product, 'productType', locale) },
  ].filter((item) => item.value)
  const visibleSummarySpecs = summarySpecs.filter((item) =>
    !isRedundantProductText(
      item.value,
      productName,
      ...facts.map((fact) => fact.value),
    ),
  )

  return (
    <section className="product-info">
      <div className="product-card__meta">
        {product.brand && <span>{product.brand}</span>}
        <span className={`stock-pill stock-pill--${stockStatus}`}>{getStockLabel(stockStatus, locale)}</span>
      </div>
      <h1>{productName}</h1>
      <ProductVariants
        product={product}
        selectedVariant={activeVariant}
        onVariantChange={onVariantChange}
      />
      <div className="product-price">
        <strong>{hasActivePrice ? formatPrice(activePrice) : t('product.priceNotSet')}</strong>
        {hasActivePrice && product.oldPrice && <del>{formatPrice(product.oldPrice)}</del>}
        {hasActivePrice && <span>/ {activeUnit}</span>}
        {product.isSale && <Badge tone="sale">{t('product.sale')}</Badge>}
      </div>
      <p className="price-disclaimer">{t('product.priceDisclaimer')}</p>
      <div className={`product-info__actions${hasActivePrice ? '' : ' product-info__actions--inquiry'}`}>
        {hasActivePrice && (
          <Button disabled={!canBuy} onClick={() => addToCart(product, 1, activeVariant)}>
            {t('product.addToCart')}
          </Button>
        )}
        <Button href={getWhatsAppUrl(quickText)} target="_blank" rel="noreferrer" variant="whatsapp">
          {hasActivePrice ? t('product.askWhatsApp') : t('product.askPriceWhatsApp')}
        </Button>
      </div>
      {hasActivePrice && !canBuy && <p className="form-error">{t('product.unavailable')}</p>}
      <ul className="product-assurance-list" aria-label={t('product.assurancesLabel')}>
        <li>{t('product.assurances.price')}</li>
        <li>{t('product.assurances.calculation')}</li>
        <li>{t('product.assurances.delivery')}</li>
      </ul>
      <dl className="product-facts">
        {facts.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
      {visibleSummarySpecs.length > 0 && (
        <div className="product-key-specs" aria-label={t('product.specifications')}>
          {visibleSummarySpecs.map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      )}
      <p className="microcopy">{t('product.volumeHelp')}</p>
    </section>
  )
}
