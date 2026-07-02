import { useLocale } from '../../i18n/LocaleContext'

export function ProductFaq({ items = [] }) {
  const { t } = useLocale()
  if (!items.length) return null

  return (
    <section className="detail-panel product-faq">
      <h2>{t('product.faqTitle')}</h2>
      {items.map((item) => (
        <details key={item.question}>
          <summary>{item.question}</summary>
          <p>{item.answer}</p>
        </details>
      ))}
    </section>
  )
}
