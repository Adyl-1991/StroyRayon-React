import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import {
  getAdminProduct,
  getAdminProductAuditLog,
  getAdminProductOptions,
  updateAdminProduct,
  uploadAdminProductImage,
} from '../api/adminApi'
import { hasAdminPermission } from './adminPermissions'
import { formatPrice } from '../utils/formatPrice'

const stockOptions = [
  ['IN_STOCK', 'В наличии'],
  ['LOW_STOCK', 'Мало'],
  ['PRE_ORDER', 'Предзаказ'],
  ['OUT_OF_STOCK', 'Нет в наличии'],
]

const documentTypeOptions = [
  ['CERTIFICATE', 'Сертификат'],
  ['MANUAL', 'Инструкция'],
  ['PASSPORT', 'Паспорт товара'],
  ['OTHER', 'Другое'],
]

const auditActionLabels = {
  product_created: 'Товар создан',
  product_updated: 'Товар обновлен',
  price_changed: 'Цена изменена',
  stock_changed: 'Остаток изменен',
  active_changed: 'Видимость изменена',
  note_changed: 'Заметка изменена',
}

function formatAuditValue(value) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Да' : 'Нет'
  if (Array.isArray(value)) return `${value.length} строк`
  if (typeof value === 'object') return JSON.stringify(value).slice(0, 140)
  return String(value)
}

function auditFieldValue(snapshot, field) {
  if (!snapshot || typeof snapshot !== 'object') return undefined
  if (field === 'stock') return snapshot.stockQuantity
  if (field === 'description') return snapshot.descriptionKg || snapshot.descriptionRu || snapshot.shortDescriptionKg
  if (field === 'seo') return snapshot.seoTitleKg || snapshot.seoTitleRu || snapshot.seoDescriptionKg || snapshot.seoDescriptionRu
  return snapshot[field]
}

function emptySpec() {
  return { key: '', value: '' }
}

function emptyDocument() {
  return { title: '', url: '', type: 'OTHER', sortOrder: 0 }
}

function specsToRows(specs = {}) {
  return Object.entries(specs || {}).map(([key, value]) => ({ key, value: String(value ?? '') }))
}

function createForm(product) {
  const specs = specsToRows(product.specs)
  return {
    catalogNodeId: product.category?.id || '',
    brandId: product.brand?.id || '',
    titleKg: product.title || '',
    titleRu: product.titleRu || '',
    slug: product.slug || '',
    sku: product.sku || '',
    shortDescriptionKg: product.shortDescriptionKg || '',
    descriptionKg: product.descriptionKg || '',
    descriptionRu: product.descriptionRu || '',
    seoTitleKg: product.seoTitleKg || '',
    seoDescriptionKg: product.seoDescriptionKg || '',
    seoTitleRu: product.seoTitleRu || '',
    seoDescriptionRu: product.seoDescriptionRu || '',
    price: String(product.price || ''),
    quantity: String(product.stock?.quantity ?? 0),
    stockStatus: product.stockStatus?.toUpperCase() || 'IN_STOCK',
    unit: product.unit || '',
    isActive: Boolean(product.isActive),
    adminNote: product.adminNote || '',
    specs: specs.length ? specs : [emptySpec()],
    documents: product.documents?.length
      ? product.documents.map((document, index) => ({
          id: document.id,
          title: document.title || '',
          url: document.url || '',
          type: document.type || 'OTHER',
          sortOrder: document.sortOrder ?? index,
        }))
      : [emptyDocument()],
    images: product.images?.length
      ? product.images.map((image, index) => ({
          id: image.id,
          src: image.src || '',
          alt: image.alt || '',
          type: index === 0 ? 'MAIN' : 'GALLERY',
          sortOrder: image.sortOrder ?? index,
        }))
      : [],
  }
}

function compactRows(rows, fields) {
  return rows
    .map((row, index) => ({ ...row, sortOrder: row.sortOrder ?? index }))
    .filter((row) => fields.some((field) => String(row[field] || '').trim()))
}

function compactSpecs(rows) {
  return rows
    .map((row) => ({ key: row.key, value: row.value }))
    .filter((row) => row.key.trim() || row.value.trim())
}

