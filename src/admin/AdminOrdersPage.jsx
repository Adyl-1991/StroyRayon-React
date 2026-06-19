import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getAdminOrders } from '../api/adminApi'
import { formatPrice } from '../utils/formatPrice'

const filters = [
  ['all', 'Все'],
  ['NEW', 'Новые'],
  ['PENDING_CONFIRMATION', 'На подтверждении'],
  ['CONFIRMED', 'Подтверждённые'],
  ['ASSEMBLING', 'Сборка'],
  ['DELIVERED', 'Доставленные'],
  ['CANCELLED', 'Отменённые'],
]

const statusLabels = {
  new: 'Новый',
  pending_confirmation: 'На подтверждении',
  confirmed: 'Подтверждён',
  assembling: 'Собирается',
  delivered: 'Доставлен',
  cancelled: 'Отменён',
}

export function AdminOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filter = searchParams.get('status') || 'all'
  const [state, setState] = useState({ filter: null, error: '', data: null })

  useEffect(() => {
    let active = true
    getAdminOrders(filter === 'all' ? {} : { status: filter })
      .then((data) => {
        if (active) setState({ filter, error: '', data })
      })
      .catch((error) => {
        if (active) {
          setState({ filter, error: error.message || 'Не удалось загрузить заказы.', data: null })
        }
      })
    return () => {
      active = false
    }
  }, [filter])
  const loading = state.filter !== filter

  return (
    <section>
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Orders CRM</span>
          <h1>Заказы</h1>
        </div>
        {state.data && <span>{state.data.pagination.total} заказов</span>}
      </div>

      <div className="admin-filters" aria-label="Фильтры заказов">
        {filters.map(([value, label]) => (
          <button
            type="button"
            className={filter === value ? 'is-active' : ''}
            key={value}
            onClick={() => setSearchParams(value === 'all' ? {} : { status: value })}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <div className="admin-state">Загружаем заказы…</div>}
      {state.error && <div className="admin-alert admin-alert-error" role="alert">{state.error}</div>}
      {!loading && !state.error && state.data?.items.length === 0 && (
        <div className="admin-state">В этой группе пока нет заказов.</div>
      )}
      {!loading && state.data?.items.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Заказ</th>
                <th>Дата</th>
                <th>Клиент</th>
                <th>Телефон</th>
                <th>Сумма</th>
                <th>Статус</th>
                <th>Резерв</th>
              </tr>
            </thead>
            <tbody>
              {state.data.items.map((order) => (
                <tr key={order.id}>
                  <td><Link to={`/admin/orders/${order.id}`}>{order.orderNumber}</Link></td>
                  <td>{new Date(order.createdAt).toLocaleString('ru-RU')}</td>
                  <td>{order.customerName}</td>
                  <td><a href={`tel:${order.phone}`}>{order.phone}</a></td>
                  <td>{formatPrice(order.total)}</td>
                  <td><span className={`admin-status admin-status-${order.status}`}>{statusLabels[order.status]}</span></td>
                  <td>{order.stockStatus === 'reserved' ? 'Зарезервирован' : order.stockStatus === 'needs_confirmation' ? 'Нужна проверка' : 'Подтверждён'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
