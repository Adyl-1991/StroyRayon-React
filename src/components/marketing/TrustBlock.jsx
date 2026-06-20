import { useLocale } from '../../i18n/LocaleContext'

export function TrustBlock() {
  const { t } = useLocale()
  const items = t('trust.items')

  return (
    <section className="trust-block" aria-labelledby="trust-title">
      <div>
        <p className="eyebrow">{t('trust.eyebrow')}</p>
        <h2 id="trust-title">{t('trust.title')}</h2>
      </div>
      <div className="trust-grid">
        {items.map((item) => (
          <article key={item.title}>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
