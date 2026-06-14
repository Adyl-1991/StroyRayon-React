import { useLocale } from '../../i18n/LocaleContext'
import { ProductGrid } from '../catalog/ProductGrid'

export function RelatedProducts({ products }) {
  const { t } = useLocale()

  return (
    <section className="page-section related-products">
      <h2>{t('product.relatedTitle')}</h2>
      <ProductGrid products={products} />
    </section>
  )
}
