import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { Button } from '../components/ui/Button'
import { Seo } from '../components/seo/Seo'
import { useLocale } from '../i18n/LocaleContext'
import { getContactDetails, getWhatsAppUrl } from '../services/whatsappService'
import { buildWebPageStructuredData, getPageCanonical } from '../utils/seoUtils'

function InfoPage({ pageKey, canonicalPath, includeContact = false }) {
  const { locale, t } = useLocale()
  const title = t(`static.${pageKey}.title`)
  const description = t(`static.${pageKey}.description`)
  const cards = t(`static.${pageKey}.cards`)
  const details = getContactDetails(locale)

  return (
    <main className="page">
      <Seo
        title={title}
        description={description}
        canonical={getPageCanonical(canonicalPath)}
        structuredData={buildWebPageStructuredData({
          path: canonicalPath,
          title,
          description,
          type: pageKey === 'about' ? 'AboutPage' : 'WebPage',
        })}
      />
      <Breadcrumbs items={[{ label: title }]} />
      <div className="page-heading">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <section className="info-grid">
        {cards.map((card) => (
          <article key={card.title}>
            <h2>{card.title}</h2>
            <p>{card.text}</p>
          </article>
        ))}
        {includeContact && (
          <article>
            <h2>{t('static.contactCardTitle')}</h2>
            <p>{t('static.contactCardText')}</p>
            <p>{details.delivery}</p>
            <Button href={getWhatsAppUrl(t('header.materialsMessage'))} target="_blank" rel="noreferrer" variant="whatsapp">
              {t('static.contactCardCta')}
            </Button>
          </article>
        )}
      </section>
    </main>
  )
}

export function AboutPage() {
  return <InfoPage pageKey="about" canonicalPath="/about" includeContact />
}

export function PaymentPage() {
  return <InfoPage pageKey="payment" canonicalPath="/payment" />
}

export function ReturnPage() {
  return <InfoPage pageKey="return" canonicalPath="/return" includeContact />
}

export function PrivacyPage() {
  return <InfoPage pageKey="privacy" canonicalPath="/privacy" />
}
