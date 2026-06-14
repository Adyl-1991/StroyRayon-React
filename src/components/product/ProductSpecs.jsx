import { useLocale } from '../../i18n/LocaleContext'

export function ProductSpecs({ specs = {}, title }) {
  const { t } = useLocale()
  const entries = Object.entries(specs).filter(([, value]) => value !== undefined && value !== null && value !== '')

  if (!entries.length) return null

  return (
    <section className="detail-panel">
      <h2>{title || t('product.specifications')}</h2>
      <dl className="specs">
        {entries.map(([key, value]) => (
          <div key={key}>
            <dt>{key}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
