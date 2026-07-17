import { useLocale } from '../../i18n/LocaleContext'
import {
  getDefaultVariant,
  getProductVariants,
  getStockLabel,
  getStockStatus,
  getUnitLabel,
} from '../../services/productService'
import { formatPrice } from '../../utils/formatPrice'

export function ProductVariants({ product, selectedVariant, onVariantChange }) {
  const { locale, t } = useLocale()
  const variants = getProductVariants(product)

  if (!variants.length) return null

  const activeVariant = selectedVariant || getDefaultVariant(product)
  const activeTitle = locale === 'ru'
    ? activeVariant?.titleRu || activeVariant?.size
    : activeVariant?.titleKg || activeVariant?.size

  return (
    <section className="product-variants" aria-labelledby="product-variants-title">
      <div className="product-variants__heading">
        <div>
          <h2 id="product-variants-title">{t('product.selectVariant')}</h2>
          <p>{activeTitle}</p>
        </div>
        <span>{variants.length}</span>
      </div>

      <div className="variant-selector__grid">
        {variants.map((variant) => {
          const variantStock = getStockStatus(variant)
          const isActive = activeVariant?.id === variant.id
          const hasVariantPrice = Number(variant.price) > 0
          const title = locale === 'ru' ? variant.titleRu || variant.size : variant.titleKg || variant.size

          return (
            <button
              key={variant.id}
              type="button"
              className={`variant-option${isActive ? ' is-active' : ''}`}
              aria-pressed={isActive}
              onClick={() => onVariantChange?.(variant.id)}
            >
              <span>{title}</span>
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
    </section>
  )
}
