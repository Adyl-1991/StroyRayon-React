import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { Seo } from '../components/seo/Seo'
import { getPageCanonical } from '../utils/seoUtils'

export function DeliveryPage() {
  return (
    <main className="page">
      <Seo title="Жеткирүү жана төлөм" description="StroyRayon курулуш материалдарын Бишкекке, Чүйгө жана Кыргызстан региондоруна жеткирүү шарттарын менеджер менен тактайт." canonical={getPageCanonical('/delivery')} />
      <Breadcrumbs items={[{ label: 'Жеткирүү жана төлөм' }]} />
      <div className="page-heading">
        <h1>Жеткирүү жана төлөм</h1>
        <p>Курулуш материалы оор жана көлөмдүү болгондуктан, жеткирүү шарттары заказ боюнча такталат.</p>
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
          <p>Накталай, которуу же эсеп-фактура боюнча төлөө шарттары заказ алдында менеджер менен макулдашылат.</p>
        </article>
      </section>
      <section className="seo-text">
        <h2>Жеткирүүнү кантип тездетсе болот?</h2>
        <p>Заказ бергенде товарлардын санын, регионду, так даректи жана түшүрүү шартын жазыңыз.</p>
      </section>
    </main>
  )
}
