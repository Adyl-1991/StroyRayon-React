import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getAdminProducts } from '../api/adminApi'
import { formatPrice } from '../utils/formatPrice'

const stockOptions = [
  ['', 'Все остатки'],
  ['IN_STOCK', 'В наличии'],
  ['LOW_STOCK', 'Мало'],
  ['PRE_ORDER', 'Предзаказ'],
  ['OUT_OF_STOCK', 'Нет в наличии'],
]

const activeOptions = [
  ['', 'Все товары'],
  ['true', 'Активные'],
  ['false', 'Неактивные'],
]

const stockLabels = {
  in_stock: 'В наличии',
  low_stock: 'Мало',
  pre_order: 'Предзаказ',
  out_of_stock: 'Нет в наличии',
}

export function AdminProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryKey = searchParams.toString()
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [state, setState] = useState({ queryKey: null, data: null, error: '' })

  useEffect(() => {
    let active = true
    const params = Object.fromEntries(searchParams.entries())
    getAdminProducts(params)
      .then((data) => {
        if (active) setState({ queryKey, data, error: '' })
      })
      .catch((error) => {
        if (active) {
          setState({
            queryKey,
            data: null,
            error: error.message || 'Не удалось загрузить товары.',
          })
        }
      })
    return () => {
      active = false
    }
  }, [queryKey, searchParams])

  const loading = state.queryKey !== queryKey
  const data = state.data

  function updateParam(key, value) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setSearchParams(next)
  }

  function submitSearch(event) {
    event.preventDefault()
    updateParam('q', search.trim())
  }

  return (
    <section>
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Каталог</span>
          <h1>Товары</h1>
          <p>Цена, остаток и видимость в магазине.</p>
        </div>
        {data && <span>{data.pagination.total} товаров</span>}
      </div>

      <div className="admin-product-filters">
        <form className="admin-search-form" onSubmit={submitSearch}>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Название, slug или артикул"
            aria-label="Поиск товаров"
          />
          <button className="admin-primary-button" type="submit">Найти</button>
        </form>
        <select
          value={searchParams.get('catalogPath') || ''}
          onChange={(event) => updateParam('catalogPath', event.target.value)}
          aria-label="Категория"
        >
          <option value="">Все категории</option>
          {data?.filters.categories.map((category) => (
            <option key={category.path} value={category.path}>
              {category.titleKg} · {category.path}
            </option>
          ))}
        </select>
        <select
          value={searchParams.get('stockStatus') || ''}
          onChange={(event) => updateParam('stockStatus', event.target.value)}
          aria-label="Статус остатка"
        >
          {stockOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select
          value={searchParams.get('isActive') || ''}
          onChange={(event) => updateParam('isActive', event.target.value)}
          aria-label="Активность товара"
        >
          {activeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      {loading && <div className="admin-state">Загружаем товары…</div>}
      {!loading && state.error && <div className="admin-alert admin-alert-error" role="alert">{state.error}</div>}
      {!loading && !state.error && data?.items.length === 0 && (
        <div className="admin-state">По этим фильтрам товары не найдены.</div>
      )}
      {!loading && data?.items.length > 0 && (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table admin-products-table">
              <thead>
                <tr>
                  <th>Товар</th>
                  <th>Категория</th>
                  <th>Бренд</th>
                  <th>Цена</th>
                  <th>Остаток</th>
                  <th>Видимость</th>
                  <th>Фото</th>
                  <th>Обновлён</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <Link to={`/admin/products/${product.id}`}>{product.title}</Link>
                      <small>{product.slug} · {product.sku} · {product.unit}</small>
                    </td>
                    <td><small>{product.catalogPath}</small></td>
                    <td>{product.brand?.name || '—'}</td>
                    <td>{formatPrice(product.price)}</td>
                    <td>
                      <strong>{product.stock?.quantity ?? 0}</strong>
                      <small>
                        {stockLabels[product.stockStatus]} · резерв {product.stock?.reservedQuantity ?? 0}
                      </small>
                    </td>
                    <td>
                      <span className={`admin-status ${product.isActive ? 'admin-status-confirmed' : 'admin-status-cancelled'}`}>
                        {product.isActive ? 'Активен' : 'Скрыт'}
                      </span>
                    </td>
                    <td>{product.imageStatus === 'ready' ? 'Готово' : product.imageStatus === 'placeholder' ? 'Заглушка' : 'Нет'}</td>
                    <td>{new Date(product.updatedAt).toLocaleString('ru-RU')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.pagination.pages > 1 && (
            <div className="admin-pagination">
              <button
                type="button"
                disabled={data.pagination.page <= 1}
                onClick={() => updateParam('page', String(data.pagination.page - 1))}
              >
                Назад
              </button>
              <span>Страница {data.pagination.page} из {data.pagination.pages}</span>
              <button
                type="button"
                disabled={data.pagination.page >= data.pagination.pages}
                onClick={() => updateParam('page', String(data.pagination.page + 1))}
              >
                Далее
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
