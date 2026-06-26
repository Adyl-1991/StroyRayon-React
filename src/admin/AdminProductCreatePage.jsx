import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createAdminProduct, getAdminProductOptions } from '../api/adminApi'

const stockOptions = [
  ['IN_STOCK', 'В наличии'],
  ['LOW_STOCK', 'Мало'],
  ['PRE_ORDER', 'Предзаказ'],
  ['OUT_OF_STOCK', 'Нет в наличии'],
]

const cyrillicMap = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'i',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'c',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ы: 'y',
  э: 'e',
  ю: 'yu',
  я: 'ya',
  ң: 'n',
  ө: 'o',
  ү: 'u',
}

function slugify(value) {
  const transliterated = value
    .toLowerCase()
    .split('')
    .map((char) => cyrillicMap[char] || char)
    .join('')

  return transliterated
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160)
}

function createInitialForm() {
  const stamp = Date.now().toString().slice(-6)
  return {
    catalogNodeId: '',
    titleKg: '',
    titleRu: '',
    slug: `local-product-${stamp}`,
    sku: `SR-LOCAL-${stamp}`,
    shortDescriptionKg: '',
    descriptionKg: '',
    descriptionRu: '',
    price: '100',
    stockQuantity: '1',
    unit: 'даана',
    stockStatus: 'IN_STOCK',
    isActive: true,
    adminNote: '',
  }
}

