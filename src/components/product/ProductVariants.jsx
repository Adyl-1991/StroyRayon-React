import { useLocale } from '../../i18n/LocaleContext'
import {
  getDefaultVariant,
  getProductVariants,
} from '../../services/productService'

export function ProductVariants({ product, selectedVariant, onVariantChange }) {
  const { locale, t } = useLocale()
  const variants = getProductVariants(product)

  if (!variants.length) return null

  const activeVariant = selectedVariant || getDefaultVariant(product)
  return (
    <section className="product-variants" aria-labelledby="product-variants-title">
      <h2 id="product-variants-title">{t('product.selectVariant')}</h2>

      <div className="variant-selector__grid">
        {variants.map((variant) => {
          const isActive = activeVariant?.id === variant.id
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
            </button>
          )
        })}
      </div>
    </section>
  )
}
