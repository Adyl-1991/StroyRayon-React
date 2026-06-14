import { useLocale } from '../../i18n/LocaleContext'

export function ProductReviews({ product }) {
  const { t } = useLocale()

  return (
    <section className="detail-panel">
      <h2>{t('product.reviewsTitle')}</h2>
      <p>{t('product.reviewsText', { rating: product.rating, count: product.reviewsCount })}</p>
      <p className="microcopy">{t('product.reviewsNote')}</p>
    </section>
  )
}