export function AdminProductCreatePage() {
  const navigate = useNavigate()
  const [options, setOptions] = useState(null)
  const [form, setForm] = useState(createInitialForm)
  const [slugTouched, setSlugTouched] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getAdminProductOptions()
      .then((data) => {
        if (!active) return
        setOptions(data)
        setForm((current) => ({
          ...current,
          catalogNodeId: current.catalogNodeId || data.categories[0]?.id || '',
          unit: data.units.includes(current.unit) ? current.unit : data.units[0] || current.unit,
        }))
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Не удалось загрузить справочники товара.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const categoryOptions = useMemo(() => options?.categories || [], [options])
  const units = useMemo(() => options?.units || ['даана', 'метр', 'кг'], [options])

  function updateField(name, value) {
    setForm((current) => {
      const next = { ...current, [name]: value }
      if ((name === 'titleKg' || name === 'titleRu') && !slugTouched) {
        const nextSlug = slugify(next.titleRu || next.titleKg)
        if (nextSlug) next.slug = nextSlug
      }
      return next
    })
  }

  async function submitForm(event) {
    event.preventDefault()
    setError('')

    const price = Number(form.price)
    const stockQuantity = Number(form.stockQuantity)
    if (!form.catalogNodeId) {
      setError('Выберите категорию.')
      return
    }
    if (!form.titleKg.trim() || !form.titleRu.trim()) {
      setError('Заполните название на кыргызском и русском.')
      return
    }
    if (!form.slug.trim()) {
      setError('Заполните slug.')
      return
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError('Цена должна быть положительным числом.')
      return
    }
    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
      setError('Остаток должен быть целым неотрицательным числом.')
      return
    }

    setSaving(true)
    try {
      const created = await createAdminProduct({
        ...form,
        price,
        stockQuantity,
      })
      navigate(`/admin/products/${created.id}`)
    } catch (requestError) {
      setError(requestError.message || 'Не удалось создать товар.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="admin-state">Загружаем форму товара…</div>

  return (
    <section>
      <Link className="admin-back-link" to="/admin/products">← К списку товаров</Link>
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Новый товар</span>
          <h1>Создать товар</h1>
          <p>Карточка сохраняется в локальную базу и сразу готова к проверке витрины.</p>
        </div>
      </div>

      {error && <div className="admin-alert admin-alert-error" role="alert">{error}</div>}

      <form className="admin-create-form" data-qa="admin-product-create-form" onSubmit={submitForm}>
        <div className="admin-detail-grid">
          <article className="admin-card admin-edit-form">
            <h2>Каталог</h2>
            <label>
              Категория
              <select
                data-qa="product-category"
                value={form.catalogNodeId}
                onChange={(event) => updateField('catalogNodeId', event.target.value)}
                required
              >
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {'— '.repeat(Math.max(category.level || 0, 0))}{category.titleKg} · {category.path}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Slug
              <input
                data-qa="product-slug"
                value={form.slug}
                onChange={(event) => {
                  setSlugTouched(true)
                  updateField('slug', event.target.value)
                }}
                maxLength={180}
                required
              />
            </label>
            <label>
              SKU
              <input
                data-qa="product-sku"
                value={form.sku}
                onChange={(event) => updateField('sku', event.target.value)}
                maxLength={80}
              />
            </label>
          </article>

          <article className="admin-card admin-edit-form">
            <h2>Цена и остаток</h2>
            <label>
              Цена, KGS
              <input
                data-qa="product-price"
                type="number"
                min="0.01"
                max="9999999999.99"
                step="0.01"
                value={form.price}
                onChange={(event) => updateField('price', event.target.value)}
                required
              />
            </label>
            <label>
              Остаток
              <input
                data-qa="product-stock"
                type="number"
                min="0"
                step="1"
                value={form.stockQuantity}
                onChange={(event) => updateField('stockQuantity', event.target.value)}
                required
              />
            </label>
            <label>
              Единица
              <select
                data-qa="product-unit"
                value={form.unit}
                onChange={(event) => updateField('unit', event.target.value)}
              >
                {units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
              </select>
            </label>
            <label>
              Статус наличия
              <select
                data-qa="product-stock-status"
                value={form.stockStatus}
                onChange={(event) => updateField('stockStatus', event.target.value)}
              >
                {stockOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="admin-checkbox-field">
              <input
                data-qa="product-active"
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => updateField('isActive', event.target.checked)}
              />
              Показывать товар в магазине
            </label>
          </article>
        </div>

        <div className="admin-detail-grid">
          <article className="admin-card admin-edit-form">
            <h2>Текст KG</h2>
            <label>
              Название KG
              <input
                data-qa="product-title-kg"
                value={form.titleKg}
                onChange={(event) => updateField('titleKg', event.target.value)}
                maxLength={180}
                required
              />
            </label>
            <label>
              Короткое описание KG
              <textarea
                data-qa="product-short-description-kg"
                rows={3}
                value={form.shortDescriptionKg}
                onChange={(event) => updateField('shortDescriptionKg', event.target.value)}
                maxLength={1200}
              />
            </label>
            <label>
              Описание KG
              <textarea
                data-qa="product-description-kg"
                rows={7}
                value={form.descriptionKg}
                onChange={(event) => updateField('descriptionKg', event.target.value)}
                maxLength={5000}
              />
            </label>
          </article>

          <article className="admin-card admin-edit-form">
            <h2>Текст RU</h2>
            <label>
              Название RU
              <input
                data-qa="product-title-ru"
                value={form.titleRu}
                onChange={(event) => updateField('titleRu', event.target.value)}
                maxLength={180}
                required
              />
            </label>
            <label>
              Описание RU
              <textarea
                data-qa="product-description-ru"
                rows={7}
                value={form.descriptionRu}
                onChange={(event) => updateField('descriptionRu', event.target.value)}
                maxLength={5000}
              />
            </label>
            <label>
              Внутренняя заметка
              <textarea
                data-qa="product-admin-note"
                rows={4}
                value={form.adminNote}
                onChange={(event) => updateField('adminNote', event.target.value)}
                maxLength={2000}
              />
            </label>
          </article>
        </div>

        <div className="admin-create-actions">
          <button className="admin-primary-button" type="submit" disabled={saving}>
            {saving ? 'Создаём…' : 'Создать товар'}
          </button>
        </div>
      </form>
    </section>
  )
}
