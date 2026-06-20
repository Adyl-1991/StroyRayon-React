import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { Button } from '../components/ui/Button'
import { Seo } from '../components/seo/Seo'
import { useLocale } from '../i18n/LocaleContext'
import { contactConfig, getContactDetails } from '../services/whatsappService'
import { getPageCanonical } from '../utils/seoUtils'

export function ContactsPage() {
  const { locale, t } = useLocale()
  const details = getContactDetails(locale)

  return (
    <main className="page">
      <Seo title={t('static.contacts.title')} description={t('static.contacts.description')} canonical={getPageCanonical('/contacts')} />
      <Breadcrumbs items={[{ label: t('static.contacts.title') }]} />
      <div className="page-heading">
        <h1>{t('static.contacts.title')}</h1>
        <p>{t('static.contacts.description')}</p>
      </div>
      <section className="info-grid">
        <article>
          <h2>{t('static.contacts.phone')}</h2>
          <a href={`tel:${contactConfig.phone.replaceAll(' ', '')}`}>{contactConfig.phone}</a>
          <p>{details.hours.join('. ')}</p>
        </article>
        <article>
          <h2>WhatsApp</h2>
          <p>{t('static.contacts.whatsappText')}</p>
          <Button href={`https://wa.me/${contactConfig.whatsapp}`} target="_blank" rel="noreferrer" variant="whatsapp">
            {t('static.contacts.whatsappCta')}
          </Button>
        </article>
        <article>
          <h2>Telegram</h2>
          <a href={contactConfig.telegramUrl}>{contactConfig.telegram}</a>
          <p>{t('static.contacts.telegramText')}</p>
        </article>
        <article>
          <h2>{t('static.contacts.address')}</h2>
          <p>{details.address}</p>
          <p>{details.delivery}</p>
        </article>
      </section>
    </main>
  )
}
