import { formatPrice } from '../../utils/formatPrice'
import { Button } from '../ui/Button'

export function CartSummary({ total, count, checkout = true }) {
  return (
    <aside className="cart-summary">
      <h2>Заказ жыйынтыгы</h2>
      <div>
        <span>Товар саны</span>
        <strong>{count}</strong>
      </div>
      <div>
        <span>Жалпы сумма</span>
        <strong>{formatPrice(total)}</strong>
      </div>
      <p>Жеткирүү баасы регион жана көлөм боюнча менеджер тарабынан такталат.</p>
      {checkout && <Button to="/checkout">Заказга өтүү</Button>}
    </aside>
  )
}
