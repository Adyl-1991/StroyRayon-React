import { Link } from 'react-router-dom'
import { HeroSlider } from '../components/home/HeroSlider'
import { OrderProcessBlock } from '../components/home/OrderProcessBlock'
import { blogPosts } from '../data/blogPosts'
import { ProductGrid } from '../components/catalog/ProductGrid'
import { TrustBlock } from '../components/marketing/TrustBlock'
import { Seo } from '../components/seo/Seo'
import { Button } from '../components/ui/Button'
import { SectionTitle } from '../components/ui/SectionTitle'
import { useProducts } from '../hooks/useProducts'
import { useLocale } from '../i18n/LocaleContext'
import { getHomePopularProducts, getProducts } from '../services/productService'
import { getWhatsAppUrl } from '../services/whatsappService'
import { getPageCanonical } from '../utils/seoUtils'

export function HomePage() {
  const { t } = useLocale()
  const { products: homeProducts } = useProducts({ limit: 100, sort: 'popular' })
  const popularProducts = getHomePopularProducts(homeProducts)
  const saleProducts = getProducts({ sale: true }).slice(0, 4)

  return (
    <>
      <Seo title="StroyRayon" canonical={getPageCanonical('/')} />
      <HeroSlider />
      <OrderProcessBlock />

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

      <section className="benefits-band">
        <div>
          <h2>{t('home.benefitsTitle')}</h2>
          <p>{t('home.benefitsText')}</p>
        </div>
        <ul>
          {t('home.benefits').map((benefit) => (
            <li key={benefit}>{benefit}</li>
          ))}
        </ul>
      </section>

      <TrustBlock />

      <section className="delivery-band">
        <div>
          <p className="eyebrow">{t('home.deliveryEyebrow')}</p>
          <h2>{t('home.deliveryTitle')}</h2>
          <p>{t('home.deliveryText')}</p>
        </div>
        <Button to="/delivery" variant="secondary">
          {t('home.deliveryCta')}
        </Button>
      </section>

      <section className="consultation-band">
        <h2>{t('home.consultTitle')}</h2>
        <p>{t('home.consultText')}</p>
        <Button href={getWhatsAppUrl('Салам! StroyRayon боюнча кеңеш алгым келет.')} target="_blank" rel="noreferrer" variant="whatsapp">
          {t('common.whatsappWrite')}
        </Button>
      </section>

      <section className="page-section">
        <SectionTitle title={t('home.adviceTitle')} text={t('home.adviceText')} />
        <div className="blog-grid">
          {blogPosts.slice(0, 3).map((post) => (
            <article className="blog-card" key={post.id}>
              <p className="eyebrow">{post.category}</p>
              <h3>{post.title}</h3>
              <p>{post.excerpt}</p>
              <Link to="/blog">{t('common.read')}</Link>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}
