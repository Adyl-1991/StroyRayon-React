import { useEffect, useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import { getAdminProducts } from '../api/adminApi'
import { formatPrice } from '../utils/formatPrice'
import { hasAdminPermission } from './adminPermissions'

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

const qualityOptions = [
  ['', 'Все по качеству'],
  ['missing_image', 'Нет фото'],
  ['missing_description', 'Нет описания'],
  ['missing_specs', 'Нет характеристик'],
  ['missing_documents', 'Нет документов'],
  ['missing_seo', 'Нет SEO'],
  ['inactive', 'Скрытые'],
  ['low_stock', 'Мало на складе'],
  ['out_of_stock', 'Нет остатка'],
]

const stockLabels = {
  in_stock: 'В наличии',
  low_stock: 'Мало',
  pre_order: 'Предзаказ',
  out_of_stock: 'Нет в наличии',
}

function qualityClass(flag) {
  return `admin-quality-chip admin-quality-chip-${flag.severity || 'info'}`
}

export function AdminProductsPage() {
  const { admin } = useOutletContext()
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
  const canCreate = hasAdminPermission(admin, 'products:create')

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
        <div className="admin-heading-actions">
          {data && <span>{data.pagination.total} товаров</span>}
          {canCreate && <Link className="admin-primary-button" to="/admin/products/new">Новый товар</Link>}
        </div>
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
        <select
          value={searchParams.get('quality') || ''}
          onChange={(event) => updateParam('quality', event.target.value)}
          aria-label="Качество заполнения товара"
        >
          {qualityOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
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
                  <th>Фото</th>
                  <th>Товар</th>
                  <th>Категория</th>
                  <th>Бренд</th>
                  <th>Цена</th>
                  <th>Остаток</th>
                  <th>Качество</th>
                  <th>Видимость</th>
                  <th>Обновлён</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((product) => (
                  <tr key={product.id}>
                    <td>
                      {product.thumbnail?.src && product.imageStatus === 'ready' ? (
                        <img className="admin-product-thumb" src={product.thumbnail.src} alt={product.thumbnail.alt || product.title} />
                      ) : (
                        <div className="admin-product-thumb admin-product-thumb-placeholder">Нет фото</div>
                      )}
                    </td>
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
                      <div className="admin-quality-summary">
                        <strong>{product.completenessScore ?? 0}%</strong>
                        <small>{product.completenessLabel}</small>
                      </div>
                      <div className="admin-quality-chips">
                        {(product.qualityFlags || []).slice(0, 4).map((flag) => (
                          <span className={qualityClass(flag)} key={flag.code}>{flag.label}</span>
                        ))}
                        {(product.qualityFlags || []).length > 4 && (
                          <span className="admin-quality-chip">+{product.qualityFlags.length - 4}</span>
                        )}
                      </div>
                      {product.variantCount > 0 && (
                        <div className="admin-quality-chips">
                          <span className="admin-quality-chip">Варианты: {product.activeVariantCount}/{product.variantCount}</span>
                          {product.inactiveVariantCount > 0 && <span className="admin-quality-chip admin-quality-chip-info">Скрыто: {product.inactiveVariantCount}</span>}
                          {(product.variantIssues || []).slice(0, 1).map((issue) => (
                            <span className="admin-quality-chip admin-quality-chip-warning" key={issue.code}>{issue.label}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`admin-status ${product.isActive ? 'admin-status-confirmed' : 'admin-status-cancelled'}`}>
                        {product.isActive ? 'Активен' : 'Скрыт'}
                      </span>
                    </td>
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
