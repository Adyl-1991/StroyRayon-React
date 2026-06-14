import { ProductCard } from './ProductCard'
import { EmptyState } from '../ui/EmptyState'
import { useLocale } from '../../i18n/LocaleContext'

export function ProductGrid({ products }) {
  const { t } = useLocale()

  if (!products.length) {
    return (
      <EmptyState
        title={t('filters.noProductsTitle')}
        text={t('filters.noProductsText')}
        actionText={t('filters.allCatalog')}
      />
    )
  }

  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
