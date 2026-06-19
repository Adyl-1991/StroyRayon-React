import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  getAdminProduct,
  updateAdminProductActive,
  updateAdminProductNote,
  updateAdminProductPrice,
  updateAdminProductStock,
} from '../api/adminApi'
import { formatPrice } from '../utils/formatPrice'

const stockOptions = [
  ['IN_STOCK', 'В наличии'],
  ['LOW_STOCK', 'Мало'],
  ['PRE_ORDER', 'Предзаказ'],
  ['OUT_OF_STOCK', 'Нет в наличии'],
]

export function AdminProductDetailPage() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [stockStatus, setStockStatus] = useState('IN_STOCK')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  function applyProduct(data) {
    setProduct(data)
    setPrice(String(data.price))
    setQuantity(String(data.stock?.quantity ?? 0))
    setStockStatus(data.stockStatus.toUpperCase())
    setNote(data.adminNote || '')
  }

  useEffect(() => {
    let active = true
    getAdminProduct(id)
      .then((data) => {
        if (!active) return
        applyProduct(data)
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Не удалось загрузить товар.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  async function performSave(kind, action, successMessage) {
    setSaving(kind)
    setError('')
    setMessage('')
    try {
      const updated = await action()
      applyProduct(updated)
      setMessage(successMessage)
    } catch (requestError) {
      setError(requestError.message || 'Не удалось сохранить изменения.')
    } finally {
      setSaving('')
    }
  }

  function savePrice(event) {
    event.preventDefault()
    const numericPrice = Number(price)
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      setError('Цена должна быть положительным числом.')
      return
    }
    performSave('price', () => updateAdminProductPrice(id, numericPrice), 'Цена обновлена.')
  }

  function saveStock(event) {
    event.preventDefault()
    const numericQuantity = Number(quantity)
    if (!Number.isInteger(numericQuantity) || numericQuantity < 0) {
      setError('Остаток должен быть целым неотрицательным числом.')
      return
    }
    if (numericQuantity < (product.stock?.reservedQuantity || 0)) {
      setError(`Остаток не может быть меньше резерва (${product.stock.reservedQuantity}).`)
      return
    }
    performSave(
      'stock',
      () => updateAdminProductStock(id, { quantity: numericQuantity, stockStatus }),
      'Остаток и статус обновлены.',
    )
  }

  function toggleActive() {
    const nextValue = !product.isActive
    performSave(
      'active',
      () => updateAdminProductActive(id, nextValue),
      nextValue ? 'Товар снова виден в магазине.' : 'Товар скрыт из магазина.',
    )
  }

  function saveNote(event) {
    event.preventDefault()
    performSave(
      'note',
      () => updateAdminProductNote(id, note),
      note.trim() ? 'Внутренняя заметка сохранена.' : 'Внутренняя заметка удалена.',
    )
  }

  if (loading) return <div className="admin-state">Загружаем товар…</div>
  if (!product) return <div className="admin-alert admin-alert-error">{error || 'Товар не найден.'}</div>

  return (
    <section>
      <Link className="admin-back-link" to="/admin/products">← К списку товаров</Link>
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Товар</span>
          <h1>{product.title}</h1>
          <p>{product.slug} · {product.sku}</p>
        </div>
        <span className={`admin-status ${product.isActive ? 'admin-status-confirmed' : 'admin-status-cancelled'}`}>
          {product.isActive ? 'Активен' : 'Скрыт'}
        </span>
      </div>

      {error && <div className="admin-alert admin-alert-error" role="alert">{error}</div>}
      {message && <div className="admin-alert admin-alert-success" role="status">{message}</div>}

      <div className="admin-detail-grid">
        <article className="admin-card">
          <h2>Сводка</h2>
          <dl>
            <div><dt>Категория</dt><dd>{product.catalogPath}</dd></div>
            <div><dt>Бренд</dt><dd>{product.brand?.name || '—'}</dd></div>
            <div><dt>Единица</dt><dd>{product.unit}</dd></div>
            <div><dt>Текущая цена</dt><dd>{formatPrice(product.price)}</dd></div>
            <div><dt>Фото</dt><dd>{product.imageStatus === 'ready' ? 'Готово' : product.imageStatus === 'placeholder' ? 'Заглушка' : 'Нет'}</dd></div>
            <div><dt>Обновлён</dt><dd>{new Date(product.updatedAt).toLocaleString('ru-RU')}</dd></div>
          </dl>
        </article>

        <article className="admin-card">
          <h2>Видимость</h2>
          <p>
            Неактивный товар исчезает из публичного каталога и страницы товара,
            а создание нового заказа с ним блокируется сервером.
          </p>
          <button
            type="button"
            className={product.isActive ? 'admin-danger-button' : 'admin-primary-button'}
            disabled={saving === 'active'}
            onClick={toggleActive}
          >
            {saving === 'active' ? 'Сохраняем…' : product.isActive ? 'Скрыть товар' : 'Активировать товар'}
          </button>
        </article>
      </div>

      <div className="admin-detail-grid">
        <form className="admin-card admin-edit-form" onSubmit={savePrice}>
          <h2>Цена</h2>
          <label>
            Цена, KGS
            <input type="number" min="0.01" max="9999999999.99" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} required />
          </label>
          <small>Новые заказы используют эту цену. Старые snapshots не пересчитываются.</small>
          <button className="admin-primary-button" type="submit" disabled={saving === 'price'}>
            {saving === 'price' ? 'Сохраняем…' : 'Обновить цену'}
          </button>
        </form>

        <form className="admin-card admin-edit-form" onSubmit={saveStock}>
          <h2>Остаток</h2>
          <label>
            Физическое количество
            <input type="number" min={product.stock?.reservedQuantity || 0} step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
          </label>
          <label>
            Статус наличия
            <select value={stockStatus} onChange={(event) => setStockStatus(event.target.value)}>
              {stockOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <small>
            Зарезервировано: {product.stock?.reservedQuantity || 0}. Доступно:
            {' '}{product.stock?.availableQuantity || 0}.
          </small>
          <button className="admin-primary-button" type="submit" disabled={saving === 'stock'}>
            {saving === 'stock' ? 'Сохраняем…' : 'Обновить остаток'}
          </button>
        </form>
      </div>

      <form className="admin-card admin-edit-form" onSubmit={saveNote}>
        <h2>Внутренняя заметка</h2>
        <textarea rows={5} maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Не видна покупателям." />
        <button className="admin-primary-button" type="submit" disabled={saving === 'note'}>
          {saving === 'note' ? 'Сохраняем…' : 'Сохранить заметку'}
        </button>
      </form>

      <div className="admin-readonly-note">
        Название, slug, категория, описания, SEO, FAQ и изображения на этом этапе доступны
        только для просмотра и защищены от случайного редактирования.
      </div>
    </section>
  )
}
