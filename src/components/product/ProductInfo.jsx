import { useCart } from '../../hooks/useCart'
import { useLocale } from '../../i18n/LocaleContext'
import {
  getDefaultVariant,
  getLocalizedProductValue,
  getProductShortDescription,
  getProductTitle,
  getProductVariants,
  getStockLabel,
  getStockStatus,
  getUnitLabel,
  isPurchasable,
  normalizeKgText,
} from '../../services/productService'
import { buildProductInquiryText, getWhatsAppUrl } from '../../services/whatsappService'
import { formatPrice } from '../../utils/formatPrice'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

export function ProductInfo({ product, selectedVariant, onVariantChange, summarySpecs = [] }) {
  const { addToCart } = useCart()
  const { locale, t } = useLocale()
  const variants = getProductVariants(product)
  const activeVariant = selectedVariant || getDefaultVariant(product)
  const stockStatus = activeVariant ? getStockStatus(activeVariant) : getStockStatus(product)
  const canBuy = isPurchasable(product, activeVariant)
  const activePrice = activeVariant?.price ?? product.price
  const hasActivePrice = Number(activePrice) > 0
  const activeUnit = getUnitLabel(activeVariant?.unit || product.unit, locale)
  const activeSku = activeVariant?.sku || product.sku
  const activeMinOrder =
    locale === 'ru'
      ? activeVariant?.packageInfoRu || getLocalizedProductValue(product, 'minOrder', locale) || `1 ${activeUnit}`
      : normalizeKgText(activeVariant?.packageInfo || product.minOrder || `1 ${activeUnit}`)
  const productName = getProductTitle(product, locale)
  const shortDescription = getProductShortDescription(product, locale)
  const quickText = buildProductInquiryText({ product: { ...product, name: productName }, variant: activeVariant, locale })
  const facts = [
    { label: t('product.sku'), value: activeSku || product.article },
    { label: t('product.brand'), value: product.brand },
    { label: t('product.productType'), value: getLocalizedProductValue(product, 'productType', locale) },
    {
      label: t('product.pack'),
      value:
        locale === 'ru'
          ? activeVariant?.packageInfoRu || getLocalizedProductValue(product, 'pack', locale) || product.weight
          : normalizeKgText(activeVariant?.packageInfo || product.pack || product.weight),
    },
    { label: t('product.minOrder'), value: activeMinOrder },
  ].filter((item) => item.value)

  return (
    <section className="product-info">
      <div className="product-card__meta">
        {product.brand && <span>{product.brand}</span>}
        <span className={`stock-pill stock-pill--${stockStatus}`}>{getStockLabel(stockStatus, locale)}</span>
      </div>
      <h1>{productName}</h1>
      <dl className="product-facts">
        {facts.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
      {summarySpecs.length > 0 && (
        <div className="product-key-specs" aria-label={t('product.specifications')}>
          {summarySpecs.map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      )}
      <div className="product-price">
        <strong>{hasActivePrice ? formatPrice(activePrice) : t('product.priceNotSet')}</strong>
        {hasActivePrice && product.oldPrice && <del>{formatPrice(product.oldPrice)}</del>}
        {hasActivePrice && <span>/ {activeUnit}</span>}
        {product.isSale && <Badge tone="sale">{t('product.sale')}</Badge>}
      </div>
      <p className="price-disclaimer">{t('product.priceDisclaimer')}</p>
      {variants.length > 0 && (
        <fieldset className="variant-selector">
          <legend>{t('product.selectVariant')}</legend>
          <div className="variant-selector__grid">
            {variants.map((variant) => {
              const variantStock = getStockStatus(variant)
              const isActive = activeVariant?.id === variant.id
              const hasVariantPrice = Number(variant.price) > 0

              return (
                <button
                  key={variant.id}
                  type="button"
                  className={`variant-option${isActive ? ' is-active' : ''}`}
                  onClick={() => onVariantChange?.(variant.id)}
                >
                  <span>{locale === 'ru' ? variant.titleRu || variant.size : variant.titleKg || variant.size}</span>
                  <small>
                    {hasVariantPrice
                      ? `${formatPrice(variant.price)} / ${getUnitLabel(variant.unit, locale)}`
                      : t('product.priceNotSet')}
                  </small>
                  <em>{getStockLabel(variantStock, locale)}</em>
                </button>
              )
            })}
          </div>
        </fieldset>
      )}
      {shortDescription && <p>{shortDescription}</p>}
      <div className="product-info__actions">
        <Button disabled={!canBuy} onClick={() => addToCart(product, 1, activeVariant)}>
          {t('product.addToCart')}
        </Button>
        <Button href={getWhatsAppUrl(quickText)} target="_blank" rel="noreferrer" variant="whatsapp">
          {t('product.askWhatsApp')}
        </Button>
      </div>
      {!canBuy && <p className="form-error">{t('product.unavailable')}</p>}
      <p className="microcopy">{t('product.volumeHelp')}</p>
    </section>
  )
}
