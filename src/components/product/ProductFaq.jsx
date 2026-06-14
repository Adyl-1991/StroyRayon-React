import { useLocale } from '../../i18n/LocaleContext'

export function ProductFaq({ items = [] }) {
  const { locale, t } = useLocale()
  const fallbackItems = [
    {
      question: locale === 'ru' ? 'Как получить консультацию по этому товару?' : 'Бул товар боюнча кантип кеңеш алсам болот?',
      answer: locale === 'ru'
        ? 'Напишите название товара и место применения в WhatsApp, менеджер уточнит подходящий вариант.'
        : 'WhatsApp аркылуу товар атын жана колдонуу жерин жазсаңыз, менеджер туура вариантты тактап берет.',
    },
  ]
  const faqItems = items.length ? items : fallbackItems

  return (
    <section className="detail-panel product-faq">
      <h2>{t('product.faqTitle')}</h2>
      {faqItems.map((item) => (
        <details key={item.question}>
          <summary>{item.question}</summary>
          <p>{item.answer}</p>
        </details>
      ))}
    </section>
  )
}