export function AdminProductDetailPage() {
  const { id } = useParams()
  const { admin } = useOutletContext()
  const [product, setProduct] = useState(null)
  const [options, setOptions] = useState(null)
  const [form, setForm] = useState(null)
  const [auditLog, setAuditLog] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([getAdminProduct(id), getAdminProductOptions(), getAdminProductAuditLog(id, { limit: 20 })])
      .then(([productData, optionsData, auditData]) => {
        if (!active) return
        setProduct(productData)
        setOptions(optionsData)
        setAuditLog(auditData)
        setForm(createForm(productData))
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

  const units = useMemo(() => options?.units || ['даана', 'метр', 'кг'], [options])
  const categories = useMemo(() => options?.categories || [], [options])
  const brands = useMemo(() => options?.brands || [], [options])
  const canEditContent = hasAdminPermission(admin, 'products:content')
  const canEditCommercial = hasAdminPermission(admin, 'products:commercial')
  const canEditActive = hasAdminPermission(admin, 'products:active')
  const canUpload = hasAdminPermission(admin, 'products:upload')
  const canSave = canEditContent || canEditCommercial || canEditActive

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  function updateRow(group, index, name, value) {
    setForm((current) => ({
      ...current,
      [group]: current[group].map((row, rowIndex) =>
        rowIndex === index ? { ...row, [name]: value } : row,
      ),
    }))
  }

  function addRow(group, row) {
    setForm((current) => ({ ...current, [group]: [...current[group], row] }))
  }

  function removeRow(group, index, fallback) {
    setForm((current) => {
      const nextRows = current[group].filter((_, rowIndex) => rowIndex !== index)
      return { ...current, [group]: nextRows.length ? nextRows : [fallback] }
    })
  }

  async function handleImageUpload(event) {
    if (!canUpload) {
      setError('Недостаточно прав для загрузки фото.')
      event.target.value = ''
      return
    }
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Выберите файл изображения.')
      event.target.value = ''
      return
    }

    setUploadingImage(true)
    setError('')
    setMessage('')
    try {
      const uploaded = await uploadAdminProductImage(file)
      setForm((current) => ({
        ...current,
        images: [
          ...current.images,
          {
            src: uploaded.src,
            alt: current.titleRu || current.titleKg || file.name.replace(/\.[^.]+$/, ''),
            type: current.images.length ? 'GALLERY' : 'MAIN',
            sortOrder: current.images.length,
          },
        ],
      }))
      setMessage('Фото загружено. Нажмите "Сохранить", чтобы прикрепить его к товару.')
    } catch (requestError) {
      setError(requestError.message || 'Не удалось загрузить фото.')
    } finally {
      setUploadingImage(false)
      event.target.value = ''
    }
  }

  function makeMainImage(index) {
    setForm((current) => {
      const images = [...current.images]
      const [selected] = images.splice(index, 1)
      return {
        ...current,
        images: [selected, ...images].map((image, imageIndex) => ({
          ...image,
          type: imageIndex === 0 ? 'MAIN' : 'GALLERY',
          sortOrder: imageIndex,
        })),
      }
    })
  }

  function removeImage(index) {
    setForm((current) => ({
      ...current,
      images: current.images
        .filter((_, imageIndex) => imageIndex !== index)
        .map((image, imageIndex) => ({
          ...image,
          type: imageIndex === 0 ? 'MAIN' : 'GALLERY',
          sortOrder: imageIndex,
        })),
    }))
  }

  async function handleSave(event) {
    event.preventDefault()
    if (!canSave) {
      setError('Недостаточно прав для изменения товара.')
      return
    }
    setSaving(true)
    setError('')
    setMessage('')

    const price = Number(form.price)
    const quantity = Number(form.quantity)
    if (!form.titleKg.trim()) {
      setError('Заполните название KG.')
      setSaving(false)
      return
    }
    if (!form.slug.trim()) {
      setError('Заполните slug.')
      setSaving(false)
      return
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError('Цена должна быть положительным числом.')
      setSaving(false)
      return
    }
    if (!Number.isInteger(quantity) || quantity < 0) {
      setError('Остаток должен быть целым неотрицательным числом.')
      setSaving(false)
      return
    }
    if (product?.stock?.reservedQuantity && quantity < product.stock.reservedQuantity) {
      setError(`Остаток не может быть меньше резерва (${product.stock.reservedQuantity}).`)
      setSaving(false)
      return
    }

    try {
      const payload = {
        ...(canEditContent
          ? {
              catalogNodeId: form.catalogNodeId,
              brandId: form.brandId || null,
              titleKg: form.titleKg,
              titleRu: form.titleRu,
              slug: form.slug,
              sku: form.sku,
              shortDescriptionKg: form.shortDescriptionKg,
              descriptionKg: form.descriptionKg,
              descriptionRu: form.descriptionRu,
              seoTitleKg: form.seoTitleKg,
              seoDescriptionKg: form.seoDescriptionKg,
              seoTitleRu: form.seoTitleRu,
              seoDescriptionRu: form.seoDescriptionRu,
              unit: form.unit,
              adminNote: form.adminNote,
              specs: compactSpecs(form.specs),
              documents: compactRows(form.documents, ['title', 'url']),
              images: form.images.filter((image) => image.src.trim()),
            }
          : {}),
        ...(canEditCommercial
          ? {
              price,
              stockQuantity: quantity,
              stockStatus: form.stockStatus,
            }
          : {}),
        ...(canEditActive ? { isActive: form.isActive } : {}),
      }
      const updated = await updateAdminProduct(id, payload)
      setProduct(updated)
      setForm(createForm(updated))
      setMessage('Товар сохранен.')
      getAdminProductAuditLog(id, { limit: 20 }).then(setAuditLog).catch(() => {})
    } catch (requestError) {
      setError(requestError.message || 'Не удалось сохранить товар.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="admin-state">Загружаем товар...</div>
  if (!form || !product) return <div className="admin-alert admin-alert-error">{error || 'Товар не найден.'}</div>

  return (
    <section>
      <Link className="admin-back-link" to="/admin/products">← К списку товаров</Link>
      <form className="admin-product-editor" data-qa="admin-product-edit-form" onSubmit={handleSave}>
        <div className="admin-page-heading">
          <div>
            <span className="admin-eyebrow">Товар</span>
            <h1>{form.titleKg || product.title}</h1>
            <p>{form.slug} · {form.sku || 'без SKU'}</p>
          </div>
          <div className="admin-heading-actions">
            <a className="admin-secondary-button" href={`/product/${form.slug}`} target="_blank" rel="noreferrer">
              Открыть на сайте
            </a>
            <button className="admin-primary-button" type="submit" disabled={saving || !canSave}>
              {saving ? 'Сохраняем...' : 'Сохранить'}
            </button>
          </div>
        </div>

        {error && <div className="admin-alert admin-alert-error" role="alert">{error}</div>}
        {message && <div className="admin-alert admin-alert-success" role="status">{message}</div>}
        {!canSave && (
          <div className="admin-alert admin-alert-error" role="status">
            У вашей роли есть только просмотр этого товара.
          </div>
        )}

        <div className="admin-detail-grid">
          <article className="admin-card admin-edit-form">
            <h2>Основное</h2>
            <label>
              Название KG
              <input data-qa="edit-title-kg" value={form.titleKg} onChange={(event) => updateField('titleKg', event.target.value)} maxLength={180} required disabled={!canEditContent} />
            </label>
            <label>
              Название RU
              <input data-qa="edit-title-ru" value={form.titleRu} onChange={(event) => updateField('titleRu', event.target.value)} maxLength={180} disabled={!canEditContent} />
            </label>
            <label>
              Slug
              <input data-qa="edit-slug" value={form.slug} onChange={(event) => updateField('slug', event.target.value)} maxLength={180} required disabled={!canEditContent} />
            </label>
            <label>
              SKU
              <input data-qa="edit-sku" value={form.sku} onChange={(event) => updateField('sku', event.target.value)} maxLength={80} required disabled={!canEditContent} />
            </label>
            <label>
              Категория
              <select data-qa="edit-category" value={form.catalogNodeId} onChange={(event) => updateField('catalogNodeId', event.target.value)} required disabled={!canEditContent}>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {'- '.repeat(Math.max(category.level || 0, 0))}{category.titleKg} · {category.path}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Бренд
              <select data-qa="edit-brand" value={form.brandId} onChange={(event) => updateField('brandId', event.target.value)} disabled={!canEditContent}>
                <option value="">Без бренда</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>{brand.name}</option>
                ))}
              </select>
            </label>
            <label>
              Единица
              <select data-qa="edit-unit" value={form.unit} onChange={(event) => updateField('unit', event.target.value)} disabled={!canEditContent}>
                {units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
              </select>
            </label>
            <label className="admin-checkbox-field">
              <input data-qa="edit-active" type="checkbox" checked={form.isActive} onChange={(event) => updateField('isActive', event.target.checked)} disabled={!canEditActive} />
              Показывать товар в магазине
            </label>
          </article>

          <article className="admin-card admin-edit-form">
            <h2>Цена и остаток</h2>
            <label>
              Цена, KGS
              <input data-qa="edit-price" type="number" min="0.01" max="9999999999.99" step="0.01" value={form.price} onChange={(event) => updateField('price', event.target.value)} required disabled={!canEditCommercial} />
            </label>
            <label>
              Остаток
              <input data-qa="edit-stock" type="number" min={product.stock?.reservedQuantity || 0} step="1" value={form.quantity} onChange={(event) => updateField('quantity', event.target.value)} required disabled={!canEditCommercial} />
            </label>
            <label>
              Статус наличия
              <select data-qa="edit-stock-status" value={form.stockStatus} onChange={(event) => updateField('stockStatus', event.target.value)} disabled={!canEditCommercial}>
                {stockOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <small>
              Текущая цена: {formatPrice(product.price)}. Зарезервировано: {product.stock?.reservedQuantity || 0}.
            </small>
          </article>
        </div>

        <div className="admin-detail-grid">
          <article className="admin-card admin-edit-form">
            <h2>Описание KG</h2>
            <label>
              Короткое описание
              <textarea data-qa="edit-short-description-kg" rows={3} value={form.shortDescriptionKg} onChange={(event) => updateField('shortDescriptionKg', event.target.value)} maxLength={1200} disabled={!canEditContent} />
            </label>
            <label>
              Полное описание KG
              <textarea data-qa="edit-description-kg" rows={8} value={form.descriptionKg} onChange={(event) => updateField('descriptionKg', event.target.value)} maxLength={5000} disabled={!canEditContent} />
            </label>
          </article>

          <article className="admin-card admin-edit-form">
            <h2>Описание RU</h2>
            <label>
              Полное описание RU
              <textarea data-qa="edit-description-ru" rows={8} value={form.descriptionRu} onChange={(event) => updateField('descriptionRu', event.target.value)} maxLength={5000} disabled={!canEditContent} />
            </label>
            <label>
              Внутренняя заметка
              <textarea data-qa="edit-admin-note" rows={5} value={form.adminNote} onChange={(event) => updateField('adminNote', event.target.value)} maxLength={2000} disabled={!canEditContent} />
            </label>
          </article>
        </div>

        <article className="admin-card admin-edit-form">
          <div className="admin-section-header">
            <h2>Характеристики</h2>
            <button type="button" className="admin-secondary-button" disabled={!canEditContent} onClick={() => addRow('specs', emptySpec())}>
              Добавить характеристику
            </button>
          </div>
          <div className="admin-repeat-list">
            {form.specs.map((row, index) => (
              <div className="admin-repeat-row admin-repeat-row-spec" key={`spec-${index}`}>
                <input data-qa="edit-spec-key" placeholder="Ключ" value={row.key} onChange={(event) => updateRow('specs', index, 'key', event.target.value)} maxLength={120} disabled={!canEditContent} />
                <input data-qa="edit-spec-value" placeholder="Значение" value={row.value} onChange={(event) => updateRow('specs', index, 'value', event.target.value)} maxLength={500} disabled={!canEditContent} />
                <button type="button" className="admin-danger-button" disabled={!canEditContent} onClick={() => removeRow('specs', index, emptySpec())}>Удалить</button>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-card admin-edit-form">
          <div className="admin-section-header">
            <h2>Документы</h2>
            <button type="button" className="admin-secondary-button" disabled={!canEditContent} onClick={() => addRow('documents', emptyDocument())}>
              Добавить документ
            </button>
          </div>
          <div className="admin-repeat-list">
            {form.documents.map((row, index) => (
              <div className="admin-repeat-row admin-repeat-row-document" key={`document-${index}`}>
                <input data-qa="edit-document-title" placeholder="Название" value={row.title} onChange={(event) => updateRow('documents', index, 'title', event.target.value)} maxLength={180} disabled={!canEditContent} />
                <input data-qa="edit-document-url" placeholder="https://... или /uploads/..." value={row.url} onChange={(event) => updateRow('documents', index, 'url', event.target.value)} maxLength={500} disabled={!canEditContent} />
                <select data-qa="edit-document-type" value={row.type} onChange={(event) => updateRow('documents', index, 'type', event.target.value)} disabled={!canEditContent}>
                  {documentTypeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <button type="button" className="admin-danger-button" disabled={!canEditContent} onClick={() => removeRow('documents', index, emptyDocument())}>Удалить</button>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-card admin-edit-form">
          <h2>SEO</h2>
          <div className="admin-detail-grid admin-detail-grid-compact">
            <label>
              SEO title KG
              <input data-qa="edit-seo-title-kg" value={form.seoTitleKg} onChange={(event) => updateField('seoTitleKg', event.target.value)} maxLength={180} disabled={!canEditContent} />
            </label>
            <label>
              SEO title RU
              <input data-qa="edit-seo-title-ru" value={form.seoTitleRu} onChange={(event) => updateField('seoTitleRu', event.target.value)} maxLength={180} disabled={!canEditContent} />
            </label>
            <label>
              SEO meta KG
              <textarea data-qa="edit-seo-description-kg" rows={3} value={form.seoDescriptionKg} onChange={(event) => updateField('seoDescriptionKg', event.target.value)} maxLength={500} disabled={!canEditContent} />
            </label>
            <label>
              SEO meta RU
              <textarea data-qa="edit-seo-description-ru" rows={3} value={form.seoDescriptionRu} onChange={(event) => updateField('seoDescriptionRu', event.target.value)} maxLength={500} disabled={!canEditContent} />
            </label>
          </div>
        </article>

        <article className="admin-card admin-edit-form">
          <div className="admin-section-header">
            <h2>Фото</h2>
            <label className="admin-file-upload admin-inline-upload">
              Загрузить фото
              <input data-qa="edit-image-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={uploadingImage || !canUpload} onChange={handleImageUpload} />
              <span>{uploadingImage ? 'Загружаем...' : 'JPG, PNG, WEBP или GIF до 5 MB'}</span>
            </label>
          </div>
          {form.images.length === 0 ? (
            <div className="admin-state">У товара нет прикрепленных фото. На сайте будет использована заглушка.</div>
          ) : (
            <div className="admin-gallery-editor">
              {form.images.map((image, index) => (
                <div className="admin-gallery-item" key={`${image.src}-${index}`}>
                  <img src={image.src} alt={image.alt || form.titleKg} />
                  <input data-qa="edit-image-alt" value={image.alt} onChange={(event) => updateRow('images', index, 'alt', event.target.value)} maxLength={180} placeholder="Alt text" disabled={!canEditContent} />
                  <div className="admin-gallery-actions">
                    <button type="button" className="admin-secondary-button" disabled={index === 0 || !canEditContent} onClick={() => makeMainImage(index)}>
                      Сделать главным
                    </button>
                    <button type="button" className="admin-danger-button" disabled={!canEditContent} onClick={() => removeImage(index)}>
                      Убрать
                    </button>
                  </div>
                  {index === 0 && <small>Главное фото</small>}
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="admin-card admin-edit-form">
          <h2>Служебные данные</h2>
          <dl>
            <div><dt>ID</dt><dd>{product.id}</dd></div>
            <div><dt>Обновлен</dt><dd>{new Date(product.updatedAt).toLocaleString('ru-RU')}</dd></div>
            <div><dt>Фото</dt><dd>{product.imageStatus === 'ready' ? 'Готово' : product.imageStatus === 'placeholder' ? 'Заглушка' : 'Нет'}</dd></div>
          </dl>
        </article>

        <article className="admin-card admin-edit-form admin-card-wide">
          <h2>История изменений</h2>
          {!auditLog?.items?.length ? (
            <div className="admin-state">История изменений пока пустая.</div>
          ) : (
            <ol className="admin-history admin-audit-history" data-qa="product-audit-log">
              {auditLog.items.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{auditActionLabels[item.action] || item.action}</strong>
                    <span>{new Date(item.createdAt).toLocaleString('ru-RU')}</span>
                    {item.admin && <small>{item.admin.name || item.admin.email} · {item.admin.role}</small>}
                  </div>
                  {item.changedFields.length > 0 && (
                    <ul className="admin-audit-fields">
                      {item.changedFields.slice(0, 10).map((field) => (
                        <li key={`${item.id}-${field}`}>
                          <span>{field}</span>
                          <small>
                            {formatAuditValue(auditFieldValue(item.beforeSnapshot, field))}
                            {' -> '}
                            {formatAuditValue(auditFieldValue(item.afterSnapshot, field))}
                          </small>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          )}
        </article>
      </form>
    </section>
  )
}
