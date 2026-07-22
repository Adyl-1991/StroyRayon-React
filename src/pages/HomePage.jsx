import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { HeroSlider } from '../components/home/HeroSlider'
import { OrderProcessBlock } from '../components/home/OrderProcessBlock'
import { blogPosts } from '../data/blogPosts'
import { TrustBlock } from '../components/marketing/TrustBlock'
import { Seo } from '../components/seo/Seo'
import { Button } from '../components/ui/Button'
import { SectionTitle } from '../components/ui/SectionTitle'
import { getWhatsAppUrl } from '../config/contact'
import { useLocale } from '../i18n/LocaleContext'
import { buildOrganizationStructuredData, getPageCanonical } from '../utils/siteSeoUtils'

const HomeProductSections = lazy(() => import('../components/home/HomeProductSections'))

function DeferredHomeProductSections() {
  const markerRef = useRef(null)
  const [shouldLoad, setShouldLoad] = useState(false)

  useEffect(() => {
    const marker = markerRef.current
    if (!marker || typeof IntersectionObserver === 'undefined') {
      setShouldLoad(true)
      return undefined
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setShouldLoad(true)
        observer.disconnect()
      },
      { rootMargin: '0px 0px -25% 0px' },
    )

    observer.observe(marker)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="home-products-deferred" ref={markerRef}>
      {shouldLoad ? (
        <Suspense fallback={<div className="home-products-placeholder" aria-hidden="true" />}>
          <HomeProductSections />
        </Suspense>
      ) : (
        <div className="home-products-placeholder" aria-hidden="true" />
      )}
    </div>
  )
}

export function HomePage() {
  const { locale, t } = useLocale()

  return (
    <main>
      <Seo
        title="StroyRayon"
        canonical={getPageCanonical('/')}
        structuredData={buildOrganizationStructuredData()}
      />
      <HeroSlider />
      <OrderProcessBlock />
      <DeferredHomeProductSections />

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
              <p className="eyebrow">{locale === 'ru' ? post.categoryRu : post.category}</p>
              <h3>{locale === 'ru' ? post.titleRu : post.title}</h3>
              <p>{locale === 'ru' ? post.excerptRu : post.excerpt}</p>
              <Link to="/blog">{t('common.read')}</Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
