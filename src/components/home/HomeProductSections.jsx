import { ProductGrid } from '../catalog/ProductGrid'
import { Button } from '../ui/Button'
import { SectionTitle } from '../ui/SectionTitle'
import { useProducts } from '../../hooks/useProducts'
import { useLocale } from '../../i18n/LocaleContext'
import { getHomePopularProducts } from '../../services/productService'
import { ProductCarousel } from './ProductCarousel'

export default function HomeProductSections() {
  const { t } = useLocale()
  const { products: homeProducts } = useProducts({ limit: 64, sort: 'popular' })
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
        <ProductCarousel products={popularProducts} />
      </section>

      <section className="page-section">
        <SectionTitle title={t('home.saleTitle')} text={t('home.saleText')} />
        <ProductGrid products={saleProducts} />
      </section>
    </>
  )
}
