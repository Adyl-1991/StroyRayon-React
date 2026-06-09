import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { Button } from '../components/ui/Button'
import { Seo } from '../components/seo/Seo'
import { businessHours, contactConfig, deliverySummary } from '../services/whatsappService'
import { getPageCanonical } from '../utils/seoUtils'

export function ContactsPage() {
  return (
    <main className="page">
      <Seo title="Байланыш" description="StroyRayon менеджери менен телефон, WhatsApp же Telegram аркылуу байланышып, курулуш материалдары боюнча кеңеш алыңыз." canonical={getPageCanonical('/contacts')} />
      <Breadcrumbs items={[{ label: 'Байланыш' }]} />
      <div className="page-heading">
        <h1>Байланыш</h1>
        <p>Товар, баа, жеткирүү жана көлөм эсептөө боюнча менеджерден кеңеш алыңыз.</p>
      </div>
      <section className="info-grid">
        <article>
          <h2>Телефон</h2>
          <a href={`tel:${contactConfig.phone.replaceAll(' ', '')}`}>{contactConfig.phone}</a>
          <p>{businessHours.join('. ')}</p>
        </article>
        <article>
          <h2>WhatsApp</h2>
          <p>Сүрөт, өлчөм же товар тизмесин жөнөтсөңүз болот.</p>
          <Button href={`https://wa.me/${contactConfig.whatsapp}`} target="_blank" rel="noreferrer" variant="whatsapp">
            WhatsAppка жазуу
          </Button>
        </article>
        <article>
          <h2>Telegram</h2>
          <a href={contactConfig.telegramUrl}>{contactConfig.telegram}</a>
          <p>Жеткирүү статусун жана алдын ала эсепти тактайбыз.</p>
        </article>
        <article>
          <h2>Дарек</h2>
          <p>{contactConfig.address}</p>
          <p>{deliverySummary}</p>
        </article>
      </section>
    </main>
  )
}
