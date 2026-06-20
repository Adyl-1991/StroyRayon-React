import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { Button } from '../components/ui/Button'
import { Seo } from '../components/seo/Seo'
import {
  getContactDetails,
  getWhatsAppUrl,
} from '../services/whatsappService'
import { useLocale } from '../i18n/LocaleContext'
import { getPageCanonical } from '../utils/seoUtils'

export function DeliveryPage() {
  const { locale, t } = useLocale()
  const details = getContactDetails(locale)
  const cards = t('static.delivery.cards')
  const tips = t('static.delivery.tips')

  return (
    <main className="page">
      <Seo title={t('static.delivery.title')} description={t('static.delivery.description')} canonical={getPageCanonical('/delivery')} />
      <Breadcrumbs items={[{ label: t('static.delivery.title') }]} />
      <div className="page-heading">
        <h1>{t('static.delivery.title')}</h1>
        <p>{t('static.delivery.description')}</p>
      </div>
      <section className="info-grid">
        {cards.map((card) => <article key={card.title}><h2>{card.title}</h2><p>{card.text}</p></article>)}
        <article>
          <h2>{t('static.delivery.hours')}</h2>
          {details.hours.map((item) => (
            <p key={item}>{item}</p>
          ))}
          <p>{t('static.delivery.address')}: {details.address}</p>
        </article>
      </section>
      <section className="seo-text">
        <h2>{t('static.delivery.tipsTitle')}</h2>
        {tips.map((tip) => <p key={tip}>{tip}</p>)}
        <p>{t('product.priceDisclaimer')}</p>
        <Button href={getWhatsAppUrl(t('header.materialsMessage'))} target="_blank" rel="noreferrer" variant="whatsapp">
          {t('static.delivery.cta')}
        </Button>
      </section>
    </main>
  )
}
