import { ProductGrid } from '../catalog/ProductGrid'
import { Button } from '../ui/Button'
import { SectionTitle } from '../ui/SectionTitle'
import { useProducts } from '../../hooks/useProducts'
import { useLocale } from '../../i18n/LocaleContext'
import { getHomePopularProducts } from '../../services/productService'

export default function HomeProductSections() {
  const { t } = useLocale()
  const { products: homeProducts } = useProducts({ limit: 48, sort: 'popular' })
  const { products: saleProducts } = useProducts({ limit: 4, sort: 'sale' })
  const popularProducts = getHomePopularProducts(homeProducts)

  return (
    <>
      <section className="page-section">
        <SectionTitle
          title={t('home.popularTitle')}
          text={t('home.popularText')}
          action={
            <Button to="/catalog" variant="secondary">
              {t('home.allProducts')}
            </Button>
          }
        />
        <ProductGrid products={popularProducts} />
      </section>

      <section className="page-section">
        <SectionTitle title={t('home.saleTitle')} text={t('home.saleText')} />
        <ProductGrid products={saleProducts} />
      </section>
    </>
  )
}
