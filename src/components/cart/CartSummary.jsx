import { formatPrice } from '../../utils/formatPrice'
import { useLocale } from '../../i18n/LocaleContext'
import { Button } from '../ui/Button'

export function CartSummary({ total, count, checkout = true }) {
  const { t } = useLocale()

  return (
    <aside className="cart-summary">
      <h2>{t('cart.summary')}</h2>
      <div>
        <span>{t('cart.itemCount')}</span>
        <strong>{count}</strong>
      </div>
      <div>
        <span>{t('cart.total')}</span>
        <strong>{formatPrice(total)}</strong>
      </div>
      <p>{t('cart.deliveryNote')} {t('product.priceDisclaimer')}</p>
      {checkout && <Button to="/checkout">{t('cart.checkout')}</Button>}
    </aside>
  )
}
