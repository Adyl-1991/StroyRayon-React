import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { Button } from '../components/ui/Button'
import { Seo } from '../components/seo/Seo'
import {
  businessHours,
  contactConfig,
  deliverySummary,
  getWhatsAppUrl,
  priceStockDisclaimer,
} from '../services/whatsappService'
import { getPageCanonical } from '../utils/seoUtils'

export function DeliveryPage() {
  return (
    <main className="page">
      <Seo title="Жеткирүү жана төлөм" description="StroyRayon курулуш материалдарын Бишкекке, Чүйгө жана Кыргызстан региондоруна жеткирүү шарттарын менеджер менен тактайт." canonical={getPageCanonical('/delivery')} />
      <Breadcrumbs items={[{ label: 'Жеткирүү жана төлөм' }]} />
      <div className="page-heading">
        <h1>Жеткирүү жана төлөм</h1>
        <p>{deliverySummary} Курулуш материалы оор жана көлөмдүү болгондуктан, акыркы шарттар буйрутма боюнча такталат.</p>
      </div>
      <section className="info-grid">
        <article>
          <h2>Бишкек жана Чүй</h2>
          <p>Көп товарлар ошол эле күнү же кийинки күнү жеткирилет. Түшүрүү дареги алдын ала такталат.</p>
        </article>
        <article>
          <h2>Региондор</h2>
          <p>Ош, Жалал-Абад, Баткен, Нарын, Ысык-Көл жана Талас багыттарына транспорт, такси же жүк жеткирүү аркылуу жөнөтүү мүмкүн.</p>
        </article>
        <article>
          <h2>Төлөм</h2>
          <p>Накталай жана онлайн которуу аркылуу төлөм кабыл алынат. Төлөм ыкмасы буйрутма такталгандан кийин менеджер менен макулдашылат.</p>
        </article>
        <article>
          <h2>Иш убактысы</h2>
          {businessHours.map((item) => (
            <p key={item}>{item}</p>
          ))}
          <p>Дарек: {contactConfig.address}</p>
        </article>
      </section>
      <section className="seo-text">
        <h2>Жеткирүүнү кантип тездетсе болот?</h2>
        <p>Буйрутма бергенде товарлардын санын, регионду, так даректи жана түшүрүү шартын жазыңыз.</p>
        <p>Оор жана көлөмдүү товарлар боюнча жеткирүү баасы буйрутманын көлөмүнө, салмагына жана дарекке жараша такталат.</p>
        <p>{priceStockDisclaimer}</p>
        <Button href={getWhatsAppUrl('Салам! StroyRayon жеткирүү жана төлөм шарттарын тактап бериңиз.')} target="_blank" rel="noreferrer" variant="whatsapp">
          WhatsApp аркылуу шарттарды тактоо
        </Button>
      </section>
    </main>
  )
}
