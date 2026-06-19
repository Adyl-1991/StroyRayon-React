import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getAdminOrder, updateAdminOrderNote, updateAdminOrderStatus } from '../api/adminApi'
import { formatPrice } from '../utils/formatPrice'

const statusOptions = [
  ['NEW', 'Новый'],
  ['PENDING_CONFIRMATION', 'На подтверждении'],
  ['CONFIRMED', 'Подтверждён'],
  ['ASSEMBLING', 'Собирается'],
  ['DELIVERED', 'Доставлен'],
  ['CANCELLED', 'Отменён'],
]

const allowedNext = {
  new: ['PENDING_CONFIRMATION', 'CONFIRMED', 'CANCELLED'],
  pending_confirmation: ['CONFIRMED', 'CANCELLED'],
  confirmed: ['ASSEMBLING', 'CANCELLED'],
  assembling: ['DELIVERED', 'CANCELLED'],
  delivered: [],
  cancelled: [],
}

function labelStatus(status) {
  return statusOptions.find(([value]) => value.toLowerCase() === status)?.[1] || status
}

export function AdminOrderDetailPage() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [note, setNote] = useState('')
  const [nextStatus, setNextStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    getAdminOrder(id)
      .then((data) => {
        if (!active) return
        setOrder(data)
        setNote(data.adminNote || '')
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Не удалось загрузить заказ.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  async function handleStatusUpdate() {
    if (!nextStatus || !allowedNext[order.status]?.includes(nextStatus)) {
      setError('Выберите допустимый следующий статус.')
      return
    }
    setSaving('status')
    setError('')
    setMessage('')
    try {
      const updated = await updateAdminOrderStatus(id, nextStatus)
      setOrder(updated)
      setNextStatus('')
      setMessage('Статус заказа обновлён.')
    } catch (requestError) {
      setError(requestError.message || 'Не удалось изменить статус.')
    } finally {
      setSaving('')
    }
  }

  async function handleNoteSave(event) {
    event.preventDefault()
    setSaving('note')
    setError('')
    setMessage('')
    try {
      const updated = await updateAdminOrderNote(id, note)
      setOrder(updated)
      setNote(updated.adminNote || '')
      setMessage(note.trim() ? 'Внутренняя заметка сохранена.' : 'Внутренняя заметка удалена.')
    } catch (requestError) {
      setError(requestError.message || 'Не удалось сохранить заметку.')
    } finally {
      setSaving('')
    }
  }

  if (loading) return <div className="admin-state">Загружаем заказ…</div>
  if (!order) return <div className="admin-alert admin-alert-error">{error || 'Заказ не найден.'}</div>

  const availableStatuses = allowedNext[order.status] || []

  return (
    <section>
      <Link className="admin-back-link" to="/admin/orders">← К списку заказов</Link>
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Заказ</span>
          <h1>{order.orderNumber}</h1>
          <p>{new Date(order.createdAt).toLocaleString('ru-RU')}</p>
        </div>
        <span className={`admin-status admin-status-${order.status}`}>{labelStatus(order.status)}</span>
      </div>

      {error && <div className="admin-alert admin-alert-error" role="alert">{error}</div>}
      {message && <div className="admin-alert admin-alert-success" role="status">{message}</div>}

      <div className="admin-detail-grid">
        <article className="admin-card">
          <h2>Клиент</h2>
          <dl>
            <div><dt>Имя</dt><dd>{order.customer.name}</dd></div>
            <div><dt>Телефон</dt><dd><a href={`tel:${order.customer.phone}`}>{order.customer.phone}</a></dd></div>
            <div><dt>Регион</dt><dd>{order.customer.region || '—'}</dd></div>
            <div><dt>Адрес</dt><dd>{order.customer.address || '—'}</dd></div>
            <div><dt>Комментарий</dt><dd>{order.customerComment || '—'}</dd></div>
          </dl>
        </article>

        <article className="admin-card">
          <h2>Обработка</h2>
          <dl>
            <div><dt>Резерв</dt><dd>{order.stockStatus === 'reserved' ? 'Зарезервирован' : order.stockStatus === 'needs_confirmation' ? 'Нужна проверка' : 'Подтверждён'}</dd></div>
            <div><dt>Обновлён</dt><dd>{new Date(order.updatedAt).toLocaleString('ru-RU')}</dd></div>
          </dl>
          {availableStatuses.length > 0 ? (
            <div className="admin-status-form">
              <select value={nextStatus} onChange={(event) => setNextStatus(event.target.value)}>
                <option value="">Следующий статус</option>
                {statusOptions.filter(([value]) => availableStatuses.includes(value)).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <button type="button" className="admin-primary-button" disabled={saving === 'status'} onClick={handleStatusUpdate}>
                {saving === 'status' ? 'Сохраняем…' : 'Изменить'}
              </button>
            </div>
          ) : <p>Заказ находится в финальном статусе.</p>}
        </article>
      </div>

      <article className="admin-card admin-card-wide">
        <h2>Состав заказа</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Товар</th><th>Кол-во</th><th>Цена</th><th>Сумма</th><th>Склад</th></tr></thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.title}</strong><small>{item.slug} · {item.sku}</small></td>
                  <td>{item.quantity} {item.unit}</td>
                  <td>{formatPrice(item.unitPrice)}</td>
                  <td>{formatPrice(item.lineTotal)}</td>
                  <td>{item.stockCheckStatus === 'ok' ? `Резерв: ${item.reservedQuantity}` : 'Нужна проверка'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="admin-totals">
          <span>Товары: {formatPrice(order.subtotal)}</span>
          <span>Доставка: {formatPrice(order.deliveryPrice)}</span>
          <strong>Итого: {formatPrice(order.total)}</strong>
        </div>
      </article>

      <div className="admin-detail-grid">
        <form className="admin-card" onSubmit={handleNoteSave}>
          <h2>Внутренняя заметка</h2>
          <textarea maxLength={2000} rows={6} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Эта заметка не видна покупателю." />
          <button className="admin-primary-button" type="submit" disabled={saving === 'note'}>
            {saving === 'note' ? 'Сохраняем…' : 'Сохранить заметку'}
          </button>
        </form>

        <article className="admin-card">
          <h2>История статусов</h2>
          {order.statusHistory.length === 0 ? <p>История пока пуста.</p> : (
            <ol className="admin-history">
              {order.statusHistory.map((event) => (
                <li key={event.id}>
                  <strong>{labelStatus(event.toStatus)}</strong>
                  <span>{new Date(event.createdAt).toLocaleString('ru-RU')}</span>
                  {event.admin && <small>{event.admin.name}</small>}
                </li>
              ))}
            </ol>
          )}
        </article>
      </div>
    </section>
  )
}
