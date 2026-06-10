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

const commonContactText = `${contactConfig.phone}. Бишкек. Иш убактысы: 09:00-19:00, дүйшөмбү эс алуу күнү, жума 13:00-14:00 тыныгуу.`

function InfoPage({ title, description, canonicalPath, children }) {
  return (
    <main className="page">
      <Seo title={title} description={description} canonical={getPageCanonical(canonicalPath)} />
      <Breadcrumbs items={[{ label: title }]} />
      <div className="page-heading">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </main>
  )
}

function ContactCard() {
  return (
    <article>
      <h2>Байланыш</h2>
      <p>{commonContactText}</p>
      <p>{deliverySummary}</p>
      <Button href={getWhatsAppUrl('Салам! StroyRayon боюнча маалымат тактап бериңиз.')} target="_blank" rel="noreferrer" variant="whatsapp">
        WhatsApp аркылуу жазуу
      </Button>
    </article>
  )
}

export function AboutPage() {
  return (
    <InfoPage
      title="StroyRayon жөнүндө"
      description="StroyRayon - курулуш материалдарын, инженердик сантехниканы, электриканы, шаймандарды жана вентиляция товарларын WhatsApp аркылуу тез тактап заказ берүүгө жардам берген онлайн каталог."
      canonicalPath="/about"
    >
      <section className="info-grid">
        <article>
          <h2>Ким үчүн иштейбиз</h2>
          <p>
            Үй оңдогон кардарларга, усталарга жана чакан объекттерге керектүү товарды категория, өлчөм жана баа боюнча
            тез табууга жардам беребиз.
          </p>
        </article>
        <article>
          <h2>Кантип заказ берилет</h2>
          <p>
            Каталогдон товар тандап себетке кошосуз. Checkout барагынан байланыш маалыматтарын жазып, заказды WhatsApp
            аркылуу менеджерге жөнөтөсүз.
          </p>
        </article>
        <article>
          <h2>Бааны тактоо</h2>
          <p>{priceStockDisclaimer}</p>
        </article>
        <ContactCard />
      </section>
    </InfoPage>
  )
}

export function PaymentPage() {
  return (
    <InfoPage
      title="Төлөм шарттары"
      description="StroyRayon заказдары боюнча төлөм товар, көлөм жана жеткирүү шарты менеджер менен такталгандан кийин кабыл алынат."
      canonicalPath="/payment"
    >
      <section className="info-grid">
        <article>
          <h2>Накталай төлөм</h2>
          <p>Бишкек ичинде товар алынганда же жеткирүүдө накталай төлөмдү алдын ала менеджер менен макулдашып аласыз.</p>
        </article>
        <article>
          <h2>Онлайн которуу</h2>
          <p>Банктык тиркеме же карта аркылуу которуу мүмкүн. Реквизиттер заказ такталгандан кийин WhatsApp аркылуу берилет.</p>
        </article>
        <article>
          <h2>Документ жана чек</h2>
          <p>Ири көлөмдөгү заказдар боюнча документ керек болсо, менеджерге алдын ала айтып коюңуз.</p>
        </article>
        <article>
          <h2>Маанилүү</h2>
          <p>{priceStockDisclaimer}</p>
        </article>
      </section>
    </InfoPage>
  )
}

export function ReturnPage() {
  return (
    <InfoPage
      title="Кайтаруу жана алмаштыруу"
      description="Товарды кайтаруу же алмаштыруу маселеси товар түрүнө, таңгагына, абалына жана сатып алуу убактысына жараша менеджер менен каралат."
      canonicalPath="/return"
    >
      <section className="info-grid">
        <article>
          <h2>Текшерүү</h2>
          <p>Товарды алганда аталышын, өлчөмүн, санын жана сырткы абалын дароо текшерип алыңыз.</p>
        </article>
        <article>
          <h2>Алмаштыруу</h2>
          <p>Өлчөм же комплектация туура келбей калса, товар колдонулбай жана таңгагы бузулбай турган учурда алмаштыруу мүмкүнчүлүгү такталат.</p>
        </article>
        <article>
          <h2>Брак же кемчилик</h2>
          <p>Кемчилик байкалса, товар сүрөтүн жана заказ маалыматын WhatsApp аркылуу жөнөтүңүз. Менеджер чечүү жолун сунуштайт.</p>
        </article>
        <ContactCard />
      </section>
    </InfoPage>
  )
}

export function PrivacyPage() {
  return (
    <InfoPage
      title="Купуялык саясаты"
      description="StroyRayon сайтында калтырган байланыш маалыматтары заказды тактоо, жеткирүү шартын сүйлөшүү жана кардар менен байланышуу үчүн гана колдонулат."
      canonicalPath="/privacy"
    >
      <section className="info-grid">
        <article>
          <h2>Кандай маалымат алынат</h2>
          <p>Checkout формасында аты-жөнүңүз, телефон номериңиз, дарек же регион жана комментарий кабыл алынат.</p>
        </article>
        <article>
          <h2>Маалымат эмне үчүн керек</h2>
          <p>Бул маалымат заказ курамын, бааны, товар бар-жогун жана жеткирүү шартын WhatsApp аркылуу тактоо үчүн колдонулат.</p>
        </article>
        <article>
          <h2>Үчүнчү жактар</h2>
          <p>Маалымат товар жеткирүү же заказды аткаруу үчүн зарыл учурларды эске албаганда сыртка берилбейт.</p>
        </article>
        <article>
          <h2>Байланыш</h2>
          <p>{commonContactText}</p>
          {businessHours.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </article>
      </section>
    </InfoPage>
  )
}
