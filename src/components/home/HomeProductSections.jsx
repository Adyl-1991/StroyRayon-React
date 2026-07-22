import { ProductGrid } from '../catalog/ProductGrid'
import { Button } from '../ui/Button'
import { SectionTitle } from '../ui/SectionTitle'
import { useProducts } from '../../hooks/useProducts'
import { useLocale } from '../../i18n/LocaleContext'
import { getHomePopularProducts, getProducts } from '../../services/productService'

export default function HomeProductSections() {
  const { t } = useLocale()
  const { products: homeProducts } = useProducts({ limit: 8, sort: 'popular' })
  const popularProducts = getHomePopularProducts(homeProducts)
  const saleProducts = getProducts({ sale: true }).slice(0, 4)

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
